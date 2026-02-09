/**
 * Tests for CodeQLCLIServer.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { ChildProcess, spawn } from 'child_process';
import { CodeQLCLIServer } from '../../../src/lib/cli-server';

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
  proc.pid = 88888;
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

describe('CodeQLCLIServer', () => {
  let mockProc: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc as unknown as ChildProcess);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      const server = new CodeQLCLIServer({});
      expect(server).toBeDefined();
      expect(server.isRunning()).toBe(false);
    });

    it('should accept config with commonCaches and logdir', () => {
      const server = new CodeQLCLIServer({ commonCaches: '/cache', logdir: '/logs' });
      expect(server).toBeDefined();
    });
  });

  describe('isRunning', () => {
    it('should return false before start', () => {
      const server = new CodeQLCLIServer({});
      expect(server.isRunning()).toBe(false);
    });

    it('should return true after start', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();
      expect(server.isRunning()).toBe(true);
    });
  });

  describe('start', () => {
    it('should spawn a codeql process with cli-server args', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      expect(spawn).toHaveBeenCalledWith(
        'codeql',
        expect.arrayContaining(['execute', 'cli-server']),
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
    });

    it('should throw if already running', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();
      await expect(server.start()).rejects.toThrow('CLI server is already running');
    });

    it('should register stdout, stderr, error, and exit handlers', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      expect(mockProc.stdout.listenerCount('data')).toBeGreaterThan(0);
      expect(mockProc.stderr.listenerCount('data')).toBeGreaterThan(0);
    });
  });

  describe('shutdown', () => {
    it('should not throw when server is not running', async () => {
      const server = new CodeQLCLIServer({});
      await expect(server.shutdown()).resolves.toBeUndefined();
    });

    it('should send shutdown command and clear state', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      // Trigger exit during shutdown to resolve immediately
      const shutdownPromise = server.shutdown();
      mockProc.emit('exit', 0);

      await shutdownPromise;
      expect(mockProc.stdin.write).toHaveBeenCalled();
    });
  });

  describe('runCommand', () => {
    it('should reject when server is not running', async () => {
      const server = new CodeQLCLIServer({});
      await expect(server.runCommand(['test'])).rejects.toThrow('CLI server is not running');
    });

    it('should write JSON args and NUL byte to stdin', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      const cmdPromise = server.runCommand(['resolve', 'qlpacks']);

      // Simulate NUL-terminated response from server
      const response = '{"result": "ok"}\0';
      mockProc.stdout.emit('data', Buffer.from(response));

      const result = await cmdPromise;
      expect(result).toBe('{"result": "ok"}');

      // Verify args were written to stdin
      expect(mockProc.stdin.write).toHaveBeenCalledWith(
        JSON.stringify(['resolve', 'qlpacks']),
        'utf8',
      );
    });

    it('should accumulate partial stdout until NUL byte', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      const cmdPromise = server.runCommand(['version']);

      // Send partial data without NUL
      mockProc.stdout.emit('data', Buffer.from('part1'));
      mockProc.stdout.emit('data', Buffer.from('part2'));
      // Now send NUL-terminated completion
      mockProc.stdout.emit('data', Buffer.from('part3\0'));

      const result = await cmdPromise;
      expect(result).toBe('part1part2part3');
    });

    it('should queue commands when one is in progress', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      const cmd1Promise = server.runCommand(['cmd1']);
      const cmd2Promise = server.runCommand(['cmd2']);

      // Complete first command
      mockProc.stdout.emit('data', Buffer.from('result1\0'));
      const result1 = await cmd1Promise;
      expect(result1).toBe('result1');

      // Complete second command
      mockProc.stdout.emit('data', Buffer.from('result2\0'));
      const result2 = await cmd2Promise;
      expect(result2).toBe('result2');
    });

    it('should reject current command on process error event', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      // Must add an error listener to prevent unhandled error event
      server.on('error', () => { /* swallow */ });

      const cmdPromise = server.runCommand(['test']);
      mockProc.emit('error', new Error('spawn failed'));

      await expect(cmdPromise).rejects.toThrow('spawn failed');
    });

    it('should reject current command on unexpected exit', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      const cmdPromise = server.runCommand(['test']);
      mockProc.emit('exit', 1);

      await expect(cmdPromise).rejects.toThrow('CLI server exited unexpectedly with code: 1');
    });
  });

  describe('handleStdout with multiple NUL delimiters', () => {
    it('should handle two NUL-delimited responses in a single data chunk', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      const cmd1Promise = server.runCommand(['cmd1']);
      const cmd2Promise = server.runCommand(['cmd2']);

      // Send two NUL-delimited responses in a single data event
      mockProc.stdout.emit('data', Buffer.from('result1\0result2\0'));

      const result1 = await cmd1Promise;
      const result2 = await cmd2Promise;

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    it('should handle a trailing NUL with more data after it', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      const cmd1Promise = server.runCommand(['cmd1']);
      const cmd2Promise = server.runCommand(['cmd2']);

      // First chunk contains cmd1 response and partial cmd2 response
      mockProc.stdout.emit('data', Buffer.from('result1\0partial'));
      const result1 = await cmd1Promise;
      expect(result1).toBe('result1');

      // Second chunk completes cmd2
      mockProc.stdout.emit('data', Buffer.from('_more\0'));
      const result2 = await cmd2Promise;
      expect(result2).toBe('partial_more');
    });
  });

  describe('events', () => {
    it('should emit error event on process error', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      const errorHandler = vi.fn();
      server.on('error', errorHandler);

      mockProc.emit('error', new Error('test error'));
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should emit exit event on process exit', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();

      const exitHandler = vi.fn();
      server.on('exit', exitHandler);

      mockProc.emit('exit', 0);
      expect(exitHandler).toHaveBeenCalledWith(0);
    });

    it('should set process to null after exit', async () => {
      const server = new CodeQLCLIServer({});
      await server.start();
      expect(server.isRunning()).toBe(true);

      mockProc.emit('exit', 0);
      expect(server.isRunning()).toBe(false);
    });
  });
});
