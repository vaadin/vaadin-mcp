/**
 * Configuration settings for the Vaadin docs MCP server
 */

import { logger } from "./logger.js";

export const config = {
  // Server settings
  server: {
    name: 'vaadin-mcp',
    version: '0.8.0',
    httpPort: parseInt(process.env.HTTP_PORT || '8080', 10),
  },

  // Pinecone configuration
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    index: process.env.PINECONE_INDEX || 'vaadin-docs',
  },

  // Embedding provider configuration (auto-detected from available API keys)
  embedding: {
    provider: (process.env.MISTRAL_API_KEY ? 'mistral' : 'openai') as 'mistral' | 'openai',
    apiKey: (process.env.MISTRAL_API_KEY || process.env.OPENAI_API_KEY)!,
    model: process.env.MISTRAL_API_KEY ? 'mistral-embed' : 'text-embedding-3-small',
  },

  // Search settings
  search: {
    defaultMaxResults: 5,
    defaultMaxTokens: 1500,
    scoreThreshold: 0.6, // Minimum similarity score to include in results
  },

  // Analytics settings
  analytics: {
    amplitudeApiKey: process.env.AMPLITUDE_API_KEY,
    enabled: !!process.env.AMPLITUDE_API_KEY,
  },

  // Feature flags
  features: {
    mockPinecone: process.env.MOCK_PINECONE === 'true',
  }
};

/**
 * Validate configuration at startup
 */
export function validateConfig() {
  if (!config.features.mockPinecone) {
    if (!config.pinecone.apiKey) {
      throw new Error('Missing required environment variable: PINECONE_API_KEY');
    }
    if (!config.pinecone.index) {
      throw new Error('Missing required environment variable: PINECONE_INDEX');
    }
    if (process.env.MISTRAL_API_KEY && process.env.OPENAI_API_KEY) {
      throw new Error('Both MISTRAL_API_KEY and OPENAI_API_KEY are set. Set exactly one to select the embedding provider.');
    }
    if (!config.embedding.apiKey) {
      throw new Error('Missing required environment variable: either MISTRAL_API_KEY or OPENAI_API_KEY');
    }
  }
}
