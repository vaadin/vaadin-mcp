# Vaadin Documentation MCP Server

This server provides access to Vaadin documentation through the Model Context Protocol (MCP). It allows IDE assistants and developers to search for relevant documentation.

## Prerequisites

- [Bun](https://bun.sh/) runtime
- OpenAI API key
- Pinecone API key and index

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index_name
```

## Installation

```bash
bun install
```

## Usage

### Starting the Server

To start the server in the foreground:

```bash
bun run start
```

## Development

The server is implemented in TypeScript and uses the MCP SDK to provide a search tool for Vaadin documentation. The server forwards search requests to a REST server that handles the actual search logic.

### Project Structure

- `src/index.ts`: Main server implementation
- `src/config.ts`: Configuration settings
- `src/pinecone-service.ts`: Pinecone service interface

