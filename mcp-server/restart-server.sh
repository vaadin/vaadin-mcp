#!/bin/bash

# Restart script for Vaadin Documentation MCP Server
# This script restarts the MCP server running in the background
# 
# Usage:
# ./restart-server.sh - Restart the server with stdio transport
# ./restart-server.sh --http - Restart the server with HTTP transport
# ./restart-server.sh --http --port=8080 - Restart the server with HTTP transport on port 8080

# Change to the project directory
cd "$(dirname "$0")"

echo "Restarting MCP server..."

# Stop the server if it's running
./stop-server.sh

# Start the server with the same arguments
./start-server.sh "$@"

echo "MCP server restarted"
