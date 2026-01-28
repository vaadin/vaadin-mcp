# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Vaadin Documentation RAG (Retrieval-Augmented Generation) system built as a Model Context Protocol (MCP) server. It provides intelligent search and retrieval over Vaadin documentation with hierarchical awareness, framework filtering (Flow vs Hilla), and multi-version support (Vaadin 24 and 25).

**Key Components:**
- **MCP Server**: HTTP-based MCP server providing tools for documentation search, component API access, and version info
- **AsciiDoc Converter**: Converts Vaadin AsciiDoc docs to Markdown with metadata extraction and framework detection
- **Embedding Generator**: Generates vector embeddings from Markdown and stores in Pinecone with hierarchical chunking
- **Core Types**: Shared TypeScript interfaces across all packages

**Architecture:** Bun workspace monorepo with TypeScript packages using dependency injection and clean architecture patterns.

## Build Commands

### Initial Setup
```bash
bun install
bun run build
```

### Development Workflow
```bash
# Build all packages (core-types first, then others)
bun run build

# Run tests across all packages
bun run test

# Run MCP server locally
bun run start:mcp

# Test individual packages
cd packages/mcp-server && bun run test
cd packages/1-asciidoc-converter && bun run test
cd packages/2-embedding-generator && bun run test
```

### Documentation Ingestion Pipeline
```bash
# Ingest Vaadin 24 documentation
bun run ingest:v24

# Ingest Vaadin 25 documentation
bun run ingest:v25

# Ingest all versions (runs v24 then v25)
bun run ingest:all
```

### MCP Server Testing
```bash
cd packages/mcp-server

# Run all tests
bun run test:all

# Run document-based integration tests
bun run test

# Run component API tests
bun run test:component-api

# Start server for development
bun run start

# Start built server (production mode)
bun run start:prod
```

### Package-Specific Commands
```bash
# AsciiDoc Converter
cd packages/1-asciidoc-converter
bun run convert                    # Convert all versions
bun run convert -- --version 24    # Convert v24 only
bun run convert -- --version 25    # Convert v25 only
bun run test                       # Run framework detection tests

# Embedding Generator
cd packages/2-embedding-generator
bun run generate -- --version 24   # Generate embeddings for v24
bun run generate -- --version 25   # Generate embeddings for v25
bun run generate -- --clear        # Clear index before generating
bun run test                       # Run chunking tests
```

## Architecture

### Monorepo Structure
```
packages/
├── core-types/              # Shared TypeScript interfaces
├── 1-asciidoc-converter/    # AsciiDoc → Markdown + metadata
├── 2-embedding-generator/   # Markdown → Pinecone vectors
└── mcp-server/              # MCP HTTP server
```

### Data Flow Pipeline

**Step 1: Documentation Processing**
1. **AsciiDoc Converter** clones Vaadin docs repo, converts AsciiDoc to Markdown
   - Detects framework (Flow/Hilla/common) via file paths and tags
   - Generates proper Vaadin.com URLs
   - Extracts metadata to YAML frontmatter
   - Output: `packages/1-asciidoc-converter/dist/markdown/v{version}/`

2. **Embedding Generator** processes Markdown into vector embeddings
   - Hierarchical chunking using `MarkdownHeaderTextSplitter` from LangChain
   - Generates OpenAI embeddings
   - Stores in Pinecone with metadata (framework, version, file_path, etc.)
   - Also populates sparse index for keyword search

**Step 2: MCP Server Runtime**
- **Hybrid Search**: Combines semantic (dense) + keyword (sparse) search with Pinecone's native reranking
- **Document Service**: Retrieves full Markdown files by file_path
- **Component API Tools**: Access component APIs (Java, React, Web Component, Styling)
- **Version Tools**: Get latest Vaadin version and component lists by version

### MCP Server Architecture (`packages/mcp-server/`)

**Entry Point**: `src/index.ts` - Express server with Streamable HTTP MCP transport

