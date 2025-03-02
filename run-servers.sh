#!/bin/bash

# Run Vaadin Documentation Servers
# This script starts both the REST server and the MCP server

# Check for required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: OPENAI_API_KEY environment variable is required"
  exit 1
fi

if [ -z "$PINECONE_API_KEY" ]; then
  echo "Error: PINECONE_API_KEY environment variable is required"
  exit 1
fi

if [ -z "$PINECONE_INDEX" ]; then
  echo "Error: PINECONE_INDEX environment variable is required"
  exit 1
fi

# Start the REST server in the background
echo "Starting REST server..."
cd rest-server && bun run src/index.ts &
REST_PID=$!

# Wait for REST server to start
sleep 2

# Start the MCP server
echo "Starting MCP server..."
cd mcp-server && bun run src/index.ts

# If MCP server exits, kill the REST server
kill $REST_PID
