/**
 * Factory to create the appropriate search provider based on environment
 */

import type { SearchProvider } from './search-interfaces.js';
import { PineconeSearchProvider } from './pinecone-search-provider.js';
import { MockSearchProvider } from './mock-search-provider.js';

/**
 * Determine if we should use mock implementations
 */
function shouldUseMock(): boolean {
  return process.env.NODE_ENV === 'test' || 
         process.env.MOCK_PINECONE === 'true' ||
         !process.env.PINECONE_API_KEY ||
         !process.env.OPENAI_API_KEY;
}

/**
 * Create the appropriate search provider
 */
export function createSearchProvider(): SearchProvider {
  if (shouldUseMock()) {
    console.log('🧪 Using mock search provider (test mode)');
    return new MockSearchProvider();
  } else {
    console.log('🔍 Using Pinecone search provider (production mode)');
    return new PineconeSearchProvider();
  }
}

/**
 * Create a search provider with explicit mode override
 */
export function createSearchProviderWithMode(useMock: boolean): SearchProvider {
  if (useMock) {
    return new MockSearchProvider();
  } else {
    return new PineconeSearchProvider();
  }
} 