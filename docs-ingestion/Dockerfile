FROM oven/bun:1.0

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN bun install --production

# Copy the rest of the application
COPY . .

# Create directory for logs
RUN mkdir -p logs

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["bun", "run", "src/index.ts"]
