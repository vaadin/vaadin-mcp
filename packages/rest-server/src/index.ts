#!/usr/bin/env bun

/**
 * Vaadin Documentation REST Server
 * 
 * This server provides a REST API for searching Vaadin documentation with hybrid search.
 * It uses clean dependency injection to separate production and test implementations.
 */

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getSearchService } from './search-factory.js';
import { config } from './config.js';
import type { RetrievalResult } from 'core-types';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize search service
let searchService: any = null;
let searchServiceInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Initialize the search service on startup
async function initializeSearchService() {
  try {
    console.log('🚀 Initializing search service...');
    searchService = await getSearchService();
    searchServiceInitialized = true;
    console.log('✅ Search service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize search service:', error);
    process.exit(1);
  }
}

// Ensure search service is ready before using it
async function ensureSearchServiceReady(): Promise<void> {
  if (searchServiceInitialized && searchService) {
    return;
  }
  
  if (!initializationPromise) {
    initializationPromise = initializeSearchService();
  }
  
  await initializationPromise;
}

// Call initialization
initializationPromise = initializeSearchService();

/**
 * Check for required environment variables (only in production mode)
 */
function checkEnvironmentVariables() {
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_PINECONE === 'true') {
    console.log('🧪 Running in test mode - skipping API key validation');
    return;
  }
  
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
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://vaadin-docs-search.fly.dev'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

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

/**
 * Search endpoint with hybrid search support
 */
