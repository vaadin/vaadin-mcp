#!/usr/bin/env node

/**
 * Vaadin Documentation MCP Server
 *
 * This server provides access to Vaadin documentation through the Model Context Protocol.
 * It allows IDE assistants and developers to search for relevant documentation and navigate
 * hierarchical relationships between documents using parent-child links.
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
import type { RetrievalResult } from './types.js';

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
          description: 'Search Vaadin documentation for relevant information about Vaadin development, components, and best practices. This tool returns results with hierarchical parent-child relationships. When using this tool, try to deduce the correct framework from context: use "flow" for Java-based views, "hilla" for React-based views, or empty string for both frameworks. Each result includes a parent_id that can be used with getDocumentChunk to explore broader context.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query or question about Vaadin. Will be used to query a vector database with hybrid search (semantic + keyword).'
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
              },
              framework: {
                type: 'string',
                description: 'The Vaadin framework to focus on: "flow" for Java-based views, "hilla" for React-based views, or empty string for both. If not specified, the agent should try to deduce the correct framework from context or asking the user for clarification.',
                enum: ['flow', 'hilla', '']
              }
            },
            required: ['query']
          }
        },
        {
          name: 'getDocumentChunk',
          description: 'Retrieve a specific document chunk by its ID. This tool enables navigation through the hierarchical structure of Vaadin documentation. Use this when you need to get parent context from a search result, or when you want to explore related content. The chunk_id can be found in the search results.',
          inputSchema: {
            type: 'object',
            properties: {
              chunk_id: {
                type: 'string',
                description: 'The unique identifier of the document chunk to retrieve. This is typically found in search results or as a parent_id reference.'
              }
            },
            required: ['chunk_id']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'search_vaadin_docs':
          return this.handleSearchTool(request.params.arguments as any);
        case 'getDocumentChunk':
          return this.handleGetDocumentChunkTool(request.params.arguments as any);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  /**
   * Handle search_vaadin_docs tool
   */
  private async handleSearchTool(args: any) {
    // Validate arguments
    if (!args.query || typeof args.query !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing or invalid query parameter'
      );
    }

    try {        
      // Forward request to REST server
      const response = await fetch(`${config.restServer.url}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: args.query, // Use 'question' for the enhanced API
          max_results: args.max_results,
          max_tokens: args.max_tokens,
          framework: args.framework || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      // Format results with hierarchical information
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
  }

  /**
   * Handle getDocumentChunk tool
   */
  private async handleGetDocumentChunkTool(args: any) {
    // Validate arguments
    if (!args.chunk_id || typeof args.chunk_id !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing or invalid chunk_id parameter'
      );
    }

    try {
      // Call REST server chunk endpoint
      const response = await fetch(`${config.restServer.url}/chunk/${encodeURIComponent(args.chunk_id)}`);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [
              {
                type: 'text',
                text: `Document chunk with ID "${args.chunk_id}" not found. This may indicate an invalid chunk ID or the chunk may have been removed from the index.`
              }
            ]
          };
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const chunk: RetrievalResult = await response.json();

      // Format the chunk for display
      const formattedChunk = this.formatDocumentChunk(chunk);

      return {
        content: [
          {
            type: 'text',
            text: formattedChunk
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching document chunk:', error);

      return {
        content: [
          {
            type: 'text',
            text: `Error fetching document chunk: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Format search results for display with hierarchical information
   * @param results - Search results from the enhanced API
   * @returns Formatted results as a string
   */
  private formatSearchResults(results: RetrievalResult[]): string {
    if (results.length === 0) {
      return 'No relevant documentation found.';
    }

    let output = `Found ${results.length} relevant documentation sections:\n\n`;

    results.forEach((result, index) => {
      output += `## ${index + 1}. ${result.metadata?.title || 'Untitled'}\n`;
      output += `**Source:** ${result.source_url}\n`;
      output += `**Framework:** ${result.framework}\n`;
      output += `**Chunk ID:** ${result.chunk_id}\n`;
      
      if (result.parent_id) {
        output += `**Parent Chunk:** ${result.parent_id} (use getDocumentChunk to get parent context)\n`;
      }
      
      output += `**Relevance Score:** ${result.relevance_score.toFixed(3)}\n\n`;
      
      output += `${result.content}\n\n`;

      if (index < results.length - 1) {
        output += '---\n\n';
      }
    });

    return output;
  }

  /**
   * Format a single document chunk for display
   * @param chunk - Document chunk to format
   * @returns Formatted chunk as a string
   */
  private formatDocumentChunk(chunk: RetrievalResult): string {
    let output = `# ${chunk.metadata?.title || 'Document Chunk'}\n\n`;
    
    output += `**Chunk ID:** ${chunk.chunk_id}\n`;
    output += `**Framework:** ${chunk.framework}\n`;
    output += `**Source:** ${chunk.source_url}\n`;
    
    if (chunk.parent_id) {
      output += `**Parent Chunk:** ${chunk.parent_id} (use getDocumentChunk to get parent context)\n`;
    } else {
      output += `**Parent Chunk:** None (this is a top-level document)\n`;
    }
    
    output += `**Relevance Score:** ${chunk.relevance_score.toFixed(3)}\n\n`;
    
    output += `## Content\n\n${chunk.content}\n`;
    
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
