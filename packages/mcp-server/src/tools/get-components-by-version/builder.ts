/**
 * Build component version data from various sources
 */

import { toTitleCase, toPascalCase } from '../../utils/string-utils.js';
import type { ComponentData, ComponentVersionData } from './types.js';
import { fetchVersionsJson, fetchFlowComponentsTree } from './fetchers.js';
import { logger } from '../../logger.js';

/**
 * Build component version data from versions.json and flow-components
 */
export async function buildComponentVersionData(version: string): Promise<ComponentVersionData> {
  // Fetch both sources in parallel
  const [versionsData, javaClassMap] = await Promise.all([
    fetchVersionsJson(version),
    fetchFlowComponentsTree(version).catch(err => {
      logger.warn('Failed to fetch flow-components tree:', err.message);
      return new Map<string, string>(); // Return empty map on error
    })
  ]);

  // Extract major version for documentation URL
  const majorVersionMatch = version.match(/^(\d+(?:\.\d+)?)/);
  const majorVersion = majorVersionMatch ? majorVersionMatch[1] : '24';
  // Use 'next' for 25.1 (development version), 'latest' for 24.x, otherwise 'v{majorVersion}'
  const docsVersionPath = majorVersion.startsWith('25.1') ? 'next' :
                          majorVersion === '24' ? 'latest' : `v${majorVersion}`;

  // Process core components
  const components: ComponentData[] = [];
  const coreComponents = versionsData.core || {};

  for (const [componentKey, componentInfo] of Object.entries(coreComponents)) {
    const info = componentInfo as any;

    // Skip internal/base components that aren't user-facing
    if (componentKey.includes('-base') || componentKey.startsWith('a11y-')) {
      continue;
    }

    components.push({
      name: toTitleCase(componentKey),
      react_component: toPascalCase(componentKey),
      java_class: javaClassMap.get(componentKey) || null,
      npm_package: info.npmName || `@vaadin/${componentKey}`,
      documentation_url: `https://vaadin.com/docs/${docsVersionPath}/components/${componentKey}`
    });
  }

  // Sort by name
  components.sort((a, b) => a.name.localeCompare(b.name));

  return {
    version: version,
    components_count: components.length,
    components
  };
}
