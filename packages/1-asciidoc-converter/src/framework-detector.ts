/**
 * Framework detection utilities for Vaadin documentation
 */

import type { Framework } from 'core-types';

/**
 * Detect the framework from the file name and content
 * @param filePath - The path to the source file
 * @param content - The content of the file
 * @returns The detected framework ('flow', 'hilla', or 'common')
 */
export function detectFramework(filePath: string, content: string): Framework {
  // Check file name for framework indicators first
  if (filePath.includes('/flow.asciidoc') || filePath.includes('/flow.adoc')) {
    return 'flow';
  }
  if (filePath.includes('/hilla.asciidoc') || filePath.includes('/hilla.adoc')) {
    return 'hilla';
  }
  
  // Check directory structure for framework detection
  // Files in flow/ directories should be detected as flow
  if (filePath.includes('/flow/') || filePath.startsWith('flow/')) {
    return 'flow';
  }
  
  // Files in hilla/ directories should be detected as hilla  
  if (filePath.includes('/hilla/') || filePath.startsWith('hilla/')) {
    return 'hilla';
  }
  
  // Check for framework badges in h1 headings
  const h1BadgeRegex = /^=\s+.*\[badge-(flow|hilla)\]#(Flow|Hilla)#/m;
  const h1Match = content.match(h1BadgeRegex);
  if (h1Match) {
    return h1Match[1].toLowerCase() as Framework; // Return 'flow' or 'hilla'
  }
  
  // Default to 'common' if no framework is detected
  return 'common';
}

/**
 * Determine if a file is a component file (should be processed for both frameworks)
 * @param filePath - The path to the source file
 * @returns boolean - True if it's a component file
 */
export function isComponentFile(filePath: string): boolean {
  return filePath.includes('/components/');
} 