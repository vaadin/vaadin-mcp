#!/bin/bash

# Clean logs script for Vaadin Documentation Ingestion Pipeline
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

# Ask for confirmation
echo "This will delete all log files in the logs directory."
echo "Available log files:"
ls -1 logs/
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
