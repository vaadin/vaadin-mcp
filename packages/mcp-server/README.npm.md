# Vaadin Documentation MCP Server

This package provides a Model Context Protocol (MCP) server for accessing Vaadin documentation. It allows IDE assistants and developers to search for relevant Vaadin documentation using semantic search.

## Installation

You don't need to install this package directly. It's designed to be used with IDE assistants that support the Model Context Protocol.

## Usage with IDE Assistants

To use with IDE assistants that support the Model Context Protocol, add the following configuration to your IDE assistant's MCP settings:

### Using npx (Recommended)

```json
{
  "mcpServers": {
    "vaadin": {
      "command": "npx",
      "args": [
        "-y",
        "vaadin-docs-mcp-server"
      ]
    }
  }
}
```

This will automatically download and run the latest version of the package without requiring a global installation.

### Optional Configuration

You can optionally override the REST server URL for local development:

```json
{
  "mcpServers": {
    "vaadin": {
      "command": "npx",
      "args": [
        "-y",
        "vaadin-docs-mcp-server"
      ],
      "env": {
        "REST_SERVER_URL": "http://localhost:3001"
      }
    }
  }
}
```

The default REST server URL points to the production server, so you typically don't need to override it unless you're running a local development server.

## Available Tools

The MCP server provides the following tool:

- `search_vaadin_docs`: Search Vaadin documentation for relevant information
  - Parameters:
    - `question` (required): The search query or question about Vaadin
    - `max_results` (optional): Maximum number of results to return (default: 5)
    - `max_tokens` (optional): Maximum number of tokens to return (default: 1500)
    - `framework` (optional): The Vaadin framework to focus on: "flow" for Java-based views, "hilla" for React-based views, or empty string for both (default: "")

## Development

To contribute to this package:

1. Clone the repository
2. Install dependencies: `bun install`
3. Make your changes
4. Build the package: `bun run build`
5. Test your changes: `bun run start`

## License

MIT
