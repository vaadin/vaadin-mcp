#!/usr/bin/env bun

/**
 * CLI entry point for the AsciiDoc converter
 */

import { convertDocumentation } from './converter.js';
import { config } from './config.js';
import path from 'path';

/**
 * Map Vaadin version to git branch
 * @param version - Vaadin version (e.g., "24", "25")
 * @returns Git branch name
 */
function versionToBranch(version: string): string {
  // v25 docs are on main branch, older versions use vXX branches
  if (version === '25') {
    return 'main';
  }
  return `v${version}`;
}

async function main() {
  console.log('🔄 Starting AsciiDoc to Markdown conversion...\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let outputDir = path.join(process.cwd(), 'dist/markdown');
  let vaadinVersion: string | undefined;
  
  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--output' || arg === '-o') {
      if (i + 1 < args.length) {
        outputDir = args[++i];
      }
    } else if (arg === '--version' || arg === '-v') {
      if (i + 1 < args.length) {
        vaadinVersion = args[++i];
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: bun run convert [options]

Options:
  -o, --output <dir>      Output directory for markdown files (default: dist/markdown)
  -v, --version <ver>     Vaadin version to process (e.g., 24, 25)
  -h, --help              Show this help message

Environment Variables:
  VAADIN_VERSION          Vaadin version (fallback if --version not specified)

Version to Branch Mapping:
  24 -> v24 branch
  25 -> main branch

Examples:
  bun run convert --version 24
  bun run convert --version 25 --output ./output
  VAADIN_VERSION=24 bun run convert
`);
      process.exit(0);
    }
  }
  
  // Use environment variable as fallback
  if (!vaadinVersion) {
    vaadinVersion = process.env.VAADIN_VERSION;
  }
  
  // Require version to be specified
  if (!vaadinVersion) {
    console.error('❌ Error: Vaadin version is required');
    console.error('   Use --version <ver> or set VAADIN_VERSION environment variable');
    console.error('   Run with --help for usage information');
    process.exit(1);
  }
  
  // Map version to branch
  const branch = versionToBranch(vaadinVersion);
  
  // Create version-specific output directory
  const versionedOutputDir = path.join(outputDir, `v${vaadinVersion}`);
  
  // Create config with explicit version
  const configToUse = {
    ...config,
    repository: {
      ...config.repository,
      branch,
      vaadinVersion
    }
  };
  
  try {
    console.log(`📦 Vaadin version: ${vaadinVersion}`);
    console.log(`🌿 Git branch: ${branch}`);
    console.log(`📁 Output directory: ${versionedOutputDir}`);
    console.log(`📂 Repository path: ${configToUse.repository.localPath}\n`);
    
    const results = await convertDocumentation(configToUse, versionedOutputDir);
    
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
    
    console.log(`\n🎉 Conversion complete! Output in: ${versionedOutputDir}`);
    
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

// Run the CLI
main();
