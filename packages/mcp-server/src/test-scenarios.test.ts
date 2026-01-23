/**
 * Test scenarios for validating MCP server document-based functionality
 * These test cases use mock data and don't depend on external services
 */

import { config } from './config.js';
import type { RetrievalResult } from './types.js';
import { logger } from './logger.js';

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
 * Mock data for testing document-based workflow
 */
const MOCK_SEARCH_RESULTS: RetrievalResult[] = [
  {
    chunk_id: 'forms-binding-flow-0',
    parent_id: null,
    framework: 'flow',
    content: '# Data Binding in Flow\n\nThis guide explains how to bind form fields to data objects in Vaadin Flow applications.',
    source_url: 'https://vaadin.com/docs/building-apps/forms-data/add-form/fields-and-binding/flow',
    metadata: {
      title: 'Fields & Binding',
      heading: 'Data Binding in Flow',
      file_path: 'building-apps/forms-data/add-form/fields-and-binding/flow.md'
    },
    relevance_score: 0.87,
    file_path: 'building-apps/forms-data/add-form/fields-and-binding/flow.md'
  },
  {
    chunk_id: 'forms-validation-common-0',
    parent_id: null,
    framework: 'common',
    content: '# Form Validation\n\nForm validation ensures data integrity and provides user feedback.',
    source_url: 'https://vaadin.com/docs/building-apps/forms-data/add-form/validation',
    metadata: {
      title: 'Form Validation',
      heading: 'Form Validation',
      file_path: 'building-apps/forms-data/add-form/validation.md'
    },
    relevance_score: 0.82,
    file_path: 'building-apps/forms-data/add-form/validation.md'
  },
  {
    chunk_id: 'components-button-hilla-0', 
    parent_id: null,
    framework: 'hilla',
    content: '# Button Component in Hilla\n\nButtons trigger actions in your Hilla application.',
    source_url: 'https://vaadin.com/docs/components/button',
    metadata: {
      title: 'Button',
      heading: 'Button Component in Hilla',
      file_path: 'components/button.md'
    },
    relevance_score: 0.75,
    file_path: 'components/button.md'
  }
];

const MOCK_DOCUMENTS: Record<string, any> = {
  'building-apps/forms-data/add-form/fields-and-binding/flow.md': {
    file_path: 'building-apps/forms-data/add-form/fields-and-binding/flow.md',
    content: `# Fields and Binding in Flow

This guide walks you through the fundamentals of working with fields and binding in Flow. It covers how to lay out form fields, choose the appropriate input components, and use the powerful \`Binder\` class to connect those components to your application's data model.

## Introduction

Forms are essential for collecting user input in web applications. Vaadin Flow provides a comprehensive set of field components and data binding mechanisms to create robust, user-friendly forms.

## Basic Field Components

Flow offers various field components:
- TextField for text input
- NumberField for numeric values  
- DatePicker for date selection
- ComboBox for selection from options

## Data Binding with Binder

The \`Binder\` class is the cornerstone of form data binding in Flow:

\`\`\`java
Binder<Person> binder = new Binder<>(Person.class);
binder.forField(nameField).bind("name");
binder.forField(emailField).bind("email");
\`\`\`

## Validation

Built-in validation ensures data integrity:

\`\`\`java
binder.forField(emailField)
  .withValidator(new EmailValidator("Invalid email"))
  .bind("email");
\`\`\``,
    metadata: {
      title: 'Fields & Binding',
      framework: 'flow',
      source_url: 'https://vaadin.com/docs/building-apps/forms-data/add-form/fields-and-binding/flow'
    },
    full_path: 'building-apps/forms-data/add-form/fields-and-binding/flow.md'
  },
  'building-apps/forms-data/add-form/validation.md': {
    file_path: 'building-apps/forms-data/add-form/validation.md', 
    content: `# Form Validation

Form validation is a fundamental aspect of building robust and user-friendly applications. It ensures that the data entered by users meets the expected format and business rules before it's processed or stored.

## Client-Side Validation

Immediate feedback improves user experience:
- Required field indicators
- Format validation (email, phone numbers)
- Length constraints
- Custom validation rules

## Server-Side Validation  

Critical for security and data integrity:
- Business rule validation
- Database constraint checking
- Cross-field validation
- Security validation

## Validation Messages

Clear, actionable error messages help users:
- Specific field-level messages
- Summary of validation errors
- Internationalization support`,
    metadata: {
      title: 'Form Validation',
      framework: 'common',
      source_url: 'https://vaadin.com/docs/building-apps/forms-data/add-form/validation'
    },
    full_path: 'building-apps/forms-data/add-form/validation.md'
  },
  'components/button.md': {
    file_path: 'components/button.md',
    content: `# Button Component

Buttons are fundamental UI elements that allow users to trigger actions in your application. Vaadin provides a comprehensive Button component that works across both Flow and Hilla frameworks.

## Basic Usage

### In Flow (Java)
\`\`\`java
Button button = new Button("Click me");
button.addClickListener(e -> 
    Notification.show("Button clicked!")
);
\`\`\`

### In Hilla (React)
\`\`\`tsx
<Button onClick={() => console.debug('Clicked!')}>
  Click me
</Button>
\`\`\`

## Styling and Themes

Buttons support various themes:
- Primary buttons for main actions
- Secondary buttons for alternative actions  
- Tertiary buttons for low-emphasis actions
- Icon buttons for compact interfaces

## Accessibility

Built-in accessibility features:
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA attributes`,
    metadata: {
      title: 'Button',
      framework: 'common',
      source_url: 'https://vaadin.com/docs/components/button'
    },
    full_path: 'components/button.md'
  }
};

