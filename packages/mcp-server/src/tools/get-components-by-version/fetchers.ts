/**
 * Functions for fetching component data from GitHub repositories
 */

import { logger } from '../../logger.js';

/**
 * Fetch and parse versions.json from platform repository
 */
export async function fetchVersionsJson(version: string): Promise<any> {
  const url = `https://raw.githubusercontent.com/vaadin/platform/${version}/versions.json`;
  logger.debug(`Fetching versions.json for ${version}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch versions.json: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch flow-components tree to map Java class names
 */
export async function fetchFlowComponentsTree(version: string): Promise<Map<string, string>> {
  const url = `https://api.github.com/repos/vaadin/flow-components/git/trees/${version}?recursive=1`;
  logger.debug(`Fetching flow-components tree for ${version}...`);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'vaadin-docs-mcp-server'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch flow-components tree: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const javaClassMap = new Map<string, string>();

  // Parse the tree to find Java class files
  // Pattern: vaadin-{component}-flow-parent/vaadin-{component}-flow/src/main/java/com/vaadin/flow/component/{package}/{ClassName}.java
  const javaFiles = data.tree.filter((item: any) =>
    item.path.includes('-flow/src/main/java/com/vaadin/flow/component/') &&
    item.path.endsWith('.java') &&
    !item.path.includes('/internal/') &&
    !item.path.includes('Test')
  );

  for (const file of javaFiles) {
    // Extract component name from path
    // e.g., vaadin-button-flow-parent/vaadin-button-flow/src/main/java/com/vaadin/flow/component/button/Button.java
    const pathParts = file.path.split('/');

    // Extract package and class name from Java path
    const javaPathIndex = pathParts.indexOf('com');
    if (javaPathIndex !== -1) {
      const packageParts = pathParts.slice(javaPathIndex);
      const className = packageParts[packageParts.length - 1].replace('.java', '');
      const packageName = packageParts.slice(0, -1).join('.');
      const fullyQualifiedName = `${packageName}.${className}`;

      // Convert class name to component key format
      // e.g., "CheckboxGroup" -> "checkbox-group", "DatePicker" -> "date-picker"
      const componentKey = className
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();

      // Store the mapping (prefer exact matches)
      if (!javaClassMap.has(componentKey)) {
        javaClassMap.set(componentKey, fullyQualifiedName);
      }
    }
  }

  logger.debug(`Found ${javaClassMap.size} Java components`);
  return javaClassMap;
}
