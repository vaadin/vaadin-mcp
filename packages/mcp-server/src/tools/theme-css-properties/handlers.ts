/**
 * Handler for get_theme_css_properties tool
 */

import * as fs from 'fs';
import { findComponentFile, parseFrontmatter } from '../../component-api-helpers.js';
import { logger } from '../../logger.js';

/**
 * Theme file paths configuration per version
 */
const THEME_FILES: Record<string, Record<string, string[]>> = {
  '25': {
    aura: [
      'styling/themes/aura/color.md',
      'styling/themes/aura/typography.md',
      'styling/themes/aura/other.md',
      'styling/themes/aura/app-layout.md',
    ],
    lumo: [
      'styling/themes/lumo/lumo-style-properties/color.md',
      'styling/themes/lumo/lumo-style-properties/elevation.md',
      'styling/themes/lumo/lumo-style-properties/interaction.md',
      'styling/themes/lumo/lumo-style-properties/shape.md',
      'styling/themes/lumo/lumo-style-properties/size-space.md',
      'styling/themes/lumo/lumo-style-properties/typography.md',
    ],
    base: [
      'styling/themes/base/index.md',
    ],
  },
  '25.1': {
    aura: [
      'styling/themes/aura/color.md',
      'styling/themes/aura/typography.md',
      'styling/themes/aura/other.md',
      'styling/themes/aura/app-layout.md',
    ],
    lumo: [
      'styling/themes/lumo/lumo-style-properties/color.md',
      'styling/themes/lumo/lumo-style-properties/elevation.md',
      'styling/themes/lumo/lumo-style-properties/interaction.md',
      'styling/themes/lumo/lumo-style-properties/shape.md',
      'styling/themes/lumo/lumo-style-properties/size-space.md',
      'styling/themes/lumo/lumo-style-properties/typography.md',
    ],
    base: [
      'styling/themes/base/index.md',
    ],
  },
  '24': {
    lumo: [
      'styling/lumo/lumo-style-properties/color.md',
      'styling/lumo/lumo-style-properties/elevation.md',
      'styling/lumo/lumo-style-properties/interaction.md',
      'styling/lumo/lumo-style-properties/shape.md',
      'styling/lumo/lumo-style-properties/size-space.md',
      'styling/lumo/lumo-style-properties/typography.md',
    ],
  },
};

/**
 * Handle get_theme_css_properties tool
 */
export async function handleGetThemeCssPropertiesTool(args: { theme: string; vaadin_version: string }) {
  const { theme, vaadin_version } = args;

  // Handle legacy versions
  if (['7', '8', '14'].includes(vaadin_version)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Theme CSS properties tool is not available for Vaadin ${vaadin_version}. This tool supports Vaadin 24 and 25+.`,
        }, null, 2),
      }],
      isError: true,
    };
  }

  // Handle version-theme incompatibilities
  if (vaadin_version === '24' && theme === 'aura') {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: 'Aura theme is only available in Vaadin 25+. Vaadin 24 uses Lumo as the default theme.',
          suggestion: 'Use theme: "lumo" for Vaadin 24 projects.',
        }, null, 2),
      }],
      isError: true,
    };
  }

  if (vaadin_version === '24' && theme === 'base') {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: 'Base styles are only available as a separate theme in Vaadin 25+.',
          suggestion: 'Use theme: "lumo" for Vaadin 24 projects.',
        }, null, 2),
      }],
      isError: true,
    };
  }

  // Look up the version config — for 25.1 use v25 markdown files
  const markdownVersion = vaadin_version === '25.1' ? '25' : vaadin_version;
  const versionFiles = THEME_FILES[vaadin_version] || THEME_FILES[markdownVersion];
  if (!versionFiles) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `No theme CSS properties available for Vaadin ${vaadin_version}.`,
        }, null, 2),
      }],
      isError: true,
    };
  }

  const filePaths = versionFiles[theme];
  if (!filePaths) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Theme "${theme}" is not available for Vaadin ${vaadin_version}.`,
        }, null, 2),
      }],
      isError: true,
    };
  }

  try {
    const sections: string[] = [];

    for (const filePath of filePaths) {
      const fileLocation = findComponentFile(filePath, markdownVersion);
      if (!fileLocation) {
        logger.warn(`Theme CSS properties file not found: ${filePath} for v${markdownVersion}`);
        continue;
      }

      const rawContent = fs.readFileSync(fileLocation.fullPath, 'utf8');
      const { content } = parseFrontmatter(rawContent);
      sections.push(content.trim());
    }

    if (sections.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            error: `No CSS properties documentation files found for the ${theme} theme in Vaadin ${vaadin_version}.`,
          }, null, 2),
        }],
        isError: true,
      };
    }

    const themeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);
    let output = `# ${themeLabel} Theme — CSS Custom Properties (Vaadin ${vaadin_version})\n\n`;
    output += sections.join('\n\n---\n\n');

    return {
      content: [{
        type: 'text' as const,
        text: output,
      }],
    };
  } catch (error) {
    logger.error('Error fetching theme CSS properties:', error);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Failed to fetch theme CSS properties: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }, null, 2),
      }],
      isError: true,
    };
  }
}
