/**
 * Parameter Extractors for Analytics
 *
 * Extracts analytics properties from tool arguments.
 * Privacy-preserving: only logs what's approved (component names, file paths, versions).
 * Never logs actual search queries (only query length).
 */

import { logger } from '../logger.js';

/**
 * Extract properties from search_vaadin_docs arguments
 */
export function extractSearchParams(args: any): Record<string, any> {
  const params: Record<string, any> = {};

  if (args.question && typeof args.question === 'string') {
    // Only log the length of the query, not the actual query
    params.query_length = args.question.length;
  }

  if (args.max_results !== undefined) {
    params.max_results = args.max_results;
  }

  if (args.max_tokens !== undefined) {
    params.max_tokens = args.max_tokens;
  }

  if (args.ui_language) {
    params.ui_language = args.ui_language;
  }

  // Also track the internal framework parameter if present
  if (args.framework) {
    params.framework = args.framework;
  }

  if (args.vaadin_version) {
    params.vaadin_version = args.vaadin_version;
  }

  return params;
}

/**
 * Extract properties from get_full_document arguments
 */
export function extractFullDocumentParams(args: any): Record<string, any> {
  const params: Record<string, any> = {};

  if (args.file_paths && Array.isArray(args.file_paths)) {
    // Log actual file paths (approved to track)
    params.file_paths = args.file_paths;
    params.file_count = args.file_paths.length;
  }

  return params;
}

/**
 * Extract properties from get_components_by_version arguments
 */
export function extractComponentsByVersionParams(args: any): Record<string, any> {
  const params: Record<string, any> = {};

  if (args.version && typeof args.version === 'string') {
    // Log the actual version (approved to track)
    params.version = args.version;
  }

  return params;
}

/**
 * Extract properties from component API tool arguments
 * Used by: get_component_java_api, get_component_react_api,
 *          get_component_web_component_api, get_component_styling
 */
export function extractComponentApiParams(args: any): Record<string, any> {
  const params: Record<string, any> = {};

  if (args.component_name && typeof args.component_name === 'string') {
    // Log the actual component name (approved to track)
    params.component_name = args.component_name;
  }

  if (args.vaadin_version) {
    params.vaadin_version = args.vaadin_version;
  }

  return params;
}

/**
 * Extract properties for tools with no parameters
 * Used by: get_vaadin_version
 */
export function extractNoParams(_args: any): Record<string, any> {
  return {};
}

/**
 * Extract properties from get_vaadin_primer arguments
 */
export function extractPrimerParams(args: any): Record<string, any> {
  const params: Record<string, any> = {};

  if (args.vaadin_version && typeof args.vaadin_version === 'string') {
    params.vaadin_version = args.vaadin_version;
  }

  return params;
}

/**
 * Main extractor function that routes to appropriate extractor based on tool name
 */
export function extractToolParams(toolName: string, args: any): Record<string, any> {
  switch (toolName) {
    case 'search_vaadin_docs':
      return extractSearchParams(args);

    case 'get_full_document':
      return extractFullDocumentParams(args);

    case 'get_components_by_version':
      return extractComponentsByVersionParams(args);

    case 'get_component_java_api':
    case 'get_component_react_api':
    case 'get_component_web_component_api':
    case 'get_component_styling':
      return extractComponentApiParams(args);

    case 'get_vaadin_version':
      return extractNoParams(args);

    case 'get_vaadin_primer':
      return extractPrimerParams(args);

    default:
      logger.warn(`📊 Analytics: Unknown tool name "${toolName}", no parameter extraction`);
      return {};
  }
}
