/**
 * Configuration settings for the Vaadin docs REST server
 */

export const config = {
  // Server settings
  server: {
    name: 'vaadin-docs-rest-server',
    version: '0.1.0',
    port: parseInt(process.env.REST_PORT || '3001', 10),
  },
  
  // Pinecone settings
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    index: process.env.PINECONE_INDEX,
  },
  
  // Search settings
  search: {
    defaultMaxResults: 10,
    defaultMaxTokens: 5000,
    scoreThreshold: 0.5, // Minimum similarity score to include in results
  }
};
