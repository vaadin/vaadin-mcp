/**
 * Configuration settings for the Vaadin docs MCP server
 */

export const config = {
  // Server settings
  server: {
    name: 'vaadin-mcp',
    version: '0.7.3',
    httpPort: parseInt(process.env.HTTP_PORT || '8080', 10),
  },

  // REST server settings
  restServer: {
    url: process.env.REST_SERVER_URL || 'https://vaadin-docs-search.fly.dev',
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
  }
};