**Services** (`src/services/`):
- `search/hybrid-search-service.ts`: Enhanced hybrid search combining semantic + keyword with reranking
- `search/pinecone-sparse-provider.ts`: Keyword search using Pinecone sparse vectors
- `document/document-service.ts`: Full document retrieval from Markdown files

**Tools** (`src/tools/`):
- `search-and-docs/`: `search_vaadin_docs` and `get_full_document` tools
- `component-api/`: Component API tools (Java, React, Web Component, Styling)
- `get-components-by-version/`: List components by Vaadin version
- `vaadin-version/`: Get latest Vaadin version from GitHub
- `vaadin-primer/`: Comprehensive Vaadin development primer
- `landing-page/`: HTML landing page for browser access

**Tool Registration Pattern**:
- Each tool has a `handlers.ts` with tool implementation
- Handlers are imported and registered in `index.ts` via `server.setRequestHandler`
- Tools use Zod schemas for parameter validation

### Multi-Version Support

The system supports multiple Vaadin versions (currently 24 and 25):
- **Converter**: Uses `VERSION_BRANCHES` config to map versions to git branches
- **Storage**: Markdown stored in `v{version}/` directories
- **Search**: `vaadin_version` metadata enables version-specific filtering
- **Required Parameter**: All version-sensitive tools require `vaadin_version` parameter

### Framework Detection

**Flow vs Hilla Detection** (`packages/1-asciidoc-converter/src/framework-detector.ts`):
- **Flow**: Java-based, files in `/flow/` or with `:hilla: false` tag
- **Hilla**: React-based, files in `/hilla/` or with `:hilla: true` tag
- **Common**: Shared content, no specific framework markers

Detection logic:
1. Check AsciiDoc tags (`:hilla: true/false`)
2. Check file path patterns (`/flow/`, `/hilla/`)
3. Default to 'common' if no clear indicators

### Search Implementation

**Hybrid Search Strategy** (`packages/mcp-server/src/services/search/hybrid-search-service.ts`):
1. **Query Preprocessing**: Extract keywords, remove stopwords
2. **Parallel Search**: Semantic (dense vectors) + Keyword (sparse vectors)
3. **Native Reranking**: Uses Pinecone's bge-reranker-v2-m3
4. **Result Merging**: Combines and deduplicates results
5. **Metadata Filtering**: Framework and version filtering

**Search Filters**:
- `framework`: 'flow', 'hilla', or 'common' (common content included in all searches)
- `vaadin_version`: Required - which major version to search

### Component API System

**Component API Tools** provide access to component documentation:
- `get_component_java_api`: Java/Flow API documentation
- `get_component_react_api`: React/Hilla API documentation
- `get_component_web_component_api`: Web Component API
- `get_component_styling`: Component styling documentation

**Path Resolution** (`src/component-api-helpers.ts`):
- Normalizes component names (Button/button/vaadin-button → button)
- Version-specific markdown directory lookup
- Security checks for path traversal prevention

## Dependencies

### Required Versions
- **Bun**: >= 1.0.0 (runtime and package manager)
- **Node.js**: >= 22 (for compatibility, but Bun is primary runtime)
- **TypeScript**: 5.8.2

### Key Dependencies
- **MCP SDK**: `@modelcontextprotocol/sdk` - Model Context Protocol implementation
- **Pinecone**: `@pinecone-database/pinecone` - Vector database for embeddings
- **OpenAI**: `openai` - Embedding generation
- **LangChain**: `@langchain/*` - Document processing, chunking, embeddings
- **Express**: HTTP server for MCP transport
- **AsciiDoctor**: AsciiDoc to HTML conversion
- **downdoc**: HTML to Markdown conversion
- **Zod**: Schema validation for tool parameters

### Environment Variables

**Required for Production**:
```bash
OPENAI_API_KEY=your_key          # OpenAI embeddings
PINECONE_API_KEY=your_key        # Pinecone vector DB
PINECONE_INDEX=vaadin-docs       # Pinecone index name
```

**Optional**:
```bash
HTTP_PORT=8080                   # MCP server port
AMPLITUDE_API_KEY=your_key       # Analytics (optional)
NODE_ENV=production              # Environment mode
```

