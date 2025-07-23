/**
 * URL generation utilities for Vaadin documentation
 */

import path from 'path';
import type { ProcessedMetadata, Framework } from 'core-types';

/**
 * Generate a direct Vaadin docs URL from a file path
 * @param filePath - The path to the source file
 * @param repoPath - The path to the local repository
 * @returns The generated Vaadin.com URL
 */
export function generateVaadinUrl(filePath: string, repoPath: string): string {
  // Get the source path relative to repo root
  const sourcePath = filePath.replace(repoPath, '');
  
  // Generate direct Vaadin docs URL
  if (sourcePath && sourcePath.includes('articles/')) {
    // Extract the path after 'articles/'
    const match = sourcePath.match(/articles\/(.+)/);
    if (match) {
      const path = match[1];
      // Remove index.adoc or .adoc extension
      const cleanPath = path.replace(/\/index\.adoc$/, '').replace(/\.adoc$/, '');
      return `https://vaadin.com/docs/${cleanPath}`;
    } else {
      // Fallback to GitHub URL if pattern doesn't match
      return `https://github.com/vaadin/docs/blob/main/${sourcePath}`;
    }
  } else {
    // Fallback to GitHub URL if not in articles directory
    return `https://github.com/vaadin/docs/blob/main/${sourcePath}`;
  }
}

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
    .map(([key, value]) => `${key}: ${value}`);
  
  return `---\n${frontmatterLines.join('\n')}\n---\n\n`;
} 