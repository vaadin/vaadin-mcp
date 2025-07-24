/**
 * Embedding Generator
 * 
 * This package handles:
 * - Loading Markdown files with frontmatter
 * - Chunking with header-based splitting
 * - Creating hierarchical relationships (intra-file and cross-file)
 * - Generating embeddings
 * - Storing in Pinecone with metadata
 */

import path from 'path';
import type { DocumentChunk } from 'core-types';

// Core module exports
export * from './hierarchy-parser.js';
export * from './document-loader.js';
export * from './chunker.js';
export * from './relationship-builder.js';
export * from './embeddings-generator.js';
export * from './pinecone-upserter.js';

// Import the modules we need for the main function
import { parseFileHierarchy } from './hierarchy-parser.js';
import { createDirectoryLoader } from './document-loader.js';
import { createChunker } from './chunker.js';
import { buildChunkRelationships } from './relationship-builder.js';
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
}

/**
 * Result of the embedding generation process
 */
export interface EmbeddingGenerationResult {
  totalChunks: number;
  totalFiles: number;
  hierarchyDepth: number;
  errors: string[];
  timings: {
    hierarchyParsing: number;
    documentLoading: number;
    chunking: number;
    relationshipBuilding: number;
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
  
  console.log('🚀 Starting embedding generation pipeline...');
  console.log(`📁 Processing markdown directory: ${config.markdownDir}`);
  
  try {
    // Step 1: Parse file hierarchy
    console.log('\n📊 Step 1: Parsing file hierarchy...');
    const hierarchyStart = Date.now();
    
    const directoryStructure = parseFileHierarchy(config.markdownDir);
    const totalFiles = Object.keys(directoryStructure).length;
    const hierarchyDepth = Math.max(...Object.values(directoryStructure).map(h => h.level));
    
    const hierarchyTime = Date.now() - hierarchyStart;
    console.log(`✅ Parsed ${totalFiles} files with max depth ${hierarchyDepth} (${hierarchyTime}ms)`);

    // Step 2: Load documents
    console.log('\n📖 Step 2: Loading markdown documents...');
    const loadingStart = Date.now();
    
    const loader = createDirectoryLoader(config.markdownDir, { 
      recursive: true,
      baseDir: config.markdownDir  // Ensure paths are relative to the markdown directory
    });
    const documents = await loader.load();
    
    const loadingTime = Date.now() - loadingStart;
    console.log(`✅ Loaded ${documents.length} documents (${loadingTime}ms)`);

    if (documents.length === 0) {
      throw new Error('No markdown documents found in the specified directory');
    }

    // Step 3: Chunk documents
    console.log('\n✂️ Step 3: Chunking documents...');
    const chunkingStart = Date.now();
    
    const chunker = createChunker({
      maxChunkSize: config.chunking?.maxChunkSize,
      chunkOverlap: config.chunking?.chunkOverlap
    });

    const allChunks = new Map<string, any[]>();
    
    for (const document of documents) {
      // Document file_path should already be relative due to baseDir in loader
      const filePath = document.metadata.file_path;
      const chunks = await chunker.chunkDocument(document);
      allChunks.set(filePath, chunks);
    }

    const totalChunks = Array.from(allChunks.values()).reduce((sum, chunks) => sum + chunks.length, 0);
    const chunkingTime = Date.now() - chunkingStart;
    console.log(`✅ Created ${totalChunks} chunks across ${allChunks.size} files (${chunkingTime}ms)`);

    // Step 4: Build relationships
    console.log('\n🔗 Step 4: Building hierarchical relationships...');
    const relationshipStart = Date.now();
    
    const documentChunks: DocumentChunk[] = buildChunkRelationships(allChunks, directoryStructure);
    
    const relationshipTime = Date.now() - relationshipStart;
    console.log(`✅ Built relationships for ${documentChunks.length} chunks (${relationshipTime}ms)`);

    // Step 5: Generate embeddings
    console.log('\n🧠 Step 5: Generating embeddings...');
    const embeddingStart = Date.now();
    
    const embeddingsGenerator = createEmbeddingsGenerator(config.embeddings);
    const chunksWithEmbeddings = await embeddingsGenerator.generateEmbeddings(documentChunks);
    
    const embeddingTime = Date.now() - embeddingStart;
    console.log(`✅ Generated embeddings for ${chunksWithEmbeddings.length} chunks (${embeddingTime}ms)`);

    // Step 6: Upload to Pinecone
    console.log('\n📡 Step 6: Uploading to Pinecone...');
    const pineconeStart = Date.now();
    
    const pineconeUpserter = createPineconeUpserter(config.pinecone);
    
    // Choose update strategy based on configuration
    if (config.clearExistingIndex) {
      console.log('🗑️ Clearing existing Pinecone index...');
      await pineconeUpserter.clearIndex();
      await pineconeUpserter.upsertChunks(chunksWithEmbeddings);
    } else if (config.smartUpdate) {
      console.log('🔄 Using smart update (recommended for CI/CD)...');
      const updateResult = await pineconeUpserter.smartUpdate(chunksWithEmbeddings);
      console.log(`📊 Update summary: ${updateResult.upserted} upserted, ${updateResult.deleted} deleted, ${updateResult.unchanged} unchanged`);
    } else {
      console.log('📤 Using simple upsert (may leave orphaned chunks)...');
      await pineconeUpserter.upsertChunks(chunksWithEmbeddings);
    }
    
    const pineconeTime = Date.now() - pineconeStart;
    console.log(`✅ Uploaded to Pinecone (${pineconeTime}ms)`);

    // Final statistics
    const totalTime = Date.now() - startTime;
    
    const result: EmbeddingGenerationResult = {
      totalChunks: documentChunks.length,
      totalFiles,
      hierarchyDepth,
      errors,
      timings: {
        hierarchyParsing: hierarchyTime,
        documentLoading: loadingTime,
        chunking: chunkingTime,
        relationshipBuilding: relationshipTime,
        embeddingGeneration: embeddingTime,
        pineconeUpserting: pineconeTime,
        total: totalTime
      }
    };

    console.log('\n🎉 Embedding generation completed successfully!');
    console.log(`📊 Total processing time: ${totalTime}ms`);
    console.log(`📁 Files processed: ${totalFiles}`);
    console.log(`📄 Chunks created: ${totalChunks}`);
    console.log(`🔗 Hierarchy depth: ${hierarchyDepth}`);
    
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    console.error('❌ Embedding generation failed:', errorMsg);
    throw error;
  }
}

/**
 * Validates the complete configuration
 */
export function validateConfig(config: Partial<EmbeddingGenerationConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.markdownDir) {
    errors.push('Markdown directory is required');
  }

