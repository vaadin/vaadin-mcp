/**
 * Configuration settings for the Vaadin docs MCP server
 */

import { logger } from "./logger";

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

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    // Configuration for checking if questions are relevant to Vaadin/Java
    relevanceChecker: {
      model: 'gpt-4.1-nano',
      temperature: 0,
      maxTokens: 400,
    },
    // Configuration for generating answers (both streaming and non-streaming)
    answerGenerator: {
      model: 'gpt-4.1',
      temperature: 0,
      maxTokens: 1500,
    },
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
  }
}
