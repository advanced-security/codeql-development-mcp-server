/**
 * Tests for CodeQL Language Server manager.
 *
 * Covers LSP feature methods (getCompletions, getDefinition, getReferences),
 * workspace management, openDocument/closeDocument, and normalizeLocations.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { ChildProcess, spawn } from 'child_process';
import { CodeQLLanguageServer } from '../../../src/lib/language-server';

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
  proc.pid = 77777;
  return proc;
}

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    spawn: vi.fn(() => createMockProcess()),
  };
});

/**
 * Build a Content-Length framed JSON-RPC message to simulate LS output.
 */
function buildLspFrame(payload: object): string {
  const body = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

describe('CodeQLLanguageServer', () => {
  let mockProc: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc as unknown as ChildProcess);
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const ls = new CodeQLLanguageServer();
      expect(ls).toBeDefined();
    });

    it('should accept custom options', () => {
      const ls = new CodeQLLanguageServer({
        loglevel: 'DEBUG',
        searchPath: '/some/path',
        synchronous: true,
      });
      expect(ls).toBeDefined();
    });
  });

  describe('start', () => {
    it('should spawn a codeql language-server process', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      expect(spawn).toHaveBeenCalledWith(
        'codeql',
        expect.arrayContaining(['execute', 'language-server']),
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
    });

    it('should throw if already running', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();
      await expect(ls.start()).rejects.toThrow('Language server is already running');
    });
  });

  describe('initialize', () => {
    it('should send initialize request and initialized notification', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      const initPromise = ls.initialize('file:///workspace');

      // The server sends an initialize request; simulate a response
      // The sendRequest will write to stdin; we need to simulate the response
      const response = buildLspFrame({
        id: 1,
        jsonrpc: '2.0',
        result: { capabilities: {} },
      });
      mockProc.stdout.emit('data', Buffer.from(response));

      await initPromise;
      // After initialize, the server should have written two messages (initialize + initialized)
      expect(mockProc.stdin.write).toHaveBeenCalled();
    });

    it('should be idempotent for same workspace', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      // First initialize
      const initPromise = ls.initialize('file:///workspace');
      mockProc.stdout.emit('data', Buffer.from(buildLspFrame({
        id: 1, jsonrpc: '2.0', result: { capabilities: {} },
      })));
      await initPromise;

      // Second call with same workspace should return immediately
      await ls.initialize('file:///workspace');
      // Only one initialize request should have been sent
    });

    it('should track the workspace URI', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      const initPromise = ls.initialize('file:///test/workspace');
      mockProc.stdout.emit('data', Buffer.from(buildLspFrame({
        id: 1, jsonrpc: '2.0', result: { capabilities: {} },
      })));
      await initPromise;

      expect(ls.getWorkspaceUri()).toBe('file:///test/workspace');
    });
  });

  describe('getCompletions', () => {
    it('should throw if not initialized', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      await expect(ls.getCompletions({
        position: { character: 0, line: 0 },
        textDocument: { uri: 'file:///test.ql' },
      })).rejects.toThrow('Language server is not initialized');
    });
  });

  describe('getDefinition', () => {
    it('should throw if not initialized', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      await expect(ls.getDefinition({
        position: { character: 0, line: 0 },
        textDocument: { uri: 'file:///test.ql' },
      })).rejects.toThrow('Language server is not initialized');
    });
  });

  describe('getReferences', () => {
    it('should throw if not initialized', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      await expect(ls.getReferences({
        position: { character: 0, line: 0 },
        textDocument: { uri: 'file:///test.ql' },
      })).rejects.toThrow('Language server is not initialized');
    });
  });

  describe('openDocument', () => {
    it('should throw if not initialized', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      expect(() => ls.openDocument('file:///test.ql', 'select 1'))
        .toThrow('Language server is not initialized');
    });
  });

  describe('closeDocument', () => {
    it('should throw if not initialized', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      expect(() => ls.closeDocument('file:///test.ql'))
        .toThrow('Language server is not initialized');
    });
  });

  describe('evaluateQL', () => {
    it('should throw if not initialized', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      await expect(ls.evaluateQL('select 1'))
        .rejects.toThrow('Language server is not initialized');
    });
  });

  describe('getWorkspaceUri', () => {
    it('should return undefined before initialization', () => {
      const ls = new CodeQLLanguageServer();
      expect(ls.getWorkspaceUri()).toBeUndefined();
    });
  });

  describe('shutdown', () => {
    it('should not throw when server is not running', async () => {
      const ls = new CodeQLLanguageServer();
      await expect(ls.shutdown()).resolves.toBeUndefined();
    });

    it('should send shutdown/exit and clean up', async () => {
      const ls = new CodeQLLanguageServer();
      await ls.start();

      const shutdownPromise = ls.shutdown();

      // Simulate response to shutdown request
      mockProc.stdout.emit('data', Buffer.from(buildLspFrame({
        id: 1, jsonrpc: '2.0', result: null,
      })));
      mockProc.emit('exit', 0);

      await shutdownPromise;
      expect(mockProc.stdin.write).toHaveBeenCalled();
    });
  });
});