#!/usr/bin/env bun

/**
 * Vaadin Documentation REST Server
 * 
 * This server provides a REST API for searching Vaadin documentation.
 * It's used by the MCP server to perform searches.
 */

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { searchDocumentation } from './pinecone-service.js';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Check for required environment variables
 */
function checkEnvironmentVariables() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.PINECONE_INDEX) {
    console.error('PINECONE_INDEX environment variable is required');
    process.exit(1);
  }
}

// Check environment variables
checkEnvironmentVariables();

// Create Express app
const app = express();

// Enable CORS
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    server: config.server.name, 
    version: config.server.version 
  });
});

// Search endpoint - accepts only JSON body parameters
app.post('/search', async (req: Request, res: Response) => {
  try {
    // Check if request has a body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Request must include a JSON body with parameters'
      });
    }
    
    const { query, max_results, max_tokens } = req.body;
    
    // Validate query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid "query" parameter in request body' 
      });
    }
    
    // Parse and validate max_results
    const maxResults = max_results && !isNaN(max_results) 
      ? Math.min(Math.max(1, max_results), 20) 
      : config.search.defaultMaxResults;
      
    // Parse and validate max_tokens
    const maxTokens = max_tokens && !isNaN(max_tokens) 
      ? Math.min(Math.max(100, max_tokens), 10000) 
      : config.search.defaultMaxTokens;
    
    // Search documentation
    const results = await searchDocumentation(query, maxResults, maxTokens);
    
    // Return results
    res.json({ results });
  } catch (error) {
    console.error('Error searching documentation:', error);
    
    res.status(500).json({ 
      error: `Error searching Vaadin documentation: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
});

/**
 * Generate an answer to a question using OpenAI and Vaadin documentation
 * @param question - The user's question
 * @param documents - The supporting documentation
 * @returns Promise with the generated answer
 */
async function generateAnswer(question: string, documents: any[]): Promise<string> {
  // Create a context from the documents
  const context = documents.map((doc, index) => {
    return `Document ${index + 1}:
Title: ${doc.metadata.title}
${doc.metadata.heading ? `Heading: ${doc.metadata.heading}\n` : ''}
Source: ${doc.metadata.url}
Content: ${doc.text}
`;
  }).join('\n\n');

  // Create the prompt for OpenAI
  const prompt = `
You are an expert on Vaadin development. Answer the following question about Vaadin using only the provided documentation.
If the documentation doesn't contain enough information to answer the question confidently, acknowledge the limitations.
Provide clear, concise answers with code examples when appropriate.

Question: ${question}

Documentation:
${context}
`;

  // Generate the answer using OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant that specializes in Vaadin development.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1500
  });

  return response.choices[0]?.message?.content || 'Unable to generate an answer.';
}

// Ask endpoint - accepts a question and returns an AI-generated answer
app.post('/ask', async (req: Request, res: Response) => {
  try {
    // Check if request has a body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Request must include a JSON body with parameters'
      });
    }
    
    const { question } = req.body;
    
    // Validate question
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid "question" parameter in request body' 
      });
    }
    
    // Search for supporting documentation (fixed at 5 results)
    const supportingDocs = await searchDocumentation(question, 5, 4000);
    
    // Generate answer using OpenAI
    const answer = await generateAnswer(question, supportingDocs);
    
    // Return the answer and supporting documents
    res.json({ 
      answer
    });
  } catch (error) {
    console.error('Error answering question:', error);
    
    res.status(500).json({ 
      error: `Error answering question: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
});

// Start the server
const port = config.server.port;
app.listen(port, () => {
  console.log(`Vaadin Documentation REST server running on http://localhost:${port}`);
});
