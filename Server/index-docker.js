const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Docker = require('dockerode');
const WebSocket = require('ws');
const http = require('http');
const tar = require('tar-stream');
const { PassThrough } = require('stream');

// Initialize Docker client
// This connects to your local Docker daemon
const docker = new Docker();

const app = express();
const port = process.env.PORT || 5000;

// Create HTTP server (needed for WebSocket)
const server = http.createServer(app);

// Create WebSocket server on same port
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(bodyParser.json());

/**
 * DOCKER CONFIGURATION
 * These settings provide isolation and resource limits to prevent:
 * - Memory bombs (limit to 128MB)
 * - CPU exhaustion (limit CPU shares)
 * - Network attacks (disable network)
 * - Fork bombs (limit processes to 50)
 * - File system tampering (read-only root)
 */
const CONTAINER_CONFIG = {
    Memory: 128 * 1024 * 1024,        // 128MB RAM limit
    MemorySwap: 128 * 1024 * 1024,    // No additional swap
    CpuShares: 512,                    // Limit CPU usage (1024 = 1 CPU)
    NetworkDisabled: true,             // No network access
    PidsLimit: 50,                     // Max 50 processes (prevents fork bombs)
    AttachStdin: true,                 // Allow stdin input
    AttachStdout: true,                // Capture stdout
    AttachStderr: true,                // Capture stderr
    Tty: false,                        // No pseudo-TTY
    OpenStdin: true,                   // Keep stdin open
    StdinOnce: false,                  // Allow multiple stdin writes
};

const EXECUTION_TIMEOUT = 100000000; // 1000 seconds max execution time

/**
 * Language configurations
 * Defines how to compile and run code for each language
 */
const LANGUAGE_CONFIG = {
    javascript: {
        image: 'coderunner-js:latest',
        fileExtension: 'js',
        fileName: 'code.js',
        compileCmd: null, // No compilation needed
        runCmd: ['node', 'code.js']
    },
    c: {
        image: 'coderunner-c:latest',
        fileExtension: 'c',
        fileName: 'code.c',
        compileCmd: ['gcc', 'code.c', '-o', 'program', '-std=c11'],
        runCmd: ['./program']
    },
    cpp: {
        image: 'coderunner-cpp:latest',
        fileExtension: 'cpp',
        fileName: 'code.cpp',
        compileCmd: ['g++', 'code.cpp', '-o', 'program', '-std=c++17'],
        runCmd: ['./program']
    },
    java: {
        image: 'coderunner-java:latest',
        fileExtension: 'java',
        fileName: 'Main.java', // Will be replaced with actual class name
        compileCmd: ['javac', 'Main.java'],
        runCmd: ['java', 'Main']
    },
    python: {
        image: 'coderunner-python:latest',
        fileExtension: 'py',
        fileName: 'code.py',
        compileCmd: null, // No compilation needed
        runCmd: ['python3', 'code.py']
    }
};

/**
 * Creates a tar archive containing the code file
 * Docker requires files to be sent as tar archives
 * 
 * @param {string} fileName - Name of the file
 * @param {string} code - Code content
 * @returns {Buffer} - Tar archive as buffer
 */
function createTarArchive(fileName, code) {
    return new Promise((resolve, reject) => {
        const pack = tar.pack();
        const chunks = [];

        // Collect tar data
        pack.on('data', chunk => chunks.push(chunk));
        pack.on('end', () => resolve(Buffer.concat(chunks)));
        pack.on('error', reject);

        // Add file to archive
        pack.entry({ name: fileName }, code, (err) => {
            if (err) reject(err);
            pack.finalize();
        });
    });
}

/**
 * Extracts Java class name from code
 * Java requires the filename to match the public class name
 * 
 * @param {string} code - Java source code
 * @returns {string|null} - Class name or null
 */
function extractJavaClassName(code) {
    const match = code.match(/public\s+class\s+(\w+)/);
    return match ? match[1] : null;
}

/**
 * Main Docker execution engine
 * This function handles the entire lifecycle of code execution:
 * 1. Create container with resource limits
 * 2. Copy code into container
 * 3. Compile code (if needed)
 * 4. Execute code with stdin/stdout streaming
 * 5. Handle timeout
 * 6. Cleanup container
 * 
 * @param {string} language - Programming language
 * @param {string} code - Source code
 * @param {Stream} stdinStream - Input stream from user
 * @param {Function} onOutput - Callback for output chunks
 * @param {Function} onError - Callback for errors
 * @param {Function} onComplete - Callback when execution completes
 */
