/**
 * Embeddings Generator
 * 
 * Generates embeddings using OpenAI's text-embedding-3-small model
 * for document chunks with batching and error handling.
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import type { DocumentChunk } from 'core-types';

/**
 * Configuration for embeddings generation
 */
export interface EmbeddingsConfig {
  openaiApiKey: string;
  modelName?: string;
  batchSize?: number;
  dimensions?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Represents a chunk with its embedding
 */
export interface ChunkWithEmbedding {
  chunk: DocumentChunk;
  embedding: number[];
}

/**
 * Generates embeddings for document chunks
 */
export class EmbeddingsGenerator {
  private embeddings: OpenAIEmbeddings;
  private batchSize: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: EmbeddingsConfig) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openaiApiKey,
      modelName: config.modelName || 'text-embedding-3-small',
      dimensions: config.dimensions || 1536
    });

    this.batchSize = config.batchSize || 50;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Generates embeddings for a batch of chunks
   */
  async generateEmbeddings(chunks: DocumentChunk[]): Promise<ChunkWithEmbedding[]> {
    const results: ChunkWithEmbedding[] = [];
    
    console.log(`Generating embeddings for ${chunks.length} chunks...`);
    
    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);
      const batchResults = await this.processBatch(batch, i / this.batchSize + 1, Math.ceil(chunks.length / this.batchSize));
      results.push(...batchResults);
    }

    console.log(`Successfully generated embeddings for ${results.length} chunks`);
    return results;
  }

  /**
   * Processes a single batch of chunks
   */
  private async processBatch(
    batch: DocumentChunk[], 
    batchNumber: number, 
    totalBatches: number
  ): Promise<ChunkWithEmbedding[]> {
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`);
    
    const texts = batch.map(chunk => this.prepareTextForEmbedding(chunk));
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const embeddings = await this.embeddings.embedDocuments(texts);
        
        const results: ChunkWithEmbedding[] = batch.map((chunk, index) => ({
          chunk,
          embedding: embeddings[index]
        }));
        
        return results;
      } catch (error) {
        console.error(`Batch ${batchNumber} attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Failed to generate embeddings for batch ${batchNumber} after ${this.maxRetries} attempts: ${error}`);
        }
        
        // Wait before retrying
        await this.sleep(this.retryDelay * attempt);
      }
    }
    
    return [];
  }

  /**
   * Prepares text content for embedding generation
   */
  private prepareTextForEmbedding(chunk: DocumentChunk): string {
    let text = '';
    
    // Add title and heading context if available
    if (chunk.metadata?.title) {
      text += `Title: ${chunk.metadata.title}\n`;
    }
    
    if (chunk.metadata?.heading) {
      text += `Heading: ${chunk.metadata.heading}\n`;
    }
    
    // Add framework context
    if (chunk.framework && chunk.framework !== 'common') {
      text += `Framework: ${chunk.framework}\n`;
    }
    
    // Add main content
    text += chunk.content;
    
    // Truncate if too long (OpenAI has token limits)
    return this.truncateText(text, 8192); // Conservative limit
  }

  /**
   * Truncates text to a maximum length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Try to truncate at a sentence boundary
    const truncated = text.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > maxLength * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    // Fall back to word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace);
    }
    
    // Hard truncate as last resort
    return truncated;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates embedding for a single text (used for queries)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.embeddings.embedQuery(text);
    return embeddings;
  }
}

/**
 * Creates an embeddings generator with the given configuration
 */
export function createEmbeddingsGenerator(config: EmbeddingsConfig): EmbeddingsGenerator {
  return new EmbeddingsGenerator(config);
}

/**
 * Validates embeddings configuration
 */
export function validateEmbeddingsConfig(config: Partial<EmbeddingsConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.openaiApiKey) {
    errors.push('OpenAI API key is required');
  }

  if (config.batchSize !== undefined && (config.batchSize < 1 || config.batchSize > 100)) {
    errors.push('Batch size must be between 1 and 100');
  }

  if (config.dimensions !== undefined && ![1536, 3072].includes(config.dimensions)) {
    errors.push('Dimensions must be 1536 or 3072 for text-embedding-3-small');
  }

  return {
    valid: errors.length === 0,
    errors
  };
} 