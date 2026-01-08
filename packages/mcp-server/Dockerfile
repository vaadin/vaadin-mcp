# Stage 1: Build markdown from docs
FROM oven/bun:latest AS markdown-builder
# Install git (required for cloning vaadin-docs)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Copy workspace configuration
COPY package.json ./package.json
# Copy core-types package (workspace dependency)
COPY packages/core-types/ ./packages/core-types/
# Copy asciidoc-converter package (including the vaadin-docs directory)
COPY packages/1-asciidoc-converter/ ./packages/1-asciidoc-converter/
# Install workspace dependencies
RUN bun install
# Build core-types first (required by asciidoc-converter)
WORKDIR /app/packages/core-types
RUN bun run build
# Build and run asciidoc-converter (vaadin-docs already copied, skip git clone)
WORKDIR /app/packages/1-asciidoc-converter
RUN bun run convert

# Stage 2: Build MCP server
FROM oven/bun:latest
WORKDIR /app
# Copy MCP server files
COPY packages/mcp-server/package.json ./package.json
COPY packages/mcp-server/tsconfig.json ./tsconfig.json
RUN bun install
COPY packages/mcp-server/src/ ./src/
RUN bun run build

# Copy markdown files from stage 1
COPY --from=markdown-builder /app/packages/1-asciidoc-converter/dist/markdown/ ./packages/1-asciidoc-converter/dist/markdown/

# Expose the port the server runs on (matching fly.toml internal_port)
EXPOSE 8080

# Start the server from built files
CMD ["bun", "run", "start:prod"]
