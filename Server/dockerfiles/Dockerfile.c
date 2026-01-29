# Dockerfile for C code execution
FROM gcc:latest

# Create non-root user for security
RUN useradd -m -u 1000 coderunner

# Create working directory
WORKDIR /app
RUN chown coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Keep container running
CMD ["/bin/sh"]
