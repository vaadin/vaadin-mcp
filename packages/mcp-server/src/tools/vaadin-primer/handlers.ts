/**
 * Handler for Vaadin primer tool
 */

import { getVaadinPrimerContent } from './content.js';

/**
 * Handle get_vaadin_primer tool
 */
export async function handleGetVaadinPrimerTool(args: { vaadin_version: string }) {
  return {
    content: [
      {
        type: 'text' as const,
        text: getVaadinPrimerContent(args.vaadin_version)
      }
    ]
  };
}
