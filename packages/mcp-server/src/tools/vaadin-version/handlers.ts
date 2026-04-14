/**
 * Handlers for Vaadin version tools
 * Fetches version info from GitHub API
 */

import { logger } from '../../logger.js';

interface VersionConfig {
  repo: string;
  commercial: boolean;
}

const VAADIN_VERSIONS: Record<string, VersionConfig> = {
  '25': { repo: 'vaadin/platform', commercial: false },
  '24': { repo: 'vaadin/platform', commercial: false },
  '23': { repo: 'vaadin/platform', commercial: true },
  '14': { repo: 'vaadin/platform', commercial: true },
  '8': { repo: 'vaadin/framework', commercial: true },
  '7': { repo: 'vaadin/framework', commercial: true },
};

async function fetchLatestVersion(repo: string, majorVersion: string): Promise<{ version: string; released: string } | null> {
  const githubUrl = `https://api.github.com/repos/${repo}/releases`;

  const response = await fetch(githubUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'vaadin-mcp-server'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed for ${repo}: ${response.status} ${response.statusText}`);
  }

  const releases: Array<{ tag_name: string; published_at: string; prerelease: boolean; draft: boolean }> = await response.json();

  // Find the latest stable release matching the major version
  for (const release of releases) {
    if (release.prerelease || release.draft) continue;
    const tag = release.tag_name;
    if (/^\d+\.\d+\.\d+$/.test(tag) && tag.startsWith(`${majorVersion}.`)) {
      return { version: tag, released: release.published_at };
    }
  }

  return null;
}

/**
 * Handle get_latest_vaadin_version tool
 */
export async function handleGetLatestVaadinVersionTool() {
  try {
    logger.info('🔍 Fetching latest Vaadin version from GitHub...');

    const response = await fetch('https://api.github.com/repos/vaadin/platform/releases/latest', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'vaadin-mcp-server'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.tag_name || !/^\d+\.\d+\.\d+$/.test(data.tag_name)) {
      throw new Error(`Invalid version format: ${data.tag_name}`);
    }

    logger.info(`✅ Latest Vaadin version: ${data.tag_name}`);

    const versionInfo = {
      version: data.tag_name,
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

/**
 * Handle get_supported_vaadin_versions tool
 */
export async function handleGetSupportedVaadinVersionsTool() {
  try {
    logger.info('🔍 Fetching supported Vaadin versions from GitHub...');

    const results = await Promise.all(
      Object.entries(VAADIN_VERSIONS).map(async ([majorVersion, config]) => {
        try {
          const result = await fetchLatestVersion(config.repo, majorVersion);
          if (result) {
            return {
              majorVersion,
              version: result.version,
              released: result.released,
              commercial: config.commercial
            };
          }
          return {
            majorVersion,
            version: null,
            released: null,
            commercial: config.commercial,
            error: `No stable release found for Vaadin ${majorVersion}`
          };
        } catch (error) {
          return {
            majorVersion,
            version: null,
            released: null,
            commercial: config.commercial,
            error: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      })
    );

    logger.info(`✅ Fetched info for ${results.length} Vaadin versions`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Error fetching supported Vaadin versions:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch supported versions: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}
