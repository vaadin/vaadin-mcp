#!/usr/bin/env node

/**
 * Vaadin Documentation MCP Server (HTTP)
 *
 * This server provides access to Vaadin documentation through the Model Context Protocol
 * using Streamable HTTP transport. It allows remote clients to search for documentation
 * and navigate hierarchical relationships between documents.
 */

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';
import type { RetrievalResult } from './types.js';
import { VAADIN_PRIMER_CONTENT } from './vaadin-primer.js';
import { z } from 'zod';

/**
 * Search result interface (legacy compatibility)
 */
export interface SearchResult {
  text: string;
  metadata: {
    title: string;
    source: string;
    url: string;
    heading?: string;
    [key: string]: any;
  };
  score: number;
}

/**
 * Create and configure MCP server instance
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: config.server.name,
    version: config.server.version
  });

  // Register tools using the new API
  setupTools(server);

  return server;
}

/**
 * Set up tools for the MCP server using the new registerTool API
 */
function setupTools(server: McpServer) {
  // Register get_vaadin_primer tool
  server.registerTool(
    "get_vaadin_primer",
    {
      title: "Vaadin Primer",
      description: "🚨 IMPORTANT: Always use this tool FIRST before working with Vaadin Flow or Hilla. Returns a comprehensive primer document with current (2025+) information about modern Vaadin development. This addresses common AI misconceptions about Vaadin and provides up-to-date information about Flow vs Hilla, project structure, components, and best practices. Essential reading to avoid outdated assumptions.",
      inputSchema: {}
    },
    async () => {
      return await handleGetVaadinPrimerTool();
    }
  );

  // Register search_vaadin_docs tool
  server.registerTool(
    "search_vaadin_docs",
    {
      title: "Search Vaadin Documentation",
      description: "Search Vaadin documentation for relevant information about Vaadin development, components, and best practices. Uses hybrid semantic + keyword search. When using this tool, try to deduce the correct framework from context: use \"flow\" for Java-based views, \"hilla\" for React-based views, or \"common\" for both frameworks. Use get_full_document with file_paths containing the result's file_path when you need complete context.",
      inputSchema: {
        question: z.string().describe("The search query or question about Vaadin. Will be used to query a vector database with hybrid search (semantic + keyword)."),
        max_results: z.number().min(1).max(20).optional().describe("Maximum number of results to return (default: 5)"),
        max_tokens: z.number().min(100).max(5000).optional().describe("Maximum number of tokens to return (default: 1500)"),
        framework: z.enum(['flow', 'hilla', 'common']).optional().describe('The Vaadin framework to focus on: "flow" for Java-based views, "hilla" for React-based views, or "common" for both. If not specified, the agent should try to deduce the correct framework from context or asking the user for clarification.')
      }
    },
    async (args) => {
      return await handleSearchTool(args);
    }
  );

  // Register get_full_document tool
  server.registerTool(
    "get_full_document",
    {
      title: "Get Full Document",
      description: "Retrieves complete documentation pages for one or more file paths. Use this when you need full context beyond what search results provide. Provide file_paths only (array).",
      inputSchema: {
        file_paths: z.array(z.string()).describe("Array of file paths from search results. Use this to fetch one or more documents in a single call.")
      }
    },
    async (args) => {
      return await handleGetFullDocumentTool(args);
    }
  );

  // Register get_vaadin_version tool
  server.registerTool(
    "get_vaadin_version",
    {
      title: "Get Vaadin Version",
      description: "Returns the latest stable version of Vaadin Core as a simple JSON object. This is useful when setting up new projects, checking for updates, or when helping with dependency management. Returns: {version, released}.",
      inputSchema: {}
    },
    async () => {
      return await handleGetVaadinVersionTool();
    }
  );

  // Register get_components_by_version tool
  server.registerTool(
    "get_components_by_version",
    {
      title: "Get Components by Version",
      description: "Returns a list of components available in a given Vaadin major version (e.g., 24, 25).",
      inputSchema: {
        version: z.string().regex(/^\d+$/).describe("The major version of Vaadin (e.g., '24', '25')")
      }
    },
    async (args) => {
      return await handleGetComponentsByVersionTool(args);
    }
  );
}

