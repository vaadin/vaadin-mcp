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

# Build the application
WORKDIR /app/packages/rest-server
RUN bun run build

# Expose the port the server runs on
EXPOSE 3001

# Start the server from built files
CMD ["bun", "run", "start"]
