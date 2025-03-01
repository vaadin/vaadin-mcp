#!/bin/bash

# Run script for Vaadin Documentation Ingestion Pipeline and MCP Server
# This script sets up the environment variables and runs the ingestion pipeline and MCP server

# Usage:
# ./run.sh ingest - Run the ingestion pipeline
# ./run.sh server - Run the MCP server
# ./run.sh start-server - Start the MCP server as a background process
# ./run.sh stop-server - Stop the MCP server running in the background
# ./run.sh restart-server - Restart the MCP server running in the background
# ./run.sh server-status - Check if the MCP server is running
# ./run.sh view-logs - View available log files
# ./run.sh view-logs <file> - View a specific log file
# ./run.sh clean-logs - Clean up log files
# ./run.sh check-env - Check if all required environment variables are set
# ./run.sh check-pinecone - Check the Pinecone index status
# ./run.sh example - Run the Claude example

# Check if the command is provided
if [ $# -eq 0 ]; then
  echo "Usage: ./run.sh [ingest|server|start-server|stop-server|restart-server|server-status|view-logs|clean-logs|check-env|check-pinecone|example]"
  exit 1
fi

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Using default environment variables..."
  # Set default environment variables
  # Replace these with your actual API keys and index name
  export OPENAI_API_KEY="your_openai_api_key"
  export PINECONE_API_KEY="your_pinecone_api_key"
  export PINECONE_INDEX="your_pinecone_index_name"
  export CLAUDE_API_KEY="your_claude_api_key"
fi

# Run the specified command
case "$1" in
  ingest)
    echo "Running ingestion pipeline..."
    bun run src/index.ts
    ;;
  server)
    echo "Running MCP server..."
    cd mcp-server && bun run src/index.ts
    ;;
  start-server)
    echo "Starting MCP server as a background process..."
    ./start-server.sh
    ;;
  stop-server)
    echo "Stopping MCP server..."
    ./stop-server.sh
    ;;
  server-status)
    echo "Checking MCP server status..."
    ./server-status.sh
    ;;
  restart-server)
    echo "Restarting MCP server..."
    ./restart-server.sh
    ;;
  view-logs)
    if [ $# -eq 2 ]; then
      echo "Viewing log file: $2"
      ./view-logs.sh "$2"
    else
      echo "Viewing available log files..."
      ./view-logs.sh
    fi
    ;;
  clean-logs)
    echo "Cleaning up log files..."
    ./clean-logs.sh
    ;;
  check-env)
    echo "Checking environment variables..."
    ./check-env.sh
    ;;
  check-pinecone)
    echo "Checking Pinecone index status..."
    bun run check-pinecone.ts
    ;;
  example)
    echo "Running Claude example..."
    bun run examples/claude-example.ts
    ;;
  *)
    echo "Unknown command: $1"
    echo "Usage: ./run.sh [ingest|server|start-server|stop-server|restart-server|server-status|view-logs|clean-logs|check-env|check-pinecone|example]"
    exit 1
    ;;
esac
