/**
 * Amplitude Analytics Service
 *
 * Tracks MCP tool usage to Amplitude "Vaadin MCP Test" project.
 * Gracefully degrades if Amplitude is not configured.
 */

import { init, track } from '@amplitude/analytics-node';
import { logger } from '../logger.js';

let initialized = false;
let enabled = false;

/**
 * Initialize Amplitude analytics
 */
export function initializeAnalytics(apiKey: string | undefined): void {
  if (!apiKey) {
    logger.debug('📊 Analytics: Amplitude API key not provided, analytics disabled');
    enabled = false;
    return;
  }

  try {
    init(apiKey);
    initialized = true;
    enabled = true;
    logger.debug('📊 Analytics: Amplitude initialized successfully');
  } catch (error) {
    logger.error('📊 Analytics: Failed to initialize Amplitude:', error);
    enabled = false;
  }
}

/**
 * Track a tool call event
 */
export async function trackToolCall(
  toolName: string,
  eventProperties: {
    success: boolean;
    execution_time_ms: number;
    result_count?: number;
    [key: string]: any;
  }
): Promise<void> {
  if (!enabled || !initialized) {
    return;
  }

  try {
    // Use the tool name as the event name for better analytics organization
    // Provide a generic device_id for anonymous server-side tracking
    // Amplitude requires either user_id or device_id (min 5 characters)
    await track(toolName, eventProperties, {
      device_id: 'vaadin-mcp-server'
    });
  } catch (error) {
    // Never throw errors that would break tool execution
    logger.error('📊 Analytics: Failed to track event:', error);
  }
}

/**
 * Track a session started event
 */
export async function trackSessionStarted(sessionId: string): Promise<void> {
  if (!enabled || !initialized) {
    return;
  }

  try {
    await track('session_started', { session_id: sessionId }, {
      device_id: 'vaadin-mcp-server'
    });
  } catch (error) {
    logger.error('📊 Analytics: Failed to track session started:', error);
  }
}

/**
 * Track a session closed event
 */
export async function trackSessionClosed(sessionId: string): Promise<void> {
  if (!enabled || !initialized) {
    return;
  }

  try {
    await track('session_closed', { session_id: sessionId }, {
      device_id: 'vaadin-mcp-server'
    });
  } catch (error) {
    logger.error('📊 Analytics: Failed to track session closed:', error);
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return enabled;
}
