# C++ Sandbox Container
# Uses minimal Alpine Linux with GCC compiler

FROM gcc:13-bookworm AS builder

# Create a minimal runtime image
FROM debian:bookworm-slim

# Install only essential C++ runtime libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    g++ \
    libstdc++6 && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user for security
# Running as non-root prevents privilege escalation attacks
RUN useradd -m -u 1000 -s /bin/bash coderunner && \
    mkdir -p /app && \
    chown coderunner:coderunner /app

# Set working directory
WORKDIR /app

# Switch to non-privileged user
USER coderunner

# Default command - will be overridden during execution
CMD ["/bin/bash"]
