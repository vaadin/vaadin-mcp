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
ENV HTTP_PORT=8080

# Expose the port
EXPOSE 8080

# Run the application in HTTP mode
CMD ["bun", "run", "src/index.ts", "--http", "--port=8080"]
