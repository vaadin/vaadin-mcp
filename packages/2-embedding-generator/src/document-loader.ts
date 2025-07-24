/**
 * Document Loader
 * 
 * LangChain document loader for markdown files with frontmatter.
 * Extracts metadata from frontmatter and loads content for processing.
 */

import { Document } from '@langchain/core/documents';
import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import fs from 'fs';
import path from 'path';
import type { ProcessedMetadata, Framework } from 'core-types';

/**
 * Represents frontmatter parsed from a markdown file
 */
export interface Frontmatter {
  framework?: Framework;
  source_url?: string;
  title?: string;
  [key: string]: any;
}

/**
 * Custom document loader for markdown files with frontmatter
 */
export class MarkdownWithFrontmatterLoader extends BaseDocumentLoader {
  constructor(
    private filePath: string,
    private encoding = 'utf8'
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    const content = await fs.promises.readFile(this.filePath, { encoding: this.encoding as BufferEncoding });
    const { frontmatter, content: markdownContent } = parseFrontmatter(content);
    
    const metadata: ProcessedMetadata = {
      framework: frontmatter.framework || 'common',
      source_url: frontmatter.source_url || '',
      title: frontmatter.title,
      ...frontmatter,
      // Add file path for tracking
      file_path: this.filePath
    };

    const document = new Document({
      pageContent: markdownContent,
      metadata
    });

    return [document];
  }
}

/**
 * Loads multiple markdown files from a directory
 */
export class DirectoryMarkdownLoader extends BaseDocumentLoader {
  constructor(
    private directoryPath: string,
    private options: {
      recursive?: boolean;
      encoding?: string;
      includePattern?: RegExp;
    } = {}
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    const files = await this.findMarkdownFiles(this.directoryPath);
    const documents: Document[] = [];

    for (const filePath of files) {
      try {
        const loader = new MarkdownWithFrontmatterLoader(filePath, this.options.encoding);
        const docs = await loader.load();
        documents.push(...docs);
      } catch (error) {
        console.error(`Error loading file ${filePath}:`, error);
        // Continue loading other files even if one fails
      }
    }

    return documents;
  }

  private async findMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }
    
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && this.options.recursive !== false) {
        files.push(...await this.findMarkdownFiles(fullPath));
      } else if (entry.isFile() && this.shouldIncludeFile(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private shouldIncludeFile(fileName: string): boolean {
    if (!fileName.endsWith('.md')) {
      return false;
    }
    
    if (this.options.includePattern) {
      return this.options.includePattern.test(fileName);
    }
    
    return true;
  }
}

/**
 * Parses frontmatter from markdown content
 */
export function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  content: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return {
      frontmatter: {},
      content: content
    };
  }
  
  const [, frontmatterText, markdownContent] = match;
  const frontmatter = parseYamlFrontmatter(frontmatterText);
  
  return {
    frontmatter,
    content: markdownContent.trim()
  };
}

/**
 * Simple YAML parser for frontmatter (handles basic key-value pairs)
 */
function parseYamlFrontmatter(yaml: string): Frontmatter {
  const frontmatter: Frontmatter = {};
  const lines = yaml.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    
    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Handle boolean values
    if (value === 'true') {
      frontmatter[key] = true;
    } else if (value === 'false') {
      frontmatter[key] = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      // Handle numeric values
      frontmatter[key] = Number(value);
    } else {
      frontmatter[key] = value;
    }
  }
  
  return frontmatter;
}

/**
 * Creates a document loader for a specific file
 */
export function createDocumentLoader(filePath: string): MarkdownWithFrontmatterLoader {
  return new MarkdownWithFrontmatterLoader(filePath);
}

/**
 * Creates a directory loader for loading all markdown files from a directory
 */
export function createDirectoryLoader(
  directoryPath: string,
  options?: {
    recursive?: boolean;
    encoding?: string;
    includePattern?: RegExp;
  }
): DirectoryMarkdownLoader {
  return new DirectoryMarkdownLoader(directoryPath, options);
} 