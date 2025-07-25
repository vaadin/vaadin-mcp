/**
 * Search factory that creates and configures search services
 * Now supports enhanced hybrid search with native Pinecone sparse vectors
 */

import { config } from './config.js';
import { PineconeSearchProvider } from './pinecone-search-provider.js';
import { PineconeSparseProvider } from './pinecone-sparse-provider.js';
import { EnhancedHybridSearchService } from './enhanced-hybrid-search-service.js';
import { MockSearchProvider } from './mock-search-provider.js';
import { HybridSearchService } from './hybrid-search-service.js';

// Global service instance (initialized once)
let enhancedSearchService: EnhancedHybridSearchService | null = null;
let legacySearchService: HybridSearchService | null = null;

/**
 * Create and initialize the enhanced hybrid search service
 * This combines dense semantic search with sparse keyword search + native reranking
 */
export async function createEnhancedSearchService(): Promise<EnhancedHybridSearchService> {
  if (enhancedSearchService) {
    return enhancedSearchService;
  }

  console.log('🏭 Creating Enhanced Search Service...');

  // Check if we have the required API keys for production
  if (!config.pinecone.apiKey || !config.pinecone.index) {
    throw new Error('❌ Missing Pinecone configuration for enhanced search service');
  }

  try {
    // Create providers
    const denseProvider = new PineconeSearchProvider();
    const sparseProvider = new PineconeSparseProvider();
    
    // Create enhanced service
    enhancedSearchService = new EnhancedHybridSearchService(denseProvider, sparseProvider);
    
    // Initialize (this will create sparse index if needed)
    await enhancedSearchService.initialize();
    
    console.log('✅ Enhanced Search Service ready!');
    return enhancedSearchService;
    
  } catch (error) {
    console.error('❌ Failed to create Enhanced Search Service:', error);
    throw error;
  }
}

/**
 * Create the legacy hybrid search service (fallback)
 * Uses the old RRF approach with fake keyword search
 */
export function createLegacySearchService(): HybridSearchService {
  if (legacySearchService) {
    return legacySearchService;
  }

  console.log('🏭 Creating Legacy Search Service (fallback)...');

  // Check if we have the required API keys
  if (!config.pinecone.apiKey || !config.pinecone.index) {
    console.log('⚠️  Missing Pinecone config, using mock provider');
    const mockProvider = new MockSearchProvider();
    legacySearchService = new HybridSearchService(mockProvider);
  } else {
    const pineconeProvider = new PineconeSearchProvider();
    legacySearchService = new HybridSearchService(pineconeProvider);
  }

  console.log('✅ Legacy Search Service ready');
  return legacySearchService;
}

/**
 * Get the appropriate search service
 * Tries enhanced first, falls back to legacy if needed
 */
export async function getSearchService(): Promise<EnhancedHybridSearchService | HybridSearchService> {
  try {
    // Try to get enhanced service first
    return await createEnhancedSearchService();
  } catch (error) {
    console.warn('⚠️  Enhanced search service failed, falling back to legacy:', error instanceof Error ? error.message : String(error));
    return createLegacySearchService();
  }
}

/**
 * Reset services (useful for testing)
 */
export function resetServices(): void {
  enhancedSearchService = null;
  legacySearchService = null;
} 