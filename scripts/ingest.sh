#!/bin/bash
#
# Vaadin Documentation Ingestion Script
#
# This script processes Vaadin documentation through the full pipeline:
# 1. Convert AsciiDoc to Markdown
# 2. Generate embeddings and upload to Pinecone
#
# Environment variables:
#   OPENAI_API_KEY    - Required for embedding generation
#   PINECONE_API_KEY  - Required for vector storage
#   PINECONE_INDEX    - Optional, defaults to 'vaadin-docs'
#
# Usage:
#   ./scripts/ingest.sh                    # Process v24 and v25
#   ./scripts/ingest.sh --clear            # Clear index first, then process both versions
#   ./scripts/ingest.sh --version 24       # Process only v24
#   ./scripts/ingest.sh --version 25       # Process only v25
#   ./scripts/ingest.sh --version 24 --clear  # Clear index and process only v24
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env file if it exists (before setting defaults)
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a  # automatically export all variables
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Default values
CLEAR_INDEX=false
SINGLE_VERSION=""
VERSIONS="24 25"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clear)
            CLEAR_INDEX=true
            shift
            ;;
        --version)
            SINGLE_VERSION="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --clear           Clear Pinecone index before processing"
            echo "  --version <ver>   Process only specified version (24 or 25)"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  OPENAI_API_KEY    Required for embedding generation"
            echo "  PINECONE_API_KEY  Required for vector storage"
            echo "  PINECONE_INDEX    Optional, defaults to 'vaadin-docs'"
            echo ""
            echo "Examples:"
            echo "  $0                          # Process v24 and v25"
            echo "  $0 --clear                  # Clear index and process both"
            echo "  $0 --version 24             # Process only v24"
            echo "  $0 --version 25 --clear     # Clear and process only v25"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# If single version specified, use only that
if [[ -n "$SINGLE_VERSION" ]]; then
    VERSIONS="$SINGLE_VERSION"
fi

# Validate environment variables
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Vaadin Documentation Ingestion Pipeline${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Validating environment...${NC}"

MISSING_VARS=false

if [[ -z "$OPENAI_API_KEY" ]]; then
    echo -e "${RED}ERROR: OPENAI_API_KEY is not set${NC}"
    MISSING_VARS=true
fi

if [[ -z "$PINECONE_API_KEY" ]]; then
    echo -e "${RED}ERROR: PINECONE_API_KEY is not set${NC}"
    MISSING_VARS=true
fi

if [[ "$MISSING_VARS" = true ]]; then
    echo ""
    echo "Required environment variables:"
    echo "  export OPENAI_API_KEY='your-api-key'"
    echo "  export PINECONE_API_KEY='your-api-key'"
    echo "  export PINECONE_INDEX='vaadin-docs'  # optional"
    exit 1
fi

# Set defaults
export PINECONE_INDEX="${PINECONE_INDEX:-vaadin-docs}"

echo -e "${GREEN}Environment validated${NC}"
echo ""
echo "Configuration:"
echo "  Versions to process: $VERSIONS"
echo "  Clear index: $CLEAR_INDEX"
echo "  Pinecone index: $PINECONE_INDEX"
echo "  Timestamp: $TIMESTAMP"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Ensure dependencies are installed and built
echo -e "${YELLOW}Installing dependencies...${NC}"
bun install --silent

echo -e "${YELLOW}Building packages...${NC}"
# Only build packages needed for ingestion (skip mcp-server which may have unrelated issues)
bun run --filter='core-types' build
bun run --filter='1-asciidoc-converter' build
bun run --filter='2-embedding-generator' build

# Track if this is the first version (for clearing index)
FIRST_VERSION=true

# Process each version
for VERSION in $VERSIONS; do
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Processing Vaadin v$VERSION${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    # Create log directories
    CONVERTER_LOG_DIR="$PROJECT_ROOT/packages/1-asciidoc-converter/logs"
    GENERATOR_LOG_DIR="$PROJECT_ROOT/packages/2-embedding-generator/logs"
    mkdir -p "$CONVERTER_LOG_DIR" "$GENERATOR_LOG_DIR"
    
    # Step 1: Convert AsciiDoc to Markdown
    echo ""
    echo -e "${YELLOW}Step 1: Converting AsciiDoc to Markdown (v$VERSION)...${NC}"
    
    cd "$PROJECT_ROOT/packages/1-asciidoc-converter"
    CONVERSION_LOG="$CONVERTER_LOG_DIR/asciidoc_conversion_v${VERSION}_${TIMESTAMP}.log"
    
    if bun run convert --version "$VERSION" 2>&1 | tee "$CONVERSION_LOG"; then
        echo -e "${GREEN}✅ AsciiDoc conversion completed for v$VERSION${NC}"
    else
        echo -e "${RED}❌ AsciiDoc conversion failed for v$VERSION${NC}"
        echo "Check log: $CONVERSION_LOG"
        exit 1
    fi
    
    # Step 2: Generate embeddings and upload to Pinecone
    echo ""
    echo -e "${YELLOW}Step 2: Generating embeddings (v$VERSION)...${NC}"
    
    cd "$PROJECT_ROOT/packages/2-embedding-generator"
    EMBEDDING_LOG="$GENERATOR_LOG_DIR/embedding_generation_v${VERSION}_${TIMESTAMP}.log"
    
    # Set version-specific markdown directory
    export MARKDOWN_DIR="$PROJECT_ROOT/packages/1-asciidoc-converter/dist/markdown/v$VERSION"
    
    # Determine if we should clear the index
    CLEAR_FLAG=""
    if [[ "$CLEAR_INDEX" = true && "$FIRST_VERSION" = true ]]; then
        CLEAR_FLAG="--clear"
        echo -e "${YELLOW}🗑️ Clearing index before first version${NC}"
    fi
    
    if bun run generate $CLEAR_FLAG 2>&1 | tee "$EMBEDDING_LOG"; then
        echo -e "${GREEN}✅ Embedding generation completed for v$VERSION${NC}"
    else
        echo -e "${RED}❌ Embedding generation failed for v$VERSION${NC}"
        echo "Check log: $EMBEDDING_LOG"
        exit 1
    fi
    
    FIRST_VERSION=false
done

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Ingestion Pipeline Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Processed versions: $VERSIONS"
echo "Logs saved to:"
echo "  - packages/1-asciidoc-converter/logs/"
echo "  - packages/2-embedding-generator/logs/"

