import { describe, test, expect } from 'bun:test';
import { processAsciiDoc } from '../src/asciidoc-processor';
import { chunkDocument } from '../src/chunking';
import { parseMetadata } from '../src/metadata-parser';
import fs from 'fs';
import path from 'path';

// Test fixtures directory
const fixturesDir = path.join(import.meta.dir, 'fixtures');

describe('AsciiDoc Processing and Chunking Integration', () => {
  test('should process and chunk a basic document', () => {
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
    
    // Verify the chunks
    expect(chunks.length).toBeGreaterThan(0);
    
    // Verify the content of the first chunk
    expect(chunks[0].text).toContain('# Basic Document Title');
    
    // Verify that sections are present in some chunks
    expect(chunks.some(chunk => chunk.text.includes('## Section One'))).toBe(true);
    expect(chunks.some(chunk => chunk.text.includes('## Section Two'))).toBe(true);
    expect(chunks.some(chunk => chunk.text.includes('```java'))).toBe(true);
    
    // Verify metadata is preserved in chunks
    chunks.forEach(chunk => {
      expect(chunk.metadata.title).toBe(metadata.title);
      expect(chunk.metadata['page-title']).toBe(metadata['page-title']);
      expect(chunk.metadata['meta-description']).toBe(metadata['meta-description']);
      expect(chunk.metadata.url).toBe(enhancedMetadata.url);
    });
  });

  test('should process and chunk a simple document with no includes', () => {
    // Create a simple document without includes
    const simpleDocument = `---
title: Simple Document
page-title: Simple Document for Testing
meta-description: A simple document without includes
order: 10
---

= Simple Document

== Introduction

This is a simple document without includes.

== Section One

Content for section one.

== Section Two

Content for section two.
`;
    
    // Parse metadata and get content
    const { content, metadata } = parseMetadata(simpleDocument);
    
    // Process the AsciiDoc to Markdown
    const markdown = processAsciiDoc(content, fixturesDir);
    
    // Create enhanced metadata
    const enhancedMetadata = {
      ...metadata,
      url: 'https://example.com/simple',
      version: '1.0.0'
    };
    
    // Chunk the document
    const chunks = chunkDocument(markdown, enhancedMetadata);
    
    // Verify the chunks
    expect(chunks.length).toBeGreaterThan(0);
    
    // Verify the content of the first chunk
    expect(chunks[0].text).toContain('# Simple Document');
    
    // Verify that sections are present in some chunks
    expect(chunks.some(chunk => chunk.text.includes('## Introduction'))).toBe(true);
    expect(chunks.some(chunk => chunk.text.includes('## Section One'))).toBe(true);
    expect(chunks.some(chunk => chunk.text.includes('## Section Two'))).toBe(true);
    
    // Verify metadata is preserved in chunks
    chunks.forEach(chunk => {
      expect(chunk.metadata.title).toBe(metadata.title);
      expect(chunk.metadata['page-title']).toBe(metadata['page-title']);
      expect(chunk.metadata['meta-description']).toBe(metadata['meta-description']);
      expect(chunk.metadata.url).toBe(enhancedMetadata.url);
    });
  });

  test('should handle document with complex structure', () => {
    // Create a complex document structure
    const complexDocument = `---
title: Complex Document
page-title: Complex Document for Testing
meta-description: A complex document with multiple sections and subsections
order: 20
---

= Complex Document

== Introduction

This is a complex document with multiple sections and subsections.

== Section One

Content for section one.

=== Subsection 1.1

Content for subsection 1.1.

==== Sub-subsection 1.1.1

Content for sub-subsection 1.1.1.

=== Subsection 1.2

Content for subsection 1.2.

== Section Two

Content for section two.

=== Subsection 2.1

Content for subsection 2.1.
`;
    
    // Parse metadata and get content
    const { content, metadata } = parseMetadata(complexDocument);
    
    // Process the AsciiDoc to Markdown
    const markdown = processAsciiDoc(content, fixturesDir);
    
    // Create enhanced metadata
    const enhancedMetadata = {
      ...metadata,
      url: 'https://example.com/complex',
      version: '1.0.0'
    };
    
    // Chunk the document
    const chunks = chunkDocument(markdown, enhancedMetadata);
    
    // Verify the chunks
    expect(chunks.length).toBeGreaterThan(0);
    
    // Verify the content of the first chunk
    expect(chunks[0].text).toContain('# Complex Document');
    
    // Verify that sections are present in some chunks
    expect(chunks.some(chunk => chunk.text.includes('## Section One'))).toBe(true);
    expect(chunks.some(chunk => chunk.text.includes('### Subsection 1.1'))).toBe(true);
    expect(chunks.some(chunk => chunk.text.includes('#### Sub-subsection 1.1.1'))).toBe(true);
    expect(chunks.some(chunk => chunk.text.includes('## Section Two'))).toBe(true);
    
    // Verify metadata is preserved in chunks
    chunks.forEach(chunk => {
      expect(chunk.metadata.title).toBe(metadata.title);
      expect(chunk.metadata['page-title']).toBe(metadata['page-title']);
      expect(chunk.metadata['meta-description']).toBe(metadata['meta-description']);
      expect(chunk.metadata.url).toBe(enhancedMetadata.url);
    });
  });

  test('should process conditional content based on framework attributes', () => {
    // Create a document with conditional content
    const conditionalDocument = `---
title: Conditional Document
page-title: Conditional Document for Testing
meta-description: A document with conditional content
order: 10
---

= Conditional Document

== Flow Content
ifdef::flow[]
This content should only be visible with flow attribute.
endif::[]

== React Content
ifdef::react[]
This content should only be visible with react attribute.
endif::[]`;
    
    // Parse metadata and get content
    const { content, metadata } = parseMetadata(conditionalDocument);
    
    // Process with Flow attribute enabled (for flow framework)
    const flowMarkdown = processAsciiDoc(content, fixturesDir, { flow: true, react: false });
    
    // Process with React attribute enabled (for hilla framework)
    const reactMarkdown = processAsciiDoc(content, fixturesDir, { flow: false, react: true });
    
    // Create enhanced metadata for flow
    const flowMetadata = {
      ...metadata,
      framework: 'flow',
      url: 'https://example.com/flow',
      source: '/test/flow.adoc'
    };
    
    // Create enhanced metadata for hilla
    const hillaMetadata = {
      ...metadata,
      framework: 'hilla',
      url: 'https://example.com/hilla',
      source: '/test/hilla.adoc'
    };
    
    // Chunk the documents
    const flowChunks = chunkDocument(flowMarkdown, flowMetadata);
    const reactChunks = chunkDocument(reactMarkdown, hillaMetadata);
    
    // Verify the flow chunks
    expect(flowChunks.length).toBeGreaterThan(0);
    expect(flowChunks.some(chunk => chunk.text.includes('This content should only be visible with flow attribute'))).toBe(true);
    expect(flowChunks.every(chunk => chunk.metadata.framework === 'flow')).toBe(true);
    
    // Verify the hilla chunks
    expect(reactChunks.length).toBeGreaterThan(0);
    expect(reactChunks.some(chunk => chunk.text.includes('This content should only be visible with react attribute'))).toBe(true);
    expect(reactChunks.every(chunk => chunk.metadata.framework === 'hilla')).toBe(true);
  });
}); 