  if (!config.embeddings) {
    errors.push('Embeddings configuration is required');
  } else {
    if (!config.embeddings.openaiApiKey) {
      errors.push('OpenAI API key is required');
    }
  }

  if (!config.pinecone) {
    errors.push('Pinecone configuration is required');
  } else {
    if (!config.pinecone.apiKey) {
      errors.push('Pinecone API key is required');
    }
    if (!config.pinecone.indexName) {
      errors.push('Pinecone index name is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Convenience function to run the embedding generation with environment variables
 */
export async function generateEmbeddingsFromEnv(markdownDir: string, options: {
  clearExistingIndex?: boolean;
  smartUpdate?: boolean;
  maxChunkSize?: number;
  chunkOverlap?: number;
} = {}): Promise<EmbeddingGenerationResult> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const pineconeIndexName = process.env.PINECONE_INDEX_NAME || 'vaadin-docs';

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!pineconeApiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }

  const config: EmbeddingGenerationConfig = {
    markdownDir,
    embeddings: {
      openaiApiKey,
      modelName: 'text-embedding-3-small',
      batchSize: 50
    },
    pinecone: {
      apiKey: pineconeApiKey,
      indexName: pineconeIndexName,
      batchSize: 100
    },
    chunking: {
      maxChunkSize: options.maxChunkSize || 1000,
      chunkOverlap: options.chunkOverlap || 200
    },
    clearExistingIndex: options.clearExistingIndex,
    smartUpdate: options.smartUpdate ?? true // Default to smart update for better CI/CD experience
  };

  return generateEmbeddings(config);
} 