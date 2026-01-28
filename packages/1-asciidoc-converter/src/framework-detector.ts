/**
 * Framework detection utilities for Vaadin documentation
 */

import { LEGACY_VERSIONS, type Framework } from 'core-types';

/**
 * Detect the framework from the file name, content, and version
 * @param filePath - The path to the source file
 * @param content - The content of the file
 * @param version - Optional Vaadin major version (e.g., '7', '8', '14', '24', '25')
 * @returns The detected framework ('flow', 'hilla', or 'common')
 */
export function detectFramework(filePath: string, content: string, version?: string): Framework {
  // Legacy versions (7, 8, 14) are pure Java - always return 'flow' for consistency
  // These versions predate Hilla/React support
  if (version && (LEGACY_VERSIONS as readonly string[]).includes(version)) {
    return 'flow';
  }

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

  // Legacy directory structures (v7, v8) use 'framework/' instead of 'flow/'
  // These should be treated as flow content
  if (filePath.includes('/framework/') || filePath.startsWith('framework/')) {
    return 'flow';
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