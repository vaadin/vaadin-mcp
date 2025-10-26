/**
 * Handler for get_components_by_version tool
 */

import { getCachedVersion, setCachedVersion, hasCachedVersion } from './cache.js';
import { buildComponentVersionData } from './builder.js';

/**
 * Handle get_components_by_version tool
 */
export async function handleGetComponentsByVersionTool(args: any) {
  // Validate arguments
  if (!args.version || typeof args.version !== 'string') {
    throw new Error('Missing or invalid version parameter');
  }

  const version = args.version;

  // Validate version format: must be minor version (X.Y)
  const versionMatch = version.match(/^\d+\.\d+$/);

  if (!versionMatch) {
    throw new Error('Invalid version format. Expected format: "24.8", "24.9", "25.0", etc.');
  }

  try {
    // Check cache first
    if (hasCachedVersion(version)) {
      console.log(`✓ Returning cached data for version ${version}`);
      const cachedData = getCachedVersion(version)!;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(cachedData, null, 2)
          }
        ]
      };
    }

    // Build component data from sources
    console.log(`Building component data for version ${version}...`);
    const componentData = await buildComponentVersionData(version);

    // Cache the result
    setCachedVersion(version, componentData);
    console.log(`✓ Cached data for version ${version}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(componentData, null, 2)
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
