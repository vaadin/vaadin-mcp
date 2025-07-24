/**
 * Relationship Builder
 * 
 * Builds parent-child relationships between chunks both within files (intra-file)
 * and across files (cross-file) based on directory structure and document hierarchy.
 */

import type { DocumentChunk } from 'core-types';
import type { HierarchicalChunk } from './chunker.js';
import type { DirectoryStructure } from './hierarchy-parser.js';

/**
 * Manages relationships between document chunks
 */
export class RelationshipBuilder {
  constructor(private directoryStructure: DirectoryStructure) {}

  /**
   * Builds complete relationships for all chunks
   */
  buildRelationships(allChunks: Map<string, HierarchicalChunk[]>): DocumentChunk[] {
    const documentChunks: DocumentChunk[] = [];
    const chunkIdToParent = new Map<string, string>();

    // First pass: establish cross-file parent relationships
    this.establishCrossFileRelationships(allChunks, chunkIdToParent);

    // Second pass: convert to DocumentChunk format with all relationships
    for (const [filePath, chunks] of allChunks) {
      for (const chunk of chunks) {
        const crossFileParentId = chunkIdToParent.get(chunk.chunk_id);
        const finalParentId = crossFileParentId || chunk.parent_chunk_id || null;

        const documentChunk: DocumentChunk = {
          chunk_id: chunk.chunk_id,
          parent_id: finalParentId,
          framework: chunk.metadata.framework,
          content: chunk.content,
          source_url: chunk.metadata.source_url,
          metadata: {
            title: chunk.metadata.title,
            heading: chunk.heading,
            level: chunk.level,
            file_path: filePath,
            ...chunk.metadata
          }
        };

        documentChunks.push(documentChunk);
      }
    }

    return documentChunks;
  }

  /**
   * Establishes cross-file parent-child relationships based on directory structure
   */
  private establishCrossFileRelationships(
    allChunks: Map<string, HierarchicalChunk[]>,
    chunkIdToParent: Map<string, string>
  ): void {
    for (const [filePath, chunks] of allChunks) {
      const hierarchy = this.directoryStructure[filePath];
      
      if (!hierarchy || !hierarchy.parentPath) {
        continue; // No parent file
      }

      const parentChunks = allChunks.get(hierarchy.parentPath);
      if (!parentChunks || parentChunks.length === 0) {
        continue; // Parent file not found or has no chunks
      }

      // Find the most appropriate parent chunk
      const parentChunkId = this.findBestParentChunk(parentChunks, chunks);
      
      if (parentChunkId) {
        // Set the first chunk of this file to have the cross-file parent
        const firstChunk = this.findRootChunk(chunks);
        if (firstChunk) {
          chunkIdToParent.set(firstChunk.chunk_id, parentChunkId);
        }
      }
    }
  }

  /**
   * Finds the best parent chunk in the parent file
   */
  private findBestParentChunk(
    parentChunks: HierarchicalChunk[],
    childFileChunks: HierarchicalChunk[]
  ): string | null {
    // Strategy 1: Find a chunk that mentions the child file topic
    const childFileTopic = this.extractFileTopic(childFileChunks);
    if (childFileTopic) {
      const topicParent = this.findChunkByTopic(parentChunks, childFileTopic);
      if (topicParent) {
        return topicParent.chunk_id;
      }
    }

    // Strategy 2: Use the first header chunk if available
    const firstHeaderChunk = parentChunks.find(chunk => chunk.level > 0);
    if (firstHeaderChunk) {
      return firstHeaderChunk.chunk_id;
    }

    // Strategy 3: Fall back to the very first chunk
    return parentChunks[0]?.chunk_id || null;
  }

  /**
   * Extracts the main topic from child file chunks
   */
  private extractFileTopic(chunks: HierarchicalChunk[]): string | null {
    // Look for the main heading in the first chunk
    const firstChunk = chunks.find(chunk => chunk.level === 1) || chunks[0];
    if (firstChunk?.heading) {
      return firstChunk.heading.toLowerCase();
    }

    // Extract from content if no heading found
    const content = firstChunk?.content || '';
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch?.[1]?.toLowerCase() || null;
  }

  /**
   * Finds a chunk in parent file that mentions the given topic
   */
  private findChunkByTopic(chunks: HierarchicalChunk[], topic: string): HierarchicalChunk | null {
    const topicWords = topic.split(/\s+/).filter(word => word.length > 2);
    
    for (const chunk of chunks) {
      const content = (chunk.content + ' ' + (chunk.heading || '')).toLowerCase();
      
      // Check if chunk content contains topic words
      const matchingWords = topicWords.filter(word => content.includes(word));
      if (matchingWords.length >= Math.ceil(topicWords.length * 0.6)) {
        return chunk;
      }
    }

    return null;
  }

  /**
   * Finds the root chunk (first or most general) in a file
   */
  private findRootChunk(chunks: HierarchicalChunk[]): HierarchicalChunk | null {
    // Prefer chunks without intra-file parents (top-level within the file)
    const rootChunks = chunks.filter(chunk => !chunk.parent_chunk_id);
    if (rootChunks.length > 0) {
      return rootChunks[0];
    }

    // Fall back to the first chunk
    return chunks[0] || null;
  }
}

/**
 * Builds comprehensive chunk relationships
 */
export function buildChunkRelationships(
  allChunks: Map<string, HierarchicalChunk[]>,
  directoryStructure: DirectoryStructure
): DocumentChunk[] {
  const builder = new RelationshipBuilder(directoryStructure);
  return builder.buildRelationships(allChunks);
}

/**
 * Validates that chunk relationships are properly formed
 */
export function validateRelationships(chunks: DocumentChunk[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const chunkIds = new Set(chunks.map(chunk => chunk.chunk_id));

  for (const chunk of chunks) {
    // Check for valid parent_id references
    if (chunk.parent_id && !chunkIds.has(chunk.parent_id)) {
      errors.push(`Chunk ${chunk.chunk_id} has invalid parent_id: ${chunk.parent_id}`);
    }

    // Check for circular references (basic check)
    if (chunk.parent_id === chunk.chunk_id) {
      errors.push(`Chunk ${chunk.chunk_id} references itself as parent`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
} 