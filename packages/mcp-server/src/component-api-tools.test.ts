/**
 * Unit tests for component API helper functions
 * Tests the normalizeComponentName, findComponentFile, and parseFrontmatter functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeComponentName, findComponentFile, parseFrontmatter } from './component-api-helpers.js';

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

function assertFalse(condition: boolean, message?: string) {
  if (condition) {
    throw new Error(message || 'Assertion failed - expected false');
  }
}

function assertContains(haystack: string, needle: string, message?: string) {
  if (!haystack.includes(needle)) {
    throw new Error(message || `Expected to find "${needle}" in "${haystack.substring(0, 100)}..."`);
  }
}

/**
 * Test normalizeComponentName function
 */
async function testNormalizeComponentName() {
  // Test PascalCase
  assertEqual(normalizeComponentName('Button'), 'button', 'Should normalize Button to button');
  assertEqual(normalizeComponentName('TextField'), 'text-field', 'Should normalize TextField to text-field');
  assertEqual(normalizeComponentName('RadioButton'), 'radio-button', 'Should normalize RadioButton to radio-button');
  assertEqual(normalizeComponentName('DatePicker'), 'date-picker', 'Should normalize DatePicker to date-picker');

  // Test kebab-case
  assertEqual(normalizeComponentName('text-field'), 'text-field', 'Should keep text-field as is');
  assertEqual(normalizeComponentName('radio-button'), 'radio-button', 'Should keep radio-button as is');
  assertEqual(normalizeComponentName('date-picker'), 'date-picker', 'Should keep date-picker as is');

  // Test with vaadin- prefix
  assertEqual(normalizeComponentName('vaadin-button'), 'button', 'Should remove vaadin- prefix');
  assertEqual(normalizeComponentName('vaadin-text-field'), 'text-field', 'Should remove vaadin- prefix from kebab-case');
  assertEqual(normalizeComponentName('Vaadin-Button'), 'button', 'Should remove Vaadin- prefix (case insensitive)');
  assertEqual(normalizeComponentName('VAADIN-Button'), 'button', 'Should remove VAADIN- prefix');

  // Test lowercase
  assertEqual(normalizeComponentName('button'), 'button', 'Should keep button as is');
  assertEqual(normalizeComponentName('grid'), 'grid', 'Should keep grid as is');
}

/**
 * Test parseFrontmatter function
 */
async function testParseFrontmatter() {
  const contentWithFrontmatter = `---
framework: flow
source_url: https://vaadin.com/docs/components/button
title: Button
---

# Button Component

This is the content.`;

  const result = parseFrontmatter(contentWithFrontmatter);

  assertEqual(result.metadata.framework, 'flow', 'Should parse framework');
  assertEqual(result.metadata.source_url, 'https://vaadin.com/docs/components/button', 'Should parse source_url');
  assertEqual(result.metadata.title, 'Button', 'Should parse title');
  assertTrue(result.content.includes('# Button Component'), 'Content should not include frontmatter');
  assertFalse(result.content.includes('framework: flow'), 'Content should not include frontmatter fields');

  // Test content without frontmatter
  const contentWithoutFrontmatter = '# Button Component\n\nThis is the content.';
  const result2 = parseFrontmatter(contentWithoutFrontmatter);
  assertEqual(result2.content, contentWithoutFrontmatter, 'Content without frontmatter should remain unchanged');
  assertEqual(Object.keys(result2.metadata).length, 0, 'Metadata should be empty');
}

/**
 * Test findComponentFile function with real component files
 */
async function testFindComponentFile() {
  // Try to find a real component (button is very likely to exist)
  const buttonFlowPath = 'components/button/index-flow.md';
  const buttonFile = findComponentFile(buttonFlowPath);

  // If button exists, test it
  if (buttonFile) {
    assertTrue(fs.existsSync(buttonFile.fullPath), 'Found file should exist');
    assertTrue(buttonFile.fullPath.includes('button'), 'Path should contain button');
    assertTrue(buttonFile.fullPath.endsWith('index-flow.md'), 'Path should end with index-flow.md');
  }

  // Test non-existent component
  const nonExistentPath = 'components/non-existent-component-xyz/index-flow.md';
  const nonExistentFile = findComponentFile(nonExistentPath);
  assertEqual(nonExistentFile, null, 'Non-existent component should return null');
}

/**
 * Test reading actual component documentation files
 */