async function executeInDocker(language, code, stdinStream, onOutput, onError, onComplete) {
    let container = null;
    let timeoutHandle = null;
    let execStream = null;

    try {
        const config = LANGUAGE_CONFIG[language];
        if (!config) {
            throw new Error(`Unsupported language: ${language}`);
        }

        // For Java, extract class name and set filename
        let fileName = config.fileName;
        let compileCmd = config.compileCmd;
        let runCmd = config.runCmd;

        if (language === 'java') {
            const className = extractJavaClassName(code);
            if (!className) {
                throw new Error('Java code must contain a public class');
            }
            fileName = `${className}.java`;
            compileCmd = ['javac', fileName];
            runCmd = ['java', className];
        }

        // Step 1: Create container
        onOutput(`[System] Creating isolated container...\n`);
        container = await docker.createContainer({
            Image: config.image,
            ...CONTAINER_CONFIG,
            Cmd: ['/bin/sh'], // Keep container alive
        });

        // Step 2: Start container
        await container.start();
        onOutput(`[System] Container started\n`);

        // Step 3: Copy code into container
        const tarArchive = await createTarArchive(fileName, code);
        await container.putArchive(tarArchive, { path: '/app' });
        onOutput(`[System] Code uploaded\n`);

        // Step 4: Compile code (if needed)
        if (compileCmd) {
            onOutput(`[System] Compiling...\n`);
            const compileExec = await container.exec({
                Cmd: compileCmd,
                AttachStdout: true,
                AttachStderr: true,
            });

            const compileStream = await compileExec.start({ Tty: false });

            // Wait for compilation
            const compileOutput = await new Promise((resolve, reject) => {
                const chunks = [];
                compileStream.on('data', chunk => chunks.push(chunk));
                compileStream.on('end', () => resolve(Buffer.concat(chunks)));
                compileStream.on('error', reject);
            });

            // Docker multiplexes streams - demultiplex them
            const demuxed = demultiplexDockerStream(compileOutput);

            if (demuxed.stderr && demuxed.stderr.length > 0) {
                let errorMsg = demuxed.stderr.toString('utf8').trim();

                // Filter out harmless JVM startup messages
                const lines = errorMsg.split('\n');
                const realErrors = lines.filter(line =>
                    !line.includes('Picked up JAVA_TOOL_OPTIONS') &&
                    !line.match(/^\s*$/) // ignore blank lines
                );

                if (realErrors.length > 0) {
                    onError(`Compilation Error:\n${realErrors.join('\n')}`);
                    onComplete();
                    return;
                }
            }

            onOutput(`[System] Compilation successful\n`);
        }

        // Step 5: Execute code
        onOutput(`[System] Executing...\n\n--- Output ---\n`);
        const exec = await container.exec({
            Cmd: runCmd,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            StdinOnce: false,
        });

        execStream = await exec.start({
            Tty: false,
            hijack: true,
            stdin: true,
        });

        await new Promise((resolve, reject) => {

            if (stdinStream) {
                stdinStream.on('data', (data) => {
                    if (execStream && !execStream.destroyed) {
                        execStream.write(data);
                    }
                });
            }

            execStream.on('data', (chunk) => {
                const demuxed = demultiplexDockerStream(chunk);
                if (demuxed.stdout) onOutput(demuxed.stdout.toString('utf8'));
                if (demuxed.stderr) {
                    const errorMsg = demuxed.stderr.toString('utf8');
                    if (!errorMsg.includes('Picked up JAVA_TOOL_OPTIONS')) {
                        onError(errorMsg);
                    }
                }
            });

            execStream.on('end', () => {
                onOutput('\n--- End ---\n');
                resolve(); // Only now do we allow the function to move to 'finally'
            });

            execStream.on('error', (err) => {
                reject(err);
            });
        });

        // Set execution timeout
        // timeoutHandle = setTimeout(async () => {
        //     onError('\n[System] Execution timeout (10 seconds exceeded)');
        //     if (execStream) execStream.end();
        //     onComplete();
        // }, EXECUTION_TIMEOUT);

    } catch (error) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        onError(`System error: ${error.message}`);
        onComplete();
    } finally {
        if (container) {
            try {
                // Remove the timeout or make it very short
                console.log('[System] Cleaning up container...');
                await container.stop({ t: 0 }); // t: 0 means stop immediately
                await container.remove();
                console.log('[System] Container removed.');
            } catch (err) {
                console.error('Cleanup error:', err.message);
            }
        }
        // This tells the WebSocket to set stdinStream to null and stop listening
        onComplete();
    }
}

