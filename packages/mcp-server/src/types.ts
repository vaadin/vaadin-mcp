/**
 * Local type definitions for MCP server
 * Inlined from core-types to avoid workspace dependencies when publishing
 */

/**
 * Represents a single processed and chunked piece of documentation.
 */
export interface DocumentChunk {
  /**
   * A unique identifier for this specific chunk.
   */
  chunk_id: string;

  /**
   * The chunk_id of the direct parent document or section.
   * This enables hierarchical lookups. Null for top-level documents.
   */
  parent_id: string | null;

  /**
   * The framework this chunk applies to.
   * 'common' is used if it applies to both.
   */
  framework: 'flow' | 'hilla' | 'common';

  /**
   * The actual text content of the chunk.
   */
  content: string;

  /**
   * The full URL to the source documentation page from which this chunk was derived.
   */
  source_url: string;

  /**
   * Additional metadata, such as the original heading title.
   */
  metadata?: {
    title?: string;
    [key: string]: any;
  };
}

/**
 * The structure of the objects returned by the REST retrieval API.
 * It extends the base chunk with a relevance score from the search.
 */
export interface RetrievalResult extends DocumentChunk {
  relevance_score: number;
  file_path?: string;
} 