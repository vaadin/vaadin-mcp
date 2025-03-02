/**
 * Chunking strategy for dividing documents into appropriate chunks for embedding
 * Implements best practices for documentation chunking for RAG:
 * 1. Preserves semantic units (especially code blocks)
 * 2. Maintains context by keeping headings with content
 * 3. Optimizes chunk size for relevance
 * 4. Uses document structure to guide chunking
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
 * Identifies code blocks in HTML content
 * @param content - HTML content
 * @returns Array of code block positions {start, end}
 */
export function identifyCodeBlocks(content: string): Array<{start: number, end: number}> {
  const codeBlocks: Array<{start: number, end: number}> = [];
  
  // Match pre tags which typically contain code blocks
  const preRegex = /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi;
  let match;
  
  while ((match = preRegex.exec(content)) !== null) {
    codeBlocks.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  // Also match code tags
  const codeRegex = /<code\b[^>]*>([\s\S]*?)<\/code>/gi;
  while ((match = codeRegex.exec(content)) !== null) {
    // Check if this code block is already inside a pre tag we found
    const isInsidePre = codeBlocks.some(block => 
      match!.index >= block.start && match!.index + match![0].length <= block.end
    );
    
    if (!isInsidePre) {
      codeBlocks.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  // Match AsciiDoc-specific listing blocks (used for code examples)
  const listingBlockRegex = /<div class="listingblock">([\s\S]*?)<\/div>/gi;
  while ((match = listingBlockRegex.exec(content)) !== null) {
    // Check if this block contains a pre or code tag
    const blockContent = match[1];
    if (blockContent.includes('<pre') || blockContent.includes('<code')) {
      codeBlocks.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  // Match highlightjs blocks which are used for syntax highlighting
  const highlightjsRegex = /<pre class="highlightjs[^"]*">([\s\S]*?)<\/pre>/gi;
  while ((match = highlightjsRegex.exec(content)) !== null) {
    // Check if this block is already inside a listing block we found
    const isInsideListingBlock = codeBlocks.some(block => 
      match!.index >= block.start && match!.index + match![0].length <= block.end
    );
    
    if (!isInsideListingBlock) {
      codeBlocks.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  return codeBlocks;
}

/**
 * Extracts headings hierarchy from HTML content
 * @param content - HTML content
 * @returns Array of headings with their level and position
 */
function extractHeadingsHierarchy(content: string): Array<{text: string, level: number, position: number}> {
  const headings: Array<{text: string, level: number, position: number}> = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  
  while ((match = headingRegex.exec(content)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    
    headings.push({
      text,
      level,
      position: match.index
    });
  }
  
  return headings;
}

/**
 * Gets the context heading for a given position in the content
 * @param position - Position in content
 * @param headings - Array of extracted headings
 * @returns Heading context as a string
 */
function getHeadingContext(position: number, headings: Array<{text: string, level: number, position: number}>): string {
  // Find the most recent heading before this position
  const relevantHeadings = headings
    .filter(h => h.position <= position)
    .sort((a, b) => b.position - a.position); // Sort in reverse order
  
  if (relevantHeadings.length === 0) return '';
  
  // Get the most immediate heading
  const immediateHeading = relevantHeadings[0];
  
  // Find parent headings (with lower level numbers = higher in hierarchy)
  const parentHeadings = relevantHeadings
    .filter(h => h.level < immediateHeading.level)
    .sort((a, b) => a.level - b.level); // Sort by level
  
  // Construct heading context
  const headingParts = [immediateHeading.text];
  
  // Add up to 2 parent headings for context
  for (let i = 0; i < Math.min(2, parentHeadings.length); i++) {
    headingParts.unshift(parentHeadings[i].text);
  }
  
  return headingParts.join(' > ');
}

/**
 * Chunk a document based on its structure
 * @param content - The document content (HTML)
 * @param metadata - The document metadata
 * @returns Array of chunks
 */
export function chunkDocument(content: string, metadata: Record<string, string>): Chunk[] {
  const chunks: Chunk[] = [];
  
  // Extract headings for context and summary
  const headings = extractHeadingsHierarchy(content);
  
  // Extract top-level headings for context in other chunks
  const topLevelHeadings = headings
    .filter(h => h.level <= 2)
    .map(h => h.text)
    .slice(0, 5)
    .join(' | ');
  
  // Store document info in a variable for use in chunk metadata
  const documentInfo = {
    document_length: content.length,
    heading_count: headings.length,
    top_level_headings: topLevelHeadings
  };
  
  // We no longer create a separate document summary chunk as it doesn't add value beyond metadata
  
  // Identify code blocks to preserve them
  const codeBlocks = identifyCodeBlocks(content);
  
  // Split by semantic sections (headings)
  const sections = content.split(/(?=<h[1-6])/i);
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Skip empty sections
    if (!section.trim()) {
      continue;
    }
    
    // Extract heading if present
    const headingMatch = section.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    const heading = headingMatch ? headingMatch[1].replace(/<[^>]*>/g, '').trim() : '';
    
    // Skip sections that are just a heading with no content
    if (headingMatch && section.length <= headingMatch[0].length + 10) {
      // If this is the last section or the heading is important, include it with the next section
      if (i < sections.length - 1 && heading) {
        // Combine with next section
        sections[i+1] = section + sections[i+1];
      }
      continue;
    }
    
    // For sections that are too long, we need to split them intelligently
    if (section.length > config.chunking.maxSectionLength) {
      // Check if this section contains code blocks
      // We need to find code blocks in the section text directly
      const sectionCodeBlocks: Array<{start: number, end: number}> = [];
      
      // Look for listing blocks in this section
      const listingBlockRegex = /<div class="listingblock">([\s\S]*?)<\/div>/gi;
      let match;
      let sectionCopy = section;
      while ((match = listingBlockRegex.exec(sectionCopy)) !== null) {
        sectionCodeBlocks.push({
          start: match.index,
          end: match.index + match[0].length
        });
      }
      
      // Look for pre tags in this section
      const preRegex = /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi;
      sectionCopy = section;
      while ((match = preRegex.exec(sectionCopy)) !== null) {
        // Check if this pre tag is already inside a listing block we found
        const isInsideListingBlock = sectionCodeBlocks.some(block => 
          match!.index >= block.start && match!.index + match![0].length <= block.end
        );
        
        if (!isInsideListingBlock) {
          sectionCodeBlocks.push({
            start: match.index,
            end: match.index + match[0].length
          });
        }
      }
      
      if (sectionCodeBlocks.length > 0) {
        // Handle sections with code blocks specially
        const sectionChunks = splitSectionWithCodeBlocks(
          section, 
          sectionCodeBlocks,
          heading,
          metadata,
          i
        );
        
        sectionChunks.forEach(chunk => chunks.push(chunk));
      } else {
        // For sections without code blocks, split by semantic units
        const semanticChunks = splitBySemanticUnits(section, heading, metadata, i);
        semanticChunks.forEach(chunk => chunks.push(chunk));
      }
    } else {
      // For smaller sections, keep them as a single chunk
      chunks.push({
        text: section,
        metadata: {
          ...metadata,
          heading,
          chunk_type: 'section',
          section_index: i,
        }
      });
    }
  }
  return chunks;
}

/**
 * Split a section that contains code blocks
 * @param section - Section content
 * @param codeBlocks - Code blocks in this section
 * @param heading - Section heading
 * @param metadata - Document metadata
 * @param sectionIndex - Index of this section
 * @returns Array of chunks
 */
function splitSectionWithCodeBlocks(
  section: string, 
  codeBlocks: Array<{start: number, end: number}>,
  heading: string,
  metadata: Record<string, string>,
  sectionIndex: number
): Chunk[] {
  const chunks: Chunk[] = [];
  
  // Sort code blocks by position
  codeBlocks.sort((a, b) => a.start - b.start);
  
  let lastEnd = 0;
  let lastTextChunk = '';
  
  // Process each code block and the text before it
  for (const block of codeBlocks) {
    // Text before the code block
    if (block.start > lastEnd) {
      const textBefore = section.substring(lastEnd, block.start);
      
      // Always add text before code block, even if it's short
      // This ensures we don't lose context around code blocks
      if (textBefore.trim().length > 0) {
        chunks.push({
          text: (heading ? `<h3>${heading}</h3>` : '') + textBefore,
          metadata: {
            ...metadata,
            heading,
            chunk_type: 'text_content',
            section_index: sectionIndex,
          }
        });
        lastTextChunk = textBefore;
      }
    }
    
    // The code block itself - always preserve code blocks as their own chunks
    const codeBlock = section.substring(block.start, block.end);
    
    // Add context from previous text if available
    let contextPrefix = '';
    if (lastTextChunk.length > 0) {
      // For code blocks, we want more substantial context - get at least a full sentence or paragraph
      // This ensures we have meaningful context even if it exceeds the overlap size
      
      // First try to get a complete paragraph or sentence
      const paragraphMatch = lastTextChunk.match(/([^.!?]+[.!?]+)[^.!?]*$/);
      if (paragraphMatch && paragraphMatch[1] && paragraphMatch[1].length > 20) {
        // We found a complete sentence at the end of the text
        contextPrefix = paragraphMatch[1].trim();
      } else {
        // If we can't find a complete sentence, get a larger chunk of text
        const minContextSize = Math.max(config.chunking.overlapSize * 2, 200); // At least 200 chars or double the overlap
        const contextSize = Math.min(minContextSize, lastTextChunk.length);
        contextPrefix = lastTextChunk.substring(lastTextChunk.length - contextSize);
      }
      
      // Only include context if it's not just whitespace
      if (contextPrefix.trim().length < 20) { // Require at least 20 chars of meaningful context
        contextPrefix = '';
      }
    }
    
    chunks.push({
      text: (heading ? `<h3>${heading}</h3>` : '') + 
            (contextPrefix ? `<div class="context">${contextPrefix}</div>` : '') + 
            codeBlock,
      metadata: {
        ...metadata,
        heading,
        chunk_type: 'code_block',
        section_index: sectionIndex,
        has_context: contextPrefix.length > 0,
      }
    });
    
    lastEnd = block.end;
    lastTextChunk = ''; // Reset after using a code block
  }
  
  // Text after the last code block
  if (lastEnd < section.length) {
    const textAfter = section.substring(lastEnd);
    
    // Always add text after code block, even if it's short
    // This ensures we don't lose context after code blocks
    if (textAfter.trim().length > 0) {
      // We don't add code context to text that follows code blocks
      // This avoids the issue of incomplete code fragments being added as context
      let contextPrefix = '';
      
      chunks.push({
        text: (heading ? `<h3>${heading}</h3>` : '') + 
              (contextPrefix ? `<div class="context">${contextPrefix}</div>` : '') + 
              textAfter,
        metadata: {
          ...metadata,
          heading,
          chunk_type: 'text_content',
          section_index: sectionIndex,
          has_context: contextPrefix.length > 0,
        }
      });
    }
  }
  
  return chunks;
}

/**
 * Split a section by semantic units (paragraphs, lists, etc.)
 * @param section - Section content
 * @param heading - Section heading
 * @param metadata - Document metadata
 * @param sectionIndex - Index of this section
 * @returns Array of chunks
 */
function splitBySemanticUnits(
  section: string,
  heading: string,
  metadata: Record<string, string>,
  sectionIndex: number
): Chunk[] {
  const chunks: Chunk[] = [];
  
  // Extract the heading part if present
  const headingMatch = section.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
  const headingPart = headingMatch ? headingMatch[0] : '';
  const contentPart = headingMatch ? section.substring(headingMatch[0].length) : section;
  
  // Split by semantic units (paragraphs, lists, divs, etc.)
  const semanticUnitRegex = /(?=<p\b)|(?=<ul\b)|(?=<ol\b)|(?=<div\b)|(?=<table\b)|(?=<section\b)/i;
  const units = contentPart.split(semanticUnitRegex);
  
  let currentChunk = headingPart;
  let currentLength = headingPart.length;
  let lastUnitAdded = ''; // Track the last unit added for overlap
  
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    
    // If adding this unit would exceed the target length, create a new chunk
    if (currentLength + unit.length > config.chunking.maxSectionLength && currentLength > 0) {
      // Only create chunk if it has substantial content
      if (currentLength > config.chunking.minParagraphLength) {
        chunks.push({
          text: currentChunk,
          metadata: {
            ...metadata,
            heading,
            chunk_type: 'semantic_unit',
            section_index: sectionIndex,
            unit_index: chunks.length,
          }
        });
      }
      
      // Get overlap text from the end of the last chunk
      let overlapText = '';
      if (config.chunking.overlapSize > 0 && lastUnitAdded.length > 0) {
        // Create overlap from the end of the last unit
        const overlapSize = Math.min(config.chunking.overlapSize, lastUnitAdded.length);
        overlapText = lastUnitAdded.substring(lastUnitAdded.length - overlapSize);
      }
      
      // Start a new chunk, including the heading for context and overlap text
      currentChunk = headingPart + overlapText + unit;
      currentLength = headingPart.length + overlapText.length + unit.length;
      lastUnitAdded = unit;
    } else {
      // Add to current chunk
      currentChunk += unit;
      currentLength += unit.length;
      lastUnitAdded = unit;
    }
  }
  
  // Add the final chunk if it has content
  if (currentLength > config.chunking.minParagraphLength) {
    chunks.push({
      text: currentChunk,
      metadata: {
        ...metadata,
        heading,
        chunk_type: 'semantic_unit',
        section_index: sectionIndex,
        unit_index: chunks.length,
      }
    });
  }
  
  return chunks;
}

/**
 * Prepare chunks for embedding by cleaning and formatting text
 * @param chunks - The original chunks
 * @returns Prepared chunks
 */
export function prepareChunksForEmbedding(chunks: Chunk[]): Chunk[] {
  // Add document position metadata to each chunk
  const totalChunks = chunks.length;
  
  return chunks.map((chunk, index) => {
    // Add position metadata
    chunk.metadata.position_in_document = index === 0 ? 'beginning' : 
                                          index === totalChunks - 1 ? 'end' : 
                                          'middle';
    chunk.metadata.chunk_index = index;
    chunk.metadata.total_chunks = totalChunks;
    
    let cleanedText;
    
    // Extract context div if present
    let contextText = '';
    const contextMatch = chunk.text.match(/<div class="context">([\s\S]*?)<\/div>/i);
    if (contextMatch) {
      contextText = contextMatch[1].replace(/<[^>]*>/g, ' ').trim();
    }
    
    // Extract heading if present
    let headingText = '';
    const headingMatch = chunk.text.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (headingMatch) {
      headingText = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    }
    
    // Special handling for code blocks to preserve their structure
    if (chunk.metadata.chunk_type === 'code_block') {
      // Extract code from various HTML structures
      let codeContent = '';
      
      // Try to extract from pre tags
      const preMatch = chunk.text.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch) {
        codeContent = preMatch[1];
        // Remove code tags inside pre if present
        codeContent = codeContent.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '$1');
      }
      
      // If no pre tags, try to extract from code tags
      if (!codeContent) {
        const codeMatch = chunk.text.match(/<code\b[^>]*>([\s\S]*?)<\/code>/i);
        if (codeMatch) {
          codeContent = codeMatch[1];
        }
      }
      
      // If no pre or code tags, try to extract from listing blocks
      if (!codeContent) {
        const listingMatch = chunk.text.match(/<div class="listingblock">([\s\S]*?)<\/div>/i);
        if (listingMatch) {
          // Try to find pre or code tags inside the listing block
          const innerPreMatch = listingMatch[1].match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i);
          if (innerPreMatch) {
            codeContent = innerPreMatch[1];
            // Remove code tags inside pre if present
            codeContent = codeContent.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '$1');
          } else {
            const innerCodeMatch = listingMatch[1].match(/<code\b[^>]*>([\s\S]*?)<\/code>/i);
            if (innerCodeMatch) {
              codeContent = innerCodeMatch[1];
            }
          }
        }
      }
      
      // If we still don't have code content, use the whole chunk
      if (!codeContent) {
        codeContent = chunk.text;
      }
      
      // Clean the code content
      cleanedText = codeContent
        // Remove HTML tags but preserve code structure
        .replace(/<[^>]*>/g, ' ')
        // Normalize whitespace but preserve line breaks and indentation
        .replace(/[ \t]+/g, ' ')
        .trim();
      
      // Add context and prefix to indicate this is code
      if (headingText) {
        if (contextText) {
          cleanedText = `${headingText} - Code Example\nContext: ${contextText}\n\n${cleanedText}`;
        } else {
          cleanedText = `${headingText} - Code Example\n\n${cleanedText}`;
        }
      } else {
        if (contextText) {
          cleanedText = `Code Example\nContext: ${contextText}\n\n${cleanedText}`;
        } else {
          cleanedText = `Code Example\n\n${cleanedText}`;
        }
      }
    } else {
      // Standard HTML cleaning for non-code chunks
      cleanedText = chunk.text
        // Remove context div if present (we'll add it back later)
        .replace(/<div class="context">[\s\S]*?<\/div>/i, '')
        // Remove all HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
      
      // Format the text with heading and context
      // First, check if the text already contains the heading (possibly duplicated)
      const headingRegex = new RegExp(`^\\s*${headingText}\\s+${headingText}`, 'i');
      if (headingText) {
        // Fix duplicated headings (e.g., "User Triggered Jobs User Triggered Jobs")
        if (headingRegex.test(cleanedText)) {
          // Replace the duplicated heading with a single instance
          cleanedText = cleanedText.replace(headingRegex, headingText);
        }
        
        // Add heading if it's not already at the start
        if (!cleanedText.trim().startsWith(headingText)) {
          cleanedText = `${headingText}\n${cleanedText}`;
        }
        
        // Add context if available
        if (contextText) {
          cleanedText = `${cleanedText}\nContext: ${contextText}`;
        }
      } else if (contextText) {
        cleanedText = `${cleanedText}\nContext: ${contextText}`;
      }
      
      // Add document breadcrumb for better context
      if (chunk.metadata.title) {
        const docInfo = `[Document: ${chunk.metadata.title}]`;
        cleanedText = `${docInfo}\n${cleanedText}`;
      }
    }
    
    return {
      text: cleanedText,
      metadata: chunk.metadata,
    };
  });
}
