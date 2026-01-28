/**
 * Unit tests for hybrid search functionality using clean architecture
 * Ported from packages/rest-server/src/hybrid-search.test.ts
 * These tests use dependency injection and can run without external API keys
 */
export {};

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
  const { RRFCombiner } = await import('./search-interfaces.js');
  const { logger } = await import('../../logger.js');

  /**
   * Test setup - create service with mock provider
   */
  const mockProvider = new MockSearchProvider();
  const sparseProvider = new PineconeSparseProvider();
  const searchService = new HybridSearchService(mockProvider, sparseProvider);

  /**
   * Test 1: Semantic search functionality
   */
  async function testSemanticSearch() {
    const results = await mockProvider.semanticSearch('form binding', 3, '');
    assertTrue(results.length > 0, 'Should return results for form binding');
    assertTrue(results[0].score > 0, 'Results should have positive scores');
    assertEqual(results[0].source, 'semantic', 'Should have semantic source');

    // Test framework filtering - Flow
    const flowResults = await mockProvider.semanticSearch('grid', 5, 'flow');
    assertTrue(
      flowResults.every(r => r.metadata.framework === 'flow' || r.metadata.framework === 'common'),
      'Flow search should only return Flow or common results'
    );

    // Test framework filtering - Hilla
    const hillaResults = await mockProvider.semanticSearch('form', 5, 'hilla');
    assertTrue(
      hillaResults.every(r => r.metadata.framework === 'hilla' || r.metadata.framework === 'common'),
      'Hilla search should only return Hilla or common results'
    );

    // Test no results for irrelevant query
    const noResults = await mockProvider.semanticSearch('irrelevant query xyz', 5, '');
    assertEqual(noResults.length, 0, 'Should return no results for irrelevant query');
  }

  /**
   * Test 2: Keyword search functionality
   */
  async function testKeywordSearch() {
    const results = await mockProvider.keywordSearch('Grid column', 3, '');
    assertTrue(results.length > 0, 'Should return results for grid column');
    assertEqual(results[0].source, 'keyword', 'Should have keyword source');

    // Test that results contain the searched terms
    const hasGridKeyword = results.some(r =>
      r.content.toLowerCase().includes('grid') ||
      r.metadata.title.toLowerCase().includes('grid')
    );
    assertTrue(hasGridKeyword, 'Results should contain grid keyword');

    // Test framework filtering
    const flowResults = await mockProvider.keywordSearch('button', 5, 'flow');
    assertTrue(
      flowResults.every(r => r.metadata.framework === 'flow' || r.metadata.framework === 'common'),
      'Flow keyword search should respect framework filter'
    );

    // Test empty query
    const emptyResults = await mockProvider.keywordSearch('', 5, '');
    assertEqual(emptyResults.length, 0, 'Empty query should return no results');

    // Test short terms filtered out
    const shortTermResults = await mockProvider.keywordSearch('a an the', 5, '');
    assertEqual(shortTermResults.length, 0, 'Short terms should be filtered out');
  }

  /**
   * Test 3: RRF (Reciprocal Rank Fusion)
   */
  async function testRRF() {
    const semanticResults = [
      { id: 'chunk1', content: 'content1', metadata: { chunk_id: 'chunk1' }, score: 0.9, source: 'semantic' as const },
      { id: 'chunk2', content: 'content2', metadata: { chunk_id: 'chunk2' }, score: 0.8, source: 'semantic' as const }
    ];

    const keywordResults = [
      { id: 'chunk2', content: 'content2', metadata: { chunk_id: 'chunk2' }, score: 5.0, source: 'keyword' as const },
      { id: 'chunk3', content: 'content3', metadata: { chunk_id: 'chunk3' }, score: 3.0, source: 'keyword' as const }
    ];

    const fusedResults = RRFCombiner.combine(semanticResults, keywordResults);

    assertTrue(fusedResults.length > 0, 'RRF should return results');
    assertTrue(fusedResults.length <= 3, 'Should not exceed input result count');

    // Check that chunk2 (appears in both) has higher score
    const chunk2 = fusedResults.find(r => r.id === 'chunk2');
    assertTrue(chunk2 !== undefined, 'Chunk2 should be in results');
    assertTrue(chunk2!.sources.includes('semantic'), 'Chunk2 should have semantic source');
    assertTrue(chunk2!.sources.includes('keyword'), 'Chunk2 should have keyword source');

    // Check that results are sorted by score
    for (let i = 1; i < fusedResults.length; i++) {
      assertTrue(
        fusedResults[i-1].score >= fusedResults[i].score,
        'Results should be sorted by score descending'
      );
    }
  }

  /**
   * Test 4: Hybrid search service integration
   */
  async function testHybridSearchService() {
    const results = await searchService.hybridSearch('form validation', { maxResults: 3 });

    assertTrue(Array.isArray(results), 'Should return array');
    assertTrue(results.length > 0, 'Should return results');

    // Check result structure
    const result = results[0];
    assertTrue(typeof result.chunk_id === 'string', 'Should have chunk_id');
    assertTrue(typeof result.content === 'string', 'Should have content');
    assertTrue(typeof result.framework === 'string', 'Should have framework');
    assertTrue(typeof result.relevance_score === 'number', 'Should have relevance_score');
  }

  /**
   * Test 5: Framework filtering logic
   */
  async function testFrameworkFiltering() {
    // Test that common framework results are included in Flow searches
    const flowResults = await searchService.hybridSearch('component', {
      maxResults: 10,
      framework: 'flow'
    });
    const hasCommon = flowResults.some(r => r.framework === 'common');
    assertTrue(hasCommon, 'Flow search should include common framework results');

    // Test that Flow results are not included in Hilla searches
    const hillaResults = await searchService.hybridSearch('grid', {
      maxResults: 10,
      framework: 'hilla'
    });
    const hasFlow = hillaResults.some(r => r.framework === 'flow');
    assertTrue(!hasFlow, 'Hilla search should not include Flow-specific results');
  }

  /**
   * Test 6: Chunk retrieval by ID
   */
  async function testChunkRetrieval() {
    // Test valid chunk ID
    const validChunk = await searchService.getDocumentChunk('forms-binding-1');
    assertTrue(validChunk !== null, 'Should return chunk for valid ID');
    assertEqual(validChunk!.chunk_id, 'forms-binding-1', 'Should return correct chunk');
    assertEqual(validChunk!.framework, 'flow', 'Should have correct framework');

    // Test invalid chunk ID
    const invalidChunk = await searchService.getDocumentChunk('non-existent-id');
    assertEqual(invalidChunk, null, 'Should return null for invalid ID');
  }

  /**
   * Test 7: Result structure and metadata
   */
  async function testResultStructure() {
    const results = await searchService.hybridSearch('grid', { maxResults: 1 });
    assertTrue(results.length > 0, 'Should have results');

    const result = results[0];

    // Check required fields
    assertTrue(typeof result.content === 'string', 'Content should be string');
    assertTrue(typeof result.relevance_score === 'number', 'Score should be number');
    assertTrue(result.metadata !== undefined, 'Metadata should exist');
    assertTrue(typeof result.chunk_id === 'string', 'chunk_id should be string');
    assertTrue(typeof result.framework === 'string', 'framework should be string');
    assertTrue(typeof result.source_url === 'string', 'source_url should be string');

    // Check score range
    assertTrue(result.relevance_score >= 0, 'Score should be non-negative');
  }

  /**
   * Test 8: Parent-child relationships
   */
  async function testParentChildRelationships() {
    // Test that we have items with parent_id
    const childChunk = await searchService.getDocumentChunk('forms-binding-1');
    assertTrue(childChunk !== null, 'Child chunk should exist');
    assertTrue(childChunk!.parent_id !== null, 'Child should have parent_id');
    assertEqual(childChunk!.parent_id, 'forms-index', 'Should have correct parent_id');

    // Test that we have root items (no parent)
    const rootChunk = await searchService.getDocumentChunk('grid-basic-1');
    assertTrue(rootChunk !== null, 'Root chunk should exist');
    assertEqual(rootChunk!.parent_id, null, 'Root should have null parent_id');
  }

  /**
   * Test 9: Edge cases and error handling
   */
  async function testEdgeCases() {
    // Test empty query
    const emptyResults = await searchService.hybridSearch('', { maxResults: 5 });
    assertEqual(emptyResults.length, 0, 'Empty query should return no results');

    // Test very long query
    const longQuery = 'very '.repeat(100) + 'long query';
    const longResults = await searchService.hybridSearch(longQuery, { maxResults: 5 });
    assertTrue(Array.isArray(longResults), 'Should handle long queries gracefully');

    // Test zero max results
    const zeroResults = await searchService.hybridSearch('test', { maxResults: 0 });
    assertEqual(zeroResults.length, 0, 'Zero max results should return empty array');
  }

  /**
   * Run all unit tests
   */
  logger.info('\n🧪 Running Hybrid Search Unit Tests...\n');

  const tests = [
    ['Semantic Search Functionality', testSemanticSearch],
    ['Keyword Search Functionality', testKeywordSearch],
    ['RRF (Reciprocal Rank Fusion)', testRRF],
    ['Hybrid Search Service Integration', testHybridSearchService],
    ['Framework Filtering Logic', testFrameworkFiltering],
    ['Chunk Retrieval by ID', testChunkRetrieval],
    ['Result Structure and Metadata', testResultStructure],
    ['Parent-Child Relationships', testParentChildRelationships],
    ['Edge Cases and Error Handling', testEdgeCases]
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

  logger.info('\n📊 Hybrid Search Unit Test Results:');
  logger.info(`  Tests: ${results.length}`);
  logger.info(`  Passed: ${passed} ✅`);
  logger.info(`  Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  logger.info(`  Success Rate: ${(passed / results.length * 100).toFixed(1)}%`);

  return { passed, failed, results };
}

main().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
});
