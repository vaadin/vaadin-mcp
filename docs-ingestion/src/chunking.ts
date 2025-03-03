/**
 * Semantic chunking strategy for dividing AsciiDoc documents into appropriate chunks for embedding
 * Implements a heading-based approach that:
 * 1. Preserves semantic units by keeping entire sections as one chunk
 * 2. Maintains context by including breadcrumbs for sub-headings
 * 3. Preserves code blocks by never breaking them up
 * 4. Outputs clean markdown with proper formatting
 */

import { config } from './config';
import { processAsciiDoc } from './asciidoc-processor';

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
 * Extract headings and their content from HTML
 * @param html - HTML content
 * @returns Array of headings with their content
 */
function extractHeadingsWithContent(html: string): Heading[] {
  const headings: Heading[] = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  
  // Find all headings
  let match;
  const headingPositions: {level: number, text: string, position: number}[] = [];
  
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    // Decode HTML entities in the heading text before removing HTML tags
    let text = match[2];
    text = text.replace(/&amp;/g, '&')
               .replace(/<[^>]*>/g, '').trim();
    
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
    const endPos = next ? next.position : html.length;
    
    // Extract the heading tag itself
    const headingTagMatch = html.substring(startPos).match(/<h[1-6][^>]*>.*?<\/h[1-6]>/i);
    const headingTag = headingTagMatch ? headingTagMatch[0] : '';
    
    // Content starts after the heading tag
    const contentStartPos = startPos + headingTag.length;
    
    // Extract content (everything between this heading and the next)
    const content = html.substring(contentStartPos, endPos).trim();
    
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
 * Generate breadcrumb for a heading based on its parent headings
 * @param heading - Current heading
 * @param headings - All headings
 * @returns Breadcrumb string
 */
function generateBreadcrumb(heading: Heading, headings: Heading[]): string {
  // Find parent headings (those with lower level numbers that come before this heading)
  const parentHeadings = headings
    .filter(h => h.level < heading.level && h.position < heading.position)
    .sort((a, b) => b.position - a.position); // Sort in reverse order to get the closest parent first
  
  if (parentHeadings.length === 0) {
    return heading.text;
  }
  
  // Get the closest parent heading
  const parent = parentHeadings[0];
  
  return `${parent.text} > ${heading.text}`;
}

/**
 * Convert HTML to Markdown
 * @param html - HTML content
 * @returns Markdown content
 */
function htmlToMarkdown(html: string): string {
  let markdown = html;
  
  // Handle code blocks
  markdown = markdown.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (match, content) => {
    // Remove code tags inside pre if present, but preserve the content exactly as is
    let code = content.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '$1');
    
    // Decode HTML entities, but preserve tags for code examples
    code = code.replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&amp;/g, '&')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'")
               .replace(/&nbsp;/g, ' ');
    
    // Determine if there's a language specified
    const langMatch = match.match(/class=".*?language-([a-zA-Z0-9]+).*?"/i);
    const language = langMatch ? langMatch[1] : '';
    
    return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
  });
  
  // Handle inline code
  markdown = markdown.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  
  // Handle strong/bold
  markdown = markdown.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  
  // Handle emphasis/italic
  markdown = markdown.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  
  // Handle links
  markdown = markdown.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  
  // Handle lists
  markdown = markdown.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    return content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  });
  
  markdown = markdown.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    let index = 1;
    return content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (m: string, c: string) => `${index++}. ${c}\n`);
  });
  
  // Handle paragraphs
  markdown = markdown.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  
  // Remove remaining HTML tags, but be careful not to remove content within code blocks
  // First, let's extract and save code blocks
  const codeBlocks: string[] = [];
  markdown = markdown.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  // Now remove HTML tags from non-code content
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    markdown = markdown.replace(`__CODE_BLOCK_${index}__`, block);
  });
  
  // Decode HTML entities - make sure to decode &amp; first to avoid double-decoding issues
  markdown = markdown.replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&hellip;/g, '...')
                    .replace(/&#8217;/g, "'")
                    .replace(/&#8216;/g, "'")
                    .replace(/&#8220;/g, '"')
                    .replace(/&#8221;/g, '"')
                    .replace(/&#8211;/g, '-')
                    .replace(/&#8212;/g, '--')
                    .replace(/&#8230;/g, '...')
                    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  
  // Normalize whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  return markdown;
}

/**
 * Chunk a document based on its semantic structure
 * @param content - The document content (HTML)
 * @param metadata - The document metadata
 * @returns Array of chunks
 */
export function chunkDocument(content: string, metadata: Record<string, string>): Chunk[] {
  
  // Extract headings with their content
  const headingsWithContent = extractHeadingsWithContent(content);
  
  // Create chunks from headings
  const chunks: Chunk[] = [];
  
  // Process each heading and its content
  for (let i = 0; i < headingsWithContent.length; i++) {
    const heading = headingsWithContent[i];
    
    // Skip empty sections or sections with only placeholders like section_outline::[]
    const trimmedContent = heading.content.trim();
    
    // Check if content is empty or too short
    if (!trimmedContent || trimmedContent.length < 100) {
      continue;
    }
    
    // Generate breadcrumb for sub-headings
    let title = heading.text;
    if (heading.level > 1) {
      title = generateBreadcrumb(heading, headingsWithContent);
    }
    
    // Convert content to markdown
    const markdownContent = htmlToMarkdown(heading.content);
    
    // Create the chunk
    // Ensure title has HTML entities decoded
    const decodedTitle = title.replace(/&amp;/g, '&')
                              .replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>')
                              .replace(/&quot;/g, '"')
                              .replace(/&#39;/g, "'");
    
    chunks.push({
      text: `# ${decodedTitle}\n\n${markdownContent}`,
      metadata: {
        ...metadata,
        heading: heading.text,
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
  return chunks.map((chunk) => {
    // Add document info if available
    if (chunk.metadata.title) {
      const docInfo = `[Document: ${chunk.metadata.title}]`;
      chunk.text = `${docInfo}\n${chunk.text}`;
    }
    
    return chunk;
  });
}
