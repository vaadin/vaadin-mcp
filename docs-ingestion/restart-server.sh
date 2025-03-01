#!/bin/bash

# Restart script for Vaadin Documentation MCP Server
# This script restarts the MCP server running in the background

# Change to the project directory
cd "$(dirname "$0")"

echo "Restarting MCP server..."

# Stop the server if it's running
./stop-server.sh

# Start the server
./start-server.sh

echo "MCP server restarted"
