# Vaadin Documentation REST Server

This server provides a REST API for searching Vaadin documentation. It's designed to work with the MCP server, which forwards search requests to this server.

## Features

- Exposes a `/search` endpoint for querying documentation
- Provides an `/ask` endpoint for AI-generated answers to Vaadin questions
- Connects to Pinecone vector database for semantic search
- Handles parameter validation and error handling
- Returns search results in JSON format

## Prerequisites

- [Bun](https://bun.sh/) runtime
- OpenAI API key (for embeddings and AI answers)
- Pinecone API key and index

## Installation

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set up environment variables:
   ```bash
   # Create .env file
   echo "OPENAI_API_KEY=your_openai_api_key" > .env
   echo "PINECONE_API_KEY=your_pinecone_api_key" >> .env
   echo "PINECONE_INDEX=your_pinecone_index" >> .env
   echo "REST_PORT=3001" >> .env
   ```

## Usage

Start the server:
```bash
bun run src/index.ts
```

## API Endpoints

### Health Check

```
GET /health
```

Returns the server status and version information.

### Search Documentation

```
POST /search
```

**Request Body:**
```json
{
  "question": "How to create a Vaadin Grid",
  "max_results": 5,
  "max_tokens": 1500
}
```

**Parameters:**
- `question` (required): The search query or question about Vaadin
- `max_results` (optional): Maximum number of results to return (default: 5)
- `max_tokens` (optional): Maximum number of tokens to return (default: 1500)

**Response:**
```json
{
  "results": [
    {
      "text": "Documentation content...",
      "metadata": {
        "title": "Grid",
        "source": "vaadin/docs",
        "url": "https://vaadin.com/docs/latest/components/grid",
        "heading": "Creating a Grid"
      },
      "score": 0.92
    },
    ...
  ]
}
```

### Ask Question

```
POST /ask
```

**Request Body:**
```json
{
  "question": "How do I create a Vaadin Grid component?",
  "stream": false
}
```

**Parameters:**
- `question` (required): The question about Vaadin development
- `stream` (optional): Boolean flag to enable streaming response (default: false)

**Response (non-streaming):**
```json
{
  "answer": "To create a Vaadin Grid component, you need to first import the Grid class. Here's a basic example:\n\n```java\nGrid<Person> grid = new Grid<>(Person.class);\ngrid.setItems(personList);\ngrid.addColumn(Person::getName).setHeader(\"Name\");\ngrid.addColumn(Person::getAge).setHeader(\"Age\");\n```\n\nThis creates a Grid that displays Person objects with Name and Age columns."
}
```

**Response (streaming):**
The endpoint returns a stream of Server-Sent Events (SSE) with the following format:

```
data: {"content":"To create a Vaadin Grid component"}

data: {"content":", you need to first import the Grid class"}

data: {"content":"."}

...

data: [DONE]
```

When streaming is enabled:
1. The response is sent as a stream of Server-Sent Events
2. Each event contains a chunk of the answer
3. The stream ends with a `data: [DONE]` event

The endpoint internally:
1. Searches for 5 relevant documentation snippets related to the question
2. Uses OpenAI to generate a comprehensive answer based on the documentation
3. Returns the generated answer to the client (either as a complete JSON response or as a stream)

### Get Vaadin Version

```
GET /vaadin-version
```

Returns the latest stable Vaadin version from GitHub releases.

**Response:**
```json
{
  "version": "24.8.4",
  "released": "2025-07-22T09:01:33Z"
}
```

**Parameters:** None

This endpoint queries the GitHub API to get the latest release from the [Vaadin platform repository](https://github.com/vaadin/platform), ensuring accurate version information even when patch releases for older versions are published later.

## Error Handling

The server returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Missing or invalid parameters
- `500 Internal Server Error`: Server-side errors

## Configuration

The server can be configured through environment variables:

- `REST_PORT`: Port to run the server on (default: 3001)
- `OPENAI_API_KEY`: OpenAI API key for embeddings and AI answers
- `PINECONE_API_KEY`: Pinecone API key
- `PINECONE_INDEX`: Pinecone index name
