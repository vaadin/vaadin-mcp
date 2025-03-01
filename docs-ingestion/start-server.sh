#!/bin/bash

# Start script for Vaadin Documentation MCP Server
# This script starts the MCP server as a background process

# Change to the project directory
cd "$(dirname "$0")"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Please create one with the required environment variables."
  exit 1
fi

# Check for required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo "OPENAI_API_KEY environment variable is required"
  exit 1
fi

if [ -z "$PINECONE_API_KEY" ]; then
  echo "PINECONE_API_KEY environment variable is required"
  exit 1
fi

if [ -z "$PINECONE_INDEX" ]; then
  echo "PINECONE_INDEX environment variable is required"
  exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Log file
LOG_FILE="logs/server-$(date +%Y-%m-%d).log"

echo "Starting Vaadin Documentation MCP Server at $(date)" | tee -a "$LOG_FILE"

# Start the MCP server in the background
cd mcp-server && nohup bun run src/index.ts > "../$LOG_FILE" 2>&1 &

# Save the process ID
echo $! > "../logs/server.pid"

echo "MCP server started with PID $(cat ../logs/server.pid)"
echo "Logs are being written to $LOG_FILE"