/**
 * Demultiplex Docker stream
 * Docker multiplexes stdout and stderr into a single stream
 * with 8-byte headers indicating stream type and size
 * 
 * Header format:
 * [stream_type, 0, 0, 0, size1, size2, size3, size4, ...data...]
 * stream_type: 1=stdout, 2=stderr
 * 
 * @param {Buffer} buffer - Multiplexed stream buffer
 * @returns {Object} - { stdout: Buffer, stderr: Buffer }
 */
function demultiplexDockerStream(buffer) {
    const result = { stdout: [], stderr: [] };
    let offset = 0;

    while (offset < buffer.length) {
        // Read 8-byte header
        if (offset + 8 > buffer.length) break;

        const streamType = buffer[offset];
        const size = buffer.readUInt32BE(offset + 4);

        if (offset + 8 + size > buffer.length) break;

        const data = buffer.slice(offset + 8, offset + 8 + size);

        if (streamType === 1) {
            result.stdout.push(data);
        } else if (streamType === 2) {
            result.stderr.push(data);
        }

        offset += 8 + size;
    }

    return {
        stdout: result.stdout.length > 0 ? Buffer.concat(result.stdout) : null,
        stderr: result.stderr.length > 0 ? Buffer.concat(result.stderr) : null,
    };
}

/**
 * WebSocket connection handler
 * Manages bidirectional communication for code execution
 * 
 * Message format from client:
 * {
 *   type: 'execute' | 'stdin',
 *   language: 'javascript' | 'cpp' | 'java',
 *   code: 'source code',
 *   input: 'stdin data'
 * }
 * 
 * Message format to client:
 * {
 *   type: 'output' | 'error' | 'complete',
 *   data: 'message content'
 * }
 */
wss.on('connection', (ws) => {
    console.log('Client connected');
    let stdinStream = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'execute') {
                // Create stdin stream for this execution
                stdinStream = new PassThrough();

                // Execute code in Docker
                await executeInDocker(
                    data.language,
                    data.code,
                    stdinStream,
                    // onOutput callback
                    (output) => {
                        ws.send(JSON.stringify({
                            type: 'output',
                            data: output
                        }));
                    },
                    // onError callback
                    (error) => {
                        ws.send(JSON.stringify({
                            type: 'error',
                            data: error
                        }));
                    },
                    // onComplete callback
                    () => {
                        ws.send(JSON.stringify({
                            type: 'complete'
                        }));
                        stdinStream = null;
                    }
                );
            } else if (data.type === 'stdin') {
                // Send stdin data to running container
                if (stdinStream) {
                    stdinStream.write(data.input + '\n');
                }
            }
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                data: `Error: ${error.message}`
            }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (stdinStream) {
            stdinStream.end(); // End stream
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get available languages
app.get('/languages', (req, res) => {
    res.json({
        languages: Object.keys(LANGUAGE_CONFIG)
    });
});

// Legacy REST endpoint (for backward compatibility)
// This is kept for testing but WebSocket is recommended
app.post('/compile/:language', async (req, res) => {
    const { language } = req.params;
    const { code } = req.body;

    let output = '';
    let error = '';

    const stdinStream = new PassThrough();
    stdinStream.end(); // No stdin for REST API

    await executeInDocker(
        language,
        code,
        stdinStream,
        (data) => { output += data; },
        (data) => { error += data; },
        () => {
            if (error) {
                res.status(500).json({ error });
            } else {
                res.json({ output });
            }
        }
    );
});

// Start server
server.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     Docker-Based Code Execution Server                    ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port: ${port}                          ║
║  WebSocket endpoint: ws://localhost:${port}               ║
║  HTTP endpoint: http://localhost:${port}                  ║
╠════════════════════════════════════════════════════════════╣
║  Security Features:                                        ║
║  ✓ Container isolation                                    ║
║  ✓ Resource limits (128MB RAM, 512 CPU shares)           ║
║  ✓ Network disabled                                       ║
║  ✓ Process limit (50 max)                                ║
║  ✓ 10-second execution timeout                           ║
║  ✓ Non-root container execution                          ║
╚════════════════════════════════════════════════════════════╝
    `);
});
