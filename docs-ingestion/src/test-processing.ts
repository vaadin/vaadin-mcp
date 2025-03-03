#!/usr/bin/env bun

/**
 * Test script for the simplified AsciiDoc processing pipeline
 */

import { processAsciiDoc } from './asciidoc-processor';
import { chunkDocument } from './chunking';

// Sample AsciiDoc content for testing
const sampleAsciiDoc = `= Main Document Title

This is an introduction paragraph.

== First Section

This is content in the first section.

=== Subsection 1.1

This is content in a subsection.

[source,java]
----
public class Example {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
----

== Second Section

This is content in the second section.

=== Subsection 2.1

More content here.

== Third Section

Final section content.
`;

async function testProcessing() {
  console.log('Testing AsciiDoc processing pipeline...');
  
  try {
    // Process AsciiDoc content directly to Markdown
    console.log('Converting AsciiDoc to Markdown...');
    const markdownContent = processAsciiDoc(sampleAsciiDoc);
    
    // Create chunks based on h2 level headings
    console.log('Chunking based on h2 level headings...');
    const chunks = chunkDocument(markdownContent, { title: 'Test Document' });
    
    console.log(`Created ${chunks.length} chunks`);
    
    // Display each chunk
    chunks.forEach((chunk, index) => {
      console.log(`\nChunk ${index + 1}:`);
      console.log('------------------------');
      console.log(chunk.text);
      console.log('------------------------');
    });
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testProcessing().catch(console.error);
