FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Expose the port the server runs on
EXPOSE 3001

# Start the server
CMD ["bun", "run", "start"]
