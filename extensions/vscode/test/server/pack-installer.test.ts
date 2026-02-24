import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackInstaller } from '../../src/server/pack-installer';

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readdir: vi.fn(),
}));

import { execFile } from 'child_process';
import { access } from 'fs/promises';

function createMockCliResolver() {
  return {
    resolve: vi.fn().mockResolvedValue('/usr/local/bin/codeql'),
    invalidateCache: vi.fn(),
    dispose: vi.fn(),
    push: vi.fn(),
  } as any;
}

function createMockServerManager(bundledQlRoot?: string) {
  return {
    getBundledQlRoot: vi.fn().mockReturnValue(bundledQlRoot ?? undefined),
    getPackageRoot: vi.fn().mockReturnValue('/mock/global-storage/mcp-server/node_modules/codeql-development-mcp-server'),
    getInstallDir: vi.fn().mockReturnValue('/mock/global-storage/mcp-server'),
    getCommand: vi.fn().mockReturnValue('npx'),
    getArgs: vi.fn().mockReturnValue(['-y', 'codeql-development-mcp-server']),
    dispose: vi.fn(),
    push: vi.fn(),
  } as any;
}

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  } as any;
}

describe('PackInstaller', () => {
  let installer: PackInstaller;
  let cliResolver: any;
  let serverManager: any;
  let logger: any;

  beforeEach(() => {
    vi.resetAllMocks();
    cliResolver = createMockCliResolver();
    serverManager = createMockServerManager();
    logger = createMockLogger();
    installer = new PackInstaller(cliResolver, serverManager, logger);
  });

  it('should be instantiable', () => {
    expect(installer).toBeDefined();
  });

  it('should list all supported languages', () => {
    const languages = PackInstaller.SUPPORTED_LANGUAGES;
    expect(languages).toContain('javascript');
    expect(languages).toContain('python');
    expect(languages).toContain('java');
    expect(languages).toHaveLength(9);
  });

  it('should resolve qlpack paths under the npm package root when no bundle', () => {
    const paths = installer.getQlpackPaths();
    expect(paths).toHaveLength(9);
    for (const p of paths) {
      expect(p).toContain('codeql-development-mcp-server/ql/');
      expect(p).toContain('/tools/src');
    }
  });

  it('should prefer bundled ql root when VSIX bundle exists', () => {
    const bundledManager = createMockServerManager('/mock/extension/server');
    const bundledInstaller = new PackInstaller(
      cliResolver,
      bundledManager,
      logger,
    );
    const paths = bundledInstaller.getQlpackPaths();
    expect(paths).toHaveLength(9);
    for (const p of paths) {
      expect(p).toMatch(/^\/mock\/extension\/server\/ql\//);
      expect(p).toContain('/tools/src');
    }
    // Should NOT have used npm package root
    expect(bundledManager.getPackageRoot).not.toHaveBeenCalled();
  });

  it('should skip installation when CLI is not found', async () => {
    cliResolver.resolve.mockResolvedValue(undefined);

    await installer.installAll();

    expect(execFile).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should run codeql pack install for each language', async () => {
    vi.mocked(access).mockResolvedValue(undefined);

    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        cb(null, '', '');
        return {} as any;
      },
    );

    await installer.installAll({ force: true });

    // Should have called execFile once per supported language
    expect(execFile).toHaveBeenCalledTimes(PackInstaller.SUPPORTED_LANGUAGES.length);
  });

  it('should pass correct args to codeql CLI', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        cb(null, '', '');
        return {} as any;
      },
    );

    await installer.installAll({ languages: ['javascript'] });

    const [cmd, args] = vi.mocked(execFile).mock.calls[0];
    expect(cmd).toBe('/usr/local/bin/codeql');
    expect(args).toContain('pack');
    expect(args).toContain('install');
    expect(args).toContain('--no-strict-mode');
  });

  it('should skip languages whose pack directory does not exist', async () => {
    // Only javascript exists, others don't
    vi.mocked(access).mockImplementation((path: any) => {
      if (String(path).includes('/javascript/')) return Promise.resolve(undefined as any);
      return Promise.reject(new Error('ENOENT'));
    });

    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        cb(null, '', '');
        return {} as any;
      },
    );

    await installer.installAll();

    // Only one call — for javascript
    expect(execFile).toHaveBeenCalledTimes(1);
  });

  it('should continue installing other languages when one fails', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        callCount++;
        if (callCount === 3) {
          cb(new Error('pack install failed'), '', 'error');
        } else {
          cb(null, '', '');
        }
        return {} as any;
      },
    );

    // Should not throw — errors are logged per-language
    await installer.installAll();

    expect(execFile).toHaveBeenCalledTimes(PackInstaller.SUPPORTED_LANGUAGES.length);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('should install only specified languages', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        cb(null, '', '');
        return {} as any;
      },
    );

    await installer.installAll({ languages: ['javascript', 'python'] });

    expect(execFile).toHaveBeenCalledTimes(2);
  });

  it('should be disposable', () => {
    expect(() => installer.dispose()).not.toThrow();
  });
});
