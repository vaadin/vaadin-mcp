FROM oven/bun:1.3.6

WORKDIR /app

# Copy package.json first for better Docker layer caching
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY src/ src/

# Build the application
RUN bun run build

# Expose the port the server runs on (matching fly.toml internal_port)
EXPOSE 8080

# Start the server from built files
CMD ["bun", "run", "start:prod"]