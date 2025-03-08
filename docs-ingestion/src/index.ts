#!/usr/bin/env bun

/**
 * Main entry point for the Vaadin docs ingestion pipeline
 * Simplified process:
 * 1. Use asciidoctor.js to handle imports and conditionals
 * 2. Convert to markdown with downdoc
 * 3. Chunk based on h2 level headings
 */

import fs from 'fs';
import path from 'path';
import { config } from './config';
import { cloneOrPullRepo, getAsciiDocFiles } from './docs-repository';
import { parseMetadata, enhanceMetadata } from './metadata-parser';
import { processAsciiDoc } from './asciidoc-processor';
import { chunkDocument, prepareChunksForEmbedding } from './chunking';
import { generateEmbeddings } from './embeddings';
import { storeInPinecone, deleteFromPineconeBySource } from './pinecone';

/**
 * Process a single AsciiDoc file
 * @param filePath - Path to the AsciiDoc file
 * @returns Promise with the number of chunks processed
 */
async function processFile(filePath: string): Promise<number> {
  console.log(`Processing file: ${filePath}`);
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse metadata and content
    const { content: cleanContent, metadata } = parseMetadata(content);
    
    // Check if file is in components directory
    const isComponentFile = filePath.includes('/components/');
    
    // If it's a component file, process it twice (once for Flow, once for Hilla)
    if (isComponentFile) {
      let totalProcessed = 0;
      
      // Process for Flow
      totalProcessed += await processFileWithFramework(filePath, cleanContent, metadata, 'flow');
      
      // Process for Hilla
      totalProcessed += await processFileWithFramework(filePath, cleanContent, metadata, 'hilla');
      
      return totalProcessed;
    } else {
      // Enhance metadata with source information and framework detection
      const enhancedMetadata = enhanceMetadata(
        metadata, 
        filePath, 
        config.docs.localPath,
        cleanContent
      );
      
      // Set attributes based on detected framework
      const attributes: Record<string, any> = { ...config.asciidoc.attributes };
      if (enhancedMetadata.framework === 'flow') {
        attributes['flow'] = true;
        attributes['react'] = false;
      } else if (enhancedMetadata.framework === 'hilla') {
        attributes['flow'] = false;
        attributes['react'] = true;
      } else {
        // Default to both attributes enabled for backward compatibility
        attributes['flow'] = true;
        attributes['react'] = true;
      }
      
      // Process AsciiDoc content directly to Markdown using asciidoctor.js and downdoc
      const markdownContent = processAsciiDoc(cleanContent, undefined, attributes);
      
      // Create chunks based on h2 level headings
      const chunks = chunkDocument(markdownContent, enhancedMetadata);
      console.log(`Created ${chunks.length} chunks from ${filePath}`);
      
      // Prepare chunks for embedding
      const preparedChunks = prepareChunksForEmbedding(chunks);
      
      // Generate embeddings
      const documentsWithEmbeddings = await generateEmbeddings(preparedChunks);
      
      // Delete existing documents for this source before storing new ones
      if (enhancedMetadata.source) {
        await deleteFromPineconeBySource(enhancedMetadata.source);
      }
      
      // Store in Pinecone
      const storedCount = await storeInPinecone(documentsWithEmbeddings);
      
      return storedCount;
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return 0;
  }
}

/**
 * Process a file with a specific framework attribute
 * @param filePath - Path to the AsciiDoc file
 * @param cleanContent - The cleaned content without front matter
 * @param metadata - The parsed metadata
 * @param framework - The framework to use ('flow' or 'hilla')
 * @returns Promise with the number of chunks processed
 */
