/**
 * Production search provider using real Pinecone and OpenAI services
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import type { RetrievalResult } from 'core-types';
import { config } from './config.js';
import type { SearchProvider, SemanticResult, KeywordResult } from './search-interfaces.js';

export class PineconeSearchProvider implements SearchProvider {
  private pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private pineconeIndex: any;
  private vectorStore: PineconeStore;

  constructor() {
    // Initialize Pinecone client
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey!,
    });

    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Pinecone index
    this.pineconeIndex = this.pinecone.index(config.pinecone.index!);

    // Initialize LangChain Pinecone vector store
    this.vectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pineconeIndex as any, // Type compatibility fix
      textKey: 'content',
      namespace: undefined, // Use default namespace
    });
  }

  /**
   * Perform semantic search using LangChain Pinecone vector store
   */
  async semanticSearch(
    query: string,
    k: number,
    framework: string
  ): Promise<SemanticResult[]> {
    // Build filter - always scope to vaadin_version, optionally filter by framework
    let filter: any = { vaadin_version: '24' };

    if (framework === 'flow' || framework === 'hilla') {
      filter = {
        $and: [
          filter,
          { $or: [
            { framework },
            { framework: 'common' }
          ] }
        ]
      };
    }

    // Perform similarity search with LangChain
    const results = await this.vectorStore.similaritySearchWithScore(query, k, filter);
    
    return results.map((result, index) => ({
      id: result[0].metadata.chunk_id || `semantic-${index}`,
      content: result[0].pageContent,
      metadata: result[0].metadata,
      score: result[1],
      source: 'semantic' as const,
    }));
  }

  /**
   * Perform keyword search using Pinecone sparse vectors
   */
  async keywordSearch(
    query: string,
    k: number,
    framework: string
  ): Promise<KeywordResult[]> {
    // Build filter - always scope to vaadin_version, optionally filter by framework
    let filter: any = { vaadin_version: '24' };

    if (framework === 'flow' || framework === 'hilla') {
      filter = {
        $and: [
          filter,
          { $or: [
            { framework },
            { framework: 'common' }
          ] }
        ]
      };
    }

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    if (queryTerms.length === 0) {
      return [];
    }

    // Create a keyword-focused query
    const keywordQuery = queryTerms.join(' ');
    
    // Use Pinecone directly for more control over the search
    const embedResponse = await this.embeddings.embedQuery(keywordQuery);
    
    const queryResponse = await this.pineconeIndex.query({
      vector: embedResponse,
      topK: k * 2, // Get more results to filter for keyword relevance
      includeMetadata: true,
      filter: filter,
    });

    // Score results based on keyword overlap
    const results: KeywordResult[] = [];
    
    for (const match of queryResponse.matches || []) {
      if (!match.metadata || !match.metadata.content) continue;
      
      const content = String(match.metadata.content).toLowerCase();
      
      // Calculate keyword score based on term frequency
      let keywordScore = 0;
      for (const term of queryTerms) {
        const termFreq = (content.match(new RegExp(term, 'g')) || []).length;
        keywordScore += termFreq * (1 / Math.log(1 + queryTerms.indexOf(term)));
      }
      
      // Only include results with keyword matches
      if (keywordScore > 0) {
        results.push({
          id: String(match.metadata.chunk_id || match.id || `keyword-${results.length}`),
          content: String(match.metadata.content),
          metadata: match.metadata,
          score: keywordScore,
          source: 'keyword' as const,
        });
      }
      
      if (results.length >= k) break;
    }
    
    // Sort by keyword score
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Get a specific document chunk by ID
   */
  async getDocumentChunk(chunkId: string): Promise<RetrievalResult | null> {
    try {
      // Query Pinecone for the specific chunk
      const queryResponse = await this.pineconeIndex.query({
        id: chunkId,
        topK: 1,
        includeMetadata: true,
      });
      
      const match = queryResponse.matches?.[0];
      if (!match || !match.metadata) {
        return null;
      }
      
      const frameworkValue = String(match.metadata.framework || 'common');
      const validFramework = (frameworkValue === 'flow' || frameworkValue === 'hilla') 
        ? frameworkValue as 'flow' | 'hilla' 
        : 'common' as const;
      
      return {
        chunk_id: chunkId,
        framework: validFramework,
        content: String(match.metadata.content || ''),
        source_url: String(match.metadata.source_url || ''),
        metadata: {
          title: String(match.metadata.title || 'Untitled'),
          heading: String(match.metadata.heading || ''),
        },
        relevance_score: match.score || 0,
      };
    } catch (error) {
      console.error('Error fetching document chunk:', error);
      return null;
    }
  }
} 