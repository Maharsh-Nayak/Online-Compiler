# Java Sandbox Container
# Uses OpenJDK 17 (LTS) on minimal Alpine Linux

FROM eclipse-temurin:17-jdk-focal

# Create non-root user for security
# Running as non-root prevents privilege escalation attacks
RUN useradd -m -u 1000 -s /bin/bash coderunner && \
    mkdir -p /app && \
    chown coderunner:coderunner /app

# Set working directory
WORKDIR /app

# Switch to non-privileged user
USER coderunner

# Set Java options to limit heap size
# Prevents memory bombs
ENV JAVA_TOOL_OPTIONS="-Xmx128m -Xms32m"

# Default command - will be overridden during execution
CMD ["/bin/bash"]
