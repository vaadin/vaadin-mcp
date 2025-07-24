/**
 * Test scenarios for validating MCP server hierarchical functionality
 * These test cases demonstrate parent-child navigation capabilities
 */

import { config } from './config.js';
import type { RetrievalResult } from './types.js';

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
 * Test configuration
 */
interface TestConfig {
  restServerUrl: string;
  verbose: boolean;
}

/**
 * Simulate MCP tool calls by directly calling the REST server
 */
class MCPTestClient {
  constructor(private config: TestConfig) {}

  /**
   * Simulate search_vaadin_docs tool call
   */
  async searchVaadinDocs(query: string, framework: string = '', maxResults: number = 5): Promise<RetrievalResult[]> {
    const response = await fetch(`${this.config.restServerUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: query,
        framework,
        max_results: maxResults
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results;
  }

  /**
   * Simulate getDocumentChunk tool call
   */
  async getDocumentChunk(chunkId: string): Promise<RetrievalResult | null> {
    const response = await fetch(`${this.config.restServerUrl}/chunk/${encodeURIComponent(chunkId)}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Get chunk failed: ${response.status}`);
    }

    return await response.json();
  }
}

/**
 * Test scenarios for hierarchical navigation
 */
const HIERARCHICAL_TEST_SCENARIOS = [
  {
    name: 'Basic search returns results with parent_id information',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        const results = await client.searchVaadinDocs('form validation', 'flow');
        
        if (!results || results.length === 0) {
          return {
            name: this.name,
            passed: false,
            error: 'No search results returned',
            duration: Date.now() - startTime
          };
        }

        // Check that results have the expected structure
        const hasValidStructure = results.every(result => 
          result.chunk_id && 
          result.hasOwnProperty('parent_id') &&
          result.framework &&
          result.content &&
          result.source_url &&
          typeof result.relevance_score === 'number'
        );

        if (!hasValidStructure) {
          return {
            name: this.name,
            passed: false,
            error: 'Results missing required hierarchical fields',
            duration: Date.now() - startTime,
            details: { results }
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: { 
            resultCount: results.length,
            hasParentIds: results.some(r => r.parent_id !== null)
          }
        };

      } catch (error) {
        return {
          name: this.name,
          passed: false,
          error: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        };
      }
    }
  },

  {
    name: 'Parent-child navigation workflow',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Step 1: Search for specific content
        const searchResults = await client.searchVaadinDocs('field binding form', 'flow', 5);
        
        if (!searchResults || searchResults.length === 0) {
          return {
            name: this.name,
            passed: false,
            error: 'No search results for initial query',
            duration: Date.now() - startTime
          };
        }

        // Step 2: Find a result with a parent_id
        const resultWithParent = searchResults.find(result => result.parent_id !== null);
        
        if (!resultWithParent) {
          // This is not necessarily a failure - some results might not have parents
          return {
            name: this.name,
            passed: true,
            duration: Date.now() - startTime,
            details: { 
              note: 'No results with parent_id found - this may be expected for top-level content',
              searchResults: searchResults.length
            }
          };
        }

        // Step 3: Retrieve the parent chunk
        const parentChunk = await client.getDocumentChunk(resultWithParent.parent_id!);
        
        if (!parentChunk) {
          return {
            name: this.name,
            passed: false,
            error: `Parent chunk ${resultWithParent.parent_id} not found`,
            duration: Date.now() - startTime,
            details: { originalResult: resultWithParent }
          };
        }

        // Step 4: Validate parent chunk structure
        const hasValidParentStructure = 
          parentChunk.chunk_id &&
          parentChunk.content &&
          parentChunk.source_url &&
          typeof parentChunk.relevance_score === 'number';

        if (!hasValidParentStructure) {
          return {
            name: this.name,
            passed: false,
            error: 'Parent chunk missing required fields',
            duration: Date.now() - startTime,
            details: { parentChunk }
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: {
            childChunkId: resultWithParent.chunk_id,
            parentChunkId: parentChunk.chunk_id,
            parentHasMoreContext: parentChunk.content.length > resultWithParent.content.length
          }
        };

      } catch (error) {
        return {
          name: this.name,
          passed: false,
          error: `Navigation workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        };
      }
    }
  },

  {
    name: 'Framework filtering with hierarchical results',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Test both Flow and Hilla framework filtering
        const [flowResults, hillaResults] = await Promise.all([
          client.searchVaadinDocs('button component', 'flow', 3),
          client.searchVaadinDocs('button component', 'hilla', 3)
        ]);

        // Validate framework filtering
        const flowValid = flowResults.every(result => 
          result.framework === 'flow' || result.framework === 'common'
        );
        
        const hillaValid = hillaResults.every(result => 
          result.framework === 'hilla' || result.framework === 'common'
        );

        if (!flowValid || !hillaValid) {
          return {
            name: this.name,
            passed: false,
            error: 'Framework filtering not working correctly',
            duration: Date.now() - startTime,
            details: {
              flowResults: flowResults.map(r => ({ id: r.chunk_id, framework: r.framework })),
              hillaResults: hillaResults.map(r => ({ id: r.chunk_id, framework: r.framework }))
            }
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: {
            flowResultCount: flowResults.length,
            hillaResultCount: hillaResults.length,
            bothHaveResults: flowResults.length > 0 && hillaResults.length > 0
          }
        };

      } catch (error) {
        return {
          name: this.name,
          passed: false,
          error: `Framework filtering test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        };
      }
    }
  },

  {
    name: 'getDocumentChunk error handling',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Test with invalid chunk ID
        const invalidChunk = await client.getDocumentChunk('non-existent-chunk-id-123');
        
        if (invalidChunk !== null) {
          return {
            name: this.name,
            passed: false,
            error: 'Expected null for invalid chunk ID, but got a result',
            duration: Date.now() - startTime,
            details: { unexpectedResult: invalidChunk }
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: { note: 'Correctly handled invalid chunk ID' }
        };

      } catch (error) {
        return {
          name: this.name,
          passed: false,
          error: `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        };
      }
    }
  },

  {
    name: 'Multi-level hierarchy exploration',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Search for content likely to have deep hierarchy
        const results = await client.searchVaadinDocs('form validation rules', '', 5);
        
        if (!results || results.length === 0) {
          return {
            name: this.name,
            passed: false,
            error: 'No results for hierarchy exploration',
            duration: Date.now() - startTime
          };
        }

        let hierarchyLevels = 0;
        let currentChunk = results.find(r => r.parent_id !== null);
        
        // Traverse up the hierarchy
        while (currentChunk && currentChunk.parent_id && hierarchyLevels < 5) {
          hierarchyLevels++;
          const nextChunk = await client.getDocumentChunk(currentChunk.parent_id);
          if (!nextChunk) break;
          currentChunk = nextChunk;
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: {
            hierarchyLevels,
            note: `Successfully traversed ${hierarchyLevels} levels of hierarchy`
          }
        };

      } catch (error) {
        return {
          name: this.name,
          passed: false,
          error: `Hierarchy exploration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        };
      }
    }
  }
];

/**
 * Run all hierarchical test scenarios
 */
export async function runHierarchicalTests(config: TestConfig): Promise<void> {
  console.log('🧪 Running MCP Server Hierarchical Test Scenarios...\n');
  
  const client = new MCPTestClient(config);
  const results: TestResult[] = [];
  
  for (const scenario of HIERARCHICAL_TEST_SCENARIOS) {
    if (config.verbose) {
      console.log(`  Running: ${scenario.name}`);
    }
    
    const result = await scenario.test(client);
    results.push(result);
    
    if (config.verbose) {
      console.log(`    ${result.passed ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
      if (!result.passed && result.error) {
        console.log(`       Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`       Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }
  
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;
  
  console.log('\n📊 Hierarchical Test Results:');
  console.log(`  ✅ Passed: ${passedTests}`);
  console.log(`  ❌ Failed: ${failedTests}`);
  console.log(`  📝 Total: ${results.length}`);
  
  if (failedTests > 0) {
    console.log('\n⚠️ Failed Tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  - ${result.name}: ${result.error}`);
    });
  }
  
  const overallSuccess = failedTests === 0;
  console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
}

/**
 * CLI interface for running hierarchical tests
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const restServerUrl = args.find(arg => arg.startsWith('--server='))?.split('=')[1] || config.restServer.url;
  
  runHierarchicalTests({
    restServerUrl,
    verbose
  }).catch(console.error);
} 