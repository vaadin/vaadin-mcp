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
import * as fs from 'fs';
import * as path from 'path';

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
          name: 'get_vaadin_primer',
          description: '🚨 IMPORTANT: Always use this tool FIRST before working with Vaadin. Returns a comprehensive primer document with current (2024+) information about modern Vaadin development. This addresses common AI misconceptions about Vaadin and provides up-to-date information about Flow vs Hilla, project structure, components, and best practices. Essential reading to avoid outdated assumptions.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'search_vaadin_docs',
          description: 'Search Vaadin documentation for relevant information about Vaadin development, components, and best practices. ⚠️ IMPORTANT: Use get_vaadin_primer FIRST to understand modern Vaadin before searching. This tool returns search results that include file_path information for complete document retrieval. When using this tool, try to deduce the correct framework from context: use "flow" for Java-based views, "hilla" for React-based views, or empty string for both frameworks. Use get_full_document with the file_path from results when you need complete context.',
          inputSchema: {
            type: 'object',
            properties: {
              question: {
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
            required: ['question']
          }
        },
        {
          name: 'get_full_document',
          description: 'Retrieves complete documentation pages for one or more file paths. Use this when you need full context beyond what search results provide. ⚠️ IMPORTANT: Use get_vaadin_primer FIRST to understand modern Vaadin fundamentals. After finding relevant chunks via search_vaadin_docs, use this to get complete context, examples, and cross-references. The response includes the complete markdown content with full context. Supports fetching multiple files at once to reduce roundtrips.',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'A single file path from search results (e.g., "building-apps/forms-data/add-form/fields-and-binding/hilla.md"). Use this for fetching a single document.'
              },
              file_paths: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'An array of file paths from search results. Use this for fetching multiple documents at once to reduce roundtrips.'
              }
            },
            anyOf: [
              { required: ['file_path'] },
              { required: ['file_paths'] }
            ]
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'get_vaadin_primer':
          return this.handleGetVaadinPrimerTool();
        case 'search_vaadin_docs':
          return this.handleSearchTool(request.params.arguments as any);
        case 'get_full_document':
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
   * Handle get_vaadin_primer tool
   */
  private async handleGetVaadinPrimerTool() {
    try {
      // Get the path to the primer document
      const primerPath = path.join(__dirname, 'vaadin-primer.md');
      
      // Read the primer document
      const primerContent = fs.readFileSync(primerPath, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: primerContent
          }
        ]
      };
    } catch (error) {
      console.error('Error reading Vaadin primer:', error);

      return {
        content: [
          {
            type: 'text',
            text: `Error reading Vaadin primer: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle search_vaadin_docs tool
   */
  private async handleSearchTool(args: any) {
    // Validate arguments
    if (!args.question || typeof args.question !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing or invalid question parameter'
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
          question: args.question, // Use 'question' for the enhanced API
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
   * Handle get_full_document tool
   */
  private async handleGetFullDocumentTool(args: any) {
    // Validate arguments
    if (!args.file_path && !args.file_paths) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing file_path or file_paths parameter'
      );
    }

    // Validate file_path if provided
    if (args.file_path && typeof args.file_path !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'file_path must be a string'
      );
    }

    // Validate file_paths if provided
    if (args.file_paths && (!Array.isArray(args.file_paths) || args.file_paths.some((path: any) => typeof path !== 'string'))) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'file_paths must be an array of strings'
      );
    }

    // Determine file paths to fetch
    const filePaths = args.file_paths || [args.file_path];

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
      const formattedResults = this.formatFullDocuments(results);

      return {
        content: [
          {
            type: 'text',
            text: formattedResults
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching full documents:', error);

      return {
        content: [
          {
            type: 'text',
            text: `Error fetching full documents: ${error instanceof Error ? error.message : 'Unknown error'}`
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
   * Format a full document for display
   * @param document - Complete document data from the API
   * @returns Formatted document as a string
   */
  private formatFullDocument(document: any): string {
    let output = `# ${document.metadata?.title || 'Documentation'}\n\n`;
    
    output += `----\n`;
    output += `File Path: ${document.file_path}\n`;
    output += `Framework: ${document.metadata?.framework || 'unknown'}\n`;
    output += `Source URL: ${document.metadata?.source_url || 'N/A'}\n`;
    output += `----\n\n`;
    
    output += `## Complete Documentation\n\n${document.content}\n`;
    
    return output;
  }

  /**
   * Format multiple full documents for display
   * @param results - Array of result objects that may contain document or error
   * @returns Formatted documents as a string
   */
  private formatFullDocuments(results: Array<{ document?: any; filePath: string; error?: string }>): string {
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
