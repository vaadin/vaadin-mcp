#!/usr/bin/env bun

/**
 * CLI entry point for the embedding generator
 */

import { generateEmbeddingsFromEnv } from './index.js';
import path from 'path';

async function main() {
  console.log('🧠 Starting embedding generation...\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let markdownDir = path.join(process.cwd(), '../1-asciidoc-converter/dist/markdown');
  let clearExistingIndex = false;
  let smartUpdate = true;
  
  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--input' || arg === '-i') {
      if (i + 1 < args.length) {
        markdownDir = args[++i];
      }
    } else if (arg === '--clear') {
      clearExistingIndex = true;
      smartUpdate = false; // Don't use smart update if clearing
    } else if (arg === '--no-smart-update') {
      smartUpdate = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: bun run generate [options]

Options:
  -i, --input <dir>     Input directory with markdown files (default: ../1-asciidoc-converter/dist/markdown)
  --clear               Clear existing index before uploading (slower but complete)
  --no-smart-update     Disable smart update (may leave orphaned chunks)
  -h, --help            Show this help message

Environment Variables:
  OPENAI_API_KEY        Required: OpenAI API key for embeddings
  PINECONE_API_KEY      Required: Pinecone API key
  PINECONE_INDEX_NAME   Optional: Pinecone index name (default: vaadin-docs)

Examples:
  bun run generate
  bun run generate --input ./custom-markdown
  bun run generate --clear  # Full rebuild
`);
      process.exit(0);
    }
  }
  
  // Validate environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ Error: PINECONE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    console.log(`📁 Input directory: ${markdownDir}`);
    console.log(`🔄 Update strategy: ${clearExistingIndex ? 'Clear & Rebuild' : smartUpdate ? 'Smart Update' : 'Simple Upsert'}`);
    console.log(`🏷️ Index: ${process.env.PINECONE_INDEX_NAME || 'vaadin-docs'}\n`);
    
    const result = await generateEmbeddingsFromEnv(markdownDir, {
      clearExistingIndex,
      smartUpdate
    });
    
    console.log('\n📊 Generation Results:');
    console.log(`📄 Total chunks: ${result.totalChunks}`);
    console.log(`📁 Files processed: ${result.totalFiles}`);
    console.log(`🔗 Hierarchy depth: ${result.hierarchyDepth}`);
    console.log(`⏱️ Total time: ${result.timings.total}ms`);
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Embedding generation complete!');
    
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    process.exit(1);
  }
}

// Run the CLI
main(); 