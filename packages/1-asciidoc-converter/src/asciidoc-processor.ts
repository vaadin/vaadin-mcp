/**
 * AsciiDoc processor for converting AsciiDoc content to Markdown with frontmatter
 * Uses asciidoctor-reducer to handle includes and downdoc for conversion to Markdown
 */

import asciidoctor from 'asciidoctor';
import downdoc from 'downdoc';
import path from 'path';
import type { Framework, ProcessedMetadata } from 'core-types';

// Initialize Asciidoctor
const Asciidoctor = asciidoctor();

// Import and register the reducer extension
// We need to use a dynamic import for ESM compatibility
async function registerReducer() {
  try {
    const reducer = await import('@asciidoctor/reducer');
    reducer.register();
    return true;
  } catch (error) {
    console.error('Failed to register reducer extension:', error);
    return false;
  }
}

// Register reducer on module load
let reducerRegistered = false;
registerReducer().then(result => {
  reducerRegistered = result;
  if (result) {
    console.log('Asciidoctor reducer extension registered successfully');
  } else {
    console.warn('Failed to register asciidoctor reducer extension. Includes may not be processed correctly.');
  }
});

/**
 * Get framework-specific attributes for AsciiDoc processing
 * @param framework - The framework to configure for
 * @param repoPath - Path to the repository root
 * @returns Configured attributes object
 */
function getFrameworkAttributes(framework: Framework, repoPath: string): Record<string, any> {
  // Import config here to avoid circular dependencies
  const { asciidocConfig } = require('./config');
  
  const attributes: Record<string, any> = {
    // Basic AsciiDoc attributes from config
    ...asciidocConfig.attributes,
    
    // Vaadin-specific attributes
    'root': repoPath,
    'articles': path.join(repoPath, 'articles'),
    'imagesdir': 'images',
    
    // Framework-specific attributes
    'flow': framework === 'flow',
    'react': framework === 'hilla'
  };
  
  return attributes;
}

/**
 * Process AsciiDoc content and convert to Markdown
 * @param content - The AsciiDoc content to process
 * @param filePath - The path to the source file
 * @param framework - The framework to process for
 * @param repoPath - The base repository path
 * @returns The processed Markdown content
 */
export async function processAsciiDoc(
  content: string, 
  filePath: string,
  framework: Framework,
  repoPath: string
): Promise<string> {
  try {
    // Set the base directory for includes
    const baseDir = path.dirname(filePath);
    
    // Get framework-specific attributes
    const attributes = getFrameworkAttributes(framework, repoPath);

    // Ensure reducer is registered
    if (!reducerRegistered) {
      await registerReducer();
    }
    
    // Load and process the AsciiDoc content with asciidoctor
    // This will handle includes if reducer is registered
    const doc = Asciidoctor.load(content, {
      safe: 'unsafe',
      attributes: attributes,
      base_dir: baseDir
    });
    
    // Get the processed source (with includes expanded if reducer is working)
    const asciidocContent = doc.getSource();
    
    // Use downdoc to convert AsciiDoc to Markdown
    const markdown = downdoc(asciidocContent, { 
      attributes: {
        ...attributes,
        'markdown-list-indent': 2
      }
    });
    
    return markdown;
  } catch (error) {
    console.error('Error processing AsciiDoc:', error);
    // Return original content if processing fails
    return content;
  }
}

/**
 * Extract title from AsciiDoc content
 * @param content - The AsciiDoc content
 * @returns The extracted title or undefined
 */
export function extractTitle(content: string): string | undefined {
  // Look for h1 title (= Title)
  const h1Match = content.match(/^=\s+(.+)$/m);
  if (h1Match) {
    // Remove any badges from the title
    return h1Match[1].replace(/\[badge-[^\]]+\]#[^#]+#/g, '').trim();
  }
  
  return undefined;
} 