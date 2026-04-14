/**
 * URL generation utilities for Vaadin documentation
 */

import type { ProcessedMetadata } from 'core-types';

/**
 * Extract metadata from AsciiDoc content
 * @param content - The AsciiDoc content
 * @returns Object with parsed metadata and cleaned content
 */
export function parseMetadata(content: string): { 
  content: string; 
  metadata: Record<string, string>;
} {
  const metadataRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(metadataRegex);

  if (!match) {
    return { 
      content, 
      metadata: {} 
    };
  }

  const metadataStr = match[1];
  const metadata: Record<string, string> = {};

  // Parse key-value pairs
  metadataStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      metadata[key.trim()] = valueParts.join(':').trim();
    }
  });

  // Remove front matter from content
  const cleanContent = content.replace(match[0], '').trim();

  return { 
    content: cleanContent, 
    metadata 
  };
}

/**
 * Generate frontmatter for markdown files
 * @param metadata - The processed metadata
 * @returns The frontmatter string
 */
export function generateFrontmatter(metadata: ProcessedMetadata): string {
  const frontmatterData = {
    ...metadata,
    processed_at: new Date().toISOString()
  };

  const frontmatterLines = Object.entries(frontmatterData)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // Quote vaadin_version to prevent YAML parsing "25.0" as a float (which drops the ".0")
      if (key === 'vaadin_version') {
        return `${key}: "${value}"`;
      }
      return `${key}: ${value}`;
    });

  return `---\n${frontmatterLines.join('\n')}\n---\n\n`;
} 