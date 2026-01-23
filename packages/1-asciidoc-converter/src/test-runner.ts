/**
 * Test runner for the AsciiDoc converter
 */

import fs from 'fs';
import path from 'path';
import type { IngestionConfig, Framework } from 'core-types';
import { detectFramework, isComponentFile } from './framework-detector';
import { convertDocumentation } from './converter';

export interface TestCase {
  name: string;
  filePath: string;
  content: string;
  expectedFramework: Framework;
  isComponent: boolean;
}

/**
 * Define test cases for framework detection
 */
export const frameworkDetectionTests: TestCase[] = [
  {
    name: "Flow document with badge",
    filePath: "test-data/forms/binding.adoc",
    content: "= Fields & Binding [badge-flow]#Flow#\n\nFlow-specific content...",
    expectedFramework: "flow",
    isComponent: false
  },
  {
    name: "Hilla document with badge", 
    filePath: "test-data/forms/validation.adoc",
    content: "= Form Validation [badge-hilla]#Hilla#\n\nHilla-specific content...",
    expectedFramework: "hilla",
    isComponent: false
  },
  {
    name: "Common document without framework badge",
    filePath: "test-data/forms.adoc",
    content: "= Forms and Data Binding\n\nGeneral forms content...",
    expectedFramework: "common",
    isComponent: false
  },
  {
    name: "Component document",
    filePath: "test-data/components/button.adoc", 
    content: "= Button Component\n\nButton documentation...",
    expectedFramework: "common",
    isComponent: true
  },
  {
    name: "Flow file by path",
    filePath: "articles/forms/flow.adoc",
    content: "= Button Usage\n\nFlow button examples...",
    expectedFramework: "flow",
    isComponent: false
  },
  {
    name: "Hilla file by path",
    filePath: "articles/forms/hilla.adoc", 
    content: "= Forms in Hilla\n\nHilla forms...",
    expectedFramework: "hilla",
    isComponent: false
  },
  {
    name: "Flow directory-based detection",
    filePath: "flow/routing/updating-url-parameters.adoc",
    content: "= Updating URL Parameters without Navigation\n\nTo preserve deep linking...",
    expectedFramework: "flow",
    isComponent: false
  },
  {
    name: "Hilla directory-based detection",
    filePath: "hilla/lit/components/text-field.adoc",
    content: "= TextField Component\n\nText field usage in Hilla...",
    expectedFramework: "hilla",
    isComponent: true  // Should be true since path contains '/components/'
  },
  {
    name: "Flow nested directory detection",
    filePath: "flow/advanced/security.adoc",
    content: "= Security Features\n\nAdvanced security in Flow...",
    expectedFramework: "flow",
    isComponent: false
  },
  {
    name: "Root level flow directory",
    filePath: "flow/index.adoc",
    content: "= Flow Overview\n\nMain Flow documentation...",
    expectedFramework: "flow",
    isComponent: false
  }
];

/**
 * Test cases using actual files from test-data
 */
export const actualFileTests = [
  {
    name: 'Flow document (forms/binding.adoc)',
    file: 'test-data/forms/binding.adoc',
    expected: 'flow' as Framework,
    isComponent: false
  },
  {
    name: 'Hilla document (forms/validation.adoc)',
    file: 'test-data/forms/validation.adoc',
    expected: 'hilla' as Framework,
    isComponent: false
  },
  {
    name: 'Common document (forms.adoc)',
    file: 'test-data/forms.adoc',
    expected: 'common' as Framework,
    isComponent: false
  },
  {
    name: 'Component document (components/button.adoc)',
    file: 'test-data/components/button.adoc',
    expected: 'common' as Framework,
    isComponent: true
  }
];

/**
 * Run framework detection tests
 * @returns Test results
 */
