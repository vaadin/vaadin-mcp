/**
 * Configuration settings for the Vaadin docs MCP server
 */

export const config = {
  // Server settings
  server: {
    name: 'vaadin-docs-server',
    version: '0.1.0',
    httpPort: parseInt(process.env.HTTP_PORT || '3000', 10),
  },
  
  // Pinecone settings
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    index: process.env.PINECONE_INDEX,
  },
  
  // Search settings
  search: {
    defaultMaxResults: 5,
    defaultMaxTokens: 1500,
    scoreThreshold: 0.7, // Minimum similarity score to include in results
  }
};
