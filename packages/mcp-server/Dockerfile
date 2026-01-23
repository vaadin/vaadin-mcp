FROM oven/bun:1.3.6

WORKDIR /app

# Copy workspace configuration
COPY package.json bun.lockb ./
COPY packages/mcp-server/package.json packages/mcp-server/

# Install all workspace dependencies
RUN bun install

# Copy mcp-server source code
COPY packages/mcp-server/ packages/mcp-server/

# Copy converted markdown files for component API tools
COPY packages/1-asciidoc-converter/dist/markdown/ packages/1-asciidoc-converter/dist/markdown/

# Build the application
WORKDIR /app/packages/mcp-server
RUN bun run build

# Expose the port the server runs on (matching fly.toml internal_port)
EXPOSE 8080

# Start the server from built files
CMD ["bun", "run", "start:prod"]