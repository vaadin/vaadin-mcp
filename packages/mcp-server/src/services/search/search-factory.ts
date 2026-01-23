/**
 * Search factory that creates and configures search services
 * Uses hybrid search with native Pinecone sparse vectors and reranking
 */

import { config } from '../../config.js';
import { PineconeSearchProvider } from './pinecone-search-provider.js';
import { PineconeSparseProvider } from './pinecone-sparse-provider.js';
import { HybridSearchService } from './hybrid-search-service.js';
import { MockSearchProvider } from './mock-search-provider.js';
import { logger } from '../../logger.js';

// Global service instance (initialized once)
let hybridSearchService: HybridSearchService | null = null;

/**
 * Create and initialize the hybrid search service
 * This combines dense semantic search with sparse keyword search + native reranking
 */
export async function createHybridSearchService(): Promise<HybridSearchService> {
  if (hybridSearchService) {
    return hybridSearchService;
  }

  logger.info('🏭 Creating Hybrid Search Service...');

  // Check if we have the required API keys for production
  if (!config.pinecone.apiKey || !config.pinecone.index) {
    throw new Error('❌ Missing Pinecone configuration for search service');
  }

  try {
    // Create providers
    const denseProvider = new PineconeSearchProvider();
    const sparseProvider = new PineconeSparseProvider();

    // Create hybrid service
    hybridSearchService = new HybridSearchService(denseProvider, sparseProvider);

    // Initialize (this will create sparse index if needed)
    await hybridSearchService.initialize();

    logger.info('✅ Hybrid Search Service ready!');
    return hybridSearchService;

  } catch (error) {
    logger.error('❌ Failed to create Hybrid Search Service:', error);
    throw error;
  }
}

/**
 * Create a mock hybrid search service for testing
 */
export function createMockSearchService(): HybridSearchService {
  logger.info('🧪 Creating Mock Search Service...');
  const mockProvider = new MockSearchProvider();
  const sparseProvider = new PineconeSparseProvider(); // Will work in mock mode
  return new HybridSearchService(mockProvider, sparseProvider);
}

/**
 * Get the hybrid search service
 * Uses mock service if Pinecone config is missing
 */
export async function getSearchService(): Promise<HybridSearchService> {
  // Use mock service in test mode or when Pinecone is not configured
  if (process.env.MOCK_PINECONE === 'true' || !config.pinecone.apiKey || !config.pinecone.index) {
    logger.info('🧪 Using mock search service');
    return createMockSearchService();
  }

  return await createHybridSearchService();
}

/**
 * Reset services (useful for testing)
 */
export function resetServices(): void {
  hybridSearchService = null;
}
