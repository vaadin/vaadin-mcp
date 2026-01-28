/**
 * Vaadin Development Primer Content
 *
 * Loads version-specific primer content from markdown files.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRIMER_FILES: Record<string, string> = {
  '24': 'primer-v24.md',
  '25': 'primer-v25.md',
};

const contentCache: Record<string, string> = {};

export function getVaadinPrimerContent(version: string): string {
  if (contentCache[version]) return contentCache[version];
  const fileName = PRIMER_FILES[version];
  if (!fileName) throw new Error(`Unsupported Vaadin version: ${version}`);
  const content = readFileSync(join(__dirname, 'content', fileName), 'utf-8');
  contentCache[version] = content;
  return content;
}