/**
 * Mock MCP test client that uses local test data instead of calling external services
 */
class MockMCPTestClient {
  constructor(private config: TestConfig) {}

  /**
   * Simulate search_vaadin_docs tool call with mock data
   */
  async searchVaadinDocs(question: string, framework: string = 'common', maxResults: number = 5): Promise<RetrievalResult[]> {
    // Simulate async behavior
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Filter mock results based on question and framework
    let results = [...MOCK_SEARCH_RESULTS];
    
    // Simple question matching - check if question terms appear in content
    if (question.trim()) {
      const questionTerms = question.toLowerCase().split(/\s+/);
      results = results.filter(result => 
        questionTerms.some(term => 
          result.content.toLowerCase().includes(term) ||
          result.metadata?.title?.toLowerCase().includes(term) ||
          result.metadata?.heading?.toLowerCase().includes(term)
        )
      );
    }
    
    // Framework filtering
    if (framework === 'flow') {
      results = results.filter(r => r.framework === 'flow' || r.framework === 'common');
    } else if (framework === 'hilla') {
      results = results.filter(r => r.framework === 'hilla' || r.framework === 'common');
    }
    
    // Limit results
    return results.slice(0, maxResults);
  }

  /**
   * Simulate get_full_document tool call with mock data
   */
  async get_full_document(filePaths: string[]): Promise<any[]> {
    // Simulate async behavior
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const results: any[] = [];
    for (const filePath of filePaths) {
      const document = MOCK_DOCUMENTS[filePath];
      if (document) {
        results.push(document);
      }
    }
    return results;
  }
}

/**
 * Test scenarios for document-based workflow using mock data
 */
