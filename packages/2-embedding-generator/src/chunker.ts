/**
 * Hierarchical Markdown Chunker
 * 
 * Uses LangChain's MarkdownHeaderTextSplitter to create chunks while preserving
 * the hierarchical structure of markdown documents.
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
}

/**
 * Represents a chunk with hierarchical information
 */
export interface HierarchicalChunk {
  chunk_id: string;
  content: string;
  level: number;
  heading?: string;
  parent_chunk_id?: string;
  metadata: {
    framework: Framework;
    source_url: string;
    title?: string;
    file_path?: string;
    [key: string]: any;
  };
}

/**
 * Chunks markdown documents with hierarchical awareness
 */
export class HierarchicalMarkdownChunker {
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
   * Chunks a single document into hierarchical chunks
   */
  async chunkDocument(document: Document): Promise<HierarchicalChunk[]> {
    const filePath = document.metadata.file_path || '';
    const baseId = this.generateBaseId(filePath);
    
    // First, split using markdown splitter
    const chunks = await this.markdownSplitter.splitDocuments([document]);
    
    // Process each chunk
    const hierarchicalChunks: HierarchicalChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const level = this.determineHeaderLevel(chunk.pageContent);
      
      // If chunk is too large, further split it
      const subChunks = await this.splitLargeChunk(chunk);
      
      for (let j = 0; j < subChunks.length; j++) {
        const subChunk = subChunks[j];
        const chunkId = this.generateChunkId(baseId, i, j);
        
        const hierarchicalChunk: HierarchicalChunk = {
          chunk_id: chunkId,
          content: subChunk.pageContent,
          level,
          heading: this.extractHeading(subChunk.pageContent),
          metadata: {
            framework: document.metadata.framework || 'common',
            source_url: document.metadata.source_url || '',
            title: document.metadata.title,
            file_path: filePath,
            ...document.metadata,
            chunk_index: i,
            sub_chunk_index: j
          }
        };
        
        hierarchicalChunks.push(hierarchicalChunk);
      }
    }

    // Establish parent-child relationships within the document
    this.establishIntraFileRelationships(hierarchicalChunks);
    
    return hierarchicalChunks;
  }

  /**
   * Splits a large chunk into smaller pieces if necessary
   */
  private async splitLargeChunk(chunk: Document): Promise<Document[]> {
    const maxSize = this.config.maxChunkSize || 1000;
    
    if (chunk.pageContent.length <= maxSize) {
      return [chunk];
    }
    
    // Use text splitter for oversized chunks
    return await this.textSplitter.splitDocuments([chunk]);
  }

  /**
   * Determines the header level from chunk content
   */
  private determineHeaderLevel(content: string): number {
    // Check content for markdown headers
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#')) {
        const headerMatch = trimmedLine.match(/^(#{1,6})\s/);
        if (headerMatch) {
          return headerMatch[1].length;
        }
      }
    }
    
    return 0; // Content without explicit headers
  }

  /**
   * Extracts the heading text from content
   */
  private extractHeading(content: string): string | undefined {
    // Try to extract from content
    const headingMatch = content.match(/^#{1,6}\s+(.+)$/m);
    return headingMatch?.[1];
  }

  /**
   * Generates a base ID from file path
   */
  private generateBaseId(filePath: string): string {
    if (!filePath) {
      return nanoid(8);
    }
    
    // Normalize the file path to use forward slashes and ensure it's relative
    let normalizedPath = filePath.replace(/\\/g, '/');
    
    // Remove any leading slashes or drive letters to ensure relative path
    normalizedPath = normalizedPath.replace(/^[A-Za-z]:/, '').replace(/^\/+/, '');
    
    // Convert file path to a clean identifier
    return normalizedPath
      .replace(/\.md$/, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generates a unique chunk ID
   */
  private generateChunkId(baseId: string, chunkIndex: number, subChunkIndex: number = 0): string {
    if (this.config.generateChunkIds === false) {
      return nanoid(12);
    }
    
    let id = `${baseId}-${chunkIndex}`;
    if (subChunkIndex > 0) {
      id += `-${subChunkIndex}`;
    }
    
    return id;
  }

  /**
   * Establishes parent-child relationships within a document based on header hierarchy
   */
  private establishIntraFileRelationships(chunks: HierarchicalChunk[]): void {
    const headerStack: HierarchicalChunk[] = [];
    
    for (const chunk of chunks) {
      if (chunk.level === 0) {
        // Content without headers - no parent relationship within file
        continue;
      }
      
      // Find the appropriate parent by traversing up the header stack
      while (headerStack.length > 0 && headerStack[headerStack.length - 1].level >= chunk.level) {
        headerStack.pop();
      }
      
      // Set parent relationship
      if (headerStack.length > 0) {
        chunk.parent_chunk_id = headerStack[headerStack.length - 1].chunk_id;
      }
      
      // Add this chunk to the stack if it's a header
      headerStack.push(chunk);
    }
  }
}

/**
 * Converts HierarchicalChunk to DocumentChunk format
 */
export function toDocumentChunk(hierarchicalChunk: HierarchicalChunk, crossFileParentId?: string): DocumentChunk {
  return {
    chunk_id: hierarchicalChunk.chunk_id,
    parent_id: crossFileParentId || hierarchicalChunk.parent_chunk_id || null,
    framework: hierarchicalChunk.metadata.framework,
    content: hierarchicalChunk.content,
    source_url: hierarchicalChunk.metadata.source_url,
    metadata: {
      title: hierarchicalChunk.metadata.title,
      heading: hierarchicalChunk.heading,
      level: hierarchicalChunk.level,
      ...hierarchicalChunk.metadata
    }
  };
}

/**
 * Creates a chunker with default configuration
 */
export function createChunker(config?: ChunkingConfig): HierarchicalMarkdownChunker {
  return new HierarchicalMarkdownChunker(config);
} 