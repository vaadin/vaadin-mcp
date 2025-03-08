import { describe, test, expect } from 'bun:test';
import { parseMetadata, enhanceMetadata, detectFramework } from '../src/metadata-parser';

describe('Metadata Parser', () => {
  test('should parse metadata from AsciiDoc content', () => {
    const content = `---
title: Test Document
page-title: Test Document for Testing
meta-description: A test document for metadata parsing
order: 1
---

= Test Document

== Introduction

This is a test document for metadata parsing.`;

    const { content: cleanContent, metadata } = parseMetadata(content);
    
    expect(metadata.title).toBe('Test Document');
    expect(metadata['page-title']).toBe('Test Document for Testing');
    expect(metadata['meta-description']).toBe('A test document for metadata parsing');
    expect(metadata.order).toBe('1');
    
    expect(cleanContent).not.toContain('---');
    expect(cleanContent).toContain('= Test Document');
  });

  test('should enhance metadata with source and URL information', () => {
    const metadata = {
      title: 'Test Document',
      'page-title': 'Test Document for Testing'
    };
    
    const filePath = '/path/to/vaadin-docs/articles/test/document.adoc';
    const repoPath = '/path/to/vaadin-docs';
    
    const enhanced = enhanceMetadata(metadata, filePath, repoPath);
    
    expect(enhanced.source).toBe('/articles/test/document.adoc');
    // The URL will be a GitHub URL since we're not using a real vaadin-docs repository
    expect(enhanced.url).toContain('github.com/vaadin/docs/blob/main//articles/test/document.adoc');
    expect(enhanced.title).toBe('Test Document');
    expect(enhanced['page-title']).toBe('Test Document for Testing');
    expect(enhanced.processed_at).toBeDefined();
  });

  test('should detect framework from file name', () => {
    // Test flow.adoc file
    expect(detectFramework('/path/to/vaadin-docs/articles/test/flow.adoc', '')).toBe('flow');
    
    // Test hilla.adoc file
    expect(detectFramework('/path/to/vaadin-docs/articles/test/hilla.adoc', '')).toBe('hilla');
    
    // Test flow.asciidoc file
    expect(detectFramework('/path/to/vaadin-docs/articles/test/flow.asciidoc', '')).toBe('flow');
    
    // Test hilla.asciidoc file
    expect(detectFramework('/path/to/vaadin-docs/articles/test/hilla.asciidoc', '')).toBe('hilla');
    
    // Test regular file (no framework)
    expect(detectFramework('/path/to/vaadin-docs/articles/test/document.adoc', '')).toBe('');
  });

  test('should detect framework from h1 heading with badge', () => {
    // Test Flow badge in h1
    const flowContent = `= Document Title [badge-flow]#Flow#

== Introduction

This is a document with a Flow badge in the h1 heading.`;
    
    expect(detectFramework('document.adoc', flowContent)).toBe('flow');
    
    // Test Hilla badge in h1
    const hillaContent = `= Document Title [badge-hilla]#Hilla#

== Introduction

This is a document with a Hilla badge in the h1 heading.`;
    
    expect(detectFramework('document.adoc', hillaContent)).toBe('hilla');
    
    // Test no badge in h1
    const noBadgeContent = `= Document Title

== Introduction

This is a document with no badge in the h1 heading.`;
    
    expect(detectFramework('document.adoc', noBadgeContent)).toBe('');
  });

  test('should enhance metadata with framework information', () => {
    const metadata = {
      title: 'Test Document',
      'page-title': 'Test Document for Testing'
    };
    
    const filePath = '/path/to/vaadin-docs/articles/test/flow.adoc';
    const repoPath = '/path/to/vaadin-docs';
    const content = `= Document Title [badge-flow]#Flow#

== Introduction

This is a document with a Flow badge in the h1 heading.`;
    
    const enhanced = enhanceMetadata(metadata, filePath, repoPath, content);
    
    expect(enhanced.framework).toBe('flow');
  });
}); 