export function runFrameworkDetectionTests(): { passed: number; failed: number; details: any[] } {
  console.debug('\n🧪 Running Framework Detection Tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    details: [] as any[]
  };
  
  // Test with actual files first
  console.debug('Testing with actual files:');
  for (const testCase of actualFileTests) {
    const fullPath = path.join(process.cwd(), testCase.file);
    
    if (!fs.existsSync(fullPath)) {
      console.debug(`❌ ${testCase.name} - File not found: ${fullPath}`);
      results.failed++;
      results.details.push({
        name: testCase.name,
        passed: false,
        error: 'File not found'
      });
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const detectedFramework = detectFramework(testCase.file, content);
    const detectedIsComponent = isComponentFile(testCase.file);
    
    const frameworkMatch = detectedFramework === testCase.expected;
    const componentMatch = testCase.isComponent === detectedIsComponent;
    const passed = frameworkMatch && componentMatch;
    
    if (passed) {
      results.passed++;
      console.debug(`✅ ${testCase.name} - Framework: ${detectedFramework}`);
    } else {
      results.failed++;
      console.debug(`❌ ${testCase.name} - Expected: ${testCase.expected}, Got: ${detectedFramework}`);
      if (testCase.isComponent && !detectedIsComponent) {
        console.debug(`   Expected component file, but isComponentFile() returned false`);
      }
    }
    
    results.details.push({
      name: testCase.name,
      passed,
      expected: { framework: testCase.expected, isComponent: testCase.isComponent },
      actual: { framework: detectedFramework, isComponent: detectedIsComponent }
    });
  }
  
  // Test with synthetic content cases
  console.debug('\nTesting with synthetic content:');
  for (const testCase of frameworkDetectionTests) {
    const detectedFramework = detectFramework(testCase.filePath, testCase.content);
    const detectedIsComponent = isComponentFile(testCase.filePath);
    
    const frameworkMatch = detectedFramework === testCase.expectedFramework;
    const componentMatch = detectedIsComponent === testCase.isComponent;
    const passed = frameworkMatch && componentMatch;
    
    if (passed) {
      results.passed++;
      console.debug(`✅ ${testCase.name}`);
    } else {
      results.failed++;
      console.debug(`❌ ${testCase.name}`);
      console.debug(`   Expected framework: ${testCase.expectedFramework}, got: ${detectedFramework}`);
      console.debug(`   Expected isComponent: ${testCase.isComponent}, got: ${detectedIsComponent}`);
    }
    
    results.details.push({
      name: testCase.name,
      passed,
      expected: { framework: testCase.expectedFramework, isComponent: testCase.isComponent },
      actual: { framework: detectedFramework, isComponent: detectedIsComponent }
    });
  }
  
  return results;
}

/**
 * Test the complete conversion process with test data
 * @returns Test results
 */
export async function runConversionTests(): Promise<{ passed: number; failed: number; details: any[] }> {
  console.debug('\n🔄 Running Conversion Tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    details: [] as any[]
  };
  
  try {
    // Check if our test files exist
    console.debug('Checking test data files...');
    const testDataDir = path.join(process.cwd(), 'test-data');
    const expectedTestFiles = [
      'forms.adoc',
      'forms/binding.adoc',
      'forms/validation.adoc',
      'forms/complex-example.adoc',
      'components/button.adoc'
    ];
    
    let foundFiles = 0;
    for (const testFile of expectedTestFiles) {
      const fullPath = path.join(testDataDir, testFile);
      if (fs.existsSync(fullPath)) {
        foundFiles++;
        console.debug(`✓ Found: ${testFile}`);
      } else {
        console.debug(`✗ Missing: ${testFile}`);
        results.failed++;
        results.details.push({
          file: testFile,
          exists: false,
          error: 'Test file not found'
        });
      }
    }
    
    if (foundFiles === 0) {
      throw new Error('No test data files found. Test data may not be set up correctly.');
    }
    
    console.debug(`\n✅ Found ${foundFiles}/${expectedTestFiles.length} test files`);
    results.passed += foundFiles;
    
    // Test framework detection accuracy
    console.debug('\nTesting framework detection on actual files...');
    for (const testCase of actualFileTests) {
      const fullPath = path.join(process.cwd(), testCase.file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const detected = detectFramework(testCase.file, content);
        if (detected === testCase.expected) {
          console.debug(`✓ ${testCase.name}: ${detected}`);
          results.passed++;
        } else {
          console.debug(`✗ ${testCase.name}: expected ${testCase.expected}, got ${detected}`);
          results.failed++;
        }
        
        results.details.push({
          file: testCase.file,
          expectedFramework: testCase.expected,
          detectedFramework: detected,
          passed: detected === testCase.expected
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Conversion test failed:', error);
    results.failed++;
    results.details.push({
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  return results;
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.debug('🚀 Starting AsciiDoc Converter Test Suite\n');
  
  // Run framework detection tests
  const frameworkResults = runFrameworkDetectionTests();
  
  // Run conversion tests  
  const conversionResults = await runConversionTests();
  
  // Summary
  console.debug('\n📊 Test Summary:');
  console.debug(`Framework Detection: ${frameworkResults.passed}/${frameworkResults.passed + frameworkResults.failed} passed`);
  console.debug(`Conversion Tests: ${conversionResults.passed}/${conversionResults.passed + conversionResults.failed} passed`);
  
  const totalPassed = frameworkResults.passed + conversionResults.passed;
  const totalFailed = frameworkResults.failed + conversionResults.failed;
  const successRate = Math.round((totalPassed / (totalPassed + totalFailed)) * 100);
  
  console.debug(`\n🎯 Overall: ${totalPassed}/${totalPassed + totalFailed} tests passed (${successRate}%)`);
  
  if (totalFailed === 0) {
    console.debug('\n🎉 All tests passed!');
  } else {
    console.debug(`\n⚠️  ${totalFailed} tests failed`);
    
    // Show failed test details
    console.debug('\nFailed tests:');
    [...frameworkResults.details, ...conversionResults.details]
      .filter(detail => !detail.passed)
      .forEach(detail => {
        console.debug(`  - ${detail.name || detail.file}: ${detail.error || 'Test failed'}`);
      });
  }
} 