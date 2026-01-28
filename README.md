# Online Compiler - Docker-Based Sandboxed Execution

A production-grade online code compiler with **Docker-based sandboxing** for secure execution of untrusted code. Features real-time output streaming, interactive stdin support, and comprehensive resource isolation.

**[Live link](https://online-compiler-eta-three.vercel.app/)** _(Original version)_

## 🚀 Features

- **🔒 Secure Execution** - Code runs in isolated Docker containers
- **⚡ Real-time Streaming** - See output as it's generated
- **💬 Interactive stdin** - Support for user input during execution
- **🛡️ Resource Limits** - 128MB RAM, 10-second timeout, 50 process limit
- **🌐 Network Isolation** - No internet access from user code
- **🎨 Multi-Language** - JavaScript, Java, C++
- **🧹 Auto-Cleanup** - Containers destroyed after each execution

## 🏗️ Architecture

- **Frontend**: React 19 + Vite + Monaco Editor + WebSocket
- **Backend**: Node.js + Express + Dockerode + WebSocket Server
- **Execution**: Docker containers with security hardening

## 📦 Quick Start

### 1. Build Docker Images
```powershell
cd Server
.\build-images.ps1
```

### 2. Start Backend
```powershell
npm install
node index-docker.js
```

### 3. Start Frontend
```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and start coding!

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get running in 3 steps
- **[DOCKER-SETUP.md](DOCKER-SETUP.md)** - Complete setup guide with security explanations
- **[EXECUTION-FLOW.md](EXECUTION-FLOW.md)** - Visual flow diagrams and architecture
- **[BEFORE-AFTER.md](BEFORE-AFTER.md)** - System transformation comparison

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| **Container Isolation** | Each execution in ephemeral container |
| **Memory Limit** | 128MB hard limit (prevents memory bombs) |
| **CPU Limit** | 512 CPU shares (50% of 1 core) |
| **Process Limit** | Max 50 processes (prevents fork bombs) |
| **Network Disabled** | No internet access (prevents data exfiltration) |
| **Execution Timeout** | 10-second hard limit (prevents infinite loops) |
| **Non-root User** | Containers run as unprivileged user |
| **Auto-Cleanup** | Containers destroyed immediately after execution |

## 🎯 Use Cases

- **Education** - Safe environment for students to practice coding
- **Coding Challenges** - Run untrusted submissions securely
- **Interview Platforms** - Execute candidate code safely
- **Prototyping** - Quick testing without local setup
- **Demonstrations** - Live code examples in presentations

## 🛠️ Tech Stack

- React 19.0 + Vite
- Monaco Editor (VS Code engine)
- Node.js + Express
- Dockerode (Docker API)
- WebSocket (ws)
- Docker Engine

## 📖 Learn More

This project demonstrates:
- Docker containerization and security
- Real-time WebSocket communication
- Binary stream processing
- Resource isolation techniques
- Secure code execution patterns

Perfect for learning about production-grade sandboxed execution systems!

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Add more languages (Python, Go, Rust)
- Implement user authentication
- Add execution queue system
- Rate limiting and abuse prevention
- Kubernetes deployment guide

## 📄 License

MIT License - Free to use and modify

---

**Built with ❤️ using Docker, Node.js, and React**