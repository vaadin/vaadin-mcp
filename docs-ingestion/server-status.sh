#!/bin/bash

# Status script for Vaadin Documentation MCP Server
# This script checks if the MCP server is running

# Change to the project directory
cd "$(dirname "$0")"

# Check if the server is running
if [ ! -f logs/server.pid ]; then
  echo "MCP server is not running (no PID file found)"
  exit 1
fi

# Get the process ID
PID=$(cat logs/server.pid)

# Check if the process is still running
if ! ps -p $PID > /dev/null; then
  echo "MCP server is not running (PID $PID not found)"
  rm logs/server.pid
  exit 1
fi

# Get the uptime of the process
if [ "$(uname)" == "Darwin" ]; then
  # macOS
  START_TIME=$(ps -p $PID -o lstart= | xargs -0 date -jf "%a %b %d %T %Y" "+%s")
  CURRENT_TIME=$(date +%s)
  UPTIME=$((CURRENT_TIME - START_TIME))
else
  # Linux
  UPTIME=$(ps -p $PID -o etimes= | tr -d ' ')
fi

# Format uptime
DAYS=$((UPTIME / 86400))
HOURS=$(( (UPTIME % 86400) / 3600 ))
MINUTES=$(( (UPTIME % 3600) / 60 ))
SECONDS=$((UPTIME % 60))

# Display status
echo "MCP server is running with PID $PID"
echo "Uptime: ${DAYS}d ${HOURS}h ${MINUTES}m ${SECONDS}s"
echo "Log file: logs/server-$(date +%Y-%m-%d).log"

exit 0
