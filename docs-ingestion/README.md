# Vaadin Documentation Ingestion Pipeline

This project provides a pipeline for ingesting Vaadin documentation from the official GitHub repository into a Pinecone vector database. The ingested documentation can then be used for semantic search and retrieval through the separate MCP (Model Context Protocol) server or REST API server.

## Features

- Clones or pulls the latest Vaadin documentation from GitHub
- Parses AsciiDoc files with custom front matter
- Processes AsciiDoc content to Markdown using a custom approach:
  - Processing includes before conversion
  - Uses asciidoctor.js to handle conditionals and other directives
  - Converts to Markdown using downdoc
- Implements a semantic chunking strategy based on heading structure:
  - Preserves semantic units by keeping entire sections together
  - Chunks based on h2 level headings
  - Preserves document title and introduction as the first chunk
  - Maintains context by including document title in each chunk
  - Never breaks up code blocks
- Generates embeddings using OpenAI's text-embedding-3-small model
- Stores embeddings and metadata in Pinecone
- Handles incremental updates by replacing documents from the same source
- Includes rate limiting and error handling for API calls

## Prerequisites

- [Bun](https://bun.sh/) runtime
- OpenAI API key
- Pinecone API key and index
- Git (for cloning the documentation repository)

## Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd vaadin-docs-ingestion
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your API keys:
   ```bash
   # OpenAI API key for generating embeddings
   OPENAI_API_KEY=your_openai_api_key
   
   # Pinecone API key and index name
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX=your_pinecone_index_name
   ```

## Pinecone Setup

Before running the ingestion pipeline, you need to set up a Pinecone index:

1. Create a Pinecone account at [https://www.pinecone.io/](https://www.pinecone.io/)
2. Create a new index with the following configuration:
   - Dimensions: 1536 (for text-embedding-3-small model)
   - Metric: Cosine
   - Pod Type: Choose based on your performance/cost needs (serverless works well)

## Usage

You can run the ingestion pipeline directly:

```bash
# Run the ingestion pipeline
bun run src/index.ts
```

The ingestion pipeline will:
1. Clone or pull the latest Vaadin documentation
2. Process all AsciiDoc files (excluding those matching skip patterns)
3. Generate embeddings
4. Store them in Pinecone

For testing and development purposes, you can also use:

```bash
# Test the AsciiDoc processing with a sample document
bun run src/test-processing.ts

# Display chunks from the building-apps directory without storing them
bun run src/display-chunks.ts
```

## Configuration

You can modify the configuration in `src/config.ts` to adjust:

- GitHub repository settings:
  - Repository URL
  - Local path for cloning
  - Articles path within the repository
  - Skip patterns for files to exclude
- OpenAI settings:
  - Model (default: text-embedding-3-small)
  - Batch size for API calls
  - Rate limiting delay between batches
- Pinecone settings:
  - Batch size for upserts
  - Rate limiting delay between batches
- AsciiDoc processor settings:
  - Safety level
  - Attributes for conditional content

## Project Structure

- `src/index.ts` - Main entry point for the ingestion pipeline
- `src/config.ts` - Configuration settings
- `src/docs-repository.ts` - Documentation repository operations (clone, pull, file listing)
- `src/metadata-parser.ts` - Front matter parsing and metadata enhancement
- `src/asciidoc-processor.ts` - AsciiDoc processing with include handling
- `src/chunking.ts` - Semantic document chunking strategy
- `src/embeddings.ts` - OpenAI embedding generation with rate limiting
- `src/pinecone.ts` - Pinecone integration for storing and retrieving embeddings
- `src/test-processing.ts` - Test script for the AsciiDoc processing pipeline

## How It Works

### AsciiDoc Processing

The pipeline uses a custom approach to handle AsciiDoc files:

1. First, it manually processes includes using a recursive function that resolves paths and handles tag directives
2. Then it uses asciidoctor.js to handle conditionals and other directives
3. Finally, it converts the processed AsciiDoc to Markdown using downdoc

This approach addresses the limitation of downdoc, which doesn't support includes and would otherwise omit them.

### Chunking Strategy

The chunking strategy is designed to preserve semantic meaning:

1. The first chunk contains the document title (h1) and introduction paragraph
2. Subsequent chunks are created based on h2 level headings
3. Each chunk includes the document title to maintain context
4. Code blocks are never split across chunks

### Metadata Handling

The pipeline extracts and enhances metadata:

1. Parses custom front matter from AsciiDoc files
2. Enhances metadata with source information
3. Generates direct Vaadin docs URLs
4. Adds processing timestamps

### Incremental Updates

To support incremental updates:

1. Before storing new chunks from a source, existing documents from the same source are deleted
2. This ensures that updates to documentation replace older versions rather than duplicating them

## License

[MIT](LICENSE)
