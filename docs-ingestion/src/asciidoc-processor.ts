/**
 * AsciiDoc processor for converting AsciiDoc content directly to Markdown
 * Uses asciidoctor-reducer to handle includes and downdoc for conversion to Markdown
 */

import asciidoctor from 'asciidoctor';
import downdoc from 'downdoc';
import { config } from './config';

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
 * Process AsciiDoc content and convert directly to Markdown
 * @param content - The AsciiDoc content to process
 * @param baseDir - The base directory for resolving includes
 * @param customAttributes - Optional custom attributes to override the default ones
 * @returns The processed Markdown content
 */
export async function processAsciiDoc(content: string, baseDir?: string, customAttributes?: Record<string, any>): Promise<string> {
  try {
    // Set the base directory for includes
    const baseDirPath = baseDir || config.docs.localPath;
    
    // Prepare attributes with absolute paths to ensure correct resolution
    const attributes = {
      ...config.asciidoc.attributes,
      // Override root and articles with absolute paths to ensure correct resolution
      'root': process.cwd() + '/' + config.docs.localPath.slice(2),
      'articles': process.cwd() + '/' + config.docs.localPath.slice(2) + '/' + config.docs.articlesPath,
      // Apply custom attributes if provided
      ...(customAttributes || {})
    };

    // Ensure reducer is registered
    if (!reducerRegistered) {
      await registerReducer();
    }
    
    // Load and process the AsciiDoc content with asciidoctor
    // This will handle includes if reducer is registered
    const doc = Asciidoctor.load(content, {
      safe: 'unsafe',
      attributes: attributes,
      base_dir: baseDirPath
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
