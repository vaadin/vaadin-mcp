/**
 * AsciiDoc to Markdown Converter
 * 
 * This package handles:
 * - Repository checkout
 * - Framework detection 
 * - AsciiDoc processing and conversion to Markdown
 * - URL generation
 * - Metadata extraction and frontmatter creation
 */

import type { IngestionConfig } from 'core-types';

// Main export - the primary function users will call
export { convertDocumentation, type ConversionResult } from './converter.js';

// Individual module exports for advanced usage
export * from './framework-detector.js';
export * from './url-generator.js';
export * from './asciidoc-processor.js';
export * from './repository-manager.js';

// Re-export types for convenience
export type { IngestionConfig, ProcessedMetadata, Framework } from 'core-types'; 