/**
 * Integration tests for search services
 * Ported from packages/rest-server/src/test-suite.ts (service-level tests)
 * and packages/rest-server/metadata-test.ts (metadata validation)
 *
 * Note: The 7 HTTP API endpoint tests from test-suite.ts are dropped because
 * they tested Express routing/status codes for endpoints that no longer exist.
 */

// Set env vars BEFORE any module loading triggers config evaluation
process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'test-dummy-key';
process.env.PINECONE_INDEX = process.env.PINECONE_INDEX || 'test-index';

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
 * Run a single test function
 */
function runTest(name: string, testFn: () => void | Promise<void>): Promise<TestResult> {
  const startTime = Date.now();
  return new Promise(async (resolve) => {
    try {
      await testFn();
      const duration = Date.now() - startTime;
      resolve({ name, passed: true, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      resolve({
        name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

/**
 * Assertion helpers
 */
function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Main test runner using dynamic imports to ensure env vars are set first
 */
async function main() {
  // Dynamic imports so config.ts reads the env vars we set above
  const { MockSearchProvider } = await import('./mock-search-provider.js');
  const { HybridSearchService } = await import('./hybrid-search-service.js');
  const { PineconeSparseProvider } = await import('./pinecone-sparse-provider.js');
  const { logger } = await import('../../logger.js');

  type RetrievalResult = import('../../types.js').RetrievalResult;

  /**
   * Create service with mock provider for testing
   */
  const mockProvider = new MockSearchProvider();
  const sparseProvider = new PineconeSparseProvider();
  const searchService = new HybridSearchService(mockProvider, sparseProvider);

  // ============================================================
  // Tests ported from test-suite.ts (hybrid search + chunk tests)
  // ============================================================

  /**
   * Test 1: Semantic search effectiveness (keyword presence validation)
   */
  async function testSemanticSearchEffectiveness() {
    const results = await searchService.hybridSearch('How to bind form fields to data model', {
      maxResults: 10,
      maxTokens: 2000,
      framework: 'common'
    });

    assertTrue(results.length >= 1, 'Should return at least 1 result');

    const allContent = results.map((r: RetrievalResult) => r.content.toLowerCase()).join(' ');
    const expectedKeywords = ['bind', 'form', 'field', 'data'];
    const missingKeywords = expectedKeywords.filter(keyword =>
      !allContent.includes(keyword.toLowerCase())
    );

    assertTrue(
      missingKeywords.length === 0,
      `Missing expected keywords: ${missingKeywords.join(', ')}`
    );
  }

  /**
   * Test 2: Keyword search accuracy (Grid column configuration)
   */
  async function testKeywordSearchAccuracy() {
    const results = await searchService.hybridSearch('Grid column configuration', {
      maxResults: 10,
      maxTokens: 2000,
      framework: 'common'
    });

    assertTrue(results.length >= 1, 'Should return at least 1 result');

    const allContent = results.map((r: RetrievalResult) => r.content.toLowerCase()).join(' ');
    const expectedKeywords = ['grid', 'column'];
    const missingKeywords = expectedKeywords.filter(keyword =>
      !allContent.includes(keyword.toLowerCase())
    );

    assertTrue(
      missingKeywords.length === 0,
      `Missing expected keywords: ${missingKeywords.join(', ')}`
    );
  }

  /**
   * Test 3: Framework filtering accuracy (Button + Flow)
   */
  async function testFrameworkFilteringAccuracy() {
    const results = await searchService.hybridSearch('Button component', {
      maxResults: 10,
      maxTokens: 2000,
      framework: 'flow'
    });

    assertTrue(results.length >= 1, 'Should return at least 1 result');

    const invalidFrameworks = results.filter((r: RetrievalResult) =>
      r.framework !== 'flow' && r.framework !== 'common'
    );

    assertTrue(
      invalidFrameworks.length === 0,
      `Found results with invalid framework: ${invalidFrameworks.map(r => r.framework).join(', ')}`
    );
  }

  /**
   * Test 4: Cross-framework content inclusion (common included with specific)
   */
  async function testCrossFrameworkInclusion() {
    const results = await searchService.hybridSearch('general component usage', {
      maxResults: 10,
      maxTokens: 2000,
      framework: 'flow'
    });

    assertTrue(results.length >= 1, 'Should return at least 1 result');

    const hasCommon = results.some((r: RetrievalResult) => r.framework === 'common');
    assertTrue(hasCommon, 'Expected common framework results but none found');
  }

  /**
   * Test 5: RRF result ranking (descending relevance scores)
   */
  async function testRRFResultRanking() {
    const results = await searchService.hybridSearch('Grid data binding validation', {
      maxResults: 10,
      maxTokens: 2000,
      framework: 'common'
    });

    assertTrue(results.length >= 3, `Expected at least 3 results, got ${results.length}`);

    // Validate results are ordered by relevance score descending
    for (let i = 1; i < results.length; i++) {
      assertTrue(
        results[i].relevance_score <= results[i-1].relevance_score,
        `Results not properly ranked by relevance score at index ${i}: ${results[i-1].relevance_score} should >= ${results[i].relevance_score}`
      );
    }
  }

  /**
   * Test 6: Valid chunk ID retrieval
   */
  async function testValidChunkRetrieval() {
    const chunk = await searchService.getDocumentChunk('forms-binding-1');

    assertTrue(chunk !== null, 'Should return chunk for valid ID');
    assertEqual(chunk!.chunk_id, 'forms-binding-1', 'Should return correct chunk');
    assertTrue(typeof chunk!.content === 'string', 'Chunk should have string content');
    assertTrue(chunk!.content.length > 0, 'Chunk content should not be empty');
  }

  /**
   * Test 7: Invalid chunk ID handling
   */
  async function testInvalidChunkRetrieval() {
    const chunk = await searchService.getDocumentChunk('non-existent-chunk-id');
    assertEqual(chunk, null, 'Should return null for non-existent chunk ID');
  }

  // ============================================================
  // Tests ported from metadata-test.ts
  // ============================================================

  /**
   * Test 8: Search result metadata structure validation
   */
  async function testSearchResultMetadataStructure() {
    const results = await searchService.hybridSearch('grid component', { maxResults: 3 });
    assertTrue(results.length > 0, 'Should return at least 1 result');

    const result = results[0];

    // Verify top-level fields
    assertTrue(typeof result.chunk_id === 'string', 'chunk_id should be a string');
    assertTrue(typeof result.framework === 'string', 'framework should be a string');
    assertTrue(typeof result.source_url === 'string', 'source_url should be a string');
    assertTrue(typeof result.relevance_score === 'number', 'relevance_score should be a number');
    assertTrue(typeof result.content === 'string', 'content should be a string');
    assertTrue(result.content.length > 0, 'content should not be empty');

    // Verify metadata sub-object
    assertTrue(result.metadata !== undefined, 'metadata should exist');
    assertTrue(typeof result.metadata?.title === 'string', 'metadata.title should be a string');
  }

  /**
   * Test 9: Chunk retrieval metadata structure validation
   */
  async function testChunkMetadataStructure() {
    const chunk = await searchService.getDocumentChunk('forms-index');
    assertTrue(chunk !== null, 'Should return chunk for forms-index');

    // Verify top-level fields
    assertTrue(typeof chunk!.chunk_id === 'string', 'chunk_id should be a string');
    assertTrue(typeof chunk!.framework === 'string', 'framework should be a string');
    assertTrue(typeof chunk!.source_url === 'string', 'source_url should be a string');
    assertTrue(typeof chunk!.relevance_score === 'number', 'relevance_score should be a number');

    // Verify metadata sub-object
    assertTrue(chunk!.metadata !== undefined, 'metadata should exist');
    assertTrue(typeof chunk!.metadata?.title === 'string', 'metadata.title should be a string');
  }

  /**
   * Test 10: No redundant fields in metadata
   * chunk_id, parent_id, framework, source_url, content should NOT be inside metadata
   */
  async function testNoRedundantMetadataFields() {
    // Check search results
    const results = await searchService.hybridSearch('grid component', { maxResults: 3 });
    assertTrue(results.length > 0, 'Should return results');

    const result = results[0];
    const redundantFields = ['chunk_id', 'parent_id', 'framework', 'source_url', 'content'];
    const foundRedundant = redundantFields.filter(field =>
      result.metadata && Object.prototype.hasOwnProperty.call(result.metadata, field)
    );

    assertTrue(
      foundRedundant.length === 0,
      `Found redundant fields in search result metadata: ${foundRedundant.join(', ')}`
    );

    // Check chunk retrieval
    const chunk = await searchService.getDocumentChunk('forms-index');
    assertTrue(chunk !== null, 'Should return chunk');

    const chunkRedundant = redundantFields.filter(field =>
      chunk!.metadata && Object.prototype.hasOwnProperty.call(chunk!.metadata, field)
    );

    assertTrue(
      chunkRedundant.length === 0,
      `Found redundant fields in chunk metadata: ${chunkRedundant.join(', ')}`
    );
  }

  /**
   * Run all integration tests
   */
  logger.info('\n🧪 Running Search Integration Tests...\n');

  const tests = [
    // From test-suite.ts
    ['Semantic search effectiveness', testSemanticSearchEffectiveness],
    ['Keyword search accuracy', testKeywordSearchAccuracy],
    ['Framework filtering accuracy', testFrameworkFilteringAccuracy],
    ['Cross-framework content inclusion', testCrossFrameworkInclusion],
    ['RRF result ranking', testRRFResultRanking],
    ['Valid chunk ID retrieval', testValidChunkRetrieval],
    ['Invalid chunk ID handling', testInvalidChunkRetrieval],
    // From metadata-test.ts
    ['Search result metadata structure', testSearchResultMetadataStructure],
    ['Chunk retrieval metadata structure', testChunkMetadataStructure],
    ['No redundant fields in metadata', testNoRedundantMetadataFields],
  ] as const;

  const results: TestResult[] = [];

  for (const [name, testFn] of tests) {
    logger.info(`  Running: ${name}`);
    const result = await runTest(name, testFn);
    results.push(result);

    logger.info(`    ${result.passed ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
    if (!result.passed) {
      logger.info(`       Error: ${result.error}`);
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  logger.info('\n📊 Search Integration Test Results:');
  logger.info(`  Tests: ${results.length}`);
  logger.info(`  Passed: ${passed} ✅`);
  logger.info(`  Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  logger.info(`  Success Rate: ${(passed / results.length * 100).toFixed(1)}%`);

  return { passed, failed, results };
}

main().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
});
