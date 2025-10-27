/**
 * Handler for Vaadin primer tool
 */

import { VAADIN_PRIMER_CONTENT } from './content.js';

/**
 * Handle get_vaadin_primer tool
 */
export async function handleGetVaadinPrimerTool() {
  return {
    content: [
      {
        type: 'text' as const,
        text: VAADIN_PRIMER_CONTENT
      }
    ]
  };
}
