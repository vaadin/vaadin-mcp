#!/usr/bin/env node

/**
 * Vaadin Documentation MCP Server
 *
 * This server provides access to Vaadin documentation through the Model Context Protocol.
 * It allows IDE assistants and developers to search for relevant documentation.
 * Uses stdio transport for local connections and defers queries to the REST server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';

/**
 * Search result interface
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
 * Vaadin Documentation MCP Server
 */
class VaadinDocsServer {
  private server: Server;

  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version
      },
      {
        capabilities: {
          tools: {}
        }
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
                description: 'The search query or question about Vaadin. Will be used to query a vector database.'
              },
              max_results: {
                type: 'number',
                description: 'Maximum number of results to return (default: 5)',
                minimum: 1,
                maximum: 20
              },
              max_tokens: {
                type: 'number',
                description: 'Maximum number of tokens to return (default: 1500)',
                minimum: 100,
                maximum: 5000
              }
            },
            required: ['query']
          }
        }
      ]
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

      try {
        console.log(`Searching for: "${args.query}" via REST server at ${config.restServer.url}`);
        
        // Forward request to REST server
        const response = await fetch(`${config.restServer.url}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: args.query,
            max_results: args.max_results,
            max_tokens: args.max_tokens
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        console.log(`Found ${data.results?.length || 0} results`);

        // Format results
        const formattedResults = this.formatSearchResults(data.results);

        return {
          content: [
            {
              type: 'text',
              text: formattedResults
            }
          ]
        };
      } catch (error) {
        console.error('Error searching documentation:', error);

        return {
          content: [
            {
              type: 'text',
              text: `Error searching Vaadin documentation: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
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
  async run() {

    // Create a new stdio transport
    const transport = new StdioServerTransport();
    
    // Connect the server to the transport
    await this.server.connect(transport); 
  }
}

// Create and run the server
const server = new VaadinDocsServer();
server.run().catch(console.error);