/**
 * Handle get_vaadin_primer tool
 */
async function handleGetVaadinPrimerTool() {
  return {
    content: [
      {
        type: 'text' as const,
        text: VAADIN_PRIMER_CONTENT
      }
    ]
  };
}

/**
 * Handle search_vaadin_docs tool
 */
async function handleSearchTool(args: any) {
  // Validate arguments
  if (!args.question || typeof args.question !== 'string') {
    throw new Error('Missing or invalid question parameter');
  }

  try {        
    // Forward request to REST server
    const response = await fetch(`${config.restServer.url}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: args.question, // Use 'question' for the enhanced API
        max_results: args.max_results,
        max_tokens: args.max_tokens,
        framework: args.framework || 'common'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();

    // Format results with hierarchical information
    const formattedResults = formatSearchResults(data.results);

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResults
        }
      ]
    };
  } catch (error) {
    console.error('Error searching documentation:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error searching Vaadin documentation: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle get_full_document tool
 */
async function handleGetFullDocumentTool(args: any) {
  // Validate arguments (Zod schema validation handles this automatically)
  if (!args.file_paths || !Array.isArray(args.file_paths) || args.file_paths.length === 0) {
    throw new Error('Missing required parameter: file_paths (non-empty array)');
  }

  // Determine file paths to fetch
  const filePaths = args.file_paths as string[];

  try {
    // Fetch all documents in parallel
    const fetchPromises = filePaths.map(async (filePath: string) => {
      const response = await fetch(`${config.restServer.url}/document/${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: `Document with file path "${filePath}" not found`,
            filePath
          };
        }
        
        const errorData = await response.json();
        return {
          error: errorData.error || `HTTP error ${response.status} for ${filePath}`,
          filePath
        };
      }

      const document = await response.json();
      return {
        document,
        filePath
      };
    });

    const results = await Promise.all(fetchPromises);

    // Format the results
    const formattedResults = formatFullDocuments(results);

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResults
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching full documents:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching full documents: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle get_vaadin_version tool
 */
