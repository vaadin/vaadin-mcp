/**
 * String utility functions for component name transformations
 */

/**
 * Convert kebab-case to Title Case
 * @example "date-picker" → "Date Picker"
 */
export function toTitleCase(kebabCase: string): string {
  return kebabCase
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert kebab-case to PascalCase
 * @example "date-picker" → "DatePicker"
 */
export function toPascalCase(kebabCase: string): string {
  return kebabCase
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
