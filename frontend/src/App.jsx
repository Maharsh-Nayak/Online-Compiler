import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { FaPlay, FaTrash, FaCode, FaTerminal, FaCog, FaStop, FaPaperPlane } from 'react-icons/fa'
import './App.css'

function App() {
  const [code, setCode] = useState('// Write your code here')
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [theme, setTheme] = useState('vs-dark')
  const [stdinInput, setStdinInput] = useState('')
  const [showStdinInput, setShowStdinInput] = useState(false)

  const wsRef = useRef(null)
  const outputRef = useRef(null)

  const defaultCode = {
    javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'
  }

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const connectWebSocket = () => {
    const wsUrl = 'ws://localhost:5000'

    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log('WebSocket connected')
      setOutput((prev) => prev + '[System] Connected to execution server\n\n')
    }

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (message.type === 'output') {
        setOutput((prev) => prev + message.data)
      } else if (message.type === 'error') {
        setOutput((prev) => prev + '❌ ' + message.data + '\n')
      } else if (message.type === 'complete') {
        setIsRunning(false)
        setShowStdinInput(false)
        setOutput((prev) => prev + '\n[System] Execution completed\n')
      }
    }

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      setOutput((prev) => prev + '[System] Connection error. Make sure backend is running.\n')
    }

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected')
      setOutput((prev) => prev + '[System] Disconnected from server\n')

      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connectWebSocket()
        }
      }, 3000)
    }
  }

  const handleEditorChange = (value) => {
    setCode(value)
  }

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value
    setLanguage(newLanguage)
    setCode(defaultCode[newLanguage])
  }

  const handleRunCode = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setOutput('[System] Not connected to server. Please wait...\n')
      return
    }

    setIsRunning(true)
    setShowStdinInput(true)
    setOutput('')

    wsRef.current.send(JSON.stringify({
      type: 'execute',
      language: language,
      code: code
    }))
  }

  const handleStopExecution = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
      setIsRunning(false)
      setShowStdinInput(false)
      setOutput((prev) => prev + '\n[System] Execution stopped by user\n')

      setTimeout(connectWebSocket, 500)
    }
  }

  const handleSendInput = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && stdinInput) {
      wsRef.current.send(JSON.stringify({
        type: 'stdin',
        input: stdinInput
      }))

      setOutput((prev) => prev + stdinInput + '\n')
      setStdinInput('')
    }
  }

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendInput()
    }
  }

  const handleClearCode = () => {
    setCode(defaultCode[language])
    setOutput('')
  }

  const toggleTheme = () => {
    setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="logo-container">
          <FaCode className="logo-icon" />
          <h1>CodeLab</h1>
        </div>
        <div className="sidebar-controls">
          <div className="control-group">
            <label>Language</label>
            <select 
              value={language} 
              onChange={handleLanguageChange}
              className="language-select"
            >
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          <div className="control-group">
            <label>Theme</label>
            <button onClick={toggleTheme} className="theme-toggle">
              <FaCog /> {theme === 'vs-dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>
      </div>

      <div className="main-area">
        <div className="toolbar">
          <div className="toolbar-title">
            <FaCode className="toolbar-icon" />
            <span>Online Compiler</span>
          </div>
          <div className="toolbar-actions">
            {!isRunning ? (
              <button 
                onClick={handleRunCode} 
                className="action-button run-button"
              >
                <FaPlay /> Run Code
              </button>
            ) : (
              <button 
                onClick={handleStopExecution} 
                className="action-button stop-button"
              >
                <FaStop /> Stop
              </button>
            )}
            <button 
              onClick={handleClearCode} 
              className="action-button clear-button"
              disabled={isRunning}
            >
              <FaTrash /> Clear
            </button>
          </div>
        </div>

        <div className="workspace">
          <div className="editor-pane">
            <div className="pane-header">
              <FaCode className="pane-icon" />
              <span>Code Editor</span>
            </div>
            <div className="editor-wrapper">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                language={language}
                value={code}
                onChange={handleEditorChange}
                theme={theme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                  formatOnPaste: true,
                  formatOnType: true,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: 'on',
                  tabCompletion: 'on',
                  wordBasedSuggestions: true,
                  parameterHints: {
                    enabled: true
                  }
                }}
              />
            </div>
          </div>

          <div className="output-pane">
            <div className="pane-header">
              <FaTerminal className="pane-icon" />
              <span>Output</span>
              {isRunning && <span className="running-indicator">● Running</span>}
            </div>
            <div className="output-wrapper" ref={outputRef}>
              <pre className="output-content">
                {output || 'Output will appear here...\n\nFeatures:\n• Real-time streaming output\n• Interactive stdin support\n• Secure Docker isolation\n• 10-second timeout\n• 128MB memory limit'}
              </pre>
            </div>
            
            {showStdinInput && (
              <div className="stdin-input-container">
                <input
                  type="text"
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                  onKeyPress={handleInputKeyPress}
                  placeholder="Type input and press Enter..."
                  className="stdin-input"
                  autoFocus
                />
                <button 
                  onClick={handleSendInput} 
                  className="send-button"
                  disabled={!stdinInput}
                >
                  <FaPaperPlane /> Send
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
