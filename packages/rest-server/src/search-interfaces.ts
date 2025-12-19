/**
 * Clean interfaces for search functionality
 * This allows for proper dependency injection and testing
 */

import type { RetrievalResult } from 'core-types';

/**
 * Abstract interface for search providers
 */
export interface SearchProvider {
  /**
   * Perform semantic search
   */
  semanticSearch(query: string, k: number, framework: string, vaadinVersion?: string): Promise<SemanticResult[]>;

  /**
   * Perform keyword search
   */
  keywordSearch(query: string, k: number, framework: string, vaadinVersion?: string): Promise<KeywordResult[]>;

  /**
   * Get a document chunk by ID
   */
  getDocumentChunk(chunkId: string): Promise<RetrievalResult | null>;
}

/**
 * Result interfaces
 */
export interface SemanticResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
  source: 'semantic';
}

export interface KeywordResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
  source: 'keyword';
}

export interface CombinedResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
  sources: string[];
  ranks: { semantic?: number; keyword?: number };
}

/**
 * RRF (Reciprocal Rank Fusion) utility
 */
export class RRFCombiner {
  static combine(
    semanticResults: SemanticResult[],
    keywordResults: KeywordResult[],
    k: number = 60
  ): CombinedResult[] {
    const combinedMap = new Map<string, CombinedResult>();
    
    // Process semantic results
    semanticResults.forEach((result, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (k + rank);
      
      combinedMap.set(result.id, {
        id: result.id,
        content: result.content,
        metadata: result.metadata,
        score: rrfScore,
        sources: ['semantic'],
        ranks: { semantic: rank },
      });
    });
    
    // Process keyword results and combine with semantic
    keywordResults.forEach((result, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (k + rank);
      
      if (combinedMap.has(result.id)) {
        // Combine with existing result
        const existing = combinedMap.get(result.id)!;
        existing.score += rrfScore;
        existing.sources.push('keyword');
        existing.ranks.keyword = rank;
      } else {
        // Add new result
        combinedMap.set(result.id, {
          id: result.id,
          content: result.content,
          metadata: result.metadata,
          score: rrfScore,
          sources: ['keyword'],
          ranks: { keyword: rank },
        });
      }
    });
    
    // Convert to array and sort by combined RRF score
    return Array.from(combinedMap.values()).sort((a, b) => b.score - a.score);
  }
}

/**
 * Result formatter utility
 */
export class ResultFormatter {
  static toRetrievalResults(
    combinedResults: CombinedResult[],
    maxResults: number,
    maxTokens: number
  ): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    let totalTokens = 0;
    const approximateTokensPerChar = 0.25;
    
    for (const result of combinedResults) {
      // Estimate token count
      const estimatedTokens = result.content.length * approximateTokensPerChar;
      
      // Check if adding this result would exceed the token limit
      if (totalTokens + estimatedTokens > maxTokens && results.length > 0) {
        break;
      }
      
      // Convert to RetrievalResult format
      const frameworkValue = String(result.metadata.framework || 'common');
      const validFramework = (frameworkValue === 'flow' || frameworkValue === 'hilla') 
        ? frameworkValue as 'flow' | 'hilla' 
        : 'common' as const;
      
      results.push({
        chunk_id: result.id,
        framework: validFramework,
        content: result.content,
        source_url: result.metadata.source_url || '',
        file_path: result.metadata.file_path || '',
        metadata: {
          title: result.metadata.title || 'Untitled',
          heading: result.metadata.heading || '',
        },
        relevance_score: result.score,
      });
      
      totalTokens += estimatedTokens;
      
      // Stop if we have enough results
      if (results.length >= maxResults) {
        break;
      }
    }
    
    return results;
  }
} 