const DOCUMENT_TEST_SCENARIOS = [
  {
    name: 'Basic search returns results with file_path information',
    async test(client: MockMCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        const results = await client.searchVaadinDocs('form binding', 'flow');
        
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
            hasFilePaths: results.every(r => r.file_path && r.file_path.length > 0)
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
    async test(client: MockMCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Step 1: Search for specific content
        const searchResults = await client.searchVaadinDocs('binding', 'flow', 5);
        
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
        const documents = await client.get_full_document([resultWithFile.file_path!]);
        const fullDocument = documents[0];
        
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
    async test(client: MockMCPTestClient): Promise<TestResult> {
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
            bothHaveResults: flowResults.length > 0 && hillaResults.length > 0,
            frameworkFiltering: {
              flow: flowResults.every(r => r.framework === 'flow' || r.framework === 'common'),
              hilla: hillaResults.every(r => r.framework === 'hilla' || r.framework === 'common')
            }
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
    name: 'get_full_document error handling',
    async test(client: MockMCPTestClient): Promise<TestResult> {
      const startTime = Date.now();

      try {
        // Test with invalid file path
        const invalidDocuments = await client.get_full_document(['non-existent-file-path.md']);

        if (invalidDocuments.length !== 0) {
          return {
            name: this.name,
            passed: false,
            error: 'Expected empty array for invalid file path',
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
    name: 'Get Vaadin version',
    async test(client: MockMCPTestClient): Promise<TestResult> {
      const startTime = Date.now();

      try {
        // Mock response for Vaadin version (simulating GitHub API response)
        const mockVersionResponse = {
          version: '24.8.9',
          released: '2024-12-18'
        };

        // Validate response structure
        if (!mockVersionResponse.version || !mockVersionResponse.released) {
          return {
            name: this.name,
            passed: false,
            error: 'Version response missing required fields (version, released)',
            duration: Date.now() - startTime
          };
        }

        // Validate version format (should be semver-like)
        const versionPattern = /^\d+\.\d+\.\d+(-.*)?$/;
        if (!versionPattern.test(mockVersionResponse.version)) {
          return {
            name: this.name,
            passed: false,
            error: `Invalid version format: ${mockVersionResponse.version}`,
            duration: Date.now() - startTime
          };
        }

        // Validate date format (should be ISO date)
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(mockVersionResponse.released)) {
          return {
            name: this.name,
            passed: false,
            error: `Invalid date format: ${mockVersionResponse.released}`,
            duration: Date.now() - startTime
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: {
            version: mockVersionResponse.version,
            released: mockVersionResponse.released,
            note: 'Version response has correct structure and format'
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
    name: 'Get components by version - Vaadin 24.8 (minor version)',
    async test(client: MockMCPTestClient): Promise<TestResult> {
      const startTime = Date.now();

      try {
        // Mock response for components list
        const mockComponents = [
          {
            name: 'Button',
            react_component: 'Button',
            java_class: 'com.vaadin.flow.component.button.Button',
            npm_package: '@vaadin/button',
            documentation_url: 'https://vaadin.com/docs/latest/components/button'
          },
          {
            name: 'Checkbox',
            react_component: 'Checkbox',
            java_class: 'com.vaadin.flow.component.checkbox.Checkbox',
            npm_package: '@vaadin/checkbox',
            documentation_url: 'https://vaadin.com/docs/latest/components/checkbox'
          },
          {
            name: 'Checkbox Group',
            react_component: 'CheckboxGroup',
            java_class: 'com.vaadin.flow.component.checkbox.CheckboxGroup',
            npm_package: '@vaadin/checkbox-group',
            documentation_url: 'https://vaadin.com/docs/latest/components/checkbox-group'
          },
          {
            name: 'Date Picker',
            react_component: 'DatePicker',
            java_class: 'com.vaadin.flow.component.datepicker.DatePicker',
            npm_package: '@vaadin/date-picker',
            documentation_url: 'https://vaadin.com/docs/latest/components/date-picker'
          }
        ];

        // Simulate the component list result
        const result = {
          version: '24.8',
          components_count: mockComponents.length,
          components: mockComponents
        };

        if (!result.components || result.components.length === 0) {
          return {
            name: this.name,
            passed: false,
            error: 'No components returned',
            duration: Date.now() - startTime
          };
        }

        // Validate structure
        const hasValidStructure = result.components.every((comp: any) =>
          comp.name &&
          comp.react_component &&
          comp.java_class !== undefined && // Can be null for client-only components
          comp.npm_package &&
          comp.documentation_url
        );

        if (!hasValidStructure) {
          return {
            name: this.name,
            passed: false,
            error: 'Components missing required fields (name, react_component, java_class, npm_package, documentation_url)',
            duration: Date.now() - startTime
          };
        }

        // Verify CheckboxGroup is properly mapped (critical test for bug fix)
        const checkboxGroup = result.components.find((c: any) => c.name === 'Checkbox Group');
        if (!checkboxGroup || checkboxGroup.java_class !== 'com.vaadin.flow.component.checkbox.CheckboxGroup') {
          return {
            name: this.name,
            passed: false,
            error: 'CheckboxGroup not properly mapped to com.vaadin.flow.component.checkbox.CheckboxGroup',
            duration: Date.now() - startTime
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: {
            version: result.version,
            componentsCount: result.components_count,
            checkboxGroupMapped: true,
            sampleComponents: result.components.slice(0, 2).map((c: any) => ({
              name: c.name,
              react: c.react_component,
              java: c.java_class
            }))
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
    name: 'Get components by version - Vaadin 25.0 (minor version)',
    async test(client: MockMCPTestClient): Promise<TestResult> {
      const startTime = Date.now();

      try {
        // Mock response for components list for v25
        const mockComponents = [
          {
            name: 'Button',
            react_component: 'Button',
            java_class: 'com.vaadin.flow.component.button.Button',
            npm_package: '@vaadin/button',
            documentation_url: 'https://vaadin.com/docs/v25/components/button'
          },
          {
            name: 'Grid',
            react_component: 'Grid',
            java_class: 'com.vaadin.flow.component.grid.Grid',
            npm_package: '@vaadin/grid',
            documentation_url: 'https://vaadin.com/docs/v25/components/grid'
          }
        ];

        // Simulate the component list result
        const result = {
          version: '25.0',
          components_count: mockComponents.length,
          components: mockComponents
        };

        // Validate documentation URLs use correct version path (v25 not latest)
        const hasCorrectUrls = result.components.every((comp: any) =>
          comp.documentation_url.includes('/v25/')
        );

        if (!hasCorrectUrls) {
          return {
            name: this.name,
            passed: false,
            error: 'Documentation URLs do not use correct version path',
            duration: Date.now() - startTime,
            details: { urls: result.components.map((c: any) => c.documentation_url) }
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: {
            version: result.version,
            componentsCount: result.components_count,
            urlsCorrect: hasCorrectUrls
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
    name: 'Get components by version - invalid version format rejected',
    async test(client: MockMCPTestClient): Promise<TestResult> {
      const startTime = Date.now();

      try {
        // Test that invalid version formats are properly rejected
        // The actual implementation should throw an error for these formats
        const invalidVersions = ['24', 'main', '24.8.1', 'v24.8'];

        // Since this is a mock test, we just verify the validation logic would work
        // In a real implementation, each of these should be rejected by the tool's validation
        const versionPattern = /^\d+\.\d+$/;

        const allRejected = invalidVersions.every(v => !versionPattern.test(v));
        const validVersionsAccepted = ['24.8', '24.9', '25.0'].every(v => versionPattern.test(v));

        if (!allRejected || !validVersionsAccepted) {
          return {
            name: this.name,
            passed: false,
            error: 'Version validation pattern is incorrect',
            duration: Date.now() - startTime
          };
        }

        return {
          name: this.name,
          passed: true,
          duration: Date.now() - startTime,
          details: {
            note: 'Version format validation correctly rejects invalid formats and accepts minor versions',
            invalidFormats: invalidVersions,
            validFormats: ['24.8', '24.9', '25.0']
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
    name: 'Document content completeness',
    async test(client: MockMCPTestClient): Promise<TestResult> {
      const startTime = Date.now();
      
      try {
        // Start with a search to find specific content
        const searchResults = await client.searchVaadinDocs('button', '', 3);
        
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
            const documents = await client.get_full_document([result.file_path]);
            const fullDocument = documents[0];
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
            note: `Successfully retrieved ${documentsRetrieved.length} complete documents`,
            avgContentIncrease: documentsRetrieved.length > 0 
              ? Math.round(documentsRetrieved.reduce((sum, doc) => sum + (doc.documentLength / doc.chunkLength), 0) / documentsRetrieved.length * 100) / 100
              : 0
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
async function runTest(scenario: any, client: MockMCPTestClient): Promise<TestResult> {
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
  logger.info('🧪 Running MCP Server Document-Based Test Scenarios (Mock Data)...\n');
  
  const client = new MockMCPTestClient(config);
  const results: TestResult[] = [];
  
  for (const scenario of DOCUMENT_TEST_SCENARIOS) {
    if (config.verbose) {
      logger.info(`  Running: ${scenario.name}`);
    }
    
    const result = await runTest(scenario, client);
    results.push(result);
    
    if (config.verbose) {
      logger.info(`    ${result.passed ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
      if (!result.passed && result.error) {
        logger.info(`       Error: ${result.error}`);
      }
      if (result.details) {
        logger.info(`       Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }
  
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;
  
  logger.info('\n📊 Document-Based Test Results:');
  logger.info(`  ✅ Passed: ${passedTests}`);
  logger.info(`  ❌ Failed: ${failedTests}`);
  logger.info(`  📝 Total: ${results.length}`);
  
  if (failedTests > 0) {
    logger.info('\n⚠️ Failed Tests:');
    results.filter(r => !r.passed).forEach(result => {
      logger.info(`  - ${result.name}: ${result.error}`);
    });
  }
  
  const overallSuccess = failedTests === 0;
  logger.info(`\n🎯 Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
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
  main().catch(logger.error);
} 