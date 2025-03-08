import { describe, test, expect } from 'bun:test';
import { chunkDocument, extractHeadingsWithContent } from '../src/chunking';
import type { Chunk } from '../src/chunking';
import { processAsciiDoc } from '../src/asciidoc-processor';
import { parseMetadata } from '../src/metadata-parser';
import fs from 'fs';
import path from 'path';

// Test fixtures directory
const fixturesDir = path.join(import.meta.dir, 'fixtures');

describe('Document Chunking', () => {
  test('should extract headings with content from markdown', () => {
    const markdown = `# Main Title

Introduction paragraph.

## Section 1

Content for section 1.

### Subsection 1.1

Content for subsection 1.1.

## Section 2

Content for section 2.`;

    const headings = extractHeadingsWithContent(markdown);
    
    expect(headings.length).toBe(4);
    
    expect(headings[0].level).toBe(1);
    expect(headings[0].text).toBe('Main Title');
    expect(headings[0].content).toContain('Introduction paragraph.');
    
    expect(headings[1].level).toBe(2);
    expect(headings[1].text).toBe('Section 1');
    expect(headings[1].content).toContain('Content for section 1.');
    
    expect(headings[2].level).toBe(3);
    expect(headings[2].text).toBe('Subsection 1.1');
    expect(headings[2].content).toContain('Content for subsection 1.1.');
    
    expect(headings[3].level).toBe(2);
    expect(headings[3].text).toBe('Section 2');
    expect(headings[3].content).toContain('Content for section 2.');
  });

  test('should chunk document based on h2 headings', () => {
    const markdown = `# Main Title

Introduction paragraph.

## Section 1

Content for section 1.

### Subsection 1.1

Content for subsection 1.1.

## Section 2

Content for section 2.`;

    const metadata = {
      title: 'Test Document',
      'page-title': 'Test Document for Testing',
      'meta-description': 'A test document for chunking',
      order: '1',
      url: 'https://example.com/test',
      version: '1.0.0'
    };

    const chunks = chunkDocument(markdown, metadata);
    
    // Should have chunks for intro and sections
    expect(chunks.length).toBeGreaterThan(0);
    
    // First chunk should be the introduction
    expect(chunks[0].text).toContain('# Main Title');
    expect(chunks[0].text).toContain('Introduction paragraph.');
    expect(chunks[0].metadata.isIntroduction).toBe(true);
    
    // Find section 1 chunk
    const section1Chunk = chunks.find(chunk => chunk.text.includes('## Section 1'));
    expect(section1Chunk).toBeDefined();
    if (section1Chunk) {
      expect(section1Chunk.text).toContain('### Subsection 1.1');
      expect(section1Chunk.metadata.heading).toBe('Section 1');
    }
    
    // Find section 2 chunk
    const section2Chunk = chunks.find(chunk => chunk.text.includes('## Section 2'));
    expect(section2Chunk).toBeDefined();
    if (section2Chunk) {
      expect(section2Chunk.text).toContain('Content for section 2.');
      expect(section2Chunk.metadata.heading).toBe('Section 2');
    }
    
    // Verify metadata is preserved in chunks
    chunks.forEach(chunk => {
      expect(chunk.metadata.title).toBe(metadata.title);
      expect(chunk.metadata['page-title']).toBe(metadata['page-title']);
      expect(chunk.metadata['meta-description']).toBe(metadata['meta-description']);
      expect(chunk.metadata.order).toBe(metadata.order);
      expect(chunk.metadata.url).toBe(metadata.url);
      expect(chunk.metadata.version).toBe(metadata.version);
    });
  });

  test('should handle document with no h2 headings', () => {
    const markdown = `# Main Title

Introduction paragraph.

### Subsection 1

Content for subsection 1.

### Subsection 2

Content for subsection 2.`;

    const metadata = {
      title: 'Test Document',
      'page-title': 'Test Document for Testing',
      'meta-description': 'A test document for chunking',
      order: '1',
      url: 'https://example.com/test',
      version: '1.0.0'
    };

    const chunks = chunkDocument(markdown, metadata);
    
    // Should have at least 1 chunk
    expect(chunks.length).toBeGreaterThan(0);
    
    // The chunk should contain the entire document
    expect(chunks[0].text).toContain('# Main Title');
    expect(chunks[0].text).toContain('Introduction paragraph.');
    
    // Verify metadata is preserved in chunks
    chunks.forEach(chunk => {
      expect(chunk.metadata.title).toBe(metadata.title);
      expect(chunk.metadata['page-title']).toBe(metadata['page-title']);
      expect(chunk.metadata['meta-description']).toBe(metadata['meta-description']);
    });
  });

  test('should handle document with no headings', () => {
    const markdown = `Just some content without any headings.

Another paragraph.`;

    const metadata = {
      title: 'Test Document',
      'page-title': 'Test Document for Testing',
      'meta-description': 'A test document for chunking',
      order: '1',
      url: 'https://example.com/test',
      version: '1.0.0'
    };

    const chunks = chunkDocument(markdown, metadata);
    
    // Should have at least 1 chunk
    expect(chunks.length).toBeGreaterThan(0);
    
    // The chunk should contain the entire document
    expect(chunks[0].text).toContain('Just some content without any headings.');
    expect(chunks[0].text).toContain('Another paragraph.');
    
    // Verify metadata is preserved in chunks
    chunks.forEach(chunk => {
      expect(chunk.metadata.title).toBe(metadata.title);
      expect(chunk.metadata['page-title']).toBe(metadata['page-title']);
      expect(chunk.metadata['meta-description']).toBe(metadata['meta-description']);
    });
  });

  test('should chunk processed AsciiDoc document', () => {
    // Read the basic document
    const basicDocument = fs.readFileSync(path.join(fixturesDir, 'basic-document.adoc'), 'utf-8');
    
    // Parse metadata and get content
    const { content, metadata } = parseMetadata(basicDocument);
    
    // Process the AsciiDoc to Markdown
    const markdown = processAsciiDoc(content, fixturesDir);
    
    // Create enhanced metadata
    const enhancedMetadata = {
      ...metadata,
      url: 'https://example.com/basic',
      version: '1.0.0'
    };
    
    // Chunk the document
    const chunks = chunkDocument(markdown, enhancedMetadata);
    
    // Should have chunks for each section
    expect(chunks.length).toBeGreaterThan(0);
    
    // First chunk should contain the title
    expect(chunks[0].text).toContain('# Basic Document Title');
    
    // Should have a chunk for Section One
    const sectionOneChunk = chunks.find(chunk => chunk.text.includes('## Section One'));
    expect(sectionOneChunk).toBeDefined();
    
    // Should have a chunk for Section Two
    const sectionTwoChunk = chunks.find(chunk => chunk.text.includes('## Section Two'));
    expect(sectionTwoChunk).toBeDefined();
    if (sectionTwoChunk) {
      expect(sectionTwoChunk.text).toContain('```java');
    }
    
    // Verify metadata is preserved in chunks
    chunks.forEach(chunk => {
      expect(chunk.metadata.title).toBe(metadata.title);
      expect(chunk.metadata['page-title']).toBe(metadata['page-title']);
      expect(chunk.metadata['meta-description']).toBe(metadata['meta-description']);
      expect(chunk.metadata.url).toBe(enhancedMetadata.url);
    });
  });

  test('should chunk processed AsciiDoc document with includes', () => {
    // Read the document with includes
    const documentWithIncludes = fs.readFileSync(path.join(fixturesDir, 'document-with-includes.adoc'), 'utf-8');
    
    // Parse metadata and get content
    const { content, metadata } = parseMetadata(documentWithIncludes);
    
    // Process the AsciiDoc to Markdown
    const markdown = processAsciiDoc(content, fixturesDir);
    
    // Create enhanced metadata
    const enhancedMetadata = {
      ...metadata,
      url: 'https://example.com/includes',
      version: '1.0.0'
    };
    
    // Chunk the document
    const chunks = chunkDocument(markdown, enhancedMetadata);
    
    // Should have chunks for each section
    expect(chunks.length).toBeGreaterThan(0);
    
    // First chunk should contain the title
    expect(chunks[0].text).toContain('# Document With Includes');
    
    // Verify metadata is preserved in chunks
    chunks.forEach(chunk => {
      expect(chunk.metadata.title).toBe(metadata.title);
      expect(chunk.metadata['page-title']).toBe(metadata['page-title']);
      expect(chunk.metadata['meta-description']).toBe(metadata['meta-description']);
      expect(chunk.metadata.url).toBe(enhancedMetadata.url);
    });
  });
}); 