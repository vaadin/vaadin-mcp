#!/usr/bin/env bun

/**
 * Vaadin Documentation REST Server
 * 
 * This server provides a REST API for searching Vaadin documentation with hybrid search.
 * It uses clean dependency injection to separate production and test implementations.
 */

// Load environment variables from project root
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

import express, { type Request, type Response } from 'express';
import cors from 'cors';
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

/**
 * Normalize component name to match directory structure
 * Handles: Button, button, vaadin-button -> button
 * Handles: TextField, text-field, vaadin-text-field -> text-field
 */
function normalizeComponentName(componentName: string): string {
  // Remove 'vaadin-' prefix if present
  let normalized = componentName.replace(/^vaadin-/i, '');

  // Convert PascalCase to kebab-case
  normalized = normalized
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  return normalized;
}

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
 * Vaadin Version endpoint - returns the latest stable version from GitHub Releases
 */
app.get('/vaadin-version', async (req: Request, res: Response) => {
  try {
    // Query GitHub API for the latest Vaadin platform release
    const githubUrl = 'https://api.github.com/repos/vaadin/platform/releases/latest';
    
    console.log('🔍 Fetching latest Vaadin version from GitHub...');
    const response = await fetch(githubUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'vaadin-docs-rest-server'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.tag_name) {
      throw new Error('No tag_name found in GitHub release response');
    }
    
    // Extract version from tag (e.g., "24.8.4" from tag_name like "24.8.4")
    const latestVersion = data.tag_name;
    
    // Validate that it's a stable version (semantic versioning pattern)
    if (!/^\d+\.\d+\.\d+$/.test(latestVersion)) {
      throw new Error(`Invalid version format: ${latestVersion}`);
    }
    
    console.log(`✅ Latest Vaadin version: ${latestVersion}`);
    console.log(`📅 Released: ${data.published_at}`);
    console.log(`🏷️ Release: ${data.name || data.tag_name}`);
    
    res.json({
      version: latestVersion,
      released: data.published_at
    });
    
  } catch (error) {
    console.error('❌ Error fetching Vaadin version:', error);
    
    res.status(500).json({
      error: `Failed to fetch Vaadin version: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
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
    
        // Validate framework parameter - support both 'flow'/'hilla' and 'common'
    const validFramework = (framework === 'flow' || framework === 'hilla' || framework === 'common')
      ? framework || 'common'
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
 * Get Flow (Java) API documentation for a component
 */
app.get('/component/:componentName/flow', async (req: Request, res: Response) => {
  try {
    const { componentName } = req.params;

    if (!componentName) {
      return res.status(400).json({
        error: 'Missing component name parameter'
      });
    }

    // Normalize component name
    const normalized = normalizeComponentName(componentName);

    // Construct file path
    const filePath = `components/${normalized}/index-flow.md`;

    // Construct absolute path to markdown file
    const markdownDir = process.env.NODE_ENV === 'production'
      ? '/app/packages/1-asciidoc-converter/dist/markdown'
      : path.join(process.cwd(), '..', '1-asciidoc-converter/dist/markdown');

    const fullPath = path.join(markdownDir, filePath);

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
        error: 'Component Flow API documentation not found',
        component: componentName,
        normalized_name: normalized
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

    // Return the component Flow API documentation
    res.json({
      component: componentName,
      normalized_name: normalized,
      framework: 'flow',
      content: markdownContent,
      metadata
    });

  } catch (error) {
    console.error('Error fetching component Flow API:', error);

    res.status(500).json({
      error: `Error fetching component Flow API: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * Get Hilla (React) API documentation for a component
 */
app.get('/component/:componentName/hilla', async (req: Request, res: Response) => {
  try {
    const { componentName } = req.params;

    if (!componentName) {
      return res.status(400).json({
        error: 'Missing component name parameter'
      });
    }

    // Normalize component name
    const normalized = normalizeComponentName(componentName);

    // Construct file path
    const filePath = `components/${normalized}/index-hilla.md`;

    // Construct absolute path to markdown file
    const markdownDir = process.env.NODE_ENV === 'production'
      ? '/app/packages/1-asciidoc-converter/dist/markdown'
      : path.join(process.cwd(), '..', '1-asciidoc-converter/dist/markdown');

    const fullPath = path.join(markdownDir, filePath);

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
        error: 'Component Hilla API documentation not found',
        component: componentName,
        normalized_name: normalized
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

    // Return the component Hilla API documentation
    res.json({
      component: componentName,
      normalized_name: normalized,
      framework: 'hilla',
      content: markdownContent,
      metadata
    });

  } catch (error) {
    console.error('Error fetching component Hilla API:', error);

    res.status(500).json({
      error: `Error fetching component Hilla API: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * Get styling documentation for a component (both Flow and Hilla)
 */
app.get('/component/:componentName/styling', async (req: Request, res: Response) => {
  try {
    const { componentName } = req.params;

    if (!componentName) {
      return res.status(400).json({
        error: 'Missing component name parameter'
      });
    }

    // Normalize component name
    const normalized = normalizeComponentName(componentName);

    // Construct file paths for both Flow and Hilla styling
    const flowFilePath = `components/${normalized}/styling-flow.md`;
    const hillaFilePath = `components/${normalized}/styling-hilla.md`;

    // Construct absolute path to markdown directory
    const markdownDir = process.env.NODE_ENV === 'production'
      ? '/app/packages/1-asciidoc-converter/dist/markdown'
      : path.join(process.cwd(), '..', '1-asciidoc-converter/dist/markdown');

    const flowFullPath = path.join(markdownDir, flowFilePath);
    const hillaFullPath = path.join(markdownDir, hillaFilePath);

    // Security checks
    const resolvedFlowPath = path.resolve(flowFullPath);
    const resolvedHillaPath = path.resolve(hillaFullPath);
    const resolvedMarkdownDir = path.resolve(markdownDir);

    if (!resolvedFlowPath.startsWith(resolvedMarkdownDir) || !resolvedHillaPath.startsWith(resolvedMarkdownDir)) {
      return res.status(403).json({
        error: 'Access denied: path traversal not allowed'
      });
    }

    // Read both files if they exist
    const flowExists = fs.existsSync(resolvedFlowPath);
    const hillaExists = fs.existsSync(resolvedHillaPath);

    if (!flowExists && !hillaExists) {
      return res.status(404).json({
        error: 'Component styling documentation not found',
        component: componentName,
        normalized_name: normalized
      });
    }

    // Helper function to parse file
    const parseFile = (filePath: string) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      let metadata: Record<string, string> = {};
      let markdownContent = content;

      if (frontmatterMatch) {
        try {
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

      return { content: markdownContent, metadata };
    };

    // Parse available files
    const result: any = {
      component: componentName,
      normalized_name: normalized
    };

    if (flowExists) {
      const parsed = parseFile(resolvedFlowPath);
      result.flow = {
        content: parsed.content,
        metadata: parsed.metadata
      };
    }

    if (hillaExists) {
      const parsed = parseFile(resolvedHillaPath);
      result.hilla = {
        content: parsed.content,
        metadata: parsed.metadata
      };
    }

    res.json(result);

  } catch (error) {
    console.error('Error fetching component styling:', error);

    res.status(500).json({
      error: `Error fetching component styling: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * Get Web Component (TypeScript) API documentation for a component
 */
app.get('/component/:componentName/web-component', async (req: Request, res: Response) => {
  try {
    const { componentName } = req.params;

    if (!componentName) {
      return res.status(400).json({
        error: 'Missing component name parameter'
      });
    }

    // Normalize component name
    const normalized = normalizeComponentName(componentName);

    // Read the Flow documentation to extract the TypeScript API URL from frontmatter
    const filePath = `components/${normalized}/index-flow.md`;
    const markdownDir = process.env.NODE_ENV === 'production'
      ? '/app/packages/1-asciidoc-converter/dist/markdown'
      : path.join(process.cwd(), '..', '1-asciidoc-converter/dist/markdown');

    const fullPath = path.join(markdownDir, filePath);
    const resolvedPath = path.resolve(fullPath);
    const resolvedMarkdownDir = path.resolve(markdownDir);

    if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
      return res.status(403).json({
        error: 'Access denied: path traversal not allowed'
      });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        error: 'Component documentation not found',
        component: componentName,
        normalized_name: normalized
      });
    }

    // Read the file to extract the TypeScript API URL
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

    if (!frontmatterMatch) {
      return res.status(500).json({
        error: 'Could not parse component documentation frontmatter'
      });
    }

    // Extract TypeScript API URL from page-links
    const pageLinksMatch = frontmatterMatch[1].match(/page-links:\s*\n-\s*'API:\s*([^[]+)\[TypeScript\]/);

    if (!pageLinksMatch || !pageLinksMatch[1]) {
      return res.status(404).json({
        error: 'TypeScript API URL not found in component documentation',
        component: componentName,
        normalized_name: normalized
      });
    }

    let typescriptApiUrl = pageLinksMatch[1].trim();

    // Check if the URL contains template variables that need to be resolved
    const hasTemplateVars = typescriptApiUrl.includes('{');

    let resolvedUrl = typescriptApiUrl;
    let apiContent = '';
    let fetchError = null;

    if (hasTemplateVars) {
      // Try to resolve template variables with a reasonable default
      // For example: {moduleNpmVersion:@vaadin/button} -> latest
      resolvedUrl = typescriptApiUrl.replace(/\{[^}]+\}/g, '24.5.0');
    }

    try {
      // Attempt to fetch the TypeScript API documentation
      const response = await fetch(resolvedUrl, {
        headers: {
          'User-Agent': 'vaadin-docs-rest-server'
        }
      });

      if (response.ok) {
        apiContent = await response.text();
      } else {
        fetchError = `Failed to fetch TypeScript API: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      fetchError = `Error fetching TypeScript API: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Return the web component API documentation
    res.json({
      component: componentName,
      normalized_name: normalized,
      framework: 'web-component',
      typescript_api_url_template: hasTemplateVars ? typescriptApiUrl : undefined,
      typescript_api_url: resolvedUrl,
      content: apiContent || `TypeScript API documentation is available at: ${resolvedUrl}${fetchError ? `\n\nNote: ${fetchError}` : ''}`,
      fetch_error: fetchError
    });

  } catch (error) {
    console.error('Error fetching component web component API:', error);

    res.status(500).json({
      error: `Error fetching component web component API: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        const validFramework = (framework === 'flow' || framework === 'hilla' || framework === 'common')
      ? framework || 'common'
      : '';

    // Use hybrid search for better results (fixed at 5 results)
    const supportingDocs = await searchService.hybridSearch(question, {
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
