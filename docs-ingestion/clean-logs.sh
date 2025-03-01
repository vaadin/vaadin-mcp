#!/bin/bash

# Clean logs script for Vaadin Documentation Ingestion Pipeline and MCP Server
# This script cleans up old log files in the logs directory

# Change to the project directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if there are any log files
if [ -z "$(ls -A logs/ 2>/dev/null)" ]; then
  echo "No log files found"
  exit 0
fi

# Check if the server is running
if [ -f logs/server.pid ]; then
  PID=$(cat logs/server.pid)
  
  # Check if the process is still running
  if ps -p $PID > /dev/null; then
    echo "MCP server is running with PID $PID"
    echo "Cannot clean logs while the server is running"
    echo "Please stop the server first with ./stop-server.sh"
    exit 1
  fi
fi

# Ask for confirmation
echo "This will delete all log files in the logs directory."
echo "Available log files:"
ls -1 logs/ | grep -v "\.pid$"
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Delete all log files
  rm -f logs/*.log
  echo "All log files have been deleted"
else
  echo "Operation cancelled"
fi
