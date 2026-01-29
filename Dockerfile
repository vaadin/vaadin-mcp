FROM oven/bun:1.3.6

WORKDIR /app

# Install git for cloning vaadin docs
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration
COPY package.json bun.lockb ./
COPY packages/core-types/package.json packages/core-types/
COPY packages/1-asciidoc-converter/package.json packages/1-asciidoc-converter/
COPY packages/mcp-server/package.json packages/mcp-server/

# Install dependencies
RUN bun install

# Copy source code
COPY packages/core-types/ packages/core-types/
COPY packages/1-asciidoc-converter/ packages/1-asciidoc-converter/
COPY packages/mcp-server/ packages/mcp-server/

# Build all packages
RUN bun run build

# Generate markdown documentation (clones vaadin docs repo and converts)
RUN cd packages/1-asciidoc-converter && bun run convert

WORKDIR /app/packages/mcp-server
EXPOSE 8080
CMD ["bun", "run", "start:prod"]