async function processFileWithFramework(
  filePath: string, 
  cleanContent: string, 
  metadata: Record<string, string>,
  framework: string
): Promise<number> {
  console.log(`Processing ${filePath} for ${framework}`);
  
  try {
    // Clone the metadata and add framework
    const metadataWithFramework = { ...metadata, framework };
    
    // Enhance metadata with source information
    const enhancedMetadata = enhanceMetadata(
      metadataWithFramework, 
      filePath, 
      config.docs.localPath
    );
    
    // Set the appropriate attribute for asciidoc processing
    const attributes: Record<string, any> = { ...config.asciidoc.attributes };
    if (framework === 'flow') {
      // Set flow to true and react to false
      attributes['flow'] = true;
      attributes['react'] = false;
    } else if (framework === 'hilla') {
      // Set flow to false and react to true
      attributes['flow'] = false;
      attributes['react'] = true; // Use 'react' attribute for Hilla framework
    }
    
    // Process AsciiDoc content with the specific framework attribute
    const markdownContent = processAsciiDoc(cleanContent, undefined, attributes);
    
    // Create chunks based on h2 level headings
    const chunks = chunkDocument(markdownContent, enhancedMetadata);
    console.log(`Created ${chunks.length} chunks from ${filePath} for ${framework}`);
    
    // Prepare chunks for embedding
    const preparedChunks = prepareChunksForEmbedding(chunks);
    
    // Generate embeddings
    const documentsWithEmbeddings = await generateEmbeddings(preparedChunks);
    
    // Delete existing documents for this source and framework before storing new ones
    const sourceWithFramework = `${enhancedMetadata.source}#${framework}`;
    await deleteFromPineconeBySource(sourceWithFramework);
    
    // Store in Pinecone
    const storedCount = await storeInPinecone(documentsWithEmbeddings);
    
    return storedCount;
  } catch (error) {
    console.error(`Error processing ${filePath} for ${framework}:`, error);
    return 0;
  }
}

/**
 * Parse command line arguments
 * @returns Object containing parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsedArgs: { 
    branch?: string;
    includePatterns?: string[];
    excludePatterns?: string[];
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--branch' && i + 1 < args.length) {
      parsedArgs.branch = args[++i];
    } else if (arg === '--include' && i + 1 < args.length) {
      // Split comma-separated patterns
      parsedArgs.includePatterns = args[++i].split(',');
    } else if (arg === '--exclude' && i + 1 < args.length) {
      // Split comma-separated patterns
      parsedArgs.excludePatterns = args[++i].split(',');
    }
  }
  
  return parsedArgs;
}

/**
 * Main function to run the ingestion pipeline
 */
async function main() {
  console.log('Starting Vaadin docs ingestion pipeline...');
  
  // Parse command line arguments
  const args = parseArgs();
  
  // Override config with command line arguments if provided
  if (args.branch) {
    console.log(`Using branch: ${args.branch}`);
  }
  
  if (args.includePatterns && args.includePatterns.length > 0) {
    config.docs.includePatterns = args.includePatterns;
    console.log(`Using include patterns: ${args.includePatterns.join(', ')}`);
  }
  
  if (args.excludePatterns && args.excludePatterns.length > 0) {
    config.docs.excludePatterns = [...config.docs.excludePatterns, ...args.excludePatterns];
    console.log(`Added exclude patterns: ${args.excludePatterns.join(', ')}`);
  }
  
  // Check for required environment variables
  if (!config.openai.apiKey) {
    console.error('OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }
  
  if (!config.pinecone.apiKey) {
    console.error('PINECONE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  if (!config.pinecone.index) {
    console.error('PINECONE_INDEX environment variable is required');
    process.exit(1);
  }
  
  // Clone or pull the repository
  const repoSuccess = await cloneOrPullRepo(args.branch);
  if (!repoSuccess) {
    console.error('Failed to clone or pull repository');
    process.exit(1);
  }
  
  // Get all AsciiDoc files
  const files = getAsciiDocFiles();
  if (files.length === 0) {
    console.error('No AsciiDoc files found');
    process.exit(1);
  }
  
  console.log(`Found ${files.length} AsciiDoc files to process`);
  
  // Process each file
  let totalProcessed = 0;
  let successCount = 0;
  
  for (const file of files) {
    try {
      const processedCount = await processFile(file);
      totalProcessed += processedCount;
      successCount++;
      console.log(`Successfully processed ${file} (${successCount}/${files.length})`);
    } catch (error) {
      console.error(`Failed to process ${file}:`, error);
    }
  }
  
  console.log(`Ingestion complete! Processed ${successCount}/${files.length} files with ${totalProcessed} total chunks.`);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
});
