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
          description: 'Search Vaadin documentation for relevant information about Vaadin development, components, and best practices. This tool returns search results that include file_path information for complete document retrieval. When using this tool, try to deduce the correct framework from context: use "flow" for Java-based views, "hilla" for React-based views, or empty string for both frameworks. Use getFullDocument with the file_path from results when you need complete context.',
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
          name: 'getFullDocument',
          description: 'Retrieves the complete documentation page for a given file path. Use this when you need full context beyond what search results provide. After finding relevant chunks via search_vaadin_docs, use this to get complete context, examples, and cross-references. The response includes the complete markdown content with full context.',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'The file path from search results (e.g., "building-apps/forms-data/add-form/fields-and-binding/hilla.md"). This identifies which complete documentation page to retrieve.'
              }
            },
            required: ['file_path']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'search_vaadin_docs':
          return this.handleSearchTool(request.params.arguments as any);
        case 'getFullDocument':
          return this.handleGetFullDocumentTool(request.params.arguments as any);
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
   * Handle getFullDocument tool
   */
  private async handleGetFullDocumentTool(args: any) {
    // Validate arguments
    if (!args.file_path || typeof args.file_path !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing or invalid file_path parameter'
      );
    }

    try {
      // Call REST server document endpoint
      const response = await fetch(`${config.restServer.url}/document/${encodeURIComponent(args.file_path)}`);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [
              {
                type: 'text',
                text: `Document with file path "${args.file_path}" not found. This may indicate an invalid file path or the document may not be available.`
              }
            ]
          };
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const document = await response.json();

      // Format the document for display
      const formattedDocument = this.formatFullDocument(document);

      return {
        content: [
          {
            type: 'text',
            text: formattedDocument
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching full document:', error);

      return {
        content: [
          {
            type: 'text',
            text: `Error fetching full document: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      
      if (result.file_path) {
        output += `**Document Path:** ${result.file_path} (use getFullDocument to get complete context)\n`;
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
   * Format a full document for display
   * @param document - Complete document data from the API
   * @returns Formatted document as a string
   */
  private formatFullDocument(document: any): string {
    let output = `# ${document.metadata?.title || 'Documentation'}\n\n`;
    
    output += `**File Path:** ${document.file_path}\n`;
    output += `**Framework:** ${document.metadata?.framework || 'unknown'}\n`;
    output += `**Source URL:** ${document.metadata?.source_url || 'N/A'}\n\n`;
    
    output += `## Complete Documentation\n\n${document.content}\n`;
    
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
