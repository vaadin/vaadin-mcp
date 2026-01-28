/**
 * Handlers for component API tools
 */

import * as fs from 'fs';
import { LEGACY_VERSIONS } from 'core-types';
import { normalizeComponentName, findComponentFile, parseFrontmatter } from '../../component-api-helpers.js';
import { logger } from '../../logger.js';

/**
 * Vaadin versions that don't have modern web component APIs (GWT-based, pre-Web Components)
 */
const LEGACY_NO_WEB_COMPONENT_API_VERSIONS = ['7', '8'];

/**
 * Handle get_component_java_api tool
 */
export async function handleGetComponentJavaApiTool(args: any) {
  // Validate arguments
  if (!args.component_name || typeof args.component_name !== 'string') {
    throw new Error('Missing or invalid component_name parameter');
  }

  try {
    // Normalize component name
    const normalized = normalizeComponentName(args.component_name);

    // Construct file path
    const filePath = `components/${normalized}/index-flow.md`;

    // Find component file
    const fileLocation = findComponentFile(filePath, args.vaadin_version);

    if (!fileLocation) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: `Component Java API documentation not found for: ${args.component_name}`,
              normalized_name: normalized
            }, null, 2)
          }
        ],
        isError: true
      };
    }

    // Read the markdown file
    const content = fs.readFileSync(fileLocation.fullPath, 'utf8');

    // Parse frontmatter and content
    const { metadata, content: markdownContent } = parseFrontmatter(content);

    // Format the response
    let output = `# ${metadata?.title || args.component_name} - Java API\n\n`;
    output += `**Component:** ${args.component_name}\n`;
    output += `**Framework:** Java\n`;
    if (metadata?.source_url) {
      output += `**Documentation URL:** ${metadata.source_url}\n`;
    }
    output += `\n---\n\n${markdownContent}`;

    return {
      content: [
        {
          type: 'text' as const,
          text: output
        }
      ]
    };
  } catch (error) {
    logger.error('Error fetching component Java API:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch component Java API: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle get_component_react_api tool
 */
export async function handleGetComponentReactApiTool(args: any) {
  // Validate arguments
  if (!args.component_name || typeof args.component_name !== 'string') {
    throw new Error('Missing or invalid component_name parameter');
  }

  // Check for legacy versions that don't support React/Hilla
  if (args.vaadin_version && (LEGACY_VERSIONS as readonly string[]).includes(args.vaadin_version)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `React API is not available for Vaadin ${args.vaadin_version}`,
            reason: 'React/Hilla support was introduced in Vaadin 23+. Earlier versions only support Java-based UI development.',
            suggestion: 'Use get_component_java_api instead for Java/Flow API documentation.',
            alternative_tool: 'get_component_java_api'
          }, null, 2)
        }
      ],
      isError: true
    };
  }

  try {
    // Normalize component name
    const normalized = normalizeComponentName(args.component_name);

    // Construct file path
    const filePath = `components/${normalized}/index-hilla.md`;

    // Find component file
    const fileLocation = findComponentFile(filePath, args.vaadin_version);

    if (!fileLocation) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: `Component React API documentation not found for: ${args.component_name}`,
              normalized_name: normalized
            }, null, 2)
          }
        ],
        isError: true
      };
    }

    // Read the markdown file
    const content = fs.readFileSync(fileLocation.fullPath, 'utf8');

    // Parse frontmatter and content
    const { metadata, content: markdownContent } = parseFrontmatter(content);

    // Format the response
    let output = `# ${metadata?.title || args.component_name} - React API\n\n`;
    output += `**Component:** ${args.component_name}\n`;
    output += `**Framework:** React\n`;
    if (metadata?.source_url) {
      output += `**Documentation URL:** ${metadata.source_url}\n`;
    }
    output += `\n---\n\n${markdownContent}`;

    return {
      content: [
        {
          type: 'text' as const,
          text: output
        }
      ]
    };
  } catch (error) {
    logger.error('Error fetching component React API:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch component React API: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle get_component_web_component_api tool
 */
export async function handleGetComponentWebComponentApiTool(args: any) {
  // Validate arguments
  if (!args.component_name || typeof args.component_name !== 'string') {
    throw new Error('Missing or invalid component_name parameter');
  }

  // Check for legacy versions that don't have modern web component APIs
  if (args.vaadin_version && LEGACY_NO_WEB_COMPONENT_API_VERSIONS.includes(args.vaadin_version)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Web Component API is not available for Vaadin ${args.vaadin_version}`,
            reason: 'Vaadin 7 and 8 used GWT-based widgets, not Web Components. Web Components were introduced in Vaadin 10+.',
            suggestion: 'Use get_component_java_api for Java API documentation.',
            alternative_tool: 'get_component_java_api'
          }, null, 2)
        }
      ],
      isError: true
    };
  }

  try {
    // Normalize component name
    const normalized = normalizeComponentName(args.component_name);

    // Read the Java documentation to extract the TypeScript API URL from frontmatter
    const filePath = `components/${normalized}/index-flow.md`;
    const fileLocation = findComponentFile(filePath, args.vaadin_version);

    if (!fileLocation) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: `Component documentation not found for: ${args.component_name}`,
              normalized_name: normalized
            }, null, 2)
          }
        ],
        isError: true
      };
    }

    // Read the file to extract the TypeScript API URL
    const content = fs.readFileSync(fileLocation.fullPath, 'utf8');
    const { metadata } = parseFrontmatter(content);

    // Extract TypeScript API URL from page-links in metadata
    const pageLinks = metadata['page-links'] || '';
    const pageLinksMatch = pageLinks.match(/API:\s*([^[]+)\[TypeScript\]/);

    if (!pageLinksMatch || !pageLinksMatch[1]) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: `TypeScript API URL not found in component documentation for: ${args.component_name}`,
              normalized_name: normalized
            }, null, 2)
          }
        ],
        isError: true
      };
    }

    let typescriptApiUrl = pageLinksMatch[1].trim();

    // Check if the URL contains template variables that need to be resolved
    const hasTemplateVars = typescriptApiUrl.includes('{');

    let resolvedUrl = typescriptApiUrl;
    let apiContent = '';
    let fetchError = null;

    if (hasTemplateVars) {
      // Try to resolve template variables with a reasonable default
      // For example: {moduleNpmVersion:@vaadin/button} -> 24.5.0
      resolvedUrl = typescriptApiUrl.replace(/\{[^}]+\}/g, '24.5.0');
    }

    try {
      // Attempt to fetch the TypeScript API documentation
      const response = await fetch(resolvedUrl, {
        headers: {
          'User-Agent': 'vaadin-mcp-server'
        }
      });

      if (response.ok) {
        apiContent = await response.text();
      } else {
        fetchError = `Failed to fetch TypeScript API: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      fetchError = `Error fetching TypeScript API: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Format the response
    let output = `# ${args.component_name} - Web Component (TypeScript) API\n\n`;
    output += `**Component:** ${args.component_name}\n`;
    output += `**Framework:** Web Component (TypeScript)\n`;
    output += `**TypeScript API URL:** ${resolvedUrl}\n`;
    if (hasTemplateVars) {
      output += `**Original URL Template:** ${typescriptApiUrl}\n`;
    }
    output += `\n---\n\n`;
    output += apiContent || `TypeScript API documentation is available at: ${resolvedUrl}${fetchError ? `\n\nNote: ${fetchError}` : ''}`;

    return {
      content: [
        {
          type: 'text' as const,
          text: output
        }
      ]
    };
  } catch (error) {
    logger.error('Error fetching component web component API:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch component web component API: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle get_component_styling tool
 */
export async function handleGetComponentStylingTool(args: any) {
  // Validate arguments
  if (!args.component_name || typeof args.component_name !== 'string') {
    throw new Error('Missing or invalid component_name parameter');
  }

  try {
    // Normalize component name
    const normalized = normalizeComponentName(args.component_name);

    // Try to find both Java and React styling files
    const flowFilePath = `components/${normalized}/styling-flow.md`;
    const hillaFilePath = `components/${normalized}/styling-hilla.md`;

    const flowFileLocation = findComponentFile(flowFilePath, args.vaadin_version);
    const hillaFileLocation = findComponentFile(hillaFilePath, args.vaadin_version);

    if (!flowFileLocation && !hillaFileLocation) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: `Component styling documentation not found for: ${args.component_name}`,
              normalized_name: normalized
            }, null, 2)
          }
        ],
        isError: true
      };
    }

    // Format the response
    let output = `# ${args.component_name} - Styling Documentation\n\n`;
    output += `**Component:** ${args.component_name}\n\n`;

    // Add Java styling if available
    if (flowFileLocation) {
      const content = fs.readFileSync(flowFileLocation.fullPath, 'utf8');
      const { metadata, content: markdownContent } = parseFrontmatter(content);

      output += `## Java Styling\n\n`;
      if (metadata?.source_url) {
        output += `**Documentation URL:** ${metadata.source_url}\n\n`;
      }
      output += `${markdownContent}\n\n`;
      output += `---\n\n`;
    }

    // Add React styling if available
    if (hillaFileLocation) {
      const content = fs.readFileSync(hillaFileLocation.fullPath, 'utf8');
      const { metadata, content: markdownContent } = parseFrontmatter(content);

      output += `## React Styling\n\n`;
      if (metadata?.source_url) {
        output += `**Documentation URL:** ${metadata.source_url}\n\n`;
      }
      output += `${markdownContent}\n\n`;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: output
        }
      ]
    };
  } catch (error) {
    logger.error('Error fetching component styling:', error);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to fetch component styling: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}
