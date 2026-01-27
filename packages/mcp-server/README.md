# Vaadin Documentation MCP Server

This package provides a Model Context Protocol (MCP) server for accessing Vaadin documentation via HTTP transport, allowing IDE assistants and developers to search for relevant Vaadin documentation using semantic search.

## Remote Access (HTTP Transport)

The MCP server is deployed and available remotely via HTTP transport:

**Production Server**: `https://mcp.vaadin.com/`

### Usage with MCP Clients

To connect to the remote MCP server, use the Streamable HTTP transport with the following endpoint:

```
https://mcp.vaadin.com/
```

Example client configuration:
```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://mcp.vaadin.com/")
);

const client = new Client({
  name: "vaadin-docs-client",
  version: "1.0.0"
});

await client.connect(transport);
```

## Health Check

The HTTP server provides a health check endpoint:

```
GET https://mcp.vaadin.com/health
```

Response:
```json
{
  "status": "ok",
  "server": "vaadin-mcp",
  "version": "0.7.3",
  "transport": "streamable-http"
}
```

## Available Tools

The MCP server provides the following tools:

### `get_vaadin_primer`
🚨 **Always use this tool FIRST** before working with Vaadin Flow or Hilla.
- **Description**: Returns a comprehensive primer document with current (2025+) information about modern Vaadin development
- **Parameters**: None
- **Purpose**: Addresses common AI misconceptions about Vaadin and provides up-to-date information about Flow vs Hilla, project structure, components, and best practices

### `search_vaadin_docs`
Search Vaadin documentation for relevant information about development, components, and best practices.
- **Parameters**:
  - `question` (required): The search query or question about Vaadin
  - `max_results` (optional): Maximum number of results to return (default: 5, range: 1-20)
  - `max_tokens` (optional): Maximum number of tokens to return (default: 1500, range: 100-5000)
  - `framework` (optional): Framework focus - "flow" for Java-based views, "hilla" for React-based views, or "" for both
- **Returns**: Search results with file_path information for complete document retrieval

### `get_full_document`
Retrieves complete documentation pages for comprehensive context.
- **Parameters**:
  - `file_path` (optional): Single file path from search results
  - `file_paths` (optional): Array of file paths for batch retrieval
- **Purpose**: Get complete context, examples, and cross-references beyond search result snippets
- **Note**: Use after `search_vaadin_docs` when you need full documentation context

### `get_vaadin_version`
Get the latest stable version of Vaadin Core from GitHub releases.
- **Parameters**: None
- **Returns**: JSON object with version and release timestamp
- **Purpose**: Useful for setting up new projects, checking for updates, or dependency management

## Configuration

### Environment Variables

The MCP server requires the following environment variables:

#### Required (Production)
- `PINECONE_API_KEY`: Your Pinecone API key for semantic search
- `PINECONE_INDEX`: Name of your Pinecone index (default: `vaadin-docs`)
- `OPENAI_API_KEY`: Your OpenAI API key for embeddings

#### Optional
- `HTTP_PORT`: HTTP server port (default: 8080)
- `AMPLITUDE_API_KEY`: Analytics tracking key (optional)
- `MOCK_PINECONE`: Set to `true` to use mock search for testing (default: false)
- `NODE_ENV`: Environment mode (`development` or `production`)

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your API keys:
   ```bash
   PINECONE_API_KEY=your_actual_key
   PINECONE_INDEX=vaadin-docs
   OPENAI_API_KEY=your_actual_key
   ```

3. For development/testing without Pinecone:
   ```bash
   MOCK_PINECONE=true
   ```

## Development

### Local Development

To contribute to this package:

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up environment variables (see Configuration above)
4. Make your changes
5. Build the package: `bun run build`
6. Test your changes:
   - **HTTP mode**: `bun run start:prod` (starts HTTP server on port 8080)
   - **Development mode**: `bun run start` (with hot reload)

### Testing the HTTP Server

The HTTP server runs on port 8080 by default. You can test it with:

```bash
# Health check
curl http://localhost:8080/health

# MCP initialization
curl -X POST http://localhost:8080/ \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {"tools": {}},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }'
```

### Deployment

The server is configured for deployment on Fly.io:

1. Install Fly CLI and authenticate:
   ```bash
   flyctl auth login
   ```

2. Set secrets (don't commit these!):
   ```bash
   fly secrets set PINECONE_API_KEY=your_key
   fly secrets set PINECONE_INDEX=vaadin-docs
   fly secrets set OPENAI_API_KEY=your_key
   fly secrets set AMPLITUDE_API_KEY=your_key
   ```

3. Deploy:
   ```bash
   fly deploy
   ```

Configuration files:
- `Dockerfile`: Multi-stage build with Bun runtime
- `fly.toml`: Fly.io configuration with health checks and environment variables

## Architecture

### Overview
The MCP server integrates search and document services directly, eliminating HTTP overhead from the previous architecture.

**Key Components:**
- **Transport**: Streamable HTTP (stateless mode)
- **Search Service**: Hybrid search using Pinecone (semantic + keyword) with reranking
- **Document Service**: Direct file system access to markdown documentation
- **State**: Stateless request handling with shared service instances

### Key Design Decisions
- Direct service calls to Pinecone/OpenAI (no HTTP intermediary)
- Single deployment on Fly.io
- Shared service instances initialized at startup
- Built with MCP TypeScript SDK v1.17.0

## License

MIT