app.post('/search', async (req: Request, res: Response) => {
  try {
    // Ensure search service is ready
    await ensureSearchServiceReady();
    
    // Check if request has a body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Request must include a JSON body with parameters'
      });
    }
    
    const { question, max_results, max_tokens, framework, stream } = req.body;
    
    // Validate search query
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid "question" parameter in request body' 
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
    
    // Validate framework parameter - support both 'flow'/'hilla' and empty string
    const validFramework = (framework === 'flow' || framework === 'hilla' || framework === '') 
      ? framework || ''
      : '';
    
    // Use hybrid search for enhanced results
    const results = await searchService.hybridSearch(question, {
      maxResults,
      maxTokens,
      framework: validFramework,
    });
    
    // Return results in the expected format
    res.json({ results });
    
  } catch (error) {
    console.error('Error searching documentation:', error);
    
    res.status(500).json({ 
      error: `Error searching Vaadin documentation: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
});

/**
 * Get specific document chunk endpoint
 * This enables navigation through parent-child relationships
 */
app.get('/chunk/:chunkId', async (req: Request, res: Response) => {
  try {
    // Ensure search service is ready
    await ensureSearchServiceReady();
    
    const { chunkId } = req.params;
    
    if (!chunkId) {
      return res.status(400).json({
        error: 'Missing chunk ID parameter'
      });
    }
    
    const chunk = await searchService.getDocumentChunk(chunkId);
    
    if (!chunk) {
      return res.status(404).json({
        error: 'Document chunk not found'
      });
    }
    
    res.json(chunk);
    
  } catch (error) {
    console.error('Error fetching document chunk:', error);
    
    res.status(500).json({
      error: `Error fetching document chunk: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * Get full document endpoint
 * This enables retrieval of complete documentation pages instead of just chunks
 */
app.get('/document/:file_path(*)', async (req: Request, res: Response) => {
  try {
    const filePath = req.params.file_path;
    
    if (!filePath) {
      return res.status(400).json({
        error: 'Missing file path parameter'
      });
    }
    
    // Decode URL-encoded file path
    const decodedFilePath = decodeURIComponent(filePath);
    
    // Construct absolute path to markdown file
    // In production: /app/packages/1-asciidoc-converter/dist/markdown/
    // In development: Navigate up from rest-server to project root, then to markdown dir
    const markdownDir = process.env.NODE_ENV === 'production' 
      ? '/app/packages/1-asciidoc-converter/dist/markdown'
      : path.join(process.cwd(), '..', '1-asciidoc-converter/dist/markdown');
    
    const fullPath = path.join(markdownDir, decodedFilePath);
    
    // Security check: ensure the path is within the markdown directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedMarkdownDir = path.resolve(markdownDir);
    
    if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
      return res.status(403).json({
        error: 'Access denied: path traversal not allowed'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        error: 'Document not found',
        file_path: decodedFilePath
      });
    }
    
    // Read the markdown file
    const content = fs.readFileSync(resolvedPath, 'utf8');
    
    // Parse frontmatter and content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    let metadata: Record<string, string> = {};
    let markdownContent = content;
    
    if (frontmatterMatch) {
      try {
        // Parse YAML frontmatter
        const yamlContent = frontmatterMatch[1];
        const lines = yamlContent.split('\n');
        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
            metadata[key] = value;
          }
        }
        markdownContent = frontmatterMatch[2];
      } catch (error) {
        console.warn('Failed to parse frontmatter:', error);
      }
    }
    
    // Return the complete document
    res.json({
      file_path: decodedFilePath,
      content: markdownContent,
      metadata,
      full_path: decodedFilePath // For compatibility
    });
    
  } catch (error) {
    console.error('Error fetching document:', error);
    
    res.status(500).json({
      error: `Error fetching document: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * Prepare the context, prompt, and messages for OpenAI from the supporting documents
 */
function prepareOpenAIRequest(question: string, documents: RetrievalResult[], framework: string): { messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> } {
  // Create a context from the documents
  const context = documents.map((doc, index) => {
    return `Document ${index + 1}:
Title: ${doc.metadata?.title || 'Untitled'}
${doc.metadata?.heading ? `Heading: ${doc.metadata.heading}\n` : ''}
Framework: ${doc.framework}
Source: ${doc.source_url}
Content: ${doc.content}
`;
  }).join('\n\n');

  // Create the prompt for OpenAI
  const prompt = `
You are an expert on Vaadin development. Answer the following question about Vaadin using the provided documentation.
The user is using the ${framework} framework.
Provide clear, concise answers with code examples when appropriate.

Question: ${question}

Documentation:
${context}
`;

  // Return the messages array for OpenAI
  return {
    messages: [
      { role: 'system', content: 'You are a helpful assistant that specializes in Vaadin development.' },
      { role: 'user', content: prompt }
    ]
  };
}

/**
 * Rewrite a user question to be more suitable for vector database search
 */
async function rewriteQuestionForSearch(originalQuestion: string): Promise<string> {
  const prompt = `
You are an expert on Vaadin documentation. Your task is to rewrite the following user question into a format that's more suitable for searching in a vector database of Vaadin documentation.

The documentation is likely organized at a more generic level than specific use cases. For example, if a user asks about "how to add a date picker column to a grid", you should rewrite it to search for "how to add a component column to a grid" since the documentation probably covers the general concept rather than specific component types.

Original question: ${originalQuestion}

Rewrite this question to be more effective for searching technical documentation while preserving the core information need. Focus on general concepts and patterns rather than specific implementations.

Rewritten question:`;

  const response = await openai.chat.completions.create({
    model: config.openai.questionRewriter.model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant that specializes in optimizing search queries for technical documentation.' },
      { role: 'user', content: prompt }
    ],
    temperature: config.openai.questionRewriter.temperature,
    max_tokens: config.openai.questionRewriter.maxTokens
  });

  return response.choices[0]?.message?.content?.trim() || originalQuestion;
}

/**
 * Check if a question is related to Vaadin or Java development
 */
async function isQuestionRelevant(question: string): Promise<{ isRelevant: boolean; reason: string }> {
  const prompt = `
You are a guardrail system that determines if questions are related to Vaadin or Java development.
Evaluate if the following question is related to Vaadin, Java development, or web development with Java frameworks.

Question: ${question}

First, provide your reasoning about whether this question is related to Vaadin, Java, or web development with Java frameworks.
Then, provide a final yes/no determination.

Format your response exactly as follows:
Reasoning: [your detailed reasoning]
Relevant: [YES or NO]
`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.relevanceChecker.model,
      messages: [
        { role: 'system', content: 'You are a guardrail system that determines if questions are on-topic.' },
        { role: 'user', content: prompt }
      ],
      temperature: config.openai.relevanceChecker.temperature,
      max_tokens: config.openai.relevanceChecker.maxTokens
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Extract the determination from the response
    const reasoningMatch = content.match(/Reasoning: (.*?)(?=\nRelevant:|$)/s);
    const relevantMatch = content.match(/Relevant: (YES|NO)/i);
    
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided';
    const isRelevant = relevantMatch ? relevantMatch[1].toUpperCase() === 'YES' : false;
    
    return {
      isRelevant,
      reason: reasoning
    };
  } catch (error) {
    console.error('Error checking question relevance:', error);
    // Default to allowing the question if there's an error with the guardrail
    return {
      isRelevant: true,
      reason: 'Error checking relevance, defaulting to allow'
    };
  }
}

// Ask endpoint - accepts a question and returns an AI-generated answer
app.post('/ask', async (req: Request, res: Response) => {
  try {
    // Ensure search service is ready
    await ensureSearchServiceReady();
    
    // Check if request has a body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Request must include a JSON body with parameters'
      });
    }
    
    const { question, stream = false, framework } = req.body;
    
    // Validate question
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid "question" parameter in request body' 
      });
    }

    // Check if the question is relevant to Vaadin or Java development
    const relevanceCheck = await isQuestionRelevant(question);
    
    if (!relevanceCheck.isRelevant) {
      return res.status(400).json({
        error: 'Question not related to Vaadin or Java development',
        reason: relevanceCheck.reason
      });
    }

    // Validate framework parameter
    const validFramework = (framework === 'flow' || framework === 'hilla' || framework === '') 
      ? framework || ''
      : '';

    // Rewrite the question for better vector search
    const searchQuestion = await rewriteQuestionForSearch(question);
    
    // Use hybrid search for better results (fixed at 5 results)
    const supportingDocs = await searchService.hybridSearch(searchQuestion, {
      maxResults: 5,
      maxTokens: 4000,
      framework: validFramework,
    });
    
    // Prepare the OpenAI request (same for both streaming and non-streaming)
    const { messages } = prepareOpenAIRequest(question, supportingDocs, framework);
    
    // If streaming is requested, handle streaming response
    if (stream === true) {
      // Set appropriate headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Generate the answer using OpenAI with streaming
      const stream = await openai.chat.completions.create({
        model: config.openai.answerGenerator.model,
        messages,
        temperature: config.openai.answerGenerator.temperature,
        max_tokens: config.openai.answerGenerator.maxTokens,
        stream: true,
      });

      // Stream the response to the client
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          // Send the chunk as a server-sent event
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // End the response
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Generate answer using OpenAI with the original question (non-streaming)
      const response = await openai.chat.completions.create({
        model: config.openai.answerGenerator.model,
        messages,
        temperature: config.openai.answerGenerator.temperature,
        max_tokens: config.openai.answerGenerator.maxTokens
      });
      
      const answer = response.choices[0]?.message?.content || 'Unable to generate an answer.';
      
      // Return the answer
      res.json({ 
        answer
      });
    }
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
