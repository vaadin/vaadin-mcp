/**
 * Analytics Wrapper for MCP Tool Handlers
 *
 * Wraps tool handlers to automatically track analytics events.
 */

import { trackToolCall } from './analytics.js';
import { extractToolParams } from './extractors.js';

/**
 * Extract result count from tool response
 * This tries to parse the response to find how many results were returned
 */
function extractResultCount(result: any): number | undefined {
  try {
    // Check if result has the standard MCP response format
    if (result && result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent && typeof textContent.text === 'string') {
        const text = textContent.text;

        // Try to extract "Found X results" or "Found X document(s)"
        const foundMatch = text.match(/Found (\d+) (?:relevant documentation sections|document|results)/i);
        if (foundMatch) {
          return parseInt(foundMatch[1], 10);
        }

        // For component lists, count components in the response
        if (text.includes('"components"')) {
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const json = JSON.parse(jsonMatch[0]);
              if (json.components && Array.isArray(json.components)) {
                return json.components.length;
              }
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors in result count extraction
  }

  return undefined;
}

/**
 * Wrap a tool handler with analytics tracking
 *
 * @param toolName - The name of the tool being wrapped
 * @param handler - The original tool handler function
 * @returns Wrapped handler that tracks analytics
 */
export function withAnalytics<T extends (...args: any[]) => Promise<any>>(
  toolName: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    let success = true;
    let result: any;
    let error: Error | undefined;

    try {
      // Call the original handler
      result = await handler(...args);

      // Check if the result indicates an error
      if (result && result.isError) {
        success = false;
      }

      return result;
    } catch (err) {
      // Handler threw an exception
      success = false;
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      // Always track analytics, even if handler failed
      const executionTime = Date.now() - startTime;

      // Extract parameters from the first argument (should be the args object)
      const toolArgs = args.length > 0 ? args[0] : {};
      const extractedParams = extractToolParams(toolName, toolArgs);

      // Extract result count if available
      const resultCount = result ? extractResultCount(result) : undefined;

      // Build event properties
      const eventProperties = {
        success,
        execution_time_ms: executionTime,
        result_count: resultCount,
        ...extractedParams,
        ...((!success && error) ? { error_type: error.constructor.name } : {}),
      };

      // Track to Amplitude
      await trackToolCall(toolName, eventProperties);
    }
  }) as T;
}
