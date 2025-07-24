/**
 * Clean hybrid search service using dependency injection
 * This service is provider-agnostic and can work with any SearchProvider implementation
 */

import type { RetrievalResult } from 'core-types';
import type { SearchProvider } from './search-interfaces.js';
import { RRFCombiner, ResultFormatter } from './search-interfaces.js';
import { config } from './config.js';

export class HybridSearchService {
  constructor(private searchProvider: SearchProvider) {}

  /**
   * Perform hybrid search combining semantic and keyword search with RRF
   */
  async hybridSearch(
    query: string,
    options: {
      maxResults?: number;
      maxTokens?: number;
      framework?: string;
      k?: number; // RRF parameter
    } = {}
  ): Promise<RetrievalResult[]> {
    const {
      maxResults = config.search.defaultMaxResults,
      maxTokens = config.search.defaultMaxTokens,
      framework = '',
      k = 60 // RRF parameter
    } = options;
    
    // Perform both searches in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      this.searchProvider.semanticSearch(query, maxResults * 2, framework),
      this.searchProvider.keywordSearch(query, maxResults * 2, framework),
    ]);
    
    // Apply RRF to combine results
    const combinedResults = RRFCombiner.combine(semanticResults, keywordResults, k);
    
    // Convert to RetrievalResult format and apply limits
    return ResultFormatter.toRetrievalResults(combinedResults, maxResults, maxTokens);
  }

  /**
   * Get a specific document chunk by ID
   */
  async getDocumentChunk(chunkId: string): Promise<RetrievalResult | null> {
    return this.searchProvider.getDocumentChunk(chunkId);
  }
} 