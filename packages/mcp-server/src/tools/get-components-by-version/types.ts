/**
 * Type definitions for component version data
 */

/**
 * Component data interface
 */
export interface ComponentData {
  name: string;
  directory: string;
  documentation_url: string;
}

/**
 * Component version data interface
 */
export interface ComponentVersionData {
  version: string;
  branch: string;
  components_count: number;
  components: ComponentData[];
}
