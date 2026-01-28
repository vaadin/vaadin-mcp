/**
 * Configuration settings for the AsciiDoc converter
 */

import path from 'path';
import type { IngestionConfig } from 'core-types';

/**
 * Maps a Vaadin major version to the corresponding docs repo branch.
 */
export const VERSION_BRANCHES: Record<string, string> = {
  '7': 'v7',
  '8': 'v8',
  '14': 'v14',
  '24': 'v24',
  '25': 'main',
};

/**
 * Version-specific include patterns for documentation processing.
 * Legacy versions (7, 8) use 'framework' directory structure.
 * Vaadin 14 uses 'flow' directory structure (first Flow version).
 * Modern versions (24, 25) use the current multi-directory structure.
 */
export const VERSION_INCLUDE_PATTERNS: Record<string, string[]> = {
  '7': [
    'framework/**/*.{adoc,asciidoc}',
    'charts/**/*.{adoc,asciidoc}',
    'designer/**/*.{adoc,asciidoc}',
    'testbench/**/*.{adoc,asciidoc}',
    'spreadsheet/**/*.{adoc,asciidoc}',
  ],
  '8': [
    'framework/**/*.{adoc,asciidoc}',
    'charts/**/*.{adoc,asciidoc}',
    'designer/**/*.{adoc,asciidoc}',
    'testbench/**/*.{adoc,asciidoc}',
    'spreadsheet/**/*.{adoc,asciidoc}',
    'board/**/*.{adoc,asciidoc}',
  ],
  '14': [
    'flow/**/*.{adoc,asciidoc}',
    'ce/**/*.{adoc,asciidoc}',
    'ds/**/*.{adoc,asciidoc}',
    'tools/**/*.{adoc,asciidoc}',
  ],
  '24': [
    'building-apps/**/*.{adoc,asciidoc}',
    'components/**/*.{adoc,asciidoc}',
    'designing-apps/**/*.{adoc,asciidoc}',
    'getting-started/**/*.{adoc,asciidoc}',
    'flow/**/*.{adoc,asciidoc}',
    'styling/**/*.{adoc,asciidoc}',
  ],
  '25': [
    'building-apps/**/*.{adoc,asciidoc}',
    'components/**/*.{adoc,asciidoc}',
    'designing-apps/**/*.{adoc,asciidoc}',
    'getting-started/**/*.{adoc,asciidoc}',
    'flow/**/*.{adoc,asciidoc}',
    'styling/**/*.{adoc,asciidoc}',
  ],
};

export const config: IngestionConfig = {
  repository: {
    url: 'https://github.com/vaadin/docs.git',
    branch: 'v24',
    localPath: path.join(process.cwd(), 'vaadin-docs')
  },
  processing: {
    includePatterns: VERSION_INCLUDE_PATTERNS['24'],
    excludePatterns: [
      '_*', // Not standalone files, used for imports
      '**/test-data/**'
    ]
  }
};

/**
 * Get a config object with version-specific include patterns.
 * @param version - Vaadin major version (e.g., '7', '8', '14', '24', '25')
 * @param baseConfig - Base config to extend
 * @returns Config with version-specific include patterns
 */
export function getVersionConfig(version: string, baseConfig: IngestionConfig = config): IngestionConfig {
  const includePatterns = VERSION_INCLUDE_PATTERNS[version] || VERSION_INCLUDE_PATTERNS['25'];
  return {
    ...baseConfig,
    processing: {
      ...baseConfig.processing,
      includePatterns,
    },
  };
}

// AsciiDoc processor settings
export const asciidocConfig = {
  safe: 'unsafe',
  attributes: {
    'source-highlighter': 'highlight.js',
    'icons': 'font',
    'experimental': '',
    'toc': 'macro',
    'sectnums': '',
    'sectlinks': '',
    'sectanchors': ''
  }
}; 
