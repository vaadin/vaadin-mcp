#!/bin/bash

# Check environment variables script for Vaadin Documentation Ingestion Pipeline
# This script checks if all the required environment variables are set

# Change to the project directory
cd "$(dirname "$0")"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Using environment variables from the current shell."
fi

# Check OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ OPENAI_API_KEY is not set"
else
  echo "✅ OPENAI_API_KEY is set"
fi

# Check Pinecone API key
if [ -z "$PINECONE_API_KEY" ]; then
  echo "❌ PINECONE_API_KEY is not set"
else
  echo "✅ PINECONE_API_KEY is set"
fi

# Check Pinecone index
if [ -z "$PINECONE_INDEX" ]; then
  echo "❌ PINECONE_INDEX is not set"
else
  echo "✅ PINECONE_INDEX is set"
fi

# Check if all required environment variables are set
if [ -z "$OPENAI_API_KEY" ] || [ -z "$PINECONE_API_KEY" ] || [ -z "$PINECONE_INDEX" ]; then
  echo ""
  echo "❌ Some required environment variables are not set."
  echo "Please set them in the .env file or in your shell environment."
  echo ""
  echo "Example .env file:"
  echo "OPENAI_API_KEY=your_openai_api_key"
  echo "PINECONE_API_KEY=your_pinecone_api_key"
  echo "PINECONE_INDEX=your_pinecone_index_name"
  exit 1
else
  echo ""
  echo "✅ All required environment variables are set."
  exit 0
fi
