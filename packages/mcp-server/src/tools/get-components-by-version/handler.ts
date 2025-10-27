/**
 * Handler for get_components_by_version tool
 */

import { toTitleCase } from '../../utils/string-utils.js';
import type { ComponentVersionData } from './types.js';

/**
 * Handle get_components_by_version tool
 */
export async function handleGetComponentsByVersionTool(args: any) {
  // Validate arguments
  if (!args.version || typeof args.version !== 'string') {
    throw new Error('Missing or invalid version parameter');
  }

  // Parse version to get major version number
  const versionMatch = args.version.match(/^(\d+)$/);
  if (!versionMatch) {
    throw new Error('Invalid version format. Expected format: "24", "25", etc.');
  }

  const majorVersion = versionMatch[1];

  try {
    // Fetch component list from GitHub documentation repository
    // The branch name for version 24 is 'v24', for version 25 is 'v25', etc.
    const branch = `v${majorVersion}`;
    const githubApiUrl = `https://api.github.com/repos/vaadin/docs/contents/articles/components?ref=${branch}`;

    console.log(`Fetching component list for Vaadin ${args.version} from branch ${branch}...`);

    const response = await fetch(githubApiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'vaadin-docs-mcp-server'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Version ${args.version} not found. The documentation branch '${branch}' may not exist.`);
      }
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Determine the documentation URL path based on version
    // Vaadin 24 uses 'latest', Vaadin 25+ uses 'v{version}'
    const docsVersionPath = majorVersion === '24' ? 'latest' : `v${majorVersion}`;

    // Filter and process the component directories
    const components = data
      .filter((item: any) => item.type === 'dir' && !item.name.startsWith('_'))
      .map((item: any) => {
        return {
          name: toTitleCase(item.name),
          directory: item.name,
          documentation_url: `https://vaadin.com/docs/${docsVersionPath}/components/${item.name}`
        };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    const result: ComponentVersionData = {
      version: args.version,
      branch: branch,
      components_count: components.length,
      components: components
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching components by version:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch components for version ${args.version}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}
