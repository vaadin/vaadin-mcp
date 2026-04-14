/**
 * Landing page exports
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const LANDING_PAGE_HTML = readFileSync(
  join(__dirname, 'content.html'),
  'utf-8'
);
