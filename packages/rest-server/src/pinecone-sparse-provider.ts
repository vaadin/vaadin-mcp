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
  private sparseIndex: any;
  private sparseIndexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey!,
    });
    
    // Use separate sparse index
    this.sparseIndexName = `${config.pinecone.index}-sparse`;
    this.sparseIndex = this.pinecone.index(this.sparseIndexName);
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
   * Real keyword search using sparse vectors - MUCH better than current approach!
   */
  async keywordSearch(
    query: string,
    k: number,
    framework: string
  ): Promise<KeywordResult[]> {
    try {
      // Determine namespace based on framework
      const namespace = this.getNamespace(framework);
      
      const results = await this.sparseIndex.search({
        namespace,
        query: {
          topK: k,
          inputs: { text: query }
        }
      });
      
      return results.result.hits.map((hit: any) => ({
        id: String(hit._id),
        content: String(hit.fields?.content || hit.content || ''),
        metadata: hit.metadata || hit.fields || {},
        score: hit._score,
        source: 'keyword' as const,
      }));
      
    } catch (error) {
      console.error('Sparse search error:', error);
      // Graceful fallback - return empty results rather than crash
      return [];
    }
  }

  /**
   * Get document chunk by ID from sparse index
   */
  async getDocumentChunk(chunkId: string): Promise<RetrievalResult | null> {
    try {
      // Try all namespaces since we don't know which one contains the chunk
      const namespaces = ['', 'flow', 'hilla', 'common'];
      
      for (const namespace of namespaces) {
        try {
          const result = await this.sparseIndex.fetch({
            ids: [chunkId],
            namespace
          });
          
          if (result.vectors && result.vectors[chunkId]) {
            const vector = result.vectors[chunkId];
            const frameworkValue = String(vector.metadata?.framework || 'common');
            const validFramework = (frameworkValue === 'flow' || frameworkValue === 'hilla') 
              ? frameworkValue as 'flow' | 'hilla' 
              : 'common' as const;
              
            return {
              chunk_id: chunkId,
              parent_id: vector.metadata?.parent_id || null,
              framework: validFramework,
              content: String(vector.metadata?.content || ''),
              source_url: vector.metadata?.source_url || '',
              metadata: {
                title: vector.metadata?.title || 'Untitled',
                heading: vector.metadata?.heading || '',
              },
              relevance_score: 1.0, // Perfect match since we fetched by ID
            };
          }
        } catch (err) {
          // Continue to next namespace
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching document chunk from sparse index:', error);
      return null;
    }
  }

  /**
   * Check if sparse index needs to be populated with data
   */
  async checkIndexStatus(): Promise<{ exists: boolean; hasData: boolean }> {
    try {
      const hasIndex = await this.checkIndexExists(this.sparseIndexName);
      if (!hasIndex) {
        return { exists: false, hasData: false };
      }

      // Check if index has data by trying a simple query
      const testResult = await this.sparseIndex.search({
        namespace: '',
        query: {
          topK: 1,
          inputs: { text: 'test' }
        }
      });

      return { 
        exists: true, 
        hasData: testResult.result.hits.length > 0 
      };
    } catch (error) {
      console.error('Error checking sparse index status:', error);
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