/**
 * Integration test suite for enhanced REST server with hybrid search
 * Uses the clean architecture with dependency injection
 */

import { MockSearchProvider } from './mock-search-provider.js';
import { HybridSearchService } from './hybrid-search-service.js';
import { PineconeSparseProvider } from './pinecone-sparse-provider.js';
import type { RetrievalResult } from 'core-types';

// Create service with mock provider for testing
const mockProvider = new MockSearchProvider();
const sparseProvider = new PineconeSparseProvider(); // Will work in mock mode
const searchService = new HybridSearchService(mockProvider, sparseProvider);

/**
 * Test configuration
 */
interface TestConfig {
  endpoint: string;
  apiKey?: string;
  verbose: boolean;
}

/**
 * Test result interface
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

/**
 * Test suite results
 */
interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  overallDuration: number;
}

/**
 * API test cases for /search endpoint
 */
const API_TEST_CASES = [
  {
    name: 'Basic search with question parameter',
    request: {
      question: 'How to create a grid',
      framework: 'common',
      max_results: 5
    },
    expectedStatus: 200,
    validate: (data: any) => {
      return data.results && Array.isArray(data.results) && data.results.length > 0;
    }
  },
  {
    name: 'Search with question parameter (new)',
    request: {
      question: 'How to create a button component',
      framework: 'flow',
      max_results: 3
    },
    expectedStatus: 200,
    validate: (data: any) => {
      return data.results && Array.isArray(data.results) && data.results.length > 0;
    }
  },
  {
    name: 'Framework filtering - Flow',
    request: {
      question: 'form validation',
      framework: 'flow',
      max_results: 5
    },
    expectedStatus: 200,
    validate: (data: any) => {
      if (!data.results || !Array.isArray(data.results)) return false;
      // Check that results are Flow or common framework
      return data.results.every((result: RetrievalResult) => 
        result.framework === 'flow' || result.framework === 'common'
      );
    }
  },
  {
    name: 'Framework filtering - Hilla',
    request: {
      question: 'form validation',
      framework: 'hilla',
      max_results: 5
    },
    expectedStatus: 200,
    validate: (data: any) => {
      if (!data.results || !Array.isArray(data.results)) return false;
      // Check that results are Hilla or common framework
      return data.results.every((result: RetrievalResult) => 
        result.framework === 'hilla' || result.framework === 'common'
      );
    }
  },
  {
    name: 'Token limit validation',
    request: {
      question: 'comprehensive guide to vaadin components',
      max_tokens: 500,
      max_results: 10
    },
    expectedStatus: 200,
    validate: (data: any) => {
      if (!data.results || !Array.isArray(data.results)) return false;
      // Estimate total tokens
      const totalChars = data.results.reduce((sum: number, result: RetrievalResult) => 
        sum + result.content.length, 0
      );
      const estimatedTokens = totalChars * 0.25;
      return estimatedTokens <= 600; // Some tolerance for estimation
    }
  },
  {
    name: 'Missing query/question parameter',
    request: {
      framework: 'flow'
    },
    expectedStatus: 400,
    validate: (data: any) => {
      return data.error && data.error.includes('question');
    }
  },
  {
    name: 'Empty body request',
    request: {},
    expectedStatus: 400,
    validate: (data: any) => {
      return data.error && data.error.includes('JSON body');
    }
  }
];

/**
 * Hybrid search test cases
 */
const HYBRID_SEARCH_TEST_CASES = [
  {
    name: 'Semantic search effectiveness',
    query: 'How to bind form fields to data model',
    framework: 'common',
    expectedKeywords: ['bind', 'form', 'field', 'data', 'model'],
    minResults: 1
  },
  {
    name: 'Keyword search accuracy',
    query: 'Grid column configuration',
    framework: 'common',
    expectedKeywords: ['grid', 'column'],
    minResults: 1
  },
  {
    name: 'Framework filtering accuracy',
    query: 'Button component',
    framework: 'flow',
    minResults: 1,
    validateFramework: true
  },
  {
    name: 'Cross-framework content inclusion',
    query: 'general component usage',
    framework: 'flow',
    expectCommonFramework: true,
    minResults: 1
  },
  {
    name: 'RRF result ranking',
    query: 'Grid data binding validation',
    framework: 'common',
    minResults: 3,
    validateRanking: true
  }
];

/**
 * Document chunk test cases
 */
