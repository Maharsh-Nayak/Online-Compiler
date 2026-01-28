# JavaScript/Node.js Sandbox Container
FROM node:20-alpine

# The 'node' image already has a user 'node' with UID 1000.
# We will rename it to 'coderunner' to keep your naming convention 
# without clashing with the existing UID.
RUN sed -i 's/node/coderunner/g' /etc/passwd && \
    sed -i 's/node/coderunner/g' /etc/group && \
    mkdir -p /app && \
    chown -R coderunner:coderunner /app

# Set working directory
WORKDIR /app

# Switch to the now-renamed non-privileged user
USER coderunner

# Limit Node.js memory usage to prevent "Memory Bombs"
# This tells the V8 engine to trigger GC before it hits the container limit
ENV NODE_OPTIONS="--max-old-space-size=128"

# Default command
CMD ["/bin/sh"]