async function handleGetVaadinVersionTool() {
  try {
    // Forward request to REST server
    const response = await fetch(`${config.restServer.url}/vaadin-version`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();

    // Return simple JSON structure with only version and release timestamp
    const versionInfo = {
      version: data.version,
      released: data.released
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(versionInfo, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching Vaadin version:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch Vaadin version: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle get_components_by_version tool
 */
async function handleGetComponentsByVersionTool(args: any) {
  // Validate arguments
  if (!args.version || typeof args.version !== 'string') {
    throw new Error('Missing or invalid version parameter');
  }

  // Parse version to get major version number
  const versionMatch = args.version.match(/^(\d+)$/);
  if (!versionMatch) {
    throw new Error('Invalid version format. Expected format: "24", "25", etc.');
  }

  const majorVersion = versionMatch[1];
  
  try {
    // Fetch component list from GitHub documentation repository
    // The branch name for version 24 is 'v24', for version 25 is 'v25', etc.
    const branch = `v${majorVersion}`;
    const githubApiUrl = `https://api.github.com/repos/vaadin/docs/contents/articles/components?ref=${branch}`;
    
    console.log(`Fetching component list for Vaadin ${args.version} from branch ${branch}...`);
    
    const response = await fetch(githubApiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'vaadin-docs-mcp-server'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Version ${args.version} not found. The documentation branch '${branch}' may not exist.`);
      }
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Determine the documentation URL path based on version
    // Vaadin 24 uses 'latest', Vaadin 25+ uses 'v{version}'
    const docsVersionPath = majorVersion === '24' ? 'latest' : `v${majorVersion}`;
    
    // Filter and process the component directories
    const components = data
      .filter((item: any) => item.type === 'dir' && !item.name.startsWith('_'))
      .map((item: any) => {
        // Convert directory name to component name (e.g., 'button' -> 'Button')
        const componentName = item.name
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        return {
          name: componentName,
          directory: item.name,
          documentation_url: `https://vaadin.com/docs/${docsVersionPath}/components/${item.name}`
        };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    const result = {
      version: args.version,
      branch: branch,
      components_count: components.length,
      components: components
    };
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching components by version:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch components for version ${args.version}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}

/**
 * Format search results for display with document information
 * @param results - Search results from the enhanced API
 * @returns Formatted results as a string
 */
function formatSearchResults(results: RetrievalResult[]): string {
  if (results.length === 0) {
    return 'No relevant documentation found.';
  }

  let output = `Found ${results.length} relevant documentation sections:\n\n`;

  results.forEach((result, index) => {
    output += `## ${index + 1}. ${result.metadata?.title || 'Untitled'}\n`;
    
    // Format metadata as markdown front matter
    output += `----\n`;
    output += `Source: ${result.source_url}\n`;
    output += `Framework: ${result.framework}\n`;
    output += `Chunk ID: ${result.chunk_id}\n`;
    
    if (result.file_path) {
      output += `Document Path: ${result.file_path} (use get_full_document to get complete context)\n`;
    }
    
    output += `Relevance Score: ${result.relevance_score.toFixed(3)}\n`;
    output += `----\n\n`;
    
    output += `${result.content}\n\n`;

    if (index < results.length - 1) {
      output += '================\n\n';
    }
  });

  return output;
}

/**
 * Format multiple full documents for display
 * @param results - Array of result objects that may contain document or error
 * @returns Formatted documents as a string
 */
function formatFullDocuments(results: Array<{ document?: any; filePath: string; error?: string }>): string {
  if (results.length === 0) {
    return 'No documents found.';
  }

  let output = `Found ${results.length} document${results.length > 1 ? 's' : ''}:\n\n`;

  results.forEach((result, index) => {
    if (result.error) {
      output += `## ${index + 1}. Error fetching document\n`;
      output += `----\n`;
      output += `File Path: ${result.filePath}\n`;
      output += `Error: ${result.error}\n`;
      output += `----\n\n`;
    } else {
      output += `## ${index + 1}. ${result.document.metadata?.title || 'Untitled'}\n`;
      output += `----\n`;
      output += `File Path: ${result.filePath}\n`;
      output += `Framework: ${result.document.metadata?.framework || 'unknown'}\n`;
      output += `Source URL: ${result.document.metadata?.source_url || 'N/A'}\n`;
      output += `----\n\n`;
      output += `### Complete Documentation\n\n${result.document.content}\n\n`;
    }
    
    if (index < results.length - 1) {
      output += '================\n\n';
    }
  });

  return output;
}

/**
 * Main function to start the MCP HTTP server
 */
async function startServer() {
  const app = express();
  
  // Configure CORS to support browser-based MCP clients
  app.use(cors({
    origin: '*', // Configure appropriately for production
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id'],
  }));
  
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      server: config.server.name, 
      version: config.server.version,
      transport: 'streamable-http'
    });
  });

  // Stateless MCP endpoint
  app.post('/', async (req: Request, res: Response) => {
    try {
      // Create new server and transport instances for each request (stateless)
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
      });
      
      // Clean up when request is closed
      res.on('close', () => {
        console.log('Request closed');
        transport.close();
        server.close();
      });
      
      // Connect server to transport
      await server.connect(transport);
      
      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // SSE notifications not supported in stateless mode
  app.get('/', async (req: Request, res: Response) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed. This server operates in stateless mode."
      },
      id: null
    }));
  });

  // Session termination not needed in stateless mode
  app.delete('/', async (req: Request, res: Response) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed. This server operates in stateless mode."
      },
      id: null
    }));
  });

  // Start the server
  const port = config.server.httpPort;
  app.listen(port, () => {
    console.log(`🚀 Vaadin Documentation MCP Server (HTTP) listening on port ${port}`);
    console.log(`📍 MCP endpoint: http://localhost:${port}/`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`🔧 Transport: Streamable HTTP (stateless mode)`);
    console.log(`🔗 REST Server: ${config.restServer.url}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});