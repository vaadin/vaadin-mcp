#!/usr/bin/env bun

/**
 * Vaadin Documentation MCP Server
 * 
 * This server provides access to Vaadin documentation through the Model Context Protocol.
 * It allows IDE assistants and developers to search for relevant documentation.
 * Supports both stdio and HTTP/SSE transports.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config';
import { searchDocumentation } from './pinecone-service';
import type { SearchResult } from './pinecone-service';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';

/**
 * Vaadin Documentation MCP Server
 */
class VaadinDocsServer {
  private server: Server;
  private activeTransports: Map<string, SSEServerTransport> = new Map();

  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up tool handlers
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Set up tool handlers
   */
  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_vaadin_docs',
          description: 'Search Vaadin documentation for relevant information',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query or question about Vaadin',
              },
              max_results: {
                type: 'number',
                description: 'Maximum number of results to return (default: 5)',
                minimum: 1,
                maximum: 20,
              },
              max_tokens: {
                type: 'number',
                description: 'Maximum number of tokens to return (default: 1500)',
                minimum: 100,
                maximum: 5000,
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'search_vaadin_docs') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = request.params.arguments as any;
      
      // Validate arguments
      if (!args.query || typeof args.query !== 'string') {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing or invalid query parameter'
        );
      }

      const maxResults = args.max_results && !isNaN(args.max_results) 
        ? Math.min(Math.max(1, args.max_results), 20) 
        : config.search.defaultMaxResults;
        
      const maxTokens = args.max_tokens && !isNaN(args.max_tokens) 
        ? Math.min(Math.max(100, args.max_tokens), 5000) 
        : config.search.defaultMaxTokens;

      try {
        // Search documentation
        const results = await searchDocumentation(args.query, maxResults, maxTokens);
        
        // Format results
        const formattedResults = this.formatSearchResults(results);
        
        return {
          content: [
            {
              type: 'text',
              text: formattedResults,
            },
          ],
        };
      } catch (error) {
        console.error('Error searching documentation:', error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error searching Vaadin documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Format search results for display
   * @param results - Search results
   * @returns Formatted results as a string
   */
  private formatSearchResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant documentation found.';
    }

    let output = `Found ${results.length} relevant documentation sections:\n\n`;

    results.forEach((result, index) => {
      output += `## ${index + 1}. ${result.metadata.title}${result.metadata.heading ? ` - ${result.metadata.heading}` : ''}\n`;
      output += `Source: ${result.metadata.url}\n`;
      output += `Relevance: ${(result.score * 100).toFixed(1)}%\n\n`;
      output += `${result.text}\n\n`;
      
      if (index < results.length - 1) {
        output += '---\n\n';
      }
    });

    return output;
  }

  /**
   * Run the server with stdio transport
   */
  async runStdio() {
    // Check for required environment variables
    this.checkEnvironmentVariables();
    
    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Vaadin Documentation MCP server running on stdio');
  }

  /**
   * Run the server with HTTP/SSE transport
   */
  async runHttp(port: number = config.server.httpPort) {
    // Check for required environment variables
    this.checkEnvironmentVariables();
    
    const app = express();
    
    // Enable CORS
    app.use(cors());
    
    // Parse JSON request bodies
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', server: config.server.name, version: config.server.version });
    });
    
    // SSE endpoint for MCP communication
    app.get('/sse', async (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Generate a unique client ID
      const clientId = Math.random().toString(36).substring(2, 15);
      res.setHeader('X-Client-ID', clientId);
      
      // Create a new SSE transport for this connection
      const transport = new SSEServerTransport('/messages', res);
      this.activeTransports.set(clientId, transport);
      
      // Remove transport when connection closes
      req.on('close', () => {
        this.activeTransports.delete(clientId);
        transport.close();
      });
      
      await this.server.connect(transport);
    });
    
    // Message endpoint for client-to-server communication
    app.post('/messages', async (req: Request, res: Response) => {
      const clientId = req.headers['x-client-id'] as string;
      
      if (!clientId) {
        return res.status(400).json({ error: 'Missing X-Client-ID header' });
      }
      
      // Find the transport for this client
      const transport = this.activeTransports.get(clientId);
      
      if (!transport) {
        return res.status(404).json({ error: 'No active connection found for this client ID' });
      }
      
      try {
        await transport.handlePostMessage(req, res);
      } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Start the HTTP server
    app.listen(port, () => {
      console.log(`Vaadin Documentation MCP server running on http://localhost:${port}`);
    });
  }
  
  /**
   * Check for required environment variables
   */
  private checkEnvironmentVariables() {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is required');
      process.exit(1);
    }
    
    if (!process.env.PINECONE_API_KEY) {
      console.error('PINECONE_API_KEY environment variable is required');
      process.exit(1);
    }
    
    if (!process.env.PINECONE_INDEX) {
      console.error('PINECONE_INDEX environment variable is required');
      process.exit(1);
    }
  }
}

// Determine which transport to use based on command line arguments
const server = new VaadinDocsServer();

// Check if we should run in HTTP mode
const args = process.argv.slice(2);
if (args.includes('--http') || args.includes('-h')) {
  // Get port from arguments or use default
  const portArg = args.find(arg => arg.startsWith('--port=') || arg.startsWith('-p='));
  const port = portArg ? parseInt(portArg.split('=')[1], 10) : config.server.httpPort;
  
  server.runHttp(port).catch(console.error);
} else {
  // Default to stdio transport
  server.runStdio().catch(console.error);
}
