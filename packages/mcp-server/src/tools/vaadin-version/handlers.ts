/**
 * Handler for Vaadin version tool
 */

import { config } from '../../config.js';

/**
 * Handle get_vaadin_version tool
 */
export async function handleGetVaadinVersionTool() {
  try {
    // Forward request to REST server
    const response = await fetch(`${config.restServer.url}/vaadin-version`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();

    // Return simple JSON structure with only version and release timestamp
    const versionInfo = {
      version: data.version,
      released: data.released
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(versionInfo, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching Vaadin version:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch Vaadin version: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}
