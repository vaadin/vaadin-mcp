/**
 * Pinecone service for querying the vector database
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from './config.js';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey!,
});

// Get the index
const index = pinecone.index(config.pinecone.index!);

/**
 * Search result interface
 */
export interface SearchResult {
  text: string;
  metadata: {
    title: string;
    source: string;
    url: string;
    heading?: string;
    framework?: string;
    [key: string]: any;
  };
  score: number;
}

/**
 * Generate embeddings for a query
 * @param query - The query text
 * @returns Promise with the embedding vector
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    encoding_format: 'float',
  });
  
  return response.data[0].embedding;
}

/**
 * Search for relevant documentation
 * @param query - The query text
 * @param maxResults - Maximum number of results to return
 * @param maxTokens - Maximum number of tokens to return
 * @param framework - Optional framework filter ('flow', 'hilla', or empty string)
 * @returns Promise with search results
 */
export async function searchDocumentation(
  query: string,
  maxResults: number = config.search.defaultMaxResults,
  maxTokens: number = config.search.defaultMaxTokens,
  framework: string = 'common'
): Promise<SearchResult[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateQueryEmbedding(query);
  
  // Prepare filter - always scope to vaadin_version, optionally filter by framework
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
  } else {
    // No specific framework filter, include all documents for v24
    filter = {
      $and: [
        filter,
        { $or: [
          { framework: 'flow' },
          { framework: 'hilla' },
          { framework: 'common' }
        ] }
      ]
    };
  }
  
  // Query Pinecone
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK: maxResults * 2, // Request more results than needed to filter by score
    includeMetadata: true,
    filter: filter
  });
  
  // Filter and format results
  const results: SearchResult[] = [];
  let totalTokens = 0;
  const approximateTokensPerChar = 0.25; // Rough estimate of tokens per character
  
  for (const match of queryResponse.matches || []) {
    // Skip results below the score threshold
    if ((match.score || 0) < config.search.scoreThreshold) {
      continue;
    }
    
    if (!match.metadata) {
      continue;
    }
    
    const metadata = match.metadata as any;
    const text = metadata.text || '';
    
    // Estimate token count
    const estimatedTokens = text.length * approximateTokensPerChar;
    
    // Check if adding this result would exceed the token limit
    if (totalTokens + estimatedTokens > maxTokens && results.length > 0) {
      break;
    }
    
    // Add result
    results.push({
      text,
      metadata: {
        title: metadata.title || 'Untitled',
        source: metadata.source || '',
        url: metadata.url || '',
        heading: metadata.heading || '',
        framework: metadata.framework || 'common'
      },
      score: match.score || 0,
    });
    
    totalTokens += estimatedTokens;
    
    // Stop if we have enough results
    if (results.length >= maxResults) {
      break;
    }
  }
  
  return results;
}
