/**
 * Simplified Markdown Chunker
 * 
 * Uses LangChain's MarkdownHeaderTextSplitter to create chunks for search while
 * preserving file_path metadata for full document retrieval.
 */

import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { nanoid } from 'nanoid';
import type { DocumentChunk, Framework } from 'core-types';

/**
 * Configuration for the chunking process
 */
export interface ChunkingConfig {
  maxChunkSize?: number;
  chunkOverlap?: number;
  generateChunkIds?: boolean;
  version?: string;
}

/**
 * Represents a chunk with basic metadata for document retrieval
 */
export interface BasicChunk {
  chunk_id: string;
  content: string;
  level: number;
  heading?: string;
  metadata: {
    framework: Framework;
    source_url: string;
    title?: string;
    file_path: string;
    [key: string]: any;
  };
}

/**
 * Chunks markdown documents for search with file_path metadata for full document retrieval
 */
export class MarkdownChunker {
  private markdownSplitter: MarkdownTextSplitter;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(private config: ChunkingConfig = {}) {
    // Configure markdown-based splitting
    this.markdownSplitter = new MarkdownTextSplitter({
      chunkSize: config.maxChunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200
    });

    // Configure fallback text splitting for large sections
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.maxChunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200,
      separators: ["\n\n", "\n", " ", ""]
    });
  }

  /**
   * Chunks a single document into basic chunks with file_path metadata
   */
  async chunkDocument(document: Document): Promise<BasicChunk[]> {
    const filePath = document.metadata.file_path || '';
    const baseId = this.generateBaseId(filePath);
    
    // First, split using markdown splitter
    const chunks = await this.markdownSplitter.splitDocuments([document]);
    
    // Process each chunk
    const basicChunks: BasicChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const level = this.determineHeaderLevel(chunk.pageContent);
      
      // If chunk is too large, further split it
      const subChunks = await this.splitLargeChunk(chunk);
      
      for (let j = 0; j < subChunks.length; j++) {
        const subChunk = subChunks[j];
        const chunkId = this.config.generateChunkIds !== false 
          ? `${baseId}-${i}-${j}`
          : `${baseId}-${i}`;

        const basicChunk: BasicChunk = {
          chunk_id: chunkId,
          content: subChunk.pageContent.trim(),
          level,
          heading: this.extractHeading(subChunk.pageContent),
          metadata: {
            ...document.metadata,
            framework: document.metadata.framework || 'common',
            source_url: document.metadata.source_url || '',
            title: document.metadata.title,
            file_path: filePath,
            heading: this.extractHeading(subChunk.pageContent),
            level
          }
        };

        basicChunks.push(basicChunk);
      }
    }
    
    return basicChunks;
  }

  /**
   * Converts BasicChunk to DocumentChunk format
   */
  convertToDocumentChunk(basicChunk: BasicChunk): DocumentChunk {
    return {
      chunk_id: basicChunk.chunk_id,
      parent_id: null, // No longer using hierarchical relationships
      framework: basicChunk.metadata.framework,
      content: basicChunk.content,
      source_url: basicChunk.metadata.source_url,
      metadata: {
        ...basicChunk.metadata,
        title: basicChunk.metadata.title,
        heading: basicChunk.heading,
        level: basicChunk.level
      }
    };
  }

  /**
   * Processes multiple documents and returns DocumentChunks
   */
  async processDocuments(documents: Document[]): Promise<DocumentChunk[]> {
    const allChunks: DocumentChunk[] = [];
    
    for (const document of documents) {
      const basicChunks = await this.chunkDocument(document);
      const documentChunks = basicChunks.map(chunk => this.convertToDocumentChunk(chunk));
      allChunks.push(...documentChunks);
    }
    
    return allChunks;
  }

  /**
   * Generates a base ID for chunks from a file path
   */
  private generateBaseId(filePath: string): string {
    return filePath
      .replace(/\.md$/, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();
  }

  /**
   * Determines the header level of a chunk
   */
  private determineHeaderLevel(content: string): number {
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^(#+)\s/);
      if (match) {
        return match[1].length;
      }
    }
    return 0;
  }

  /**
   * Extracts heading text from content
   */
  private extractHeading(content: string): string | undefined {
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^#+\s+(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  /**
   * Splits large chunks into smaller pieces
   */
  private async splitLargeChunk(chunk: Document): Promise<Document[]> {
    const maxSize = this.config.maxChunkSize || 1000;
    
    if (chunk.pageContent.length <= maxSize) {
      return [chunk];
    }
    
    // Use text splitter for large chunks
    return await this.textSplitter.splitDocuments([chunk]);
  }
}

/**
 * Factory function to create a chunker with default configuration
 */
export function createChunker(config: ChunkingConfig = {}): MarkdownChunker {
  return new MarkdownChunker(config);
} 