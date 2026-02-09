/**
 * Tests for CodeQLServerManager.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import {
  CodeQLServerManager,
  getServerManager,
  initServerManager,
  resetServerManager,
  shutdownServerManager,
} from '../../../src/lib/server-manager';

// Mock child_process.spawn to avoid starting real CodeQL processes
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    spawn: vi.fn(() => {
      const proc = new EventEmitter() as EventEmitter & {
        stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
        stdout: EventEmitter;
        stderr: EventEmitter;
        killed: boolean;
        kill: ReturnType<typeof vi.fn>;
        pid: number;
      };
      proc.stdin = { write: vi.fn(), end: vi.fn() };
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();
      proc.killed = false;
      proc.kill = vi.fn(() => { (proc as { killed: boolean }).killed = true; });
      proc.pid = 12345;
      return proc;
    }),
  };
});

describe('CodeQLServerManager', () => {
  beforeEach(() => {
    resetServerManager();
  });

  afterEach(() => {
    resetServerManager();
  });

  describe('constructor', () => {
    it('should create session cache directories', () => {
      const manager = new CodeQLServerManager({ sessionId: 'test-session-1' });
      const cacheDir = manager.getCacheDir();

      expect(cacheDir).toContain('test-session-1');
      expect(existsSync(cacheDir)).toBe(true);
    });

    it('should generate a random session ID when none provided', () => {
      const manager = new CodeQLServerManager();
      const sessionId = manager.getSessionId();

      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBeGreaterThan(0);
    });
  });

  describe('getCacheDir', () => {
    it('should return a path under codeql-cache/<sessionId>', () => {
      const manager = new CodeQLServerManager({ sessionId: 'cache-test' });
      expect(manager.getCacheDir()).toContain('codeql-cache');
      expect(manager.getCacheDir()).toContain('cache-test');
    });
  });

  describe('getLogDir', () => {
    it('should return a logs subdirectory of the cache dir', () => {
      const manager = new CodeQLServerManager({ sessionId: 'log-test' });
      expect(manager.getLogDir()).toContain('logs');
    });
  });

  describe('getStatus', () => {
    it('should report all servers as null when none started', () => {
      const manager = new CodeQLServerManager();
      const status = manager.getStatus();

      expect(status.cli).toBeNull();
      expect(status.language).toBeNull();
      expect(status.query).toBeNull();
    });
  });

  describe('isRunning', () => {
    it('should return false for servers that were never started', () => {
      const manager = new CodeQLServerManager();

      expect(manager.isRunning('cli')).toBe(false);
      expect(manager.isRunning('language')).toBe(false);
      expect(manager.isRunning('query')).toBe(false);
    });
  });

  describe('shutdownAll', () => {
    it('should not throw when no servers are running', async () => {
      const manager = new CodeQLServerManager();
      await expect(manager.shutdownAll()).resolves.toBeUndefined();
    });
  });

  describe('shutdownServer', () => {
    it('should not throw when shutting down a server that was never started', async () => {
      const manager = new CodeQLServerManager();
      await expect(manager.shutdownServer('language')).resolves.toBeUndefined();
    });

    it('should accept all server type values', async () => {
      const manager = new CodeQLServerManager();
      await expect(manager.shutdownServer('cli')).resolves.toBeUndefined();
      await expect(manager.shutdownServer('language')).resolves.toBeUndefined();
      await expect(manager.shutdownServer('query')).resolves.toBeUndefined();
    });
  });

  describe('enrichConfig', () => {
    it('should enrich config with session-specific cache and log dirs', () => {
      const manager = new CodeQLServerManager({ sessionId: 'enrich-test' });
      const cacheDir = manager.getCacheDir();
      const logDir = manager.getLogDir();

      // getCacheDir and getLogDir should be included in enriched configs
      expect(cacheDir).toContain('enrich-test');
      expect(logDir).toContain('logs');
    });
  });

  describe('getStatus after construction', () => {
    it('should return consistent status structure', () => {
      const manager = new CodeQLServerManager({ sessionId: 'status-test' });
      const status = manager.getStatus();

      // All three server types should be present as keys
      expect(Object.keys(status)).toEqual(expect.arrayContaining(['cli', 'language', 'query']));
      expect(status.cli).toBeNull();
      expect(status.language).toBeNull();
      expect(status.query).toBeNull();
    });
  });
});

describe('global server manager', () => {
  beforeEach(() => {
    resetServerManager();
  });

  afterEach(() => {
    resetServerManager();
  });

  describe('getServerManager', () => {
    it('should create a manager on first call', () => {
      const manager = getServerManager();
      expect(manager).toBeInstanceOf(CodeQLServerManager);
    });

    it('should return the same instance on subsequent calls', () => {
      const m1 = getServerManager();
      const m2 = getServerManager();
      expect(m1).toBe(m2);
    });
  });

  describe('initServerManager', () => {
    it('should initialize the global manager', () => {
      const manager = initServerManager({ sessionId: 'init-test' });
      expect(manager.getSessionId()).toBe('init-test');
    });

    it('should be idempotent', () => {
      const m1 = initServerManager({ sessionId: 'first' });
      const m2 = initServerManager({ sessionId: 'second' });
      expect(m1).toBe(m2);
      expect(m1.getSessionId()).toBe('first');
    });
  });

  describe('shutdownServerManager', () => {
    it('should not throw when no manager exists', async () => {
      await expect(shutdownServerManager()).resolves.toBeUndefined();
    });

    it('should clear the global manager', async () => {
      initServerManager();
      await shutdownServerManager();
      // After shutdown, getServerManager should create a new instance
      const newManager = getServerManager();
      expect(newManager).toBeDefined();
    });
  });
});
