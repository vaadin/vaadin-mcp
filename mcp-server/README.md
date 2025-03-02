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

To start the server in the background:

```bash
bun run start:background
```

### Managing the Server

Check server status:

```bash
bun run status
```

Stop the server:

```bash
bun run stop
```

Restart the server:

```bash
bun run restart
```

### Managing Logs

List available log files:

```bash
bun run logs
```

View a specific log file:

```bash
bun run logs:view server-2025-03-01.log
```

Clean up log files:

```bash
bun run logs:clean
```

### Checking Environment

Check if all required environment variables are set:

```bash
bun run check:env
```

Check Pinecone index status:

```bash
bun run check:pinecone
```

## Development

The server is implemented in TypeScript and uses the MCP SDK to provide a search tool for Vaadin documentation. The server forwards search requests to a REST server that handles the actual search logic.

### Project Structure

- `src/index.ts`: Main server implementation
- `src/config.ts`: Configuration settings
- `src/pinecone-service.ts`: Pinecone service interface
- `check-pinecone.ts`: Script to check Pinecone index status

### Adding New Tools

To add a new tool to the server, modify the `setupToolHandlers` method in `src/index.ts`.
