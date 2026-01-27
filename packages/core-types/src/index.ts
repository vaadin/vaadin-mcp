/**
 * Represents a single processed and chunked piece of documentation.
 * This is the core data structure to be stored in Pinecone's metadata payload.
 */
export interface DocumentChunk {
  /**
   * A unique identifier for this specific chunk.
   * e.g., 'forms-binder-validation-1'
   */
  chunk_id: string;

  /**
   * The chunk_id of the direct parent document or section.
   * This enables hierarchical lookups. Null for top-level documents.
   * e.g., 'forms-binder-intro'
   * @deprecated No longer used in document-based approach
   */
  parent_id?: string | null;

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
   * The Vaadin major version this chunk applies to.
   * e.g., '24'
   */
  vaadin_version?: string;

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

/**
 * Configuration for the ingestion pipeline.
 */
export interface IngestionConfig {
  repository: {
    url: string;
    branch: string;
    localPath: string;
  };
  processing: {
    includePatterns: string[];
    excludePatterns: string[];
  };
}

/**
 * Framework detection result
 */
export type Framework = 'flow' | 'hilla' | 'common';

/**
 * Metadata extracted from processed documents
 */
export interface ProcessedMetadata {
  framework: Framework;
  source_url: string;
  title?: string;
  vaadin_version?: string;
  [key: string]: any;
}

/**
 * Configuration for search requests
 */
export interface SearchRequest {
  question: string;
  framework: 'flow' | 'hilla' | 'common';
  stream?: boolean;
}

/**
 * Response from search endpoints
 */
export interface SearchResponse {
  results: RetrievalResult[];
  total: number;
} 