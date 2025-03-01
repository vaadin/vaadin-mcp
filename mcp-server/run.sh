#!/bin/bash

# Run script for Vaadin Documentation MCP Server
# This script sets up the environment variables and runs the MCP server

# Usage:
# ./run.sh server [--http] [--port=<port>] - Run the MCP server (with optional HTTP transport)
# ./run.sh start-server [--http] [--port=<port>] - Start the MCP server as a background process
# ./run.sh stop-server - Stop the MCP server running in the background
# ./run.sh restart-server [--http] [--port=<port>] - Restart the MCP server running in the background
# ./run.sh server-status - Check if the MCP server is running
# ./run.sh view-logs - View available log files
# ./run.sh view-logs <file> - View a specific log file
# ./run.sh clean-logs - Clean up log files
# ./run.sh check-env - Check if all required environment variables are set
# ./run.sh check-pinecone - Check the Pinecone index status

# Check if the command is provided
if [ $# -eq 0 ]; then
  echo "Usage: ./run.sh [server|start-server|stop-server|restart-server|server-status|view-logs|clean-logs|check-env|check-pinecone]"
  echo "For server and start-server, you can add --http to use HTTP transport and --port=<port> to specify the port."
  exit 1
fi

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Using environment variables from the current shell."
fi

# Run the specified command
case "$1" in
  server)
    echo "Running MCP server..."
    # Pass all arguments after the first one to the server
    if [[ "$*" == *"--http"* ]]; then
      echo "Using HTTP transport"
      bun run src/index.ts "${@:2}"
    else
      bun run src/index.ts
    fi
    ;;
  start-server)
    echo "Starting MCP server as a background process..."
    # Pass all arguments after the first one to the start-server script
    ./start-server.sh "${@:2}"
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
    # Pass all arguments after the first one to the restart-server script
    ./restart-server.sh "${@:2}"
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
  *)
    echo "Unknown command: $1"
    echo "Usage: ./run.sh [server|start-server|stop-server|restart-server|server-status|view-logs|clean-logs|check-env|check-pinecone]"
    echo "For server and start-server, you can add --http to use HTTP transport and --port=<port> to specify the port."
    exit 1
    ;;
esac
