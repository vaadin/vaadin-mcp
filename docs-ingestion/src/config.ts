/**
 * Configuration settings for the Vaadin docs ingestion pipeline
 */

export const config = {
  // Documentation repository settings
  docs: {
    repoUrl: 'https://github.com/vaadin/docs.git',
    localPath: './vaadin-docs',
    articlesPath: 'articles',
    // Patterns for files and paths to skip, relative to the articlesPath
    skipPatterns: [
      // Skip files starting with underscore as they used for imports
      '_*',
      'hilla/lit/**',
      '404.adoc',
      'contributing/**'
    ],
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
  
  // AsciiDoc processor settings
  asciidoc: {
    safe: 'unsafe',
    attributes: {
      'source-highlighter': 'highlight.js',
      'icons': 'font',
      'experimental': '',
      'toc': 'macro',
      'root': './vaadin-docs',
      'articles': '../vaadin-docs/articles'
    }
  },
};
