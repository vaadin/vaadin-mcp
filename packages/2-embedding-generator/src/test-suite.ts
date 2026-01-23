/**
 * Test Suite for Simplified Embedding Generator
 * 
 * Validates chunking logic, file_path metadata, and overall pipeline functionality.
 */

import fs from 'fs';
import path from 'path';
import { parseFrontmatter } from './document-loader.js';
import { createChunker } from './chunker.js';
import { Document } from '@langchain/core/documents';

/**
 * Test case definition
 */
export interface TestCase {
  name: string;
  description: string;
  testFn: () => Promise<boolean>;
}

/**
 * Test result
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * Runs all test cases
 */
export async function runTestSuite(testDataDir: string = './test-data'): Promise<{
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  console.debug('🧪 Running Simplified Embedding Generator Test Suite...\n');
  
  const testCases: TestCase[] = [
    {
      name: 'Frontmatter Parsing',
      description: 'Tests markdown frontmatter extraction',
      testFn: () => testFrontmatterParsing(testDataDir)
    },
    {
      name: 'Document Chunking',
      description: 'Tests document chunking with file_path metadata',
      testFn: () => testDocumentChunking(testDataDir)
    },
    {
      name: 'File Path Metadata',
      description: 'Tests that chunks contain proper file_path for document retrieval',
      testFn: () => testFilePathMetadata(testDataDir)
    },
    {
      name: 'Chunk Structure',
      description: 'Tests that chunks have simplified structure without parent_id',
      testFn: () => testChunkStructure(testDataDir)
    }
  ];

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.debug(`🔍 Running: ${testCase.name}`);
    console.debug(`   ${testCase.description}`);
    
    const startTime = Date.now();
    
    try {
      const success = await testCase.testFn();
      const duration = Date.now() - startTime;
      
      if (success) {
        console.debug(`   ✅ PASSED (${duration}ms)`);
        passed++;
        results.push({ name: testCase.name, passed: true, duration });
      } else {
        console.debug(`   ❌ FAILED (${duration}ms)`);
        failed++;
        results.push({ name: testCase.name, passed: false, duration });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.debug(`   ❌ FAILED (${duration}ms): ${errorMessage}`);
      failed++;
      results.push({ 
        name: testCase.name, 
        passed: false, 
        error: errorMessage, 
        duration 
      });
    }
    
    console.debug('');
  }

  return {
    totalTests: testCases.length,
    passed,
    failed,
    results
  };
}

/**
 * Tests frontmatter parsing functionality
 */
async function testFrontmatterParsing(testDataDir: string): Promise<boolean> {
  const testFile = path.join(testDataDir, 'forms.md');
  
  if (!fs.existsSync(testFile)) {
    throw new Error(`Test file not found: ${testFile}`);
  }
  
  const fileContent = fs.readFileSync(testFile, 'utf-8');
  const { frontmatter, content } = parseFrontmatter(fileContent);
  
  console.debug(`     📄 Parsed frontmatter with ${Object.keys(frontmatter).length} fields`);
  
  // Should have basic frontmatter fields
  return Object.keys(frontmatter).length > 0 && content.length > 0;
}

/**
 * Tests document chunking functionality
 */
async function testDocumentChunking(testDataDir: string): Promise<boolean> {
  const testFile = path.join(testDataDir, 'forms/binding.md');
  
  if (!fs.existsSync(testFile)) {
    throw new Error(`Test file not found: ${testFile}`);
  }
  
  const fileContent = fs.readFileSync(testFile, 'utf-8');
  const { frontmatter, content } = parseFrontmatter(fileContent);
  
  const document = new Document({
    pageContent: content,
    metadata: {
      ...frontmatter,
      file_path: 'forms/binding.md'
    }
  });
  
  const chunker = createChunker();
  const chunks = await chunker.processDocuments([document]);
  
  console.debug(`     ✂️ Created ${chunks.length} chunks with proper structure`);
  
  // Should create at least one chunk with proper structure
  return chunks.length > 0 && 
         chunks.every(chunk => 
           chunk.chunk_id && 
           chunk.content && 
           chunk.metadata &&
           chunk.metadata.file_path === 'forms/binding.md' &&
           chunk.parent_id === null // No hierarchical relationships
         );
}

/**
 * Tests that chunks contain proper file_path metadata
 */
async function testFilePathMetadata(testDataDir: string): Promise<boolean> {
  const documents: Document[] = [];
  
  // Load multiple test documents
  const testFiles = ['forms.md', 'forms/binding.md', 'forms/validation.md'];
  
  for (const testFile of testFiles) {
    const fullPath = path.join(testDataDir, testFile);
    if (fs.existsSync(fullPath)) {
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const { frontmatter, content } = parseFrontmatter(fileContent);
      
      documents.push(new Document({
        pageContent: content,
        metadata: {
          ...frontmatter,
          file_path: testFile
        }
      }));
    }
  }
  
  if (documents.length === 0) {
    throw new Error('No test documents found');
  }
  
  const chunker = createChunker();
  const chunks = await chunker.processDocuments(documents);
  
  console.debug(`     📁 Processed ${documents.length} documents into ${chunks.length} chunks`);
  
  // All chunks should have file_path metadata
  const hasValidFilePaths = chunks.every(chunk => 
    chunk.metadata?.file_path && 
    typeof chunk.metadata.file_path === 'string' &&
    chunk.metadata.file_path.length > 0
  );
  
  // Should have chunks from different files
  const uniqueFilePaths = new Set(chunks.map(chunk => chunk.metadata?.file_path));
  
  return hasValidFilePaths && uniqueFilePaths.size > 1;
}

/**
 * Tests that chunks have simplified structure without hierarchical complexity
 */
async function testChunkStructure(testDataDir: string): Promise<boolean> {
  const testFile = path.join(testDataDir, 'forms/binding.md');
  
  if (!fs.existsSync(testFile)) {
    throw new Error(`Test file not found: ${testFile}`);
  }
  
  const fileContent = fs.readFileSync(testFile, 'utf-8');
  const { frontmatter, content } = parseFrontmatter(fileContent);
  
  const document = new Document({
    pageContent: content,
    metadata: {
      ...frontmatter,
      file_path: 'forms/binding.md'
    }
  });
  
  const chunker = createChunker();
  const chunks = await chunker.processDocuments([document]);
  
  console.debug(`     🏗️ Validated structure of ${chunks.length} chunks`);
  
  // All chunks should have simplified structure
  return chunks.every(chunk => {
    return (
      // Required fields
      typeof chunk.chunk_id === 'string' &&
      typeof chunk.content === 'string' &&
      typeof chunk.framework === 'string' &&
      typeof chunk.source_url === 'string' &&
      // Note: relevance_score is only added during search, not in base DocumentChunk
      chunk.parent_id === null && // No hierarchical relationships
      chunk.metadata &&
      typeof chunk.metadata.file_path === 'string' &&
      chunk.metadata.file_path.length > 0
    );
  });
}

/**
 * Prints test results summary
 */
export function printTestResults(results: {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
}): void {
  console.debug(`📊 Test Suite Results:`);
  console.debug(`  Total: ${results.totalTests}`);
  console.debug(`  Passed: ${results.passed}`);
  console.debug(`  Failed: ${results.failed}`);
  console.debug(`  Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.debug('\n❌ Failed Tests:');
    results.results
      .filter(r => !r.passed)
      .forEach(result => {
        console.debug(`  - ${result.name}: ${result.error || 'Test returned false'}`);
      });
  }
}

/**
 * Main test runner
 */
export async function main(): Promise<void> {
  try {
    const results = await runTestSuite();
    printTestResults(results);
    
    if (results.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 