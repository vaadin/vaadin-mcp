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
import { handleGetComponentsByVersionTool } from './tools/get-components-by-version/index.js';

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
      description: "Returns a comprehensive list of components available in a specific Vaadin version, including component names, React/Hilla component names, Java class names, and npm packages.",
      inputSchema: {
        version: z.string().describe("The Vaadin version as a minor version (e.g., '24.8', '24.9', '25.0')")
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
    console.log('Received GET MCP request - returning setup page');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vaadin MCP Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #eaf0f8;
      background: linear-gradient(135deg, #1a81fa 0%, #8854fc 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #161B21;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      padding: 40px;
      border: 1px solid #232e3c;
    }
    h1 {
      color: #eaf0f8;
      margin-bottom: 20px;
      font-size: 2.5em;
      font-weight: 600;
    }
    h2 {
      color: #1a81fa;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.5em;
      font-weight: 600;
    }
    p {
      margin-bottom: 15px;
      color: #eaf0f8;
    }
    .config-box {
      background: #0F0F0F;
      border-left: 4px solid #1a81fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      font-family: "Courier New", monospace;
      overflow-x: auto;
      border: 1px solid #232e3c;
    }
    .config-box strong {
      color: #1a81fa;
      display: block;
      margin-bottom: 10px;
    }
    .config-box pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #eaf0f8;
    }
    .link-box {
      background: #0F0F0F;
      border-left: 4px solid #8854fc;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      border: 1px solid #232e3c;
    }
    .link-box p {
      color: #eaf0f8;
    }
    ul {
      color: #eaf0f8;
    }
    li {
      margin-bottom: 8px;
    }
    a {
      color: #1a81fa;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      color: #8854fc;
      text-decoration: underline;
    }
    code {
      background: #232e3c;
      color: #1a81fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: "Courier New", monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Vaadin MCP Server</h1>

    <p>
      The Vaadin Model Context Protocol (MCP) server provides AI tools like Claude Code and Junie
      with direct access to comprehensive Vaadin documentation, enabling intelligent code assistance
      for Vaadin Java and React applications.
    </p>

    <h2>📋 Configuration</h2>
    <p>To enable the Vaadin MCP server in your AI tool, add the following configuration:</p>

    <div class="config-box">
      <strong>For Claude Code:</strong>
      <pre>{
  "mcpServers": {
    "vaadin": {
      "type": "http",
      "url": "https://mcp.vaadin.com/docs"
    }
  }
}</pre>
    </div>

    <div class="config-box">
      <strong>For Junie or other MCP clients:</strong>
      <pre>Server URL: https://mcp.vaadin.com/docs</pre>
    </div>

    <h2>✨ What's Included</h2>
    <ul style="margin-left: 20px; margin-bottom: 15px;">
      <li>Semantic search across Vaadin documentation</li>
      <li>Full document retrieval for complete context</li>
      <li>Component version information and API references</li>
      <li>Support for both Java and React applications</li>
      <li>Current Vaadin version information</li>
    </ul>

    <h2>🔗 Resources</h2>
    <div class="link-box">
      <p><strong>GitHub Repository:</strong></p>
      <p><a href="https://github.com/vaadin/vaadin-mcp" target="_blank">https://github.com/vaadin/vaadin-mcp</a></p>
      <p style="margin-top: 10px;">View source code, report issues, and contribute to the project.</p>
    </div>

    <div class="link-box">
      <p><strong>Vaadin Documentation:</strong></p>
      <p><a href="https://vaadin.com/docs" target="_blank">https://vaadin.com/docs</a></p>
      <p style="margin-top: 10px;">Browse the full Vaadin documentation.</p>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Legacy MCP endpoint - inform about new URL
  app.get('/mcp', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The MCP server has moved. The new URL is https://mcp.vaadin.com/docs',
      oldUrl: 'https://mcp.vaadin.com/docs/mcp',
      newUrl: 'https://mcp.vaadin.com/docs',
      timestamp: new Date().toISOString()
    });
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