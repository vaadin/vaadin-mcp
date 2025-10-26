/**
 * Type definitions for component version data
 */

/**
 * Component data interface
 */
export interface ComponentData {
  name: string;
  react_component: string;
  java_class: string | null;
  npm_package: string;
  documentation_url: string;
}

/**
 * Component version data interface
 */
export interface ComponentVersionData {
  version: string;
  components_count: number;
  components: ComponentData[];
}
