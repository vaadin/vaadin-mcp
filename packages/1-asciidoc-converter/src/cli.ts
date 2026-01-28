#!/usr/bin/env bun

/**
 * CLI entry point for the AsciiDoc converter
 */

import { convertDocumentation } from './converter.js';
import { config, VERSION_BRANCHES } from './config.js';
import path from 'path';

async function main() {
  console.log('🔄 Starting AsciiDoc to Markdown conversion...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let outputDir: string | undefined;
  let branch: string | undefined;
  let version = 'all';

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--output' || arg === '-o') {
      if (i + 1 < args.length) {
        outputDir = args[++i];
      }
    } else if (arg === '--branch' || arg === '-b') {
      if (i + 1 < args.length) {
        branch = args[++i];
      }
    } else if (arg === '--version' || arg === '-v') {
      if (i + 1 < args.length) {
        version = args[++i];
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: bun run convert [options]

Options:
  -v, --version <ver>   Vaadin major version to index, or 'all' (default: all)
  -o, --output <dir>    Output directory for markdown files (default: dist/markdown/v{version})
  -b, --branch <name>   Git branch to use (default: derived from version)
  -h, --help            Show this help message

Examples:
  bun run convert
  bun run convert --version all
  bun run convert --version 24
  bun run convert --version 25
  bun run convert --output ./output --branch main
`);
      process.exit(0);
    }
  }

  // Validate version
  if (version !== 'all' && !(version in VERSION_BRANCHES)) {
    console.error(`❌ Unknown version '${version}'. Valid versions: ${Object.keys(VERSION_BRANCHES).join(', ')}, all`);
    process.exit(1);
  }

  const versions = version === 'all' ? Object.keys(VERSION_BRANCHES) : [version];

  for (const ver of versions) {
    const resolvedBranch = branch || VERSION_BRANCHES[ver] || `v${ver}`;
    const configToUse = {
      ...config,
      repository: {
        ...config.repository,
        branch: resolvedBranch
      }
    };
    const resolvedOutputDir = outputDir || path.join(process.cwd(), `dist/markdown/v${ver}`);

    try {
      console.log(`📁 Output directory: ${resolvedOutputDir}`);
      console.log(`🌿 Repository branch: ${configToUse.repository.branch}`);
      console.log(`📂 Repository path: ${configToUse.repository.localPath}`);
      console.log(`📦 Vaadin version: ${ver}\n`);

      const results = await convertDocumentation(configToUse, resolvedOutputDir, ver);

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

      console.log(`\n🎉 Conversion complete! Output in: ${resolvedOutputDir}`);

    } catch (error) {
      console.error(`❌ Conversion failed for version ${ver}:`, error);
      process.exit(1);
    }
  }
}

// Run the CLI
main(); 