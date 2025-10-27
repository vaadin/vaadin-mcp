/**
 * Handlers for search and document retrieval tools
 */

import { config } from '../../config.js';
import type { RetrievalResult } from '../../types.js';

/**
 * Handle search_vaadin_docs tool
 */
export async function handleSearchTool(args: any) {
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
export async function handleGetFullDocumentTool(args: any) {
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
