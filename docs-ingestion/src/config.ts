/**
 * Configuration settings for the Vaadin docs ingestion pipeline
 */

export const config = {
  // GitHub repository settings
  github: {
    repoUrl: 'https://github.com/vaadin/docs.git',
    localPath: './vaadin-docs',
    articlesPath: 'articles',
  },
  
  // OpenAI settings
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small',
    batchSize: 10, // Number of texts to embed in a single API call
    rateLimitDelay: 200, // Delay between batches in ms
  },
  
  // Pinecone settings
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    index: process.env.PINECONE_INDEX,
    batchSize: 100, // Number of vectors to upsert in a single API call
    rateLimitDelay: 500, // Delay between batches in ms
  },
  
};
