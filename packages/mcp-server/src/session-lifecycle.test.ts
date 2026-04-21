/**
 * Regression test for session transport close behavior.
 *
 * The original stateful patch set transport.onclose to call server.close(),
 * which goes Protocol.close → transport.close → onclose → server.close → ...
 * producing "RangeError: Maximum call stack size exceeded" whenever a client
 * disconnected. Because the faulty server.close() call was fire-and-forget
 * (not awaited), the error surfaces as an unhandled promise rejection rather
 * than propagating to the initial transport.close() caller, so this test
 * collects unhandled rejections and fails if any RangeError appears.
 *
 * The test imports createStatefulTransport from src/session.ts so that any
 * future change to the production onclose wiring is exercised here.
 */

import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createStatefulTransport, type ActiveSession } from './session.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const unhandledRejections: unknown[] = [];
process.on('unhandledRejection', (reason) => {
  unhandledRejections.push(reason);
});

async function drainMicrotasks(): Promise<void> {
  await new Promise((r) => setTimeout(r, 50));
}

function takeStackOverflowRejections(): RangeError[] {
  const overflows = unhandledRejections.filter(
    (r): r is RangeError => r instanceof RangeError && r.message.includes('Maximum call stack'),
  );
  unhandledRejections.length = 0;
  return overflows;
}

async function testCloseWithoutSession(): Promise<TestResult> {
  const name = 'transport.close() does not recurse when no session is active';
  const activeSessions = new Map<string, ActiveSession>();
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const transport = createStatefulTransport(server, activeSessions);

  try {
    await server.connect(transport);
    await transport.close();
    await drainMicrotasks();

    const overflows = takeStackOverflowRejections();
    if (overflows.length > 0) {
      return { name, passed: false, error: `stack overflow detected (${overflows.length} recursion(s))` };
    }
    return { name, passed: true };
  } catch (err) {
    return { name, passed: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function testCloseWithTrackedSession(): Promise<TestResult> {
  const name = 'transport.close() removes the tracked session without recursing';
  const activeSessions = new Map<string, ActiveSession>();
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const transport = createStatefulTransport(server, activeSessions);

  try {
    await server.connect(transport);

    // Simulate post-handshake state: sessionId populated, session registered
    // in the map. This is what onsessioninitialized would do in a real flow.
    const fakeId = 'test-session-' + randomUUID();
    (transport as unknown as { sessionId: string }).sessionId = fakeId;
    activeSessions.set(fakeId, { server, transport, createdAt: new Date() });

    await transport.close();
    await drainMicrotasks();

    const overflows = takeStackOverflowRejections();
    if (overflows.length > 0) {
      return { name, passed: false, error: `stack overflow detected (${overflows.length} recursion(s))` };
    }
    if (activeSessions.has(fakeId)) {
      return { name, passed: false, error: 'session entry was not removed on close' };
    }
    return { name, passed: true };
  } catch (err) {
    return { name, passed: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const results = [
    await testCloseWithoutSession(),
    await testCloseWithTrackedSession(),
  ];

  let failed = 0;
  for (const r of results) {
    if (r.passed) {
      console.log(`  ✅ ${r.name}`);
    } else {
      console.log(`  ❌ ${r.name}`);
      console.log(`     ${r.error}`);
      failed++;
    }
  }

  console.log('');
  console.log(`📊 Session Lifecycle Tests: ${results.length - failed}/${results.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Test runner crashed:', err);
  process.exit(1);
});
