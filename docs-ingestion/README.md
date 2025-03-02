# Vaadin Documentation Ingestion Pipeline

This project provides a pipeline for ingesting Vaadin documentation from the official GitHub repository into a Pinecone vector database. The ingested documentation can then be used for semantic search and retrieval through the separate MCP (Model Context Protocol) server.

## Features

- Clones or pulls the latest Vaadin documentation from GitHub
- Parses AsciiDoc files with custom front matter
- Processes AsciiDoc content to HTML
- Implements a hierarchical chunking strategy
- Generates embeddings using OpenAI's text-embedding-3-small model
- Stores embeddings and metadata in Pinecone
- Handles incremental updates by replacing documents from the same source

## Prerequisites

- [Bun](https://bun.sh/) runtime
- OpenAI API key
- Pinecone API key and index

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
   
   # Claude API key (only needed for the example script)
   CLAUDE_API_KEY=your_claude_api_key
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
bun run ingest
```

The ingestion pipeline will:
1. Clone or pull the latest Vaadin documentation
2. Process all AsciiDoc files
3. Generate embeddings
4. Store them in Pinecone

## Configuration

You can modify the configuration in `src/config.ts` to adjust:

- GitHub repository settings
- OpenAI settings (model, batch size, rate limiting)
- Pinecone settings (batch size, rate limiting)
- Chunking settings
- Metadata settings

## Project Structure

- `src/index.ts` - Main entry point for the ingestion pipeline
- `src/config.ts` - Configuration settings
- `src/docs-repository.ts` - Documentation repository operations
- `src/metadata-parser.ts` - Front matter parsing
- `src/asciidoc-processor.ts` - AsciiDoc processing
- `src/chunking.ts` - Document chunking strategy
- `src/embeddings.ts` - OpenAI embedding generation
- `src/pinecone.ts` - Pinecone integration


## License

[MIT](LICENSE)
