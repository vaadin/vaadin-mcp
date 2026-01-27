#!/usr/bin/env bun

/**
 * CLI entry point for the AsciiDoc converter
 */

import { convertDocumentation } from './converter.js';
import { config } from './config.js';
import path from 'path';

async function main() {
  console.log('🔄 Starting AsciiDoc to Markdown conversion...\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let outputDir = path.join(process.cwd(), 'dist/markdown/v24');
  let configToUse = config;
  
  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--output' || arg === '-o') {
      if (i + 1 < args.length) {
        outputDir = args[++i];
      }
    } else if (arg === '--branch' || arg === '-b') {
      if (i + 1 < args.length) {
        configToUse = {
          ...config,
          repository: {
            ...config.repository,
            branch: args[++i]
          }
        };
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: bun run convert [options]

Options:
  -o, --output <dir>    Output directory for markdown files (default: dist/markdown/v24)
  -b, --branch <name>   Git branch to use (default: latest)
  -h, --help           Show this help message

Examples:
  bun run convert
  bun run convert --output ./output --branch main
`);
      process.exit(0);
    }
  }
  
  try {
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`🌿 Repository branch: ${configToUse.repository.branch}`);
    console.log(`📂 Repository path: ${configToUse.repository.localPath}\n`);
    
    const results = await convertDocumentation(configToUse, outputDir);
    
    // Summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalOutputFiles = successful.reduce((sum, r) => sum + r.outputFiles.length, 0);
    
    console.log('\n📊 Conversion Results:');
    console.log(`✅ ${successful.length} files converted successfully`);
    console.log(`❌ ${failed.length} files failed`);
    console.log(`📁 ${totalOutputFiles} markdown files generated`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed conversions:');
      failed.forEach(result => {
        console.log(`  - ${result.inputFile}: ${result.error || 'Unknown error'}`);
      });
    }
    
    console.log(`\n🎉 Conversion complete! Output in: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

// Run the CLI
main(); 