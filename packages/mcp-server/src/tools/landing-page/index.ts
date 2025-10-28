/**
 * Landing page exports
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const LANDING_PAGE_HTML = readFileSync(
  join(__dirname, 'content.html'),
  'utf-8'
);
