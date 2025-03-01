#!/bin/bash

# Daily update script for Vaadin Documentation Ingestion Pipeline
# This script is designed to be run as a cron job to update the Vaadin documentation daily

# Change to the project directory
cd "$(dirname "$0")"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Please create one with the required environment variables."
  exit 1
fi

# Check for required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo "OPENAI_API_KEY environment variable is required"
  exit 1
fi

if [ -z "$PINECONE_API_KEY" ]; then
  echo "PINECONE_API_KEY environment variable is required"
  exit 1
fi

if [ -z "$PINECONE_INDEX" ]; then
  echo "PINECONE_INDEX environment variable is required"
  exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Log file
LOG_FILE="logs/update-$(date +%Y-%m-%d).log"

echo "Starting Vaadin documentation update at $(date)" | tee -a "$LOG_FILE"

# Run the ingestion pipeline
bun run src/index.ts 2>&1 | tee -a "$LOG_FILE"

# Check if the ingestion was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "Vaadin documentation update completed successfully at $(date)" | tee -a "$LOG_FILE"
else
  echo "Vaadin documentation update failed at $(date)" | tee -a "$LOG_FILE"
  exit 1
fi
