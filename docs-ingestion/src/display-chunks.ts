#!/usr/bin/env bun

/**
 * Display script for the Vaadin docs ingestion pipeline
 * Processes the same asciidocs as test-ingest.ts but outputs chunks and metadata to console
 */

import fs from 'fs';
import path from 'path';
import { config } from './config';
import { cloneOrPullRepo } from './docs-repository';
import { parseMetadata, enhanceMetadata } from './metadata-parser';
import { processAsciiDoc } from './asciidoc-processor';
import { chunkDocument } from './chunking';

/**
 * Format metadata for display
 * @param metadata - The metadata object
 * @returns Formatted metadata string
 */
function formatMetadata(metadata: Record<string, any>): string {
  const output = Object.entries(metadata)
    .map(([key, value]) => `  "${key}": ${JSON.stringify(value)}`)
    .join(',\n');
  
  return `{\n${output}\n}`;
}

/**
 * Process a single AsciiDoc file and display chunks
 * @param filePath - Path to the AsciiDoc file
 */
async function processAndDisplayFile(filePath: string): Promise<void> {
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
    // Pass the directory of the file being processed as the base directory for includes
    const fileDir = path.dirname(filePath);
    const htmlContent = processAsciiDoc(cleanContent, fileDir);
    
    // Create chunks
    const chunks = chunkDocument(htmlContent, enhancedMetadata);
    
    // Display each chunk with its metadata
    chunks.forEach((chunk, index) => {
      console.log(`\n${'━'.repeat(80)}`);
      console.log(`Chunk ${index + 1} of ${chunks.length} from ${path.basename(filePath)}`);
      console.log(`${'━'.repeat(80)}\n`);
      
      // Display the markdown content
      console.log(chunk.text);
      
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`Metadata:`);
      console.log(formatMetadata(chunk.metadata));
      console.log(`${'━'.repeat(80)}\n`);
    });
    
    return;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return;
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
    'business-logic'
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
 * Main function to run the display pipeline for building-apps only
 */
async function main() {
  // Clone or pull the repository if needed
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
  
  console.log(`Found ${files.length} AsciiDoc files to process\n`);
  
  // Process each file
  for (const file of files) {
    try {
      await processAndDisplayFile(file);
    } catch (error) {
      console.error(`Failed to process ${file}:`, error);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
});
