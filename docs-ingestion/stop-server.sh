#!/bin/bash

# Stop script for Vaadin Documentation MCP Server
# This script stops the MCP server running in the background

# Change to the project directory
cd "$(dirname "$0")"

# Check if the server is running
if [ ! -f logs/server.pid ]; then
  echo "MCP server is not running (no PID file found)"
  exit 0
fi

# Get the process ID
PID=$(cat logs/server.pid)

# Check if the process is still running
if ! ps -p $PID > /dev/null; then
  echo "MCP server is not running (PID $PID not found)"
  rm logs/server.pid
  exit 0
fi

# Stop the process
echo "Stopping MCP server with PID $PID..."
kill $PID

# Wait for the process to stop
for i in {1..10}; do
  if ! ps -p $PID > /dev/null; then
    echo "MCP server stopped"
    rm logs/server.pid
    exit 0
  fi
  echo "Waiting for server to stop... ($i/10)"
  sleep 1
done

# Force kill if still running
if ps -p $PID > /dev/null; then
  echo "Force stopping MCP server with PID $PID..."
  kill -9 $PID
  rm logs/server.pid
fi

echo "MCP server stopped"
