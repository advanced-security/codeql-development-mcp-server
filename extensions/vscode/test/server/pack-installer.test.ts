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
    getCliVersion: vi.fn().mockReturnValue('2.25.1'),
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
    getExtensionVersion: vi.fn().mockReturnValue('2.25.1'),
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

  describe('baseVersion', () => {
    it('should strip pre-release suffix', () => {
      expect(PackInstaller.baseVersion('2.25.1-next.1')).toBe('2.25.1');
    });

    it('should strip v prefix', () => {
      expect(PackInstaller.baseVersion('v2.24.3')).toBe('2.24.3');
    });

    it('should strip both v prefix and pre-release suffix', () => {
      expect(PackInstaller.baseVersion('v2.25.0-rc1')).toBe('2.25.0');
    });

    it('should pass through bare version unchanged', () => {
      expect(PackInstaller.baseVersion('2.25.1')).toBe('2.25.1');
    });
  });

  describe('getPackVersionForCli', () => {
    it('should return pack version for known CLI version', () => {
      expect(PackInstaller.getPackVersionForCli('2.25.0')).toBe('2.25.0');
    });

    it('should return undefined for unknown CLI version', () => {
      expect(PackInstaller.getPackVersionForCli('9.99.99')).toBeUndefined();
    });

    it('should handle CLI version with pre-release suffix', () => {
      expect(PackInstaller.getPackVersionForCli('2.24.1-rc1')).toBe('2.24.1');
    });
  });

  describe('getTargetCliVersion', () => {
    it('should derive base version from extension version', () => {
      serverManager.getExtensionVersion.mockReturnValue('2.25.1-next.1');
      expect(installer.getTargetCliVersion()).toBe('2.25.1');
    });

    it('should handle stable extension version', () => {
      serverManager.getExtensionVersion.mockReturnValue('2.25.0');
      expect(installer.getTargetCliVersion()).toBe('2.25.0');
    });
  });

  describe('version-aware pack download', () => {
    beforeEach(() => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, callback: any) => {
          const cb = typeof _opts === 'function' ? _opts : callback;
          cb(null, '', '');
          return {} as any;
        },
      );
    });

    it('should download packs when CLI version differs from target', async () => {
      cliResolver.getCliVersion.mockReturnValue('2.24.1');
      serverManager.getExtensionVersion.mockReturnValue('2.25.1-next.1');

      await installer.installAll({ languages: ['javascript'] });

      // Should have called pack download, not pack install
      const calls = vi.mocked(execFile).mock.calls;
      expect(calls.length).toBe(1);
      const [cmd, args] = calls[0];
      expect(cmd).toBe('/usr/local/bin/codeql');
      expect(args).toContain('download');
      expect(args).toContain('advanced-security/ql-mcp-javascript-tools-src@2.24.1');
    });

    it('should fall back to bundled pack install when CLI version matches target', async () => {
      cliResolver.getCliVersion.mockReturnValue('2.25.1');
      serverManager.getExtensionVersion.mockReturnValue('2.25.1-next.1');

      await installer.installAll({ languages: ['javascript'] });

      const calls = vi.mocked(execFile).mock.calls;
      expect(calls.length).toBe(1);
      const [, args] = calls[0];
      expect(args).toContain('install');
      expect(args).toContain('--no-strict-mode');
    });

    it('should fall back to bundled pack install when download is disabled', async () => {
      cliResolver.getCliVersion.mockReturnValue('2.24.1');
      serverManager.getExtensionVersion.mockReturnValue('2.25.1-next.1');

      await installer.installAll({
        languages: ['javascript'],
        downloadForCliVersion: false,
      });

      const calls = vi.mocked(execFile).mock.calls;
      expect(calls.length).toBe(1);
      const [, args] = calls[0];
      expect(args).toContain('install');
    });

    it('should fall back to bundled install when CLI version is unknown', async () => {
      cliResolver.getCliVersion.mockReturnValue('9.99.99');
      serverManager.getExtensionVersion.mockReturnValue('2.25.1-next.1');

      await installer.installAll({ languages: ['javascript'] });

      const calls = vi.mocked(execFile).mock.calls;
      expect(calls.length).toBe(1);
      const [, args] = calls[0];
      expect(args).toContain('install');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No known ql-mcp pack version'),
      );
    });

    it('should fall back to bundled install when download fails', async () => {
      cliResolver.getCliVersion.mockReturnValue('2.24.1');
      serverManager.getExtensionVersion.mockReturnValue('2.25.1-next.1');

      let callCount = 0;
      vi.mocked(execFile).mockImplementation(
        (_cmd: any, args: any, _opts: any, callback: any) => {
          const cb = typeof _opts === 'function' ? _opts : callback;
          callCount++;
          if (callCount === 1) {
            // Download fails
            cb(new Error('download failed'), '', 'network error');
          } else {
            // Install succeeds
            cb(null, '', '');
          }
          return {} as any;
        },
      );

      await installer.installAll({ languages: ['javascript'] });

      // Should have tried download then fallen back to install
      expect(callCount).toBe(2);
    });

    it('should download packs for all specified languages', async () => {
      cliResolver.getCliVersion.mockReturnValue('2.24.0');
      serverManager.getExtensionVersion.mockReturnValue('2.25.1-next.1');

      await installer.installAll({
        languages: ['javascript', 'python', 'go'],
      });

      const calls = vi.mocked(execFile).mock.calls;
      expect(calls.length).toBe(3);
      expect(calls[0][1]).toContain('advanced-security/ql-mcp-javascript-tools-src@2.24.0');
      expect(calls[1][1]).toContain('advanced-security/ql-mcp-python-tools-src@2.24.0');
      expect(calls[2][1]).toContain('advanced-security/ql-mcp-go-tools-src@2.24.0');
    });

    it('should not attempt download when CLI version is undefined', async () => {
      cliResolver.getCliVersion.mockReturnValue(undefined);
      serverManager.getExtensionVersion.mockReturnValue('2.25.1-next.1');

      await installer.installAll({ languages: ['javascript'] });

      const calls = vi.mocked(execFile).mock.calls;
      expect(calls.length).toBe(1);
      const [, args] = calls[0];
      expect(args).toContain('install');
    });
  });
});
