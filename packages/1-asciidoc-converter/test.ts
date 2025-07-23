#!/usr/bin/env bun

/**
 * Test script for the AsciiDoc converter package
 */

import { runAllTests } from './src/test-runner';

// Run all tests
runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 