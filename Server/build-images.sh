#!/bin/bash
# Docker Image Build Script (Linux/Mac)
# This script builds all required Docker images for the code execution system

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Docker Code Runner - Image Builder                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
echo "[1/4] Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "✗ Error: Docker is not installed"
    echo "  Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "✗ Error: Docker daemon is not running"
    echo "  Please start Docker and try again"
    exit 1
fi

DOCKER_VERSION=$(docker --version)
echo "✓ Docker found: $DOCKER_VERSION"

echo ""
echo "[2/4] Building C++ Image..."
if docker build -f dockerfiles/Dockerfile.cpp -t coderunner-cpp:latest .; then
    echo "✓ C++ image built successfully"
else
    echo "✗ Failed to build C++ image"
    exit 1
fi

echo ""
echo "[3/4] Building Java Image..."
if docker build -f dockerfiles/Dockerfile.java -t coderunner-java:latest .; then
    echo "✓ Java image built successfully"
else
    echo "✗ Failed to build Java image"
    exit 1
fi

echo ""
echo "[4/4] Building JavaScript Image..."
if docker build -f dockerfiles/Dockerfile.javascript -t coderunner-js:latest .; then
    echo "✓ JavaScript image built successfully"
else
    echo "✗ Failed to build JavaScript image"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     All images built successfully!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Verifying images:"
docker images | grep coderunner

echo ""
echo "Next steps:"
echo "  1. Install dependencies: npm install"
echo "  2. Start backend: node index-docker.js"
echo "  3. Start frontend: cd ../frontend && npm run dev"
echo ""
