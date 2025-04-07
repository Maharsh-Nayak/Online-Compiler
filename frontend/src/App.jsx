import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { FaPlay, FaTrash, FaCode, FaTerminal, FaCog } from 'react-icons/fa'
import './App.css'
import axios from 'axios'

function App() {
  const [code, setCode] = useState('// Write your code here')
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [theme, setTheme] = useState('vs-dark')

  const defaultCode = {
    javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'
  }

  const handleEditorChange = (value) => {
    setCode(value)
  }

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value
    setLanguage(newLanguage)
    setCode(defaultCode[newLanguage])
  }

  const handleRunCode = async () => {
    setIsLoading(true)
    try {

      const res = await axios.post(`http://localhost:5000/compile/${language}`, { code });
      const data = res.data;

      if(res.status === 200) {
        setOutput(data.output)
      } else {
        setOutput('Error: ' + data.error)
      }

    } catch (error) {
      setOutput('Error: ' + error.message)
    }
    setIsLoading(false)
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
            <button 
              onClick={handleRunCode} 
              className="action-button run-button"
              disabled={isLoading}
            >
              <FaPlay /> {isLoading ? 'Running...' : 'Run Code'}
            </button>
            <button 
              onClick={handleClearCode} 
              className="action-button clear-button"
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
            </div>
            <div className="output-wrapper">
              <pre className="output-content">
                {output || 'Output will appear here...'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
