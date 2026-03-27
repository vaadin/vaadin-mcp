/**
 * Build component version data from various sources
 */

import { toTitleCase, toPascalCase } from '../../utils/string-utils.js';
import type { ComponentData, ComponentVersionData } from './types.js';
import { fetchVersionsJson, fetchFlowComponentsTree } from './fetchers.js';
import { logger } from '../../logger.js';

/** Infrastructure, internal, and non-UI entries in versions.json that should not be listed as components */
const NON_UI_COMPONENTS = new Set([
  'aura',
  'browserless-test',
  'flow',
  'flow-cdi',
  'flow-components',
  'hilla',
  'icons',
  'input-container',
  'item',
  'lit-renderer',
  'mpr-v7',
  'mpr-v8',
  'overlay',
  'vaadin-aura-theme',
  'vaadin-development-mode-detector',
  'vaadin-lumo-styles',
  'vaadin-lumo-theme',
  'vaadin-messages',
  'vaadin-ordered-layout',
  'vaadin-quarkus',
  'vaadin-renderer',
  'vaadin-router',
  'vaadin-usage-statistics',
]);

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

  // Process core components
  const components: ComponentData[] = [];
  const coreComponents = versionsData.core || {};

  for (const [componentKey, componentInfo] of Object.entries(coreComponents)) {
    const info = componentInfo as any;

    // Skip internal/infrastructure components that aren't user-facing
    if (
      componentKey.includes('-base') ||
      componentKey.startsWith('a11y-') ||
      NON_UI_COMPONENTS.has(componentKey)
    ) {
      continue;
    }

    components.push({
      name: toTitleCase(componentKey),
      react_component: toPascalCase(componentKey),
      java_class: javaClassMap.get(componentKey) || null,
      npm_package: info.npmName || `@vaadin/${componentKey}`
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
