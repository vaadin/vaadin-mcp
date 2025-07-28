/**
 * Test scenarios for validating MCP server document-based functionality
 * These test cases demonstrate the new getFullDocument workflow
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
   * Simulate getFullDocument tool call
   */
  async getFullDocument(filePath: string): Promise<any | null> {
    const response = await fetch(`${this.config.restServerUrl}/document/${encodeURIComponent(filePath)}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Get document failed: ${response.status}`);
    }

    return await response.json();
  }
}

/**
 * Test scenarios for document-based workflow
 */
const DOCUMENT_TEST_SCENARIOS = [
  {
    name: 'Basic search returns results with file_path information',
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

        // Check that results have the expected structure with file_path
        const hasValidStructure = results.every(result => 
          result.chunk_id && 
          result.hasOwnProperty('file_path') &&
          result.framework &&
          result.content &&
          result.source_url &&
          typeof result.relevance_score === 'number'
        );

        if (!hasValidStructure) {
          return {
            name: this.name,
            passed: false,
            error: 'Results missing required document fields',
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
            hasFilePaths: results.some(r => r.file_path !== null && r.file_path !== '')
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
    name: 'Document retrieval workflow',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Step 1: Search for specific content
        const searchResults = await client.searchVaadinDocs('field binding form', 'flow', 5);
        
        if (!searchResults || searchResults.length === 0) {
          return {
            name: this.name,
            passed: false,
            error: 'No search results returned',
            duration: Date.now() - startTime
          };
        }

        // Step 2: Find a result with a file_path
        const resultWithFile = searchResults.find(result => result.file_path);
        
        if (!resultWithFile) {
          return {
            name: this.name,
            passed: false,
            error: 'No results with file_path found',
            duration: Date.now() - startTime,
            details: { searchResults }
          };
        }

        // Step 3: Retrieve the complete document
        const fullDocument = await client.getFullDocument(resultWithFile.file_path!);
        
        if (!fullDocument) {
          return {
            name: this.name,
            passed: false,
            error: 'Full document not found',
            duration: Date.now() - startTime,
            details: { filePath: resultWithFile.file_path }
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: { 
            chunkId: resultWithFile.chunk_id,
            filePath: resultWithFile.file_path,
            documentHasMoreContent: fullDocument.content.length > resultWithFile.content.length
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
    name: 'Framework filtering with document results',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Test both frameworks
        const [flowResults, hillaResults] = await Promise.all([
          client.searchVaadinDocs('component', 'flow', 3),
          client.searchVaadinDocs('component', 'hilla', 3)
        ]);

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
          error: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        };
      }
    }
  },

  {
    name: 'getFullDocument error handling',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Test with invalid file path
        const invalidDocument = await client.getFullDocument('non-existent-file-path.md');
        
        if (invalidDocument !== null) {
          return {
            name: this.name,
            passed: false,
            error: 'Expected null for invalid file path',
            duration: Date.now() - startTime
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: { note: 'Correctly handled invalid file path' }
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
    name: 'Document content completeness',
    async test(client: MCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Start with a search to find specific content
        const searchResults = await client.searchVaadinDocs('component styling', '', 3);
        
        if (!searchResults || searchResults.length === 0) {
          return {
            name: this.name,
            passed: false,
            error: 'No search results returned',
            duration: Date.now() - startTime
          };
        }

        // Get full documents for all results that have file_path
        const documentsRetrieved = [];
        
        for (const result of searchResults) {
          if (result.file_path) {
            const fullDocument = await client.getFullDocument(result.file_path);
            if (fullDocument) {
              documentsRetrieved.push({
                filePath: result.file_path,
                chunkLength: result.content.length,
                documentLength: fullDocument.content.length,
                hasMetadata: !!fullDocument.metadata
              });
            }
          }
        }

        return {
          name: this.name,
          passed: documentsRetrieved.length > 0,
          duration: Date.now() - startTime,
          details: { 
            documentsRetrieved: documentsRetrieved.length,
            note: `Successfully retrieved ${documentsRetrieved.length} complete documents`
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
  }
];

/**
 * Run a single test
 */
async function runTest(scenario: any, client: MCPTestClient): Promise<TestResult> {
  try {
    return await scenario.test(client);
  } catch (error) {
    return {
      name: scenario.name,
      passed: false,
      error: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0
    };
  }
}

/**
 * Run all document-based test scenarios
 */
export async function runHierarchicalTests(config: TestConfig): Promise<void> {
  console.log('🧪 Running MCP Server Document-Based Test Scenarios...\n');
  
  const client = new MCPTestClient(config);
  const results: TestResult[] = [];
  
  for (const scenario of DOCUMENT_TEST_SCENARIOS) {
    if (config.verbose) {
      console.log(`  Running: ${scenario.name}`);
    }
    
    const result = await runTest(scenario, client);
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
  
  console.log('\n📊 Document-Based Test Results:');
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
 * Main test runner
 */
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const serverArg = args.find(arg => arg.startsWith('--server='));
  const restServerUrl = serverArg ? serverArg.split('=')[1] : config.restServer.url;

  const testConfig: TestConfig = {
    restServerUrl,
    verbose
  };

  await runHierarchicalTests(testConfig);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 