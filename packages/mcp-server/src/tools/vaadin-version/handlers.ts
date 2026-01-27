/**
 * Handler for Vaadin version tool
 * Fetches latest stable version from GitHub API
 */

import { logger } from '../../logger.js';

/**
 * Handle get_vaadin_version tool
 */
export async function handleGetVaadinVersionTool() {
  try {
    // Query GitHub API directly for the latest Vaadin platform release
    const githubUrl = 'https://api.github.com/repos/vaadin/platform/releases/latest';

    logger.info('🔍 Fetching latest Vaadin version from GitHub...');
    const response = await fetch(githubUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'vaadin-mcp-server'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.tag_name) {
      throw new Error('No tag_name found in GitHub release response');
    }

    // Extract version from tag (e.g., "24.8.4" from tag_name)
    const latestVersion = data.tag_name;

    // Validate that it's a stable version (semantic versioning pattern)
    if (!/^\d+\.\d+\.\d+$/.test(latestVersion)) {
      throw new Error(`Invalid version format: ${latestVersion}`);
    }

    logger.info(`✅ Latest Vaadin version: ${latestVersion}`);

    // Return simple JSON structure with only version and release timestamp
    const versionInfo = {
      version: latestVersion,
      released: data.published_at
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
    logger.error('Error fetching Vaadin version:', error);

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
