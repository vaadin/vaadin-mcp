/**
 * Semantic chunking strategy for dividing AsciiDoc documents into appropriate chunks for embedding
 * Implements a heading-based approach that:
 * 1. Preserves semantic units by keeping entire sections as one chunk
 * 2. Maintains context by including breadcrumbs for sub-headings
 * 3. Preserves code blocks by never breaking them up
 * 4. Chunks based on h2 level headings
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
 * Heading structure with level, text, and content
 */
interface Heading {
  level: number;
  text: string;
  content: string;
  position: number;
}

/**
 * Extract headings and their content from Markdown
 * @param markdown - Markdown content
 * @returns Array of headings with their content
 */
export function extractHeadingsWithContent(markdown: string): Heading[] {
  const headings: Heading[] = [];
  // Match markdown headings (# Heading, ## Heading, etc.)
  const headingRegex = /^(#{1,6})\s+(.+?)$/gm;
  
  // Find all headings
  let match;
  const headingPositions: {level: number, text: string, position: number}[] = [];
  
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length; // Number of # characters
    const text = match[2].trim();
    
    headingPositions.push({
      level,
      text,
      position: match.index
    });
  }
  
  // Sort headings by position
  headingPositions.sort((a, b) => a.position - b.position);
  
  // Extract content between headings
  for (let i = 0; i < headingPositions.length; i++) {
    const current = headingPositions[i];
    const next = i < headingPositions.length - 1 ? headingPositions[i + 1] : null;
    
    const startPos = current.position;
    // Find the end of the current heading line
    const headingEndPos = markdown.indexOf('\n', startPos);
    
    // Content starts after the heading line
    const contentStartPos = headingEndPos !== -1 ? headingEndPos + 1 : markdown.length;
    const endPos = next ? next.position : markdown.length;
    
    // Extract content (everything between this heading and the next)
    const content = markdown.substring(contentStartPos, endPos).trim();
    
    headings.push({
      level: current.level,
      text: current.text,
      content: content,
      position: current.position
    });
  }
  
  return headings;
}

/**
 * Chunk a document based on h2 level headings
 * First chunk is the main document title and introduction paragraph
 * Subsequent chunks are based on h2 level headings
 * @param content - The document content (Markdown)
 * @param metadata - The document metadata
 * @returns Array of chunks
 */
export function chunkDocument(content: string, metadata: Record<string, string>): Chunk[] {
  // Extract headings with their content
  const headingsWithContent = extractHeadingsWithContent(content);
  
  // Create chunks from headings
  const chunks: Chunk[] = [];
  
  // Get h1 heading if it exists
  const h1Heading = headingsWithContent.find(h => h.level === 1);
  const documentTitle = h1Heading ? h1Heading.text : metadata.title || '';
  
  // Create the first chunk with the document title and introduction paragraph
  if (h1Heading) {
    // Check for framework badge in h1 heading
    const h1Framework = getFrameworkFromHeading(h1Heading.text);
    
    chunks.push({
      text: `# ${h1Heading.text}\n\n${h1Heading.content}`,
      metadata: {
        ...metadata,
        heading: h1Heading.text,
        documentTitle,
        isIntroduction: true,
        // Override framework if badge is found in h1
        ...(h1Framework ? { framework: h1Framework } : {})
      }
    });
  }
  
  // Filter for h2 headings
  const h2Headings = headingsWithContent.filter(h => h.level === 2);
  
  // If no h2 headings and no h1 heading, create a single chunk with the entire content
  if (h2Headings.length === 0 && !h1Heading) {
    chunks.push({
      text: content,
      metadata: {
        ...metadata,
        documentTitle
      }
    });
    return chunks;
  }
  
  // Process each h2 heading to create a chunk
  for (let i = 0; i < h2Headings.length; i++) {
    const h2Heading = h2Headings[i];
    const nextH2 = i < h2Headings.length - 1 ? h2Headings[i + 1] : null;
    
    // Find all content between this h2 and the next h2 (or end of document)
    let sectionContent = '';
    
    // Start with the h2 heading itself
    sectionContent += `## ${h2Heading.text}\n\n${h2Heading.content}\n\n`;
    
    // Find all sub-headings (h3, h4, etc.) that belong to this h2 section
    const subHeadings = headingsWithContent.filter(h => 
      h.level > 2 && 
      h.position > h2Heading.position && 
      (!nextH2 || h.position < nextH2.position)
    );
    
    // Sort sub-headings by position
    subHeadings.sort((a, b) => a.position - b.position);
    
    // Add sub-headings content
    for (const subHeading of subHeadings) {
      sectionContent += `${'#'.repeat(subHeading.level)} ${subHeading.text}\n\n${subHeading.content}\n\n`;
    }
    
    // Skip sections below the minimum length
    if (sectionContent.trim().length < config.chunking.minSectionLength) {
      continue;
    }
    
    // Check for framework badge in h2 heading
    const h2Framework = getFrameworkFromHeading(h2Heading.text);
    
    // Create the chunk
    chunks.push({
      text: documentTitle ? `# ${documentTitle}\n\n${sectionContent}` : sectionContent,
      metadata: {
        ...metadata,
        heading: h2Heading.text,
        documentTitle,
        // Override framework if badge is found in h2
        ...(h2Framework ? { framework: h2Framework } : {})
      }
    });
  }
  
  return chunks;
}

/**
 * Extract framework information from a heading with a badge
 * @param headingText - The heading text
 * @returns The framework ('flow', 'hilla', or undefined if no badge)
 */
function getFrameworkFromHeading(headingText: string): string | undefined {
  // Check for [badge-flow]#Flow# or [badge-hilla]#Hilla#
  const badgeRegex = /\[badge-(flow|hilla)\]#(Flow|Hilla)#/;
  const match = headingText.match(badgeRegex);
  
  if (match) {
    return match[1].toLowerCase(); // Return 'flow' or 'hilla'
  }
  
  return undefined;
}

/**
 * Prepare chunks for embedding by cleaning and formatting text
 * @param chunks - The original chunks
 * @returns Prepared chunks
 */
export function prepareChunksForEmbedding(chunks: Chunk[]): Chunk[] {
  return chunks.map((chunk) => {
    // Add document info if available
    if (chunk.metadata.title) {
      const docInfo = `[Document: ${chunk.metadata.title}]`;
      chunk.text = `${docInfo}\n${chunk.text}`;
    }
    
    return chunk;
  });
}