const CHUNK_TEST_CASES = [
  {
    name: 'Valid chunk ID retrieval',
    chunkId: 'forms-binding-1', // This uses our mock data
    expectSuccess: true
  },
  {
    name: 'Invalid chunk ID handling',
    chunkId: 'non-existent-chunk-id',
    expectSuccess: false
  }
];

/**
 * Run a single API test
 */
async function runApiTest(testCase: any, config: TestConfig): Promise<TestResult> {
  const startTime = Date.now();
  const testName = testCase.name;
  
  try {
    const response = await fetch(`${config.endpoint}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.request),
    });
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    // Check status code
    if (response.status !== testCase.expectedStatus) {
      return {
        name: testName,
        passed: false,
        error: `Expected status ${testCase.expectedStatus}, got ${response.status}`,
        duration,
        details: { response: data }
      };
    }
    
    // Run custom validation
    if (testCase.validate && !testCase.validate(data)) {
      return {
        name: testName,
        passed: false,
        error: 'Custom validation failed',
        duration,
        details: { response: data }
      };
    }
    
    return {
      name: testName,
      passed: true,
      duration,
      details: { response: data }
    };
    
  } catch (error) {
    return {
      name: testName,
      passed: false,
      error: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run a single hybrid search test
 */
async function runHybridSearchTest(testCase: any): Promise<TestResult> {
  const startTime = Date.now();
  const testName = testCase.name;
  
  try {
    const results = await searchService.hybridSearch(testCase.query, {
      maxResults: 10,
      maxTokens: 2000,
      framework: testCase.framework
    });
    
    const duration = Date.now() - startTime;
    
    // Check minimum results
    if (results.length < testCase.minResults) {
      return {
        name: testName,
        passed: false,
        error: `Expected at least ${testCase.minResults} results, got ${results.length}`,
        duration,
        details: { results }
      };
    }
    
    // Check keyword presence (if specified)
    if (testCase.expectedKeywords) {
      const allContent = results.map((r: RetrievalResult) => r.content.toLowerCase()).join(' ');
      const missingKeywords = testCase.expectedKeywords.filter((keyword: string) => 
        !allContent.includes(keyword.toLowerCase())
      );
      
      if (missingKeywords.length > 0) {
        return {
          name: testName,
          passed: false,
          error: `Missing expected keywords: ${missingKeywords.join(', ')}`,
          duration,
          details: { results, missingKeywords }
        };
      }
    }
    
    // Check framework filtering
    if (testCase.validateFramework) {
      const invalidFrameworks = results.filter((r: RetrievalResult) => 
        r.framework !== testCase.framework && r.framework !== 'common'
      );
      
      if (invalidFrameworks.length > 0) {
        return {
          name: testName,
          passed: false,
          error: `Found results with invalid framework`,
          duration,
          details: { results, invalidFrameworks }
        };
      }
    }
    
    // Check for common framework inclusion
    if (testCase.expectCommonFramework) {
      const hasCommon = results.some((r: RetrievalResult) => r.framework === 'common');
      if (!hasCommon) {
        return {
          name: testName,
          passed: false,
          error: 'Expected common framework results but none found',
          duration,
          details: { results }
        };
      }
    }
    
    // Validate RRF ranking (results should be ordered by relevance)
    if (testCase.validateRanking && results.length >= 2) {
      for (let i = 1; i < results.length; i++) {
        if (results[i].relevance_score > results[i-1].relevance_score) {
          return {
            name: testName,
            passed: false,
            error: 'Results not properly ranked by relevance score',
            duration,
            details: { results }
          };
        }
      }
    }
    
    return {
      name: testName,
      passed: true,
      duration,
      details: { resultCount: results.length, results: results.slice(0, 3) } // Include first 3 results
    };
    
  } catch (error) {
    return {
      name: testName,
      passed: false,
      error: `Hybrid search test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run a single chunk test
 */
async function runChunkTest(testCase: any): Promise<TestResult> {
  const startTime = Date.now();
  const testName = testCase.name;
  
  try {
    const chunk = await searchService.getDocumentChunk(testCase.chunkId);
    const duration = Date.now() - startTime;
    
    const success = (chunk !== null) === testCase.expectSuccess;
    
    return {
      name: testName,
      passed: success,
      error: success ? undefined : `Expected ${testCase.expectSuccess ? 'success' : 'failure'} but got ${chunk !== null ? 'success' : 'failure'}`,
      duration,
      details: { chunk }
    };
    
  } catch (error) {
    return {
      name: testName,
      passed: false,
      error: `Chunk test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run the complete test suite
 */
export async function runTestSuite(config: TestConfig): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const results: TestResult[] = [];
  
  console.debug('🧪 Starting Enhanced REST Server Test Suite...\n');
  
  // Run API tests
  console.debug('📡 Running API Tests...');
  for (const testCase of API_TEST_CASES) {
    if (config.verbose) console.debug(`  Running: ${testCase.name}`);
    const result = await runApiTest(testCase, config);
    results.push(result);
    
    if (config.verbose) {
      console.debug(`    ${result.passed ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
      if (!result.passed) console.debug(`       Error: ${result.error}`);
    }
  }
  
  // Run hybrid search tests
  console.debug('\n🔍 Running Hybrid Search Tests...');
  for (const testCase of HYBRID_SEARCH_TEST_CASES) {
    if (config.verbose) console.debug(`  Running: ${testCase.name}`);
    const result = await runHybridSearchTest(testCase);
    results.push(result);
    
    if (config.verbose) {
      console.debug(`    ${result.passed ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
      if (!result.passed) console.debug(`       Error: ${result.error}`);
    }
  }
  
  // Run chunk tests
  console.debug('\n📄 Running Document Chunk Tests...');
  for (const testCase of CHUNK_TEST_CASES) {
    if (config.verbose) console.debug(`  Running: ${testCase.name}`);
    const result = await runChunkTest(testCase);
    results.push(result);
    
    if (config.verbose) {
      console.debug(`    ${result.passed ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
      if (!result.passed) console.debug(`       Error: ${result.error}`);
    }
  }
  
  const overallDuration = Date.now() - startTime;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;
  
  // Print summary
  console.debug('\n📊 Test Suite Results:');
  console.debug(`  Total Tests: ${results.length}`);
  console.debug(`  Passed: ${passedTests} ✅`);
  console.debug(`  Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.debug(`  Duration: ${overallDuration}ms`);
  console.debug(`  Success Rate: ${(passedTests / results.length * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.debug('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.debug(`  - ${result.name}: ${result.error}`);
    });
  }
  
  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    overallDuration
  };
}

/**
 * Quick validation tests that don't require external server
 */
export async function runQuickValidation(): Promise<TestSuiteResult> {
  console.debug('⚡ Running Quick Validation Tests...\n');
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Test 1: Hybrid search basic functionality
  try {
    console.debug('  Testing hybrid search basic functionality...');
    const testStartTime = Date.now();
    const searchResults = await searchService.hybridSearch('test query', { maxResults: 1, maxTokens: 100 });
    const duration = Date.now() - testStartTime;
    
    results.push({
      name: 'Hybrid search basic functionality',
      passed: Array.isArray(searchResults),
      duration,
      details: { resultCount: searchResults.length }
    });
  } catch (error) {
    results.push({
      name: 'Hybrid search basic functionality',
      passed: false,
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime
    });
  }
  
  // Test 2: Framework filtering logic
  try {
    console.debug('  Testing framework filtering logic...');
    const testStartTime = Date.now();
    
    // Test with empty framework (should work)
    await searchService.hybridSearch('test', { framework: 'common' });
    
    // Test with valid frameworks
    await searchService.hybridSearch('test', { framework: 'flow' });
    await searchService.hybridSearch('test', { framework: 'hilla' });
    
    const duration = Date.now() - testStartTime;
    
    results.push({
      name: 'Framework filtering logic',
      passed: true,
      duration
    });
  } catch (error) {
    results.push({
      name: 'Framework filtering logic',
      passed: false,
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime
    });
  }
  
  const overallDuration = Date.now() - startTime;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;
  
  console.debug('\n📊 Quick Validation Results:');
  console.debug(`  Tests: ${results.length}`);
  console.debug(`  Passed: ${passedTests} ✅`);
  console.debug(`  Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.debug(`  Duration: ${overallDuration}ms`);
  
  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    overallDuration
  };
}

/**
 * CLI interface for running tests
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const endpoint = args.find(arg => arg.startsWith('--endpoint='))?.split('=')[1] || 'http://localhost:3001';
  
  if (isQuick) {
    runQuickValidation();
  } else {
    runTestSuite({
      endpoint,
      verbose
    });
  }
} 