/**
 * Tests for the waitForProcessReady utility.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { waitForProcessReady } from '../../../src/utils/process-ready';

/**
 * Create a fake ChildProcess-like object with controllable streams.
 */
function createFakeProcess(options?: { exitCode?: number | null; killed?: boolean }) {
  const proc = new EventEmitter() as EventEmitter & {
    exitCode: number | null;
    killed: boolean;
    pid: number;
    stderr: EventEmitter;
    stdout: EventEmitter;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = options?.killed ?? false;
  proc.exitCode = options?.exitCode ?? null;
  proc.pid = 42;
  return proc;
}

describe('waitForProcessReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve when stderr emits data', async () => {
    const proc = createFakeProcess();
    const promise = waitForProcessReady(proc as unknown as ChildProcess, 'TestServer');

    proc.stderr.emit('data', Buffer.from('JVM starting...'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('should resolve when stdout emits data', async () => {
    const proc = createFakeProcess();
    const promise = waitForProcessReady(proc as unknown as ChildProcess, 'TestServer');

    proc.stdout.emit('data', Buffer.from('Content-Length: 42\r\n\r\n'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('should reject when process emits error before readiness', async () => {
    const proc = createFakeProcess();
    const promise = waitForProcessReady(proc as unknown as ChildProcess, 'TestServer');

    proc.emit('error', new Error('spawn ENOENT'));

    await expect(promise).rejects.toThrow('TestServer failed to start: spawn ENOENT');
  });

  it('should reject when process exits before readiness', async () => {
    const proc = createFakeProcess();
    const promise = waitForProcessReady(proc as unknown as ChildProcess, 'TestServer');

    proc.emit('exit', 1);

    await expect(promise).rejects.toThrow('TestServer exited before becoming ready (code: 1)');
  });

  it('should reject immediately if process is already killed', async () => {
    const proc = createFakeProcess({ killed: true, exitCode: 137 });

    await expect(
      waitForProcessReady(proc as unknown as ChildProcess, 'DeadServer'),
    ).rejects.toThrow('DeadServer is not running');
  });

  it('should reject immediately if process has already exited', async () => {
    const proc = createFakeProcess({ exitCode: 0 });

    await expect(
      waitForProcessReady(proc as unknown as ChildProcess, 'ExitedServer'),
    ).rejects.toThrow('ExitedServer is not running');
  });

  it('should resolve on timeout (best-effort) when no output arrives', async () => {
    vi.useFakeTimers();

    const proc = createFakeProcess();
    const promise = waitForProcessReady(proc as unknown as ChildProcess, 'SlowServer', {
      timeoutMs: 100,
    });

    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBeUndefined();

    vi.useRealTimers();
  });

  it('should clean up listeners after resolving via stderr', async () => {
    const proc = createFakeProcess();
    const promise = waitForProcessReady(proc as unknown as ChildProcess, 'CleanupTest');

    const stderrListenersBefore = proc.stderr.listenerCount('data');
    expect(stderrListenersBefore).toBeGreaterThan(0);

    proc.stderr.emit('data', Buffer.from('ready'));
    await promise;

    // The utility should have removed its listeners
    expect(proc.stderr.listenerCount('data')).toBe(stderrListenersBefore - 1);
    expect(proc.stdout.listenerCount('data')).toBe(0);
    expect(proc.listenerCount('error')).toBe(0);
    expect(proc.listenerCount('exit')).toBe(0);
  });

  it('should not settle twice if stderr fires after timeout', async () => {
    vi.useFakeTimers();

    const proc = createFakeProcess();
    const promise = waitForProcessReady(proc as unknown as ChildProcess, 'DoubleSettle', {
      timeoutMs: 50,
    });

    await vi.advanceTimersByTimeAsync(50);
    await promise;

    // This should be harmless (no uncaught rejections)
    proc.stderr.emit('data', Buffer.from('late output'));

    vi.useRealTimers();
  });

  it('should use default timeout when none specified', async () => {
    const proc = createFakeProcess();
    // Just verify it doesn't throw with undefined opts
    const promise = waitForProcessReady(proc as unknown as ChildProcess, 'DefaultTimeout');

    // Immediately resolve via stderr to avoid waiting 30s
    proc.stderr.emit('data', Buffer.from('ready'));

    await expect(promise).resolves.toBeUndefined();
  });
});
