# Vaadin Documentation MCP Server

This MCP (Model Context Protocol) server provides access to Vaadin documentation through semantic search. It allows IDE assistants and developers to retrieve relevant documentation for their tasks.

## Features

- Semantic search of Vaadin documentation
- Control over the number of results and token limits
- Integration with IDE assistants through the Model Context Protocol
- HTTP/SSE transport for remote access without requiring API keys

## Prerequisites

- [Bun](https://bun.sh/) runtime
- OpenAI API key
- Pinecone API key and index (populated with Vaadin documentation)

## Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd vaadin-docs-mcp-server
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
   # OpenAI API key for embeddings
   OPENAI_API_KEY=your_openai_api_key
   
   # Pinecone API key and index name
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX=your_pinecone_index_name
   ```

## Standalone Deployment

This MCP server can be deployed independently from the ingestion pipeline. Both services share the same Pinecone database, but can run on different machines or in different directories.

### Directory Structure

For a standalone deployment, you can use the following directory structure:

```
/path/to/vaadin-docs-mcp-server/  # MCP server directory
  ├── src/                        # Server source code
  ├── .env                        # Environment variables
  ├── package.json                # Dependencies
  ├── run.sh                      # Run script
  └── ...

/path/to/vaadin-docs-ingestion/   # Ingestion pipeline directory (separate)
  ├── src/                        # Ingestion source code
  ├── .env                        # Environment variables
  └── ...
```

### Running the Server

You can run the MCP server in several ways:

#### Using the run script

```bash
# Make the script executable
chmod +x run.sh

# Run the MCP server with stdio transport
./run.sh server

# Run the MCP server with HTTP transport
./run.sh server --http
```

#### Running directly

```bash
# Run the server with stdio transport
bun run src/index.ts

# Run the server with HTTP transport
bun run start:http
```

#### Running as a background process

```bash
# Make the scripts executable
chmod +x start-server.sh stop-server.sh server-status.sh

# Start the server in the background (stdio transport)
./start-server.sh

# Start the server in the background with HTTP transport
./start-server.sh --http

# Check the status of the server
./server-status.sh

# Restart the server
./restart-server.sh

# Stop the server
./stop-server.sh
```

When running as a background process, the server logs will be written to the logs directory. The server-status.sh script provides information about the server's uptime and process ID. You can view the logs using the view-logs.sh script:

```bash
# View available log files
./view-logs.sh

# View a specific log file
./view-logs.sh server-2025-03-01.log

# Clean up log files
./clean-logs.sh

# Check if all required environment variables are set
./check-env.sh

# Check the Pinecone index status
./run.sh check-pinecone
```

When running with stdio transport, the server will listen on stdio for MCP requests.
When running with HTTP transport, the server will start an HTTP server and listen for MCP requests over HTTP/SSE.

## MCP Integration

### Local Integration

To use this server locally with an MCP-compatible client, add it to your MCP settings file:

```json
{
  "mcpServers": {
    "vaadin-docs": {
      "command": "bun",
      "args": ["/path/to/vaadin-docs-mcp-server/src/index.ts"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key",
        "PINECONE_API_KEY": "your_pinecone_api_key",
        "PINECONE_INDEX": "your_pinecone_index_name"
      }
    }
  }
}
```

### Remote Integration

For remote integration, you can deploy the server to a cloud provider and access it over HTTP. This way, end users don't need to provide their own API keys or set up a server.

1. Deploy the server to a cloud provider (e.g., AWS, Google Cloud, Heroku)
2. Set the required environment variables on the server:
   - `OPENAI_API_KEY`
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX`
   - `HTTP_PORT` (optional, defaults to 3000)

3. Start the server with HTTP transport:
   ```bash
   bun run start:http:prod
   ```

4. Connect to the server using the MCP client's HTTP/SSE transport:
   ```typescript
   import { Client } from '@modelcontextprotocol/sdk/client/index.js';
   import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

   const transport = new SSEClientTransport({
     sseUrl: 'https://your-server-url.com/sse',
     postUrl: 'https://your-server-url.com/messages',
   });

   const client = new Client(
     {
       name: 'example-client',
       version: '1.0.0',
     },
     {
       capabilities: {
         tools: {},
       },
     }
   );

   await client.connect(transport);
   ```

## Available Tools

### search_vaadin_docs

Search Vaadin documentation for relevant information.

**Parameters:**
- `query` (required): The search query or question about Vaadin
- `max_results` (optional): Maximum number of results to return (default: 5, range: 1-20)
- `max_tokens` (optional): Maximum number of tokens to return (default: 1500, range: 100-5000)

**Example:**
```json
{
  "query": "How to use domain primitives in Vaadin?",
  "max_results": 3,
  "max_tokens": 1000
}
```

## Project Structure

- `src/index.ts` - Main MCP server implementation
- `src/config.ts` - Configuration settings
- `src/pinecone-service.ts` - Pinecone integration for semantic search

## License

[MIT](LICENSE)