async function testReadActualComponentDocs() {
  // Try to find and read button component Flow documentation
  const buttonPath = 'components/button/index-flow.md';
  const buttonFile = findComponentFile(buttonPath);

  if (buttonFile) {
    const content = fs.readFileSync(buttonFile.fullPath, 'utf8');
    const { metadata, content: markdownContent } = parseFrontmatter(content);

    // Verify structure
    assertTrue(content.length > 0, 'Content should not be empty');
    assertEqual(metadata.framework, 'flow', 'Button framework should be flow');
    assertTrue(metadata.source_url !== undefined, 'Button should have source_url in metadata');
    assertTrue(markdownContent.length > 0, 'Markdown content should not be empty');
    assertTrue(markdownContent.includes('Button') || markdownContent.includes('button'), 'Content should mention button');
  } else {
    console.warn('    ⚠️  Button component not found, skipping actual doc test');
  }
}

/**
 * Test reading styling documentation
 */
async function testReadStylingDocs() {
  // Try to find button styling documentation
  const flowStylingPath = 'components/button/styling-flow.md';
  const hillaStylingPath = 'components/button/styling-hilla.md';

  const flowFile = findComponentFile(flowStylingPath);
  const hillaFile = findComponentFile(hillaStylingPath);

  // At least one styling file should exist for button
  if (flowFile || hillaFile) {
    if (flowFile) {
      const content = fs.readFileSync(flowFile.fullPath, 'utf8');
      const { metadata, content: markdownContent } = parseFrontmatter(content);

      assertTrue(content.length > 0, 'Flow styling content should not be empty');
      assertTrue(
        markdownContent.includes('theme') ||
        markdownContent.includes('style') ||
        markdownContent.includes('CSS') ||
        markdownContent.includes('Lumo'),
        'Flow styling should mention theming or styling'
      );
    }

    if (hillaFile) {
      const content = fs.readFileSync(hillaFile.fullPath, 'utf8');
      assertTrue(content.length > 0, 'Hilla styling content should not be empty');
    }
  } else {
    console.warn('    ⚠️  Button styling documentation not found, skipping styling test');
  }
}

/**
 * Test multiple component name formats resolve to same file
 */
async function testComponentNameEquivalence() {
  const variants = ['Button', 'button', 'vaadin-button', 'Vaadin-Button'];
  const paths = variants.map(name => {
    const normalized = normalizeComponentName(name);
    return `components/${normalized}/index-flow.md`;
  });

  // All paths should be identical
  const uniquePaths = [...new Set(paths)];
  assertEqual(uniquePaths.length, 1, 'All component name variants should resolve to the same path');
  assertEqual(uniquePaths[0], 'components/button/index-flow.md', 'Path should be components/button/index-flow.md');
}

/**
 * Test path security (should not allow traversal)
 */
async function testPathSecurity() {
  // These should not work due to security checks in findComponentFile
  const maliciousPath1 = '../../../etc/passwd';
  const maliciousPath2 = 'components/../../etc/passwd';

  const result1 = findComponentFile(maliciousPath1);
  const result2 = findComponentFile(maliciousPath2);

  // Should return null or not escape the markdown directory
  if (result1) {
    assertTrue(result1.fullPath.includes('markdown'), 'Path should stay within markdown directory');
    assertFalse(result1.fullPath.includes('/etc/passwd'), 'Path should not escape to /etc');
  }

  if (result2) {
    assertTrue(result2.fullPath.includes('markdown'), 'Path should stay within markdown directory');
    assertFalse(result2.fullPath.includes('/etc/passwd'), 'Path should not escape to /etc');
  }
}

/**
 * Run all component API helper tests
 */
export async function runComponentApiHelperTests(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
  console.log('\n🧪 Running Component API Helper Tests...\n');

  const tests = [
    ['Normalize Component Name', testNormalizeComponentName],
    ['Parse Frontmatter', testParseFrontmatter],
    ['Find Component File', testFindComponentFile],
    ['Read Actual Component Docs', testReadActualComponentDocs],
    ['Read Styling Docs', testReadStylingDocs],
    ['Component Name Equivalence', testComponentNameEquivalence],
    ['Path Security', testPathSecurity]
  ] as const;

  const results: TestResult[] = [];

  for (const [name, testFn] of tests) {
    console.log(`  Running: ${name}`);
    const result = await runTest(name, testFn);
    results.push(result);

    console.log(`    ${result.passed ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
    if (!result.passed) {
      console.log(`       Error: ${result.error}`);
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  console.log('\n📊 Component API Helper Test Results:');
  console.log(`  Tests: ${results.length}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`  Success Rate: ${(passed / results.length * 100).toFixed(1)}%`);

  return { passed, failed, results };
}

/**
 * CLI interface for running tests
 */
if (import.meta.main) {
  runComponentApiHelperTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
