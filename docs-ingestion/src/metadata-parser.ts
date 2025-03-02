/**
 * Metadata parser for extracting front matter from AsciiDoc files
 */

/**
 * Parse the custom front matter format from AsciiDoc files
 * @param content - The full content of the AsciiDoc file
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
 * Enhance metadata with additional information
 * @param metadata - The original metadata
 * @param filePath - The path to the source file
 * @param repoPath - The path to the local repository
 * @returns Enhanced metadata
 */
export function enhanceMetadata(
  metadata: Record<string, string>,
  filePath: string,
  repoPath: string
): Record<string, string> {
  // Clone the metadata object
  const enhancedMetadata = { ...metadata };
  
  // Add source information
  enhancedMetadata.source = filePath.replace(repoPath, '');
  
  // Generate direct Vaadin docs URL
  const sourcePath = enhancedMetadata.source;
  if (sourcePath && sourcePath.includes('vaadin-docs/articles/')) {
    // Extract the path after 'vaadin-docs/articles/'
    const match = sourcePath.match(/vaadin-docs\/articles\/(.+)/);
    if (match) {
      const path = match[1];
      // Remove index.adoc or .adoc extension
      const cleanPath = path.replace(/\/index\.adoc$/, '').replace(/\.adoc$/, '');
      enhancedMetadata.url = `https://vaadin.com/docs/${cleanPath}`;
    } else {
      // Fallback to GitHub URL if pattern doesn't match
      enhancedMetadata.url = `https://github.com/vaadin/docs/blob/main/${sourcePath}`;
    }
  } else {
    // Fallback to GitHub URL if not in articles directory
    enhancedMetadata.url = `https://github.com/vaadin/docs/blob/main/${sourcePath}`;
  }
  
  // Add timestamp
  enhancedMetadata.processed_at = new Date().toISOString();
  
  return enhancedMetadata;
}
