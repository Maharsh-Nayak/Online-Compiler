const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    // proxy: 'http://localhost:5173'
    proxy : "https://vercel.com/maharshs-projects-50474920/online-compiler/8s4N2dLgmGz8gfM58nA54DCQ2yvj"
}));
app.use(bodyParser.json());

function createTempFile(language, code) {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const fileName = `${uuidv4()}.${language}`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, code);
    return { fileName, filePath, tempDir };
}

function cleanupTempFiles(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error cleaning up file:', error);
    }
}

app.post('/compile/cpp', (req, res) => {
    const { code } = req.body;
    const { fileName, filePath, tempDir } = createTempFile('cpp', code);

    const compileCommand = `g++ ${filePath} -o ${path.join(tempDir, fileName.replace('.cpp', ''))}`;
    exec(compileCommand, (error, stdout, stderr) => {
        if (error) {
            cleanupTempFiles(filePath);
            return res.status(500).json({ error: 'Compilation error' });
        }

        const executablePath = path.join(tempDir, fileName.replace('.cpp', ''));
        const runCommand = executablePath;
        exec(runCommand, (error, stdout, stderr) => {
            cleanupTempFiles(filePath);
            cleanupTempFiles(executablePath);
            if (error) {
                return res.status(500).json({ error: stderr || error.message });
            }
            return res.json({ output: stdout });
        })
    })
});

app.post('/compile/java', (req, res) => {
    const { code } = req.body;

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    
    // Extract class name from Java code
    const classNameMatch = code.match(/public\s+class\s+(\w+)/);
    if (!classNameMatch) {
        cleanupTempFiles(filePath);
        return res.status(400).json({ error: 'Java code must contain a public class' });
    }
    
    const className = classNameMatch[1];
    const fileName = `${className}.java`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, code);
    
    // Compile Java code
    const compileCommand = `javac ${filePath}`;
    exec(compileCommand, (compileError, compileStdout, compileStderr) => {
        if (compileError) {
            cleanupTempFiles(filePath);
            return res.status(500).json({ error: compileStderr || compileError.message });
        }
        
        // Execute compiled Java class
        const runCommand = `java -cp ${tempDir} ${className}`;
        exec(runCommand, (error, stdout, stderr) => {
            cleanupTempFiles(filePath);
            cleanupTempFiles(path.join(tempDir, `${className}.class`));
            
            if (error) {
                return res.status(500).json({ error: stderr || error.message });
            }
            
            return res.json({ output: stdout || 'Code executed successfully with no output' });
        });
    });
});

app.post('/compile/javascript', (req, res) => {
    const { code } = req.body;
    const { fileName, filePath, tempDir } = createTempFile('js', code);

    const runCommand = `node ${filePath}`;
    exec(runCommand, (error, stdout, stderr) => {
        if(error){
            cleanupTempFiles(filePath);
            return res.status(500).json({ error: stderr || error.message });
        }

        return res.json({ output: stdout });
    })
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


