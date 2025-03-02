FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Run the ingestion script
CMD ["bun", "run", "ingest"]
