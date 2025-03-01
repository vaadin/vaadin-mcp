/**
 * Chunking strategy for dividing documents into appropriate chunks for embedding
 */

import { config } from './config';

/**
 * Chunk type definition
 */
export interface Chunk {
  text: string;
  metadata: Record<string, any>;
}

/**
 * Chunk a document based on its structure
 * @param content - The document content (HTML)
 * @param metadata - The document metadata
 * @returns Array of chunks
 */
export function chunkDocument(content: string, metadata: Record<string, string>): Chunk[] {
  const chunks: Chunk[] = [];
  
  // First, add a document-level chunk with summary information
  chunks.push({
    text: `${metadata.title || 'Untitled'}: ${metadata.description || ''}`,
    metadata: {
      ...metadata,
      chunk_type: 'document_summary',
    }
  });
  
  // Split by headings (look for HTML heading tags)
  const sections = content.split(/(?=<h[1-6])/i);
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Extract heading if present
    const headingMatch = section.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    const heading = headingMatch ? headingMatch[1].replace(/<[^>]*>/g, '') : '';
    
    // Create section chunk with metadata
    chunks.push({
      text: section,
      metadata: {
        ...metadata,
        heading,
        chunk_type: 'section',
        section_index: i,
      }
    });
    
    // For longer sections, further chunk by paragraphs
    if (section.length > config.chunking.maxSectionLength) {
      // Split by paragraph tags or double line breaks
      const paragraphs = section.split(/(?=<p>)|(?=\n\n)/i);
      
      if (paragraphs.length > 1) {
        for (let j = 0; j < paragraphs.length; j++) {
          const paragraph = paragraphs[j];
          
          // Only create chunks for substantial paragraphs
          if (paragraph.length > config.chunking.minParagraphLength) {
            chunks.push({
              text: paragraph,
              metadata: {
                ...metadata,
                heading,
                chunk_type: 'paragraph',
                section_index: i,
                paragraph_index: j,
              }
            });
          }
        }
      }
    }
  }
  
  return chunks;
}

/**
 * Prepare chunks for embedding by cleaning and formatting text
 * @param chunks - The original chunks
 * @returns Prepared chunks
 */
export function prepareChunksForEmbedding(chunks: Chunk[]): Chunk[] {
  return chunks.map(chunk => {
    // Clean HTML from text
    const cleanedText = chunk.text.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return {
      text: cleanedText,
      metadata: chunk.metadata,
    };
  });
}
