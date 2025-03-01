#!/bin/bash

# Start script for Vaadin Documentation MCP Server
# This script starts the MCP server as a background process
# 
# Usage:
# ./start-server.sh - Start the server with stdio transport
# ./start-server.sh --http - Start the server with HTTP transport
# ./start-server.sh --http --port=8080 - Start the server with HTTP transport on port 8080

# Change to the project directory
cd "$(dirname "$0")"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Using environment variables from the current shell."
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

# Check if HTTP transport is requested
HTTP_MODE=false
PORT_ARG=""

for arg in "$@"; do
  if [ "$arg" == "--http" ] || [ "$arg" == "-h" ]; then
    HTTP_MODE=true
  elif [[ "$arg" == --port=* ]] || [[ "$arg" == -p=* ]]; then
    PORT_ARG="$arg"
  fi
done

# Start the MCP server in the background
if [ "$HTTP_MODE" = true ]; then
  echo "Starting server with HTTP transport" | tee -a "$LOG_FILE"
  if [ -n "$PORT_ARG" ]; then
    echo "Using port from argument: $PORT_ARG" | tee -a "$LOG_FILE"
    nohup bun run src/index.ts --http "$PORT_ARG" > "$LOG_FILE" 2>&1 &
  else
    echo "Using default port" | tee -a "$LOG_FILE"
    nohup bun run src/index.ts --http > "$LOG_FILE" 2>&1 &
  fi
else
  echo "Starting server with stdio transport" | tee -a "$LOG_FILE"
  nohup bun run src/index.ts > "$LOG_FILE" 2>&1 &
fi

# Save the process ID
echo $! > "logs/server.pid"

echo "MCP server started with PID $(cat logs/server.pid)"
echo "Logs are being written to $LOG_FILE"
