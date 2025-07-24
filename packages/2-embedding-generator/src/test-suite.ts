/**
 * Test Suite for Embedding Generator
 * 
 * Validates chunking logic, relationship building, and overall pipeline functionality.
 */

import fs from 'fs';
import path from 'path';
import { parseFileHierarchy } from './hierarchy-parser.js';
import { parseFrontmatter } from './document-loader.js';
import { createChunker } from './chunker.js';
import { buildChunkRelationships, validateRelationships } from './relationship-builder.js';
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
  console.log('🧪 Running Embedding Generator Test Suite...\n');
  
  const testCases: TestCase[] = [
    {
      name: 'File Hierarchy Parsing',
      description: 'Tests file hierarchy detection and parent-child relationships',
      testFn: () => testFileHierarchy(testDataDir)
    },
    {
      name: 'Frontmatter Parsing',
      description: 'Tests markdown frontmatter extraction',
      testFn: () => testFrontmatterParsing(testDataDir)
    },
    {
      name: 'Document Chunking',
      description: 'Tests document chunking with header detection',
      testFn: () => testDocumentChunking(testDataDir)
    },
    {
      name: 'Relationship Building',
      description: 'Tests intra-file and cross-file relationship creation',
      testFn: () => testRelationshipBuilding(testDataDir)
    },
    {
      name: 'Relationship Validation',
      description: 'Tests validation of chunk relationships',
      testFn: () => testRelationshipValidation()
    }
  ];

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`🔍 Running: ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    
    const startTime = Date.now();
    
    try {
      const success = await testCase.testFn();
      const duration = Date.now() - startTime;
      
      if (success) {
        console.log(`   ✅ PASSED (${duration}ms)\n`);
        passed++;
        results.push({ name: testCase.name, passed: true, duration });
      } else {
        console.log(`   ❌ FAILED (${duration}ms)\n`);
        failed++;
        results.push({ name: testCase.name, passed: false, duration });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ ERROR: ${errorMsg} (${duration}ms)\n`);
      failed++;
      results.push({ name: testCase.name, passed: false, error: errorMsg, duration });
    }
  }

  console.log('📊 Test Suite Results:');
  console.log(`   Total: ${testCases.length}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  return {
    totalTests: testCases.length,
    passed,
    failed,
    results
  };
}

/**
 * Tests file hierarchy parsing
 */
async function testFileHierarchy(testDataDir: string): Promise<boolean> {
  const structure = parseFileHierarchy(testDataDir);
  
  // Check that forms.md is detected as parent
  const formsHierarchy = structure['forms.md'];
  if (!formsHierarchy || formsHierarchy.level !== 0) {
    throw new Error('forms.md should be a root level file');
  }

  // Check that forms/binding.md has forms.md as parent
  const bindingHierarchy = structure['forms/binding.md'];
  if (!bindingHierarchy || bindingHierarchy.parentPath !== 'forms.md') {
    throw new Error('forms/binding.md should have forms.md as parent');
  }

  console.log(`     📁 Found ${Object.keys(structure).length} files in hierarchy`);
  return true;
}

/**
 * Tests frontmatter parsing
 */
async function testFrontmatterParsing(testDataDir: string): Promise<boolean> {
  // Create a test markdown content with frontmatter
  const testContent = `---
framework: flow
source_url: https://vaadin.com/docs/test
title: Test Document
---

# Test Heading

This is test content.`;

  const { frontmatter, content } = parseFrontmatter(testContent);
  
  if (frontmatter.framework !== 'flow') {
    throw new Error('Framework should be "flow"');
  }
  
  if (!content.includes('# Test Heading')) {
    throw new Error('Content should include the heading');
  }

  console.log(`     📄 Parsed frontmatter with ${Object.keys(frontmatter).length} fields`);
  return true;
}

/**
 * Tests document chunking
 */
async function testDocumentChunking(testDataDir: string): Promise<boolean> {
  const testContent = `# Main Heading

This is the introduction with enough content to potentially trigger splitting.

## Sub Heading 1

Content for sub heading 1 with more details to make it substantial enough for the chunker.

### Deep Heading

Nested content that should be detected as level 3.

## Sub Heading 2

Content for sub heading 2 with additional text to ensure proper chunking behavior.`;

  const document = new Document({
    pageContent: testContent,
    metadata: {
      framework: 'flow',
      source_url: 'https://example.com',
      file_path: 'test.md'
    }
  });

  const chunker = createChunker({ maxChunkSize: 500, chunkOverlap: 100 });
  const chunks = await chunker.chunkDocument(document);
  
  if (chunks.length === 0) {
    throw new Error('Should produce at least one chunk');
  }

  // Check that hierarchy is preserved - should detect at least some headers
  const hasAnyLevel = chunks.some(chunk => chunk.level > 0);
  
  if (!hasAnyLevel) {
    throw new Error(`Should detect at least some header levels. Found levels: ${chunks.map(c => c.level).join(', ')}`);
  }

  console.log(`     ✂️ Created ${chunks.length} chunks with proper hierarchy`);
  return true;
}

/**
 * Tests relationship building
 */
async function testRelationshipBuilding(testDataDir: string): Promise<boolean> {
  // Mock some hierarchical chunks
  const mockChunks = new Map();
  
  // Parent file chunks
  mockChunks.set('forms.md', [{
    chunk_id: 'forms-0',
    content: '# Forms Overview\n\nThis covers form basics.',
    level: 1,
    heading: 'Forms Overview',
    metadata: { framework: 'common' as const, source_url: '', title: 'Forms' }
  }]);
  
  // Child file chunks
  mockChunks.set('forms/binding.md', [{
    chunk_id: 'forms-binding-0',
    content: '# Data Binding\n\nHow to bind data to forms.',
    level: 1,
    heading: 'Data Binding',
    metadata: { framework: 'flow' as const, source_url: '', title: 'Binding' }
  }]);

  const mockStructure = {
    'forms.md': {
      filePath: 'forms.md',
      parentPath: null,
      children: ['forms/binding.md'],
      level: 0
    },
    'forms/binding.md': {
      filePath: 'forms/binding.md',
      parentPath: 'forms.md',
      children: [],
      level: 1
    }
  };

  const documentChunks = buildChunkRelationships(mockChunks, mockStructure);
  
  if (documentChunks.length !== 2) {
    throw new Error('Should produce 2 document chunks');
  }

  // Check that child chunk has parent relationship
  const childChunk = documentChunks.find(chunk => chunk.chunk_id === 'forms-binding-0');
  if (!childChunk || childChunk.parent_id !== 'forms-0') {
    throw new Error('Child chunk should reference parent chunk');
  }

  console.log(`     🔗 Built relationships for ${documentChunks.length} chunks`);
  return true;
}

/**
 * Tests relationship validation
 */
async function testRelationshipValidation(): Promise<boolean> {
  const validChunks = [
    {
      chunk_id: 'chunk-1',
      parent_id: null,
      framework: 'common' as const,
      content: 'Root content',
      source_url: 'https://example.com',
      metadata: {}
    },
    {
      chunk_id: 'chunk-2',
      parent_id: 'chunk-1',
      framework: 'flow' as const,
      content: 'Child content',
      source_url: 'https://example.com',
      metadata: {}
    }
  ];

  const validation = validateRelationships(validChunks);
  
  if (!validation.valid) {
    throw new Error(`Validation should pass for valid chunks: ${validation.errors.join(', ')}`);
  }

  // Test invalid chunks
  const invalidChunks = [
    {
      chunk_id: 'chunk-1',
      parent_id: 'nonexistent',
      framework: 'common' as const,
      content: 'Invalid content',
      source_url: 'https://example.com',
      metadata: {}
    }
  ];

  const invalidValidation = validateRelationships(invalidChunks);
  
  if (invalidValidation.valid) {
    throw new Error('Validation should fail for invalid parent reference');
  }

  console.log(`     ✅ Validation correctly identified ${invalidValidation.errors.length} errors`);
  return true;
}

/**
 * Utility to run tests from command line
 */
export async function main(): Promise<void> {
  const results = await runTestSuite();
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

// Run tests when file is executed directly
if (import.meta.main) {
  main().catch(console.error);
} 