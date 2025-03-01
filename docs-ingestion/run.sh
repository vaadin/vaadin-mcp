#!/bin/bash

# Run script for Vaadin Documentation Ingestion Pipeline
# This script sets up the environment variables and runs the ingestion pipeline

# Usage:
# ./run.sh ingest - Run the ingestion pipeline
# ./run.sh view-logs - View available log files
# ./run.sh view-logs <file> - View a specific log file
# ./run.sh clean-logs - Clean up log files
# ./run.sh check-env - Check if all required environment variables are set
# ./run.sh check-pinecone - Check the Pinecone index status

# Check if the command is provided
if [ $# -eq 0 ]; then
  echo "Usage: ./run.sh [ingest|view-logs|clean-logs|check-env|check-pinecone]"
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
fi

# Run the specified command
case "$1" in
  ingest)
    echo "Running ingestion pipeline..."
    bun run src/index.ts
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
    echo "Usage: ./run.sh [ingest|view-logs|clean-logs|check-env|check-pinecone]"
    exit 1
    ;;
esac
