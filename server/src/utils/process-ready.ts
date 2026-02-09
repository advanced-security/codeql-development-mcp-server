/**
 * Utility for waiting until a spawned child process is ready.
 *
 * CodeQL background servers (cli-server, query-server2, language-server) run
 * on the JVM and emit stderr log output once the JVM has initialised.  Rather
 * than sleeping for a hard-coded duration — which is fragile on both fast and
 * slow machines — this helper resolves as soon as the first stderr output
 * arrives (indicating the JVM is alive), or when the maximum timeout expires.
 * It also rejects immediately if the process exits or errors before becoming
 * ready, giving callers a clear error instead of a silent hang.
 */

import { ChildProcess } from 'child_process';
import { clearTimeout, setTimeout } from 'timers';
import { logger } from './logger';

/** Default maximum wait for a CodeQL server to become ready (30 s). */
const DEFAULT_READY_TIMEOUT_MS = 30_000;

/**
 * Options for {@link waitForProcessReady}.
 */
export interface ProcessReadyOptions {
  /**
   * Maximum time in milliseconds to wait for the process to emit its first
   * stderr output.  If the timeout is reached without a signal the promise
   * still resolves (best-effort) so the caller can attempt communication.
   *
   * Default: 30 000 ms.
   */
  timeoutMs?: number;
}

/**
 * Wait until a child process signals readiness.
 *
 * "Ready" is defined as any of:
 * 1. The process emits data on **stderr** (JVM startup log line).
 * 2. The process emits data on **stdout** (initial protocol message).
 * 3. The maximum timeout elapses (best-effort resolve).
 *
 * The promise **rejects** if the process emits an `error` event or exits
 * before any of the above conditions are met.
 *
 * @param child  - The spawned child process.
 * @param name   - A human-readable label for log messages.
 * @param opts   - Optional configuration.
 */
export function waitForProcessReady(
  child: ChildProcess,
  name: string,
  opts?: ProcessReadyOptions,
): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_READY_TIMEOUT_MS;

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      settled = true;
      child.stderr?.removeListener('data', onStderr);
      child.stdout?.removeListener('data', onStdout);
      child.removeListener('error', onError);
      child.removeListener('exit', onExit);
      clearTimeout(timer);
    };

    const onStderr = () => {
      if (settled) return;
      logger.debug(`${name}: ready (stderr output detected)`);
      cleanup();
      resolve();
    };

    const onStdout = () => {
      if (settled) return;
      logger.debug(`${name}: ready (stdout output detected)`);
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      if (settled) return;
      cleanup();
      reject(new Error(`${name} failed to start: ${error.message}`));
    };

    const onExit = (code: number | null) => {
      if (settled) return;
      cleanup();
      reject(new Error(`${name} exited before becoming ready (code: ${code})`));
    };

    const timer = setTimeout(() => {
      if (settled) return;
      logger.warn(`${name}: readiness timeout (${timeoutMs} ms) — proceeding anyway`);
      cleanup();
      resolve(); // best-effort: let the caller attempt communication
    }, timeoutMs);

    child.stderr?.on('data', onStderr);
    child.stdout?.on('data', onStdout);
    child.on('error', onError);
    child.on('exit', onExit);

    // If the process was dead before we even attached listeners, reject now
    if (child.killed || child.exitCode !== null) {
      cleanup();
      reject(new Error(`${name} is not running (exitCode: ${child.exitCode})`));
    }
  });
}
