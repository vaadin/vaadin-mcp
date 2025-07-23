#!/usr/bin/env node

/**
 * Build script for the Vaadin Documentation MCP Server
 * 
 * This script:
 * 1. Runs the TypeScript compiler
 * 2. Ensures the shebang line is preserved in the compiled JavaScript file
 * 3. Makes the main file executable
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run TypeScript compiler
console.log('Running TypeScript compiler...');
execSync('tsc', { stdio: 'inherit' });

// Ensure the shebang line is preserved in the compiled JavaScript file
console.log('Ensuring shebang line is preserved...');
const indexJsPath = path.join(__dirname, '..', 'dist', 'index.js');

if (fs.existsSync(indexJsPath)) {
  let content = fs.readFileSync(indexJsPath, 'utf8');
  
  // Check if the shebang line is missing
  if (!content.startsWith('#!/usr/bin/env node')) {
    content = '#!/usr/bin/env node\n' + content;
    fs.writeFileSync(indexJsPath, content);
    console.log('Added shebang line to index.js');
  }
  
  // Make the file executable
  try {
    fs.chmodSync(indexJsPath, '755');
    console.log('Made index.js executable');
  } catch (error) {
    console.error('Failed to make index.js executable:', error);
  }
} else {
  console.error('Error: dist/index.js not found');
  process.exit(1);
}

console.log('Build completed successfully');
