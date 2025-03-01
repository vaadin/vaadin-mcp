/**
 * AsciiDoc processor for converting AsciiDoc content to HTML
 */

import asciidoctor from 'asciidoctor';

// Initialize Asciidoctor processor
const processor = asciidoctor();

/**
 * Process AsciiDoc content and convert to HTML
 * @param content - The AsciiDoc content to process
 * @returns The processed HTML content
 */
export function processAsciiDoc(content: string): string {
  try {
    // Load the document
    const document = processor.load(content, {
      safe: 'server', // Safe mode level
      attributes: {
        // Common attributes for Vaadin docs
        'source-highlighter': 'highlight.js',
        'icons': 'font',
        'experimental': '',
        'toc': 'macro'
      }
    });
    
    // Convert to HTML
    const html = document.convert();
    return html;
  } catch (error) {
    console.error('Error processing AsciiDoc:', error);
    // Return original content if processing fails
    return content;
  }
}

/**
 * Clean HTML content for better embedding
 * @param html - The HTML content to clean
 * @returns The cleaned content
 */
export function cleanHtmlForEmbedding(html: string): string {
  // Remove script tags and their content
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Convert HTML entities to their corresponding characters
  cleaned = cleaned.replace(/&nbsp;/g, ' ')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Extract plain text from HTML for embedding
 * @param html - The HTML content
 * @returns Plain text content
 */
export function extractTextFromHtml(html: string): string {
  // Simple HTML to text conversion
  // Remove all HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}
