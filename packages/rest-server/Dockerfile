FROM oven/bun:latest

WORKDIR /app

# Copy workspace configuration
COPY package.json bun.lockb ./
COPY packages/core-types/ packages/core-types/
COPY packages/rest-server/package.json packages/rest-server/

# Install all workspace dependencies
RUN bun install

# Copy rest-server source code
COPY packages/rest-server/ packages/rest-server/

# Copy converted markdown files for document endpoint (includes v24/ and v25/ subdirs)
COPY packages/1-asciidoc-converter/dist/markdown/ packages/1-asciidoc-converter/dist/markdown/

# Verify markdown structure
RUN echo "Markdown directory structure:" && ls -la packages/1-asciidoc-converter/dist/markdown/ || echo "Warning: markdown dir may be empty"

# Build the application
WORKDIR /app/packages/rest-server
RUN bun run build

# Expose the port the server runs on (matching fly.toml internal_port)
EXPOSE 8080

# Start the server from built files
CMD ["bun", "run", "start:prod"]
