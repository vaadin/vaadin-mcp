/**
 * OpenAI embeddings generation
 */

import OpenAI from 'openai';
import { config } from './config';
import type { Chunk } from './chunking';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Document with embedding
 */
export interface DocumentWithEmbedding extends Chunk {
  embedding: number[];
}

/**
 * Generate embeddings for chunks using OpenAI API
 * @param chunks - Array of chunks to embed
 * @returns Promise with array of documents with embeddings
 */
export async function generateEmbeddings(chunks: Chunk[]): Promise<DocumentWithEmbedding[]> {
  const results: DocumentWithEmbedding[] = [];
  
  console.log(`Generating embeddings for ${chunks.length} chunks...`);
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < chunks.length; i += config.openai.batchSize) {
    const batch = chunks.slice(i, i + config.openai.batchSize);
    const texts = batch.map(chunk => chunk.text);
    
    try {
      console.log(`Processing batch ${i / config.openai.batchSize + 1}/${Math.ceil(chunks.length / config.openai.batchSize)}`);
      
      const response = await openai.embeddings.create({
        model: config.openai.model,
        input: texts,
        encoding_format: "float"
      });
      
      for (let j = 0; j < batch.length; j++) {
        if (response.data[j] && response.data[j].embedding) {
          results.push({
            ...batch[j],
            embedding: response.data[j].embedding
          });
        } else {
          console.error(`No embedding returned for chunk ${i + j}`);
        }
      }
      
      // Simple rate limiting
      if (i + config.openai.batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, config.openai.rateLimitDelay));
      }
    } catch (error) {
      console.error(`Error generating embeddings for batch starting at index ${i}:`, error);
      
      // Implement exponential backoff for rate limiting errors
      if (error instanceof OpenAI.APIError && error.status === 429) {
        const delay = 1000 * Math.pow(2, Math.floor(i / config.openai.batchSize) % 5); // Exponential backoff up to 32 seconds
        console.log(`Rate limited. Waiting for ${delay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        i -= config.openai.batchSize; // Retry this batch
      }
    }
  }
  
  console.log(`Generated embeddings for ${results.length} chunks`);
  return results;
}
