# Vaadin Documentation MCP Server

This package provides a Model Context Protocol (MCP) server for accessing Vaadin documentation via HTTP transport, allowing IDE assistants and developers to search for relevant Vaadin documentation using semantic search.

## Remote Access (HTTP Transport)

The MCP server is deployed and available remotely via HTTP transport:

**Production Server**: `https://vaadin-mcp.fly.dev/mcp`

### Usage with MCP Clients

To connect to the remote MCP server, use the Streamable HTTP transport with the following endpoint:

```
https://vaadin-mcp.fly.dev/mcp
```

Example client configuration:
```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://vaadin-mcp.fly.dev/mcp")
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
GET https://vaadin-mcp.fly.dev/health
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

## Development

### Local Development

To contribute to this package:

1. Clone the repository
2. Install dependencies: `bun install`
3. Make your changes
4. Build the package: `bun run build`
5. Test your changes:
   - **HTTP mode**: `bun run start:prod` (starts HTTP server on port 8080)

### Testing the HTTP Server

The HTTP server runs on port 8080 by default. You can test it with:

```bash
# Health check
curl http://localhost:8080/health

# MCP initialization
curl -X POST http://localhost:8080/mcp \
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

The server is configured for deployment on Fly.io with:
- `Dockerfile`: Multi-stage build with Bun runtime
- `fly.toml`: Fly.io configuration with health checks
- Environment variables: `HTTP_PORT`, `REST_SERVER_URL`

## Architecture

- **Transport**: Streamable HTTP transport
- **State**: Stateless design - each request creates a new server instance for isolation
- **Backend**: Forwards search requests to the REST server at `https://vaadin-docs-search.fly.dev`
- **SDK**: Built with MCP TypeScript SDK v1.17.0

## License

MIT
