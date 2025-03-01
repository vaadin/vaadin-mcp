#!/bin/bash

# View logs script for Vaadin Documentation Ingestion Pipeline
# This script displays the logs for the ingestion pipeline

# Change to the project directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if a specific log file is specified
if [ $# -eq 1 ]; then
  LOG_FILE="logs/$1"
  
  # Check if the log file exists
  if [ ! -f "$LOG_FILE" ]; then
    echo "Log file $LOG_FILE not found"
    echo "Available log files:"
    ls -1 logs/
    exit 1
  fi
  
  # Display the log file
  echo "Displaying log file: $LOG_FILE"
  cat "$LOG_FILE"
  exit 0
fi

# Check if there are any log files
if [ -z "$(ls -A logs/ 2>/dev/null)" ]; then
  echo "No log files found"
  exit 1
fi

# List available log files
echo "Available log files:"
ls -1 logs/

echo ""
echo "To view a specific log file, run:"
echo "  ./view-logs.sh <log-file-name>"
