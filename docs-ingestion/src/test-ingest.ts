#!/usr/bin/env bun

/**
 * Test script for the Vaadin docs ingestion pipeline
 * Focuses only on the articles/building-apps directory
 */

import fs from 'fs';
import path from 'path';
import { config } from './config';
import { cloneOrPullRepo } from './docs-repository';
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
    
    // Enhance metadata with source information
    const enhancedMetadata = enhanceMetadata(
      metadata, 
      filePath, 
      config.docs.localPath
    );
    
    // Process AsciiDoc content to HTML
    const htmlContent = processAsciiDoc(cleanContent);
    
    // Create chunks
    const chunks = chunkDocument(htmlContent, enhancedMetadata);
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
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return 0;
  }
}

/**
 * Get AsciiDoc files from the building-apps directory only
 * @returns string[] - Array of file paths
 */
function getBuildingAppsFiles(): string[] {
  const files: string[] = [];
  const buildingAppsDir = path.join(
    config.docs.localPath, 
    config.docs.articlesPath,
    'building-apps',
    // 'application-layer',
    // 'background-jobs'
  );
  
  function getFiles(dir: string) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          getFiles(fullPath);
        } else if (item.endsWith('.asciidoc') || item.endsWith('.adoc')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }
  
  if (fs.existsSync(buildingAppsDir)) {
    getFiles(buildingAppsDir);
    console.log(`Found ${files.length} AsciiDoc files in building-apps directory`);
  } else {
    console.error(`Building-apps directory not found: ${buildingAppsDir}`);
  }
  
  return files;
}

/**
 * Main function to run the ingestion pipeline for building-apps only
 */
async function main() {
  console.log('Starting Vaadin docs ingestion pipeline for building-apps directory...');
  
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
  const repoSuccess = await cloneOrPullRepo();
  if (!repoSuccess) {
    console.error('Failed to clone or pull repository');
    process.exit(1);
  }
  
  // Get AsciiDoc files from building-apps directory only
  const files = getBuildingAppsFiles();
  if (files.length === 0) {
    console.error('No AsciiDoc files found in building-apps directory');
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
