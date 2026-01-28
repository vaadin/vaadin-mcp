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

export const config: IngestionConfig = {
  repository: {
    url: 'https://github.com/vaadin/docs.git',
    branch: 'v24',
    localPath: path.join(process.cwd(), 'vaadin-docs')
  },
  processing: {
    includePatterns: ['**/*.{adoc,asciidoc}'],
    excludePatterns: [
      '_*', // Not standalone files, used for imports
      '**/test-data/**'
    ]
  }
};

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
