/**
 * Stateful MCP session wiring.
 *
 * Extracted from the HTTP server so that the transport-close behavior
 * (which is prone to recursion if wired wrong) can be exercised by tests.
 */

import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { logger } from './logger.js';

export interface ActiveSession {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  createdAt: Date;
}

export interface SessionCallbacks {
  onStart?: (sessionId: string) => void;
  onEnd?: (sessionId: string) => void;
}

/**
 * Build a StreamableHTTPServerTransport wired to track its session in
 * `activeSessions`. Registers the session on initialize and removes it on
 * clean close (DELETE) or unexpected disconnect.
 *
 * The onclose handler deliberately does NOT call server.close(): the SDK's
 * Protocol.connect composes this callback with its own _onclose which owns
 * protocol-side cleanup. Calling server.close() here would re-enter
 * transport.close() and recurse into a stack overflow.
 */
export function createStatefulTransport(
  server: McpServer,
  activeSessions: Map<string, ActiveSession>,
  callbacks: SessionCallbacks = {},
): StreamableHTTPServerTransport {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id: string) => {
      activeSessions.set(id, { server, transport, createdAt: new Date() });
      logger.info(`Session started: ${id}`);
      callbacks.onStart?.(id);
    },
    onsessionclosed: (id: string) => {
      activeSessions.delete(id);
      logger.info(`Session closed: ${id}`);
      callbacks.onEnd?.(id);
    },
  });

  transport.onclose = () => {
    const id = transport.sessionId;
    if (id && activeSessions.has(id)) {
      activeSessions.delete(id);
      logger.debug(`Session cleaned up on transport close: ${id}`);
    }
  };

  return transport;
}
