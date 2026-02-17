import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliResolver } from '../../src/codeql/cli-resolver';

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  access: vi.fn(),
}));

import { execFile } from 'child_process';
import { access } from 'fs/promises';

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
    channel: {},
  } as any;
}

describe('CliResolver', () => {
  let resolver: CliResolver;
  let logger: any;

  beforeEach(() => {
    vi.resetAllMocks();
    logger = createMockLogger();
    resolver = new CliResolver(logger);
  });

  it('should be instantiable', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve from CODEQL_PATH env var when set', async () => {
    const originalEnv = process.env.CODEQL_PATH;
    process.env.CODEQL_PATH = '/usr/local/bin/codeql';

    // Mock access to succeed (file exists)
    vi.mocked(access).mockResolvedValueOnce(undefined);

    // Mock execFile to return a version
    vi.mocked(execFile).mockImplementationOnce(
      (_cmd: any, _args: any, callback: any) => {
        callback(null, 'CodeQL command-line toolchain release 2.19.0.\n', '');
        return {} as any;
      },
    );

    const result = await resolver.resolve();
    expect(result).toBe('/usr/local/bin/codeql');

    process.env.CODEQL_PATH = originalEnv;
  });

  it('should cache resolved path', async () => {
    const originalEnv = process.env.CODEQL_PATH;
    process.env.CODEQL_PATH = '/cached/codeql';

    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, callback: any) => {
        callback(null, 'CodeQL command-line toolchain release 2.19.0.\n', '');
        return {} as any;
      },
    );

    const result1 = await resolver.resolve();
    const result2 = await resolver.resolve();

    expect(result1).toBe('/cached/codeql');
    expect(result2).toBe('/cached/codeql');
    // access should only be called once due to caching
    expect(access).toHaveBeenCalledTimes(1);

    process.env.CODEQL_PATH = originalEnv;
  });

  it('should invalidate cache when instructed', async () => {
    const originalEnv = process.env.CODEQL_PATH;
    process.env.CODEQL_PATH = '/cached/codeql';

    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, callback: any) => {
        callback(null, 'CodeQL command-line toolchain release 2.19.0.\n', '');
        return {} as any;
      },
    );

    await resolver.resolve();
    resolver.invalidateCache();
    await resolver.resolve();

    // access should be called twice (once before invalidation, once after)
    expect(access).toHaveBeenCalledTimes(2);

    process.env.CODEQL_PATH = originalEnv;
  });

  it('should return undefined when no CLI is found', async () => {
    const originalEnv = process.env.CODEQL_PATH;
    delete process.env.CODEQL_PATH;

    // All access checks fail
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

    // execFile (which/command -v) also fails
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, callback: any) => {
        callback(new Error('not found'), '', '');
        return {} as any;
      },
    );

    const result = await resolver.resolve();
    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not found'));

    process.env.CODEQL_PATH = originalEnv;
  });

  it('should fall back to PATH when CODEQL_PATH is invalid', async () => {
    const originalEnv = process.env.CODEQL_PATH;
    process.env.CODEQL_PATH = '/nonexistent/codeql';

    // CODEQL_PATH access fails
    vi.mocked(access).mockImplementation((path: any) => {
      if (String(path) === '/nonexistent/codeql') return Promise.reject(new Error('ENOENT'));
      return Promise.resolve(undefined as any);
    });

    // which/command -v succeeds
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, callback: any) => {
        callCount++;
        if (callCount === 1) {
          // which codeql
          callback(null, '/usr/local/bin/codeql\n', '');
        } else {
          // codeql --version
          callback(null, 'CodeQL CLI 2.19.0\n', '');
        }
        return {} as any;
      },
    );

    const result = await resolver.resolve();
    expect(result).toBe('/usr/local/bin/codeql');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not a valid'));

    process.env.CODEQL_PATH = originalEnv;
  });

  it('should be disposable', () => {
    expect(() => resolver.dispose()).not.toThrow();
  });
});
