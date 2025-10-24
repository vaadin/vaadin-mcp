/**
 * Configuration settings for the AsciiDoc converter
 */

import path from 'path';
import type { IngestionConfig } from 'core-types';

export const config: IngestionConfig = {
  repository: {
    url: 'https://github.com/vaadin/docs.git',
    branch: 'v24',
    localPath: path.join(process.cwd(), 'vaadin-docs')
  },
  processing: {
    includePatterns: [
      'building-apps/**/*.{adoc,asciidoc}',
      'components/**/*.{adoc,asciidoc}',
      'designing-apps/**/*.{adoc,asciidoc}',
      'getting-started/**/*.{adoc,asciidoc}',
      'flow/**/*.{adoc,asciidoc}'.
      'styling/**/*.{adoc,asciidoc}'
    ],
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
