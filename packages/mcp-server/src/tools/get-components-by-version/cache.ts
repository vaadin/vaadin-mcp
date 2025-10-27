/**
 * Cache for component version data
 */

import type { ComponentVersionData } from './types.js';

/**
 * Cache for component version data
 * Key: version string (e.g., "24.8", "24.9")
 * Value: complete component data for that version
 */
const componentVersionCache = new Map<string, ComponentVersionData>();

/**
 * Check if a version is cached
 */
export function hasCachedVersion(version: string): boolean {
  return componentVersionCache.has(version);
}

/**
 * Get cached version data
 */
export function getCachedVersion(version: string): ComponentVersionData | undefined {
  return componentVersionCache.get(version);
}

/**
 * Set cached version data
 */
export function setCachedVersion(version: string, data: ComponentVersionData): void {
  componentVersionCache.set(version, data);
}