## Testing

**Test Structure**:
- **MCP Server**: Integration tests using real Pinecone data (`test-scenarios.test.ts`, `component-api-tools.test.ts`)
- **Converter**: Framework detection tests (`test.ts`)
- **Embedding Generator**: Chunking and processing tests (`test-suite.ts`)

**Running Tests**:
```bash
# All tests (workspace root)
bun run test

# Individual package tests
cd packages/mcp-server && bun run test:all
cd packages/1-asciidoc-converter && bun run test
cd packages/2-embedding-generator && bun run test
```

## CI/CD

**GitHub Actions** (`.github/workflows/`):

**`docs-ingestion.yml`**:
- Runs daily at 2 AM UTC (schedule) or manually (workflow_dispatch)
- Converts AsciiDoc → Markdown → Embeddings
- Supports version selection (all/24/25) and index clearing
- Uploads logs and creates detailed summaries
- Creates GitHub issues on failure

**`pr-validation.yml`**:
- Runs on PRs to main branch
- Builds all packages (`bun run build`)
- Runs all tests (`bun test`)
- Type checking via TypeScript compilation

## Common Patterns

### Adding a New MCP Tool

1. Create tool directory in `packages/mcp-server/src/tools/your-tool/`
2. Create `handlers.ts` with tool implementation:
   ```typescript
   export async function handleYourTool(args: any) {
     // Validate args with Zod or manual checks
     // Implement tool logic
     return { content: [{ type: 'text', text: result }] };
   }
   ```
3. Create `index.ts` to export handler:
   ```typescript
   export { handleYourTool } from './handlers.js';
   ```
4. Register in `packages/mcp-server/src/index.ts`:
   ```typescript
   import { handleYourTool } from './tools/your-tool/index.js';

   // In tool listing
   server.setRequestHandler(ListToolsRequestSchema, async () => ({
     tools: [
       // ... existing tools
       {
         name: 'your_tool_name',
         description: 'Tool description',
         inputSchema: { /* Zod schema as JSON */ }
       }
     ]
   }));

   // In tool call handler
   server.setRequestHandler(CallToolRequestSchema, async (request) => {
     if (request.params.name === 'your_tool_name') {
       return handleYourTool(request.params.arguments);
     }
     // ... other tools
   });
   ```

### Modifying Search Behavior

Key files:
- `packages/mcp-server/src/services/search/hybrid-search-service.ts`: Main search logic
- `packages/mcp-server/src/services/search/pinecone-sparse-provider.ts`: Keyword search
- `packages/mcp-server/src/tools/search-and-docs/handlers.ts`: Tool wrappers

Search parameters in `HybridSearchService.hybridSearch()`:
- `query`: Search text
- `maxResults`: Number of results (default: 5)
- `maxTokens`: Token limit per result (default: 1500)
- `framework`: Framework filter ('flow'/'hilla'/'common')
- `vaadinVersion`: Required version filter

### Processing Documentation Updates

When Vaadin docs are updated:
1. Trigger GitHub Actions workflow (manual or scheduled)
2. Converter clones/pulls latest docs repo
3. Converts AsciiDoc → Markdown with metadata
4. Generator creates embeddings and updates Pinecone
5. MCP server automatically uses new data (no restart needed)

### Workspace Dependencies

The monorepo uses Bun workspaces with `workspace:*` protocol:
- `core-types` is a dependency of other packages
- Build order: `core-types` first, then others
- Changes to `core-types` require rebuilding dependent packages

## Production Deployment

**Server**: Deployed at `https://mcp.vaadin.com/`
- **Health Check**: `GET /health`
- **MCP Endpoint**: Root path `/` with Streamable HTTP transport
- **Landing Page**: Browser access shows HTML landing page

**Markdown Files**: Production server expects Markdown at:
```
/app/packages/1-asciidoc-converter/dist/markdown/v{version}/
```

**Development**: Resolves relative to workspace root:
```
../1-asciidoc-converter/dist/markdown/v{version}/
```
