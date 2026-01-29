/**
 * Embedding Generator
 * 
 * This package handles:
 * - Loading Markdown files with frontmatter
 * - Chunking with header-based splitting for search relevance
 * - Generating embeddings
 * - Storing in Pinecone with file_path metadata for document retrieval
 */

import path from 'path';
import { config as dotenvConfig } from 'dotenv';

// Core module exports
export * from './document-loader.js';
export * from './chunker.js';
export * from './embeddings-generator.js';
export * from './pinecone-upserter.js';

// Import the modules we need for the main function
import { createDirectoryLoader } from './document-loader.js';
import { createChunker } from './chunker.js';
import { createEmbeddingsGenerator, type EmbeddingsConfig } from './embeddings-generator.js';
import { createPineconeUpserter, type PineconeConfig } from './pinecone-upserter.js';

/**
 * Configuration for the complete embedding generation process
 */
export interface EmbeddingGenerationConfig {
  markdownDir: string;
  embeddings: EmbeddingsConfig;
  pinecone: PineconeConfig;
  chunking?: {
    maxChunkSize?: number;
    chunkOverlap?: number;
  };
  clearExistingIndex?: boolean;
  smartUpdate?: boolean; // New option for CI/CD scenarios
  version?: string;
}

/**
 * Result of the embedding generation process
 */
export interface EmbeddingGenerationResult {
  totalChunks: number;
  totalFiles: number;
  errors: string[];
  timings: {
    documentLoading: number;
    chunking: number;
    embeddingGeneration: number;
    pineconeUpserting: number;
    total: number;
  };
}

/**
 * Main function to generate embeddings from markdown directory
 */
export async function generateEmbeddings(config: EmbeddingGenerationConfig): Promise<EmbeddingGenerationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log('🚀 Starting simplified embedding generation pipeline...');
  console.log(`📁 Processing markdown directory: ${config.markdownDir}`);
  
  try {
    // Step 1: Load documents
    console.log('\n📖 Step 1: Loading markdown documents...');
    const loadingStart = Date.now();
    
    const loader = createDirectoryLoader(config.markdownDir, {
      recursive: true,
      baseDir: path.dirname(config.markdownDir)  // Parent dir so file_path includes version prefix (e.g. "v24/")
    });
    const documents = await loader.load();
    
    const loadingTime = Date.now() - loadingStart;
    console.log(`✅ Loaded ${documents.length} documents (${loadingTime}ms)`);

    if (documents.length === 0) {
      throw new Error('No markdown documents found in the specified directory');
    }

    // Step 2: Chunk documents with file_path metadata
    console.log('\n✂️ Step 2: Chunking documents...');
    const chunkingStart = Date.now();
    
    const chunker = createChunker({
      maxChunkSize: config.chunking?.maxChunkSize,
      chunkOverlap: config.chunking?.chunkOverlap,
      version: config.version
    });

    const documentChunks = await chunker.processDocuments(documents);
    
    const chunkingTime = Date.now() - chunkingStart;
    console.log(`✅ Created ${documentChunks.length} chunks across ${documents.length} files (${chunkingTime}ms)`);

    // Step 3: Generate embeddings
    console.log('\n🧠 Step 3: Generating embeddings...');
    const embeddingStart = Date.now();
    
    const embeddingsGenerator = createEmbeddingsGenerator(config.embeddings);
    const chunksWithEmbeddings = await embeddingsGenerator.generateEmbeddings(documentChunks);
    
    const embeddingTime = Date.now() - embeddingStart;
    console.log(`✅ Generated embeddings for ${chunksWithEmbeddings.length} chunks (${embeddingTime}ms)`);

    // Step 4: Upload to Pinecone (Dense + Sparse)
    console.log('\n📡 Step 4: Uploading to Pinecone (Dense + Sparse)...');
    const pineconeStart = Date.now();
    
    const pineconeUpserter = createPineconeUpserter(config.pinecone);
    
    if (config.clearExistingIndex) {
      console.log('🗑️ Clearing existing Pinecone index...');
      await pineconeUpserter.clearIndex();
      console.log('✅ Index cleared');
    }
    
    await pineconeUpserter.upsertChunks(chunksWithEmbeddings);
    
    const pineconeTime = Date.now() - pineconeStart;
    console.log(`✅ Uploaded ${chunksWithEmbeddings.length} chunks to Pinecone (${pineconeTime}ms)`);

    // Final results
    const totalTime = Date.now() - startTime;
    
    console.log('\n🎉 Embedding generation completed successfully!');
    console.log(`📊 Summary: ${documentChunks.length} chunks from ${documents.length} files in ${totalTime}ms`);
    
    return {
      totalChunks: documentChunks.length,
      totalFiles: documents.length,
      errors,
      timings: {
        documentLoading: loadingTime,
        chunking: chunkingTime,
        embeddingGeneration: embeddingTime,
        pineconeUpserting: pineconeTime,
        total: totalTime
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Embedding generation failed: ${errorMessage}`);
    errors.push(errorMessage);
    
    throw error;
  }
}

/**
 * Clear the Pinecone index
 */
export async function clearIndex(config: { apiKey: string; indexName: string }): Promise<void> {
  console.log('🗑️ Clearing Pinecone index...');
  const upserter = createPineconeUpserter(config);
  await upserter.clearIndex();
  console.log('✅ Index cleared successfully');
}

/**
 * CLI interface for the embedding generator
 */
export async function runCLI(): Promise<void> {
  // Load environment variables from .env file in project root
  const projectRoot = path.resolve(process.cwd(), '..', '..');
  dotenvConfig({ path: path.join(projectRoot, '.env') });

  const args = process.argv.slice(2);
  const clearFlag = args.includes('--clear');
  const clearOnlyFlag = args.includes('--clear-only');

  // Parse --version flag
  let version = '24';
  const versionIdx = args.indexOf('--version') !== -1 ? args.indexOf('--version') : args.indexOf('-v');
  if (versionIdx !== -1 && versionIdx + 1 < args.length) {
    version = args[versionIdx + 1];
  }

  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!process.env.PINECONE_INDEX) {
    console.error('❌ PINECONE_INDEX environment variable is required');
    process.exit(1);
  }

  // Handle --clear-only: just clear the index and exit
  if (clearOnlyFlag) {
    try {
      await clearIndex({
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX
      });
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Failed to clear index:', error);
      process.exit(1);
    }
  }

  // Default to the AsciiDoc converter's output directory
  const markdownDir = process.env.MARKDOWN_DIR || path.join(process.cwd(), '..', '1-asciidoc-converter', 'dist', 'markdown', `v${version}`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const config: EmbeddingGenerationConfig = {
    markdownDir,
    embeddings: {
      openaiApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
      batchSize: 50
    },
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      indexName: process.env.PINECONE_INDEX
    },
    chunking: {
      maxChunkSize: 1000,
      chunkOverlap: 200
    },
    clearExistingIndex: clearFlag,
    version
  };

  try {
    const result = await generateEmbeddings(config);
    console.log('\n📈 Final Results:');
    console.log(`  Files processed: ${result.totalFiles}`);
    console.log(`  Chunks created: ${result.totalChunks}`);
    console.log(`  Total time: ${result.timings.total}ms`);

    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
  } catch (error) {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI().catch(console.error);
} 