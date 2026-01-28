/**
 * Document Service
 * Handles retrieval of complete documentation markdown files
 */

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { logger } from '../../logger';

export interface DocumentResult {
  file_path: string;
  content: string;
  metadata: Record<string, string>;
}

export class DocumentService {
  private markdownBasePath: string;

  constructor() {
    // Path to asciidoc-converter markdown output
    // In production on Fly.io: /app/packages/1-asciidoc-converter/dist/markdown
    // In development: workspace_root/packages/1-asciidoc-converter/dist/markdown
    this.markdownBasePath = process.env.NODE_ENV === 'production'
      ? '/app/packages/1-asciidoc-converter/dist/markdown'
      : path.resolve(process.cwd(), '../1-asciidoc-converter/dist/markdown');

    logger.info(`📁 Document service using markdown path: ${this.markdownBasePath}`);
  }

  /**
   * Get a document by file path
   * @param filePath - Relative path to the markdown file
   * @returns Document content and metadata
   * @throws Error if file not found or path invalid
   */
  async getDocument(filePath: string): Promise<DocumentResult> {
    // Validate path (prevent path traversal)
    if (filePath.includes('..') || path.isAbsolute(filePath)) {
      throw new Error('Invalid file path: path traversal not allowed');
    }

    // Decode URL-encoded file path
    const decodedFilePath = decodeURIComponent(filePath);

    // Construct full path
    const fullPath = path.join(this.markdownBasePath, decodedFilePath);

    // Security check: ensure the path is within the markdown directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedMarkdownDir = path.resolve(this.markdownBasePath);

    if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
      throw new Error('Access denied: path outside markdown directory');
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Document not found: ${decodedFilePath}`);
    }

    // Read the markdown file
    const content = fs.readFileSync(resolvedPath, 'utf-8');

    // Parse frontmatter and content
    const { metadata, markdownContent } = this.parseFrontmatter(content);

    return {
      file_path: decodedFilePath,
      content: markdownContent,
      metadata,
    };
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): {
    metadata: Record<string, string>;
    markdownContent: string;
  } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return {
        metadata: {},
        markdownContent: content,
      };
    }

    try {
      const parsed = YAML.parse(frontmatterMatch[1]);
      const metadata: Record<string, string> = {};
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed)) {
          metadata[key] = Array.isArray(value) ? value.join('\n') : String(value);
        }
      }

      return {
        metadata,
        markdownContent: frontmatterMatch[2],
      };
    } catch (error) {
      logger.warn('Failed to parse frontmatter:', error);
      return {
        metadata: {},
        markdownContent: frontmatterMatch[2] || content,
      };
    }
  }

  /**
   * Check if a document exists
   */
  async documentExists(filePath: string): Promise<boolean> {
    try {
      // Validate path
      if (filePath.includes('..') || path.isAbsolute(filePath)) {
        return false;
      }

      const decodedFilePath = decodeURIComponent(filePath);
      const fullPath = path.join(this.markdownBasePath, decodedFilePath);
      const resolvedPath = path.resolve(fullPath);
      const resolvedMarkdownDir = path.resolve(this.markdownBasePath);

      if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
        return false;
      }

      return fs.existsSync(resolvedPath);
    } catch (error) {
      return false;
    }
  }
}
