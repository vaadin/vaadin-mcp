# Vaadin Documentation Ingestion Pipeline

This project provides a pipeline for ingesting Vaadin documentation from the official GitHub repository into a Pinecone vector database. The ingested documentation can then be used for semantic search and retrieval through an MCP (Model Context Protocol) server.

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
   - Pod Type: Choose based on your performance/cost needs

## Usage

You can use the provided run script to run the ingestion pipeline, MCP server, or example:

```bash
# Make the script executable
chmod +x run.sh

# Run the ingestion pipeline
./run.sh ingest

# Run the MCP server
./run.sh server

# Start the MCP server as a background process
./run.sh start-server

# Check the status of the MCP server
./run.sh server-status

# Restart the MCP server
./run.sh restart-server

# Stop the MCP server running in the background
./run.sh stop-server

# View available log files
./run.sh view-logs

# View a specific log file
./run.sh view-logs <filename>

# Clean up log files
./run.sh clean-logs

# Check if all required environment variables are set
./run.sh check-env

# Check the Pinecone index status
./run.sh check-pinecone

# Run the Claude example
./run.sh example
```

Alternatively, you can run the commands directly:

```bash
# Run the ingestion pipeline
bun run src/index.ts

# Run the MCP server
cd mcp-server && bun run src/index.ts

# Run the Claude example
bun run examples/claude-example.ts
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

- `src/index.ts` - Main entry point
- `src/config.ts` - Configuration settings
- `src/git-operations.ts` - GitHub repository operations
- `src/metadata-parser.ts` - Front matter parsing
- `src/asciidoc-processor.ts` - AsciiDoc processing
- `src/chunking.ts` - Document chunking strategy
- `src/embeddings.ts` - OpenAI embedding generation
- `src/pinecone.ts` - Pinecone integration

## Scheduling

A daily update script is provided to make it easy to set up a cron job:

```bash
# Make the script executable
chmod +x update-daily.sh

# Test the script
./update-daily.sh
```

To set up a cron job to run the script daily:

```bash
# Edit crontab
crontab -e

# Add a line to run the script daily at 2 AM
0 2 * * * cd /path/to/vaadin-docs-ingestion && ./update-daily.sh
```

The script will:
1. Load environment variables from the .env file
2. Run the ingestion pipeline
3. Log the output to a date-stamped log file in the logs directory (e.g., logs/update-2025-03-01.log)

## MCP Server

This project also includes an MCP (Model Context Protocol) server that provides access to the Vaadin documentation through semantic search. The MCP server allows IDE assistants and developers to retrieve relevant documentation for their tasks.

### MCP Server Setup

1. Navigate to the MCP server directory:
   ```bash
   cd mcp-server
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   ```bash
   export OPENAI_API_KEY=your_openai_api_key
   export PINECONE_API_KEY=your_pinecone_api_key
   export PINECONE_INDEX=your_pinecone_index_name
   ```

4. Run the MCP server:

   You can run the server directly:
   ```bash
   bun run src/index.ts
   ```
   
   Or use the provided scripts to run the server as a background process:
   ```bash
   # Make the scripts executable
   chmod +x start-server.sh stop-server.sh
   
   # Start the server in the background
   ./start-server.sh
   
   # Stop the server
   ./stop-server.sh
   ```
   
   The server logs will be written to the logs directory.

### MCP Integration

To use this server with an MCP-compatible client, add it to your MCP settings file:

```json
{
  "mcpServers": {
    "vaadin-docs": {
      "command": "bun",
      "args": ["/path/to/vaadin-docs-ingestion/mcp-server/src/index.ts"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key",
        "PINECONE_API_KEY": "your_pinecone_api_key",
        "PINECONE_INDEX": "your_pinecone_index_name"
      }
    }
  }
}
```

### Available Tools

The MCP server provides the following tools:

#### search_vaadin_docs

Search Vaadin documentation for relevant information.

**Parameters:**
- `query` (required): The search query or question about Vaadin
- `max_results` (optional): Maximum number of results to return (default: 5, range: 1-20)
- `max_tokens` (optional): Maximum number of tokens to return (default: 1500, range: 100-5000)

For more details, see the [MCP Server README](mcp-server/README.md).

## License

[MIT](LICENSE)
