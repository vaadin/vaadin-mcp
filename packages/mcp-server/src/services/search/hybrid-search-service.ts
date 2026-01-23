/**
 * Hybrid Search Service
 * Combines semantic and keyword search using Pinecone's native capabilities
 * with built-in reranking for superior relevance
 */

import type { RetrievalResult } from '../../types.js';
import type { SearchProvider } from './search-interfaces.js';
import { PineconeSparseProvider } from './pinecone-sparse-provider.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

interface SearchOptions {
  maxResults?: number;
  maxTokens?: number;
  framework?: string;
}

interface ProcessedQuery {
  original: string;
  cleaned: string;
  terms: string[];
}

export class HybridSearchService {
  private pinecone: Pinecone;

  constructor(
    private denseProvider: SearchProvider,
    private sparseProvider: PineconeSparseProvider
  ) {
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey!,
    });
  }

  /**
   * Initialize the service by ensuring sparse index exists
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Enhanced Hybrid Search Service...');

    try {
      // Ensure sparse index exists and is ready
      await this.sparseProvider.ensureSparseIndex();

      // Check if sparse index needs data population
      const status = await this.sparseProvider.checkIndexStatus();
      if (status.exists && !status.hasData) {
        logger.info('⚠️  Sparse index exists but has no data. You may need to populate it.');
        logger.info(`   Index name: ${this.sparseProvider.getSparseIndexName()}`);
        logger.info('   💡 Run the embedding generator to populate both dense and sparse indexes.');
      }

      logger.info('✅ Enhanced Hybrid Search Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Enhanced Hybrid Search Service:', error);
      throw error;
    }
  }

  /**
   * Enhanced hybrid search with native Pinecone reranking
   */
  async hybridSearch(query: string, options: SearchOptions = {}): Promise<RetrievalResult[]> {
    const {
      maxResults = config.search.defaultMaxResults,
      maxTokens = config.search.defaultMaxTokens,
      framework = 'common'
    } = options;

    try {
      // 1. Preprocess query for better search quality
      const processedQuery = this.preprocessQuery(query);

      // 2. Parallel search (dense + sparse) - get more results for reranking
      const searchResultsMultiplier = 3; // Get 3x results for better reranking
      const candidateCount = Math.min(maxResults * searchResultsMultiplier, 100);

      logger.info(`🔍 Searching: "${processedQuery.cleaned}" (${framework || 'all frameworks'})`);

      const [semanticResults, keywordResults] = await Promise.all([
        this.denseProvider.semanticSearch(processedQuery.cleaned, candidateCount, framework),
        this.sparseProvider.keywordSearch(processedQuery.cleaned, candidateCount, framework)
      ]);

      logger.info(`📊 Results: ${semanticResults.length} semantic, ${keywordResults.length} keyword`);

      // 3. Merge and deduplicate results
      const mergedResults = this.mergeAndDeduplicateResults(semanticResults, keywordResults);
      logger.info(`🔗 Merged to ${mergedResults.length} unique results`);

      // 4. If we have enough results, use Pinecone's native reranking
      if (mergedResults.length > 1) {
        const rerankedResults = await this.rerank(processedQuery.original, mergedResults, maxResults);
        logger.info(`🎯 Reranked to top ${rerankedResults.length} results`);

        // 5. Apply token limits and return
        return this.applyTokenLimits(rerankedResults, maxTokens);
      } else {
        // Not enough results for reranking, just apply limits
        return this.applyTokenLimits(mergedResults, maxTokens).slice(0, maxResults);
      }

    } catch (error) {
      logger.error('Error in hybrid search:', error);
      // Graceful fallback to semantic search only
      logger.info('🔄 Falling back to semantic search only');
      const semanticResults = await this.denseProvider.semanticSearch(query, maxResults, framework);
      return semanticResults.map(this.convertSemanticToRetrievalResult.bind(this));
    }
  }

  /**
   * Get document chunk by ID (tries both indexes)
   */
  async getDocumentChunk(chunkId: string): Promise<RetrievalResult | null> {
    // Try dense index first (more likely to have the chunk)
    let result = await this.denseProvider.getDocumentChunk(chunkId);

    // Fallback to sparse index if not found
    if (!result) {
      result = await this.sparseProvider.getDocumentChunk(chunkId);
    }

    return result;
  }

  /**
   * Query preprocessing for better search quality
   */
  private preprocessQuery(query: string): ProcessedQuery {
    const original = query;

    // Clean and normalize query
    let cleaned = query
      .toLowerCase()
      .trim()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove common punctuation that doesn't help search
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract important terms (longer than 2 chars)
    const terms = cleaned
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 10); // Limit to avoid overly complex queries

    return {
      original,
      cleaned: cleaned || original, // Fallback to original if cleaning removed everything
      terms
    };
  }

  /**
   * Merge and deduplicate results from semantic and keyword search
   */
  private mergeAndDeduplicateResults(semanticResults: any[], keywordResults: any[]): any[] {
    const resultMap = new Map();

    // Add semantic results
    semanticResults.forEach(result => {
      resultMap.set(result.id, {
        ...result,
        sources: ['semantic'],
        semanticScore: result.score,
        keywordScore: 0
      });
    });

    // Add keyword results, combining with semantic if duplicate
    keywordResults.forEach(result => {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Combine scores from both sources
        existing.sources.push('keyword');
        existing.keywordScore = result.score;
      } else {
        resultMap.set(result.id, {
          ...result,
          sources: ['keyword'],
          semanticScore: 0,
          keywordScore: result.score
        });
      }
    });

    return Array.from(resultMap.values());
  }

  /**
   * Rerank results using Pinecone's native reranking
   */
  private async rerank(query: string, results: any[], topN: number): Promise<RetrievalResult[]> {
    try {
      if (!results || results.length === 0) {
        return [];
      }

      // Prepare documents for reranking - use simple string array format
      const documents = results.map(result => result.content || '').filter(content => content.length > 0);

      if (documents.length === 0) {
        logger.warn('No valid documents for reranking, returning original order');
        return results.slice(0, topN).map(result => this.convertToRetrievalResult(result));
      }

      logger.info(`🔄 Reranking ${documents.length} documents...`);

      // Use Pinecone's rerank API with correct format
      const rerankedResponse = await this.pinecone.inference.rerank(
        'bge-reranker-v2-m3',
        query,
        documents,
        {
          topN: Math.min(topN, documents.length),
          returnDocuments: true
        }
      );

      // Convert reranked results back to RetrievalResult format
      const rerankedResults: RetrievalResult[] = [];

      for (const item of rerankedResponse.data || []) {
        const originalIndex = item.index;
        if (originalIndex >= 0 && originalIndex < results.length) {
          const originalResult = results[originalIndex];
          rerankedResults.push(this.convertToRetrievalResult(originalResult));
        }
      }

      logger.info(`✅ Reranked to ${rerankedResults.length} results`);
      return rerankedResults;

    } catch (error) {
      logger.error('Reranking failed, falling back to original order:', error);
      // Fallback to original order
      return results.slice(0, topN).map(result => this.convertToRetrievalResult(result));
    }
  }

  /**
   * Apply token limits to results
   */
  private applyTokenLimits(results: RetrievalResult[], maxTokens: number): RetrievalResult[] {
    const approximateTokensPerChar = 0.25;
    let totalTokens = 0;
    const limitedResults: RetrievalResult[] = [];

    for (const result of results) {
      const estimatedTokens = result.content.length * approximateTokensPerChar;

      if (totalTokens + estimatedTokens > maxTokens && limitedResults.length > 0) {
        break;
      }

      limitedResults.push(result);
      totalTokens += estimatedTokens;
    }

    return limitedResults;
  }

  /**
   * Converts search results to standard RetrievalResult format
   */
  private convertToRetrievalResult(result: any): RetrievalResult {
    const frameworkValue = String(result.metadata?.framework || 'common');
    const validFramework = (frameworkValue === 'flow' || frameworkValue === 'hilla')
      ? frameworkValue as 'flow' | 'hilla'
      : 'common' as const;

    // Explicitly construct response without parent_id
    const response = {
      chunk_id: result.id,
      parent_id: result.metadata?.parent_id || null,
      framework: validFramework,
      content: result.content,
      source_url: result.metadata?.source_url || '',
      file_path: result.metadata?.file_path || '',
      metadata: {
        title: result.metadata?.title || 'Untitled',
        heading: result.metadata?.heading || '',
      },
      relevance_score: result.score || 0
    } as RetrievalResult;

    return response;
  }

  /**
   * Convert semantic search result to RetrievalResult format
   */
  private convertSemanticToRetrievalResult(result: any): RetrievalResult {
    const frameworkValue = String(result.metadata?.framework || 'common');
    const validFramework = (frameworkValue === 'flow' || frameworkValue === 'hilla')
      ? frameworkValue as 'flow' | 'hilla'
      : 'common' as const;

    return {
      chunk_id: result.id,
      parent_id: result.metadata?.parent_id || null,
      framework: validFramework,
      content: result.content,
      source_url: result.metadata?.source_url || '',
      file_path: result.metadata?.file_path || '',
      metadata: {
        title: result.metadata?.title || 'Untitled',
        heading: result.metadata?.heading || '',
      },
      relevance_score: result.score || 0,
    };
  }
}
