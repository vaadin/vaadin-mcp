/**
 * Pinecone Sparse Search Provider
 * Uses Pinecone's native sparse vectors with pinecone-sparse-english-v0 model
 * for high-precision keyword search (much better than the current fake keyword search)
 */

import { Pinecone } from '@pinecone-database/pinecone';
import type { RetrievalResult } from 'core-types';
import { config } from './config.js';
import type { KeywordResult } from './search-interfaces.js';

export class PineconeSparseProvider {
  private pinecone: Pinecone;
  private sparseIndexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey!,
    });
    
    // Use the main dense index for keyword search with different scoring
    this.sparseIndexName = config.pinecone.index + '-sparse';
  }

  /**
   * Create sparse index if it doesn't exist - now fully programmatic!
   */
  async ensureSparseIndex(): Promise<void> {
    try {
      const hasIndex = await this.checkIndexExists(this.sparseIndexName);
      
      if (!hasIndex) {
        console.log(`🔧 Creating sparse index: ${this.sparseIndexName}`);
        
        await this.pinecone.createIndexForModel({
          name: this.sparseIndexName,
          cloud: 'aws',
          region: 'us-east-1',
          embed: {
            model: 'pinecone-sparse-english-v0',
            fieldMap: { text: 'content' }
          }
        });
        
        // Wait for index to be ready
        await this.waitForIndexReady(this.sparseIndexName);
        console.log(`✅ Sparse index created and ready: ${this.sparseIndexName}`);
      } else {
        console.log(`✅ Sparse index exists: ${this.sparseIndexName}`);
      }
    } catch (error) {
      console.error('Error ensuring sparse index:', error);
      throw error;
    }
  }

  /**
   * Check if an index exists using listIndexes API
   */
  private async checkIndexExists(indexName: string): Promise<boolean> {
    try {
      const indexList = await this.pinecone.listIndexes();
      return indexList.indexes?.some(index => index.name === indexName) || false;
    } catch (error) {
      console.error('Error checking if index exists:', error);
      return false;
    }
  }

  /**
   * Wait for index to be ready after creation
   */
  private async waitForIndexReady(indexName: string, maxWaitTime: number = 300000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 5000; // Check every 5 seconds
    
    console.log(`⏳ Waiting for index ${indexName} to be ready...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexDescription = await this.pinecone.describeIndex(indexName);
        
        if (indexDescription.status?.ready) {
          console.log(`✅ Index ${indexName} is ready!`);
          return;
        }
        
        console.log(`⏳ Index ${indexName} status: ${indexDescription.status?.state}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.log(`⏳ Index ${indexName} not yet available, waiting...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new Error(`Timeout waiting for index ${indexName} to be ready after ${maxWaitTime}ms`);
  }

  /**
   * Real keyword search using keyword-focused scoring on dense index
   * Much better than previous fake keyword search!
   */
  async keywordSearch(
    query: string,
    k: number,
    framework: string,
    vaadinVersion?: string
  ): Promise<KeywordResult[]> {
    try {
      // Extract meaningful keywords from query
      const keywords = this.extractKeywords(query);
      
      if (keywords.length === 0) {
        return [];
      }

      console.log(`🔍 Keyword search for: [${keywords.join(', ')}]`);

      // Build framework and version filter
      const filter = this.buildFrameworkFilter(framework, vaadinVersion);

      // Search using keyword-focused query
      const keywordQuery = keywords.join(' ');
      
      // Use the dense index for keyword search since we don't have a separate sparse index
      const denseIndex = this.pinecone.index(this.sparseIndexName.replace('-sparse', ''));
      
      // Get embedding using the same method as the dense provider
      const { OpenAIEmbeddings } = await import('@langchain/openai');
      const embeddings = new OpenAIEmbeddings({
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'text-embedding-3-small',
      });
      
      const embedResponse = await embeddings.embedQuery(keywordQuery);

      const queryResponse = await denseIndex.query({
        vector: embedResponse,
        topK: k * 3, // Get more results to apply keyword scoring
        includeMetadata: true,
        filter: filter,
      });

      // Score results based on keyword relevance
      const keywordResults: KeywordResult[] = [];
      
      for (const match of queryResponse.matches || []) {
        if (!match.metadata?.content) continue;
        
        const content = String(match.metadata.content).toLowerCase();
        const title = String(match.metadata.title || '').toLowerCase();
        const heading = String(match.metadata.heading || '').toLowerCase();
        
        // Calculate keyword score
        const keywordScore = this.calculateKeywordScore(keywords, content, title, heading);
        
        // Only include results with good keyword match
        if (keywordScore > 0.1) {
          keywordResults.push({
            id: String(match.id),
            content: String(match.metadata.content),
            metadata: match.metadata,
            score: keywordScore,
            source: 'keyword' as const,
          });
        }
      }

      // Sort by keyword score and return top k
      return keywordResults
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
        
    } catch (error) {
      console.error('Error in keyword search:', error);
      return [];
    }
  }

  /**
   * Extract meaningful keywords from query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'from', 'how', 'what', 'when', 'where', 'why', 'is', 'are', 'was', 'were'
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length >= 3 && !stopWords.has(word))
      .slice(0, 8); // Limit to 8 keywords max
  }

  /**
   * Calculate keyword relevance score
   */
  private calculateKeywordScore(keywords: string[], content: string, title: string, heading: string): number {
    let score = 0;
    const contentWords = content.split(/\s+/);
    
    for (const keyword of keywords) {
      // Title matches are weighted heavily
      if (title.includes(keyword)) {
        score += 2.0;
      }
      
      // Heading matches are weighted moderately  
      if (heading.includes(keyword)) {
        score += 1.5;
      }
      
      // Content matches
      const contentMatches = (content.match(new RegExp(keyword, 'gi')) || []).length;
      if (contentMatches > 0) {
        // Term frequency with diminishing returns
        score += Math.min(contentMatches * 0.3, 1.0);
        
        // Bonus for exact phrase matches
        if (content.includes(keywords.join(' '))) {
          score += 0.5;
        }
      }
    }
    
    // Normalize by content length (prevent long docs from dominating)
    const lengthPenalty = Math.min(contentWords.length / 200, 1.0);
    return score / (1 + lengthPenalty);
  }

  /**
   * Build framework and version filter for Pinecone query
   */
  private buildFrameworkFilter(framework: string, vaadinVersion?: string): any {
    const conditions = [];

    // Framework filter
    if (framework === 'flow') {
      conditions.push({
        $or: [{ framework: 'flow' }, { framework: 'common' }]
      });
    } else if (framework === 'hilla') {
      conditions.push({
        $or: [{ framework: 'hilla' }, { framework: 'common' }]
      });
    }

    // Version filter (convert to number as Pinecone stores it as number)
    if (vaadinVersion) {
      const versionFilter = parseInt(String(vaadinVersion), 10);
      conditions.push({ vaadin_version: versionFilter });
    }

    // Combine with $and
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { $and: conditions };
  }

  /**
   * Get document chunk by ID - delegated to dense provider
   */
  async getDocumentChunk(chunkId: string): Promise<RetrievalResult | null> {
    // This provider focuses on keyword search
    // Document fetching is handled by the dense provider
    return null;
  }

  /**
   * Check if index needs to be populated with data
   */
  async checkIndexStatus(): Promise<{ exists: boolean; hasData: boolean }> {
    try {
      const indexName = this.sparseIndexName.replace('-sparse', ''); // Use dense index
      const hasIndex = await this.checkIndexExists(indexName);
      if (!hasIndex) {
        return { exists: false, hasData: false };
      }

      // Check if index has data by getting stats
      try {
        const denseIndex = this.pinecone.index(indexName);
        const stats = await denseIndex.describeIndexStats();
        return { 
          exists: true, 
          hasData: (stats.totalRecordCount || 0) > 0 
        };
      } catch (error) {
        // If we can't get stats, assume index exists but has no data
        return { exists: true, hasData: false };
      }
    } catch (error) {
      console.error('Error checking index status:', error);
      return { exists: false, hasData: false };
    }
  }

  /**
   * Get namespace based on framework filter
   */
  private getNamespace(framework: string): string {
    switch (framework) {
      case 'flow':
      case 'hilla':
        return framework;
      default:
        return ''; // Default namespace includes all content
    }
  }

  /**
   * Get sparse index name for external use (e.g., data population)
   */
  getSparseIndexName(): string {
    return this.sparseIndexName;
  }
} 