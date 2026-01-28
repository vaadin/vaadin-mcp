/**
 * Helper functions for component API endpoints
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger.js';

/**
 * Normalize component name to match directory structure
 * Handles: Button, button, vaadin-button -> button
 * Handles: TextField, text-field, vaadin-text-field -> text-field
 */
export function normalizeComponentName(componentName: string): string {
  // Remove 'vaadin-' prefix if present
  let normalized = componentName.replace(/^vaadin-/i, '');

  // Convert PascalCase to kebab-case
  normalized = normalized
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  return normalized;
}

/**
 * Get the markdown directory for a specific Vaadin version
 */
export function getMarkdownDirectory(version: string): string {
  const markdownRoot = process.env.NODE_ENV === 'production'
    ? '/app/packages/1-asciidoc-converter/dist/markdown'
    : path.join(process.cwd(), '..', '1-asciidoc-converter/dist/markdown');

  return path.join(markdownRoot, 'v' + version);
}

/**
 * Find component file in the version-specific markdown directory
 * Returns the full path if found, or null if not found
 */
export function findComponentFile(componentFilePath: string, version: string): { fullPath: string; markdownDir: string } | null {
  const directories: string[] = [getMarkdownDirectory(version)];

  // Test fixtures directory (when in test mode)
  if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
    const testFixturesDir = path.join(process.cwd(), 'test-fixtures');
    if (fs.existsSync(testFixturesDir)) {
      directories.push(testFixturesDir);
    }
  }

  for (const markdownDir of directories) {
    const fullPath = path.join(markdownDir, componentFilePath);
    const resolvedPath = path.resolve(fullPath);
    const resolvedMarkdownDir = path.resolve(markdownDir);

    // Security check: ensure the path is within the markdown directory
    if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
      continue;
    }

    if (fs.existsSync(resolvedPath)) {
      return { fullPath: resolvedPath, markdownDir: resolvedMarkdownDir };
    }
  }

  return null;
}

/**
 * Parse frontmatter and content from a markdown file
 */
export function parseFrontmatter(content: string): { metadata: Record<string, string>; content: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let metadata: Record<string, string> = {};
  let markdownContent = content;

  if (frontmatterMatch) {
    try {
      // Parse YAML frontmatter
      const yamlContent = frontmatterMatch[1];
      const lines = yamlContent.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
          metadata[key] = value;
        }
      }
      markdownContent = frontmatterMatch[2];
    } catch (error) {
      logger.warn('Failed to parse frontmatter:', error);
    }
  }

  return { metadata, content: markdownContent };
}
