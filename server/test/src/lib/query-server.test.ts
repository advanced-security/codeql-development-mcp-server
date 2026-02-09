/**
 * Tests for CodeQLQueryServer.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { ChildProcess, spawn } from 'child_process';
import { CodeQLQueryServer } from '../../../src/lib/query-server';

// Mock waitForProcessReady so start() resolves immediately in tests
vi.mock('../../../src/utils/process-ready', () => ({
  waitForProcessReady: vi.fn().mockResolvedValue(undefined),
}));

// Shared mock process factory
function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    exitCode: number | null;
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
    pid: number;
    stderr: EventEmitter;
    stdin: { end: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn> };
    stdout: EventEmitter;
  };
  proc.stdin = { end: vi.fn(), write: vi.fn() };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.exitCode = null;
  proc.kill = vi.fn(() => { (proc as { killed: boolean }).killed = true; });
  proc.pid = 99999;
  return proc;
}

// Mock child_process.spawn
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    spawn: vi.fn(() => createMockProcess()),
  };
});

/**
 * Build a Content-Length framed JSON-RPC message for simulating query server output.
 */
function buildJsonRpcFrame(payload: object): string {
  const body = JSON.stringify(payload);
  const contentLength = Buffer.byteLength(body, 'utf8');
  return `Content-Length: ${contentLength}\r\n\r\n${body}`;
}

describe('CodeQLQueryServer', () => {
  let mockProc: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc as unknown as ChildProcess);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      const server = new CodeQLQueryServer({});
      expect(server).toBeDefined();
      expect(server.isRunning()).toBe(false);
    });

    it('should accept config with all options', () => {
      const server = new CodeQLQueryServer({
        commonCaches: '/cache',
        debug: true,
        logdir: '/logs',
        threads: 4,
        timeout: 60,
      });
      expect(server).toBeDefined();
    });
  });

  describe('isRunning', () => {
    it('should return false before start', () => {
      const server = new CodeQLQueryServer({});
      expect(server.isRunning()).toBe(false);
    });

    it('should return true after start', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();
      expect(server.isRunning()).toBe(true);
    });
  });

  describe('start', () => {
    it('should spawn codeql with query-server2 args', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      expect(spawn).toHaveBeenCalledWith(
        'codeql',
        expect.arrayContaining(['execute', 'query-server2']),
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
    });

    it('should throw if already running', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();
      await expect(server.start()).rejects.toThrow('Query server is already running');
    });
  });

  describe('shutdown', () => {
    it('should not throw when server is not running', async () => {
      const server = new CodeQLQueryServer({});
      await expect(server.shutdown()).resolves.toBeUndefined();
    });

    it('should send shutdown request through sendRaw', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      // Start shutdown - it will wait for the shutdown response
      const shutdownPromise = server.shutdown();

      // Simulate the response to the shutdown request
      const responseFrame = buildJsonRpcFrame({ id: 1, jsonrpc: '2.0', result: null });
      mockProc.stdout.emit('data', Buffer.from(responseFrame));

      await shutdownPromise;
      expect(mockProc.stdin.write).toHaveBeenCalled();
    });
  });

  describe('sendRequest', () => {
    it('should reject when server is not running', async () => {
      const server = new CodeQLQueryServer({});
      await expect(server.sendRequest('test')).rejects.toThrow('Query server is not running');
    });

    it('should send JSON-RPC framed message and resolve on response', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      const reqPromise = server.sendRequest('evaluation/runQuery', { query: 'select 1' });

      // Simulate response
      const responseFrame = buildJsonRpcFrame({
        id: 1,
        jsonrpc: '2.0',
        result: { resultType: 0 },
      });
      mockProc.stdout.emit('data', Buffer.from(responseFrame));

      const result = await reqPromise;
      expect(result).toEqual({ resultType: 0 });
    });

    it('should reject on error response', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      const reqPromise = server.sendRequest('evaluation/runQuery');

      const responseFrame = buildJsonRpcFrame({
        error: { code: -1, message: 'Compilation failed' },
        id: 1,
        jsonrpc: '2.0',
      });
      mockProc.stdout.emit('data', Buffer.from(responseFrame));

      await expect(reqPromise).rejects.toThrow('Query server error: Compilation failed');
    });

    it('should handle concurrent requests with different IDs', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      const req1Promise = server.sendRequest('method1');
      const req2Promise = server.sendRequest('method2');

      // Respond to request 2 first
      mockProc.stdout.emit('data', Buffer.from(
        buildJsonRpcFrame({ id: 2, jsonrpc: '2.0', result: 'result2' }),
      ));
      const result2 = await req2Promise;
      expect(result2).toBe('result2');

      // Respond to request 1
      mockProc.stdout.emit('data', Buffer.from(
        buildJsonRpcFrame({ id: 1, jsonrpc: '2.0', result: 'result1' }),
      ));
      const result1 = await req1Promise;
      expect(result1).toBe('result1');
    });

    it('should handle partial Content-Length messages', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      const reqPromise = server.sendRequest('test');

      const body = JSON.stringify({ id: 1, jsonrpc: '2.0', result: 'ok' });
      const contentLength = Buffer.byteLength(body, 'utf8');
      const frame = `Content-Length: ${contentLength}\r\n\r\n${body}`;

      // Send frame in two parts
      const mid = Math.floor(frame.length / 2);
      mockProc.stdout.emit('data', Buffer.from(frame.substring(0, mid)));
      mockProc.stdout.emit('data', Buffer.from(frame.substring(mid)));

      const result = await reqPromise;
      expect(result).toBe('ok');
    });
  });

  describe('events', () => {
    it('should emit error event on process error', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      const errorHandler = vi.fn();
      server.on('error', errorHandler);

      mockProc.emit('error', new Error('test error'));
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should emit exit event on process exit', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      const exitHandler = vi.fn();
      server.on('exit', exitHandler);

      mockProc.emit('exit', 0);
      expect(exitHandler).toHaveBeenCalledWith(0);
    });

    it('should reject all pending requests on exit', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      const req1 = server.sendRequest('test1');
      const req2 = server.sendRequest('test2');

      mockProc.emit('exit', 1);

      await expect(req1).rejects.toThrow('Query server exited with code: 1');
      await expect(req2).rejects.toThrow('Query server exited with code: 1');
    });

    it('should emit notification events for server-pushed messages', async () => {
      const server = new CodeQLQueryServer({});
      await server.start();

      const notifHandler = vi.fn();
      server.on('notification', notifHandler);

      const notifFrame = buildJsonRpcFrame({
        jsonrpc: '2.0',
        method: 'ql/progressUpdated',
        params: { step: 1 },
      });
      mockProc.stdout.emit('data', Buffer.from(notifFrame));

      expect(notifHandler).toHaveBeenCalledWith({
        method: 'ql/progressUpdated',
        params: { step: 1 },
      });
    });
  });
});
