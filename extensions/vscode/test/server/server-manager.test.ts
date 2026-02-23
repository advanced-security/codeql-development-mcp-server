import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerManager } from '../../src/server/server-manager';

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('fs', () => ({
  accessSync: vi.fn(),
  constants: { R_OK: 4 },
}));

import { execFile } from 'child_process';
import { access, readFile } from 'fs/promises';
import { accessSync } from 'fs';

function createMockContext(extensionVersion = '2.24.2') {
  return {
    extensionUri: { fsPath: '/mock/extension' },
    globalStorageUri: { fsPath: '/mock/global-storage' },
    extension: {
      packageJSON: { version: extensionVersion },
    },
    globalState: {
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockReturnValue([]),
      setKeysForSync: vi.fn(),
    },
    subscriptions: [],
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

describe('ServerManager', () => {
  let manager: ServerManager;
  let ctx: any;
  let logger: any;

  beforeEach(() => {
    vi.resetAllMocks();
    ctx = createMockContext();
    logger = createMockLogger();
    manager = new ServerManager(ctx, logger);
  });

  it('should be instantiable', () => {
    expect(manager).toBeDefined();
  });

  it('should compute install directory under globalStorageUri', () => {
    const dir = manager.getInstallDir();
    expect(dir).toBe('/mock/global-storage/mcp-server');
  });

  it('should compute package root under install dir', () => {
    const root = manager.getPackageRoot();
    expect(root).toBe(
      '/mock/global-storage/mcp-server/node_modules/codeql-development-mcp-server',
    );
  });

  it('should detect when package is not installed', async () => {
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'));
    const installed = await manager.isInstalled();
    expect(installed).toBe(false);
  });

  it('should detect when package is installed', async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ version: '2.24.1' }));
    const installed = await manager.isInstalled();
    expect(installed).toBe(true);
  });

  it('should default command to npx when bundle is missing', () => {
    vi.mocked(accessSync).mockImplementation(() => { throw new Error('ENOENT'); });
    expect(manager.getCommand()).toBe('npx');
  });

  it('should default args to npx -y codeql-development-mcp-server when bundle is missing', () => {
    vi.mocked(accessSync).mockImplementation(() => { throw new Error('ENOENT'); });
    const args = manager.getArgs();
    expect(args).toEqual(['-y', 'codeql-development-mcp-server']);
  });

  it('should provide a human-readable description', () => {
    vi.mocked(accessSync).mockImplementation(() => { throw new Error('ENOENT'); });
    const desc = manager.getDescription();
    expect(desc).toBe('npx -y codeql-development-mcp-server');
  });

  it('should use node with bundled server path when bundle exists', () => {
    vi.mocked(accessSync).mockImplementation(() => undefined);
    expect(manager.getCommand()).toBe('node');
    expect(manager.getArgs()).toEqual(['/mock/extension/server/dist/codeql-development-mcp-server.js']);
  });

  it('should fall back to monorepo server path when VSIX bundle is missing', () => {
    let callCount = 0;
    vi.mocked(accessSync).mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error('ENOENT'); // VSIX path missing
      return undefined; // monorepo path exists
    });
    expect(manager.getCommand()).toBe('node');
    // monorepo path: /mock/extension/../../server/dist/...
    const args = manager.getArgs();
    expect(args[0]).toContain('server/dist/codeql-development-mcp-server.js');
  });

  it('should run npm install when installing', async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        if (typeof _opts === 'function') {
          _opts(null, '', '');
        } else if (callback) {
          callback(null, '', '');
        }
        return {} as any;
      },
    );
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

    await manager.install();
    expect(execFile).toHaveBeenCalled();

    // Should call npm with install --prefix <dir> <package>
    const [cmd, args] = vi.mocked(execFile).mock.calls[0];
    expect(cmd).toMatch(/npm/);
    expect(args).toContain('install');
    expect(args).toContain('--prefix');
  });

  it('should reject when npm install fails', async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        cb(new Error('npm ERR! network'), '', 'npm ERR! network');
        return {} as any;
      },
    );

    await expect(manager.install()).rejects.toThrow(/npm install failed/);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should read installed version from package.json', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ version: '2.24.1' }));

    const version = await manager.getInstalledVersion();
    expect(version).toBe('2.24.1');
  });

  it('should return undefined for version when not installed', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

    const version = await manager.getInstalledVersion();
    expect(version).toBeUndefined();
  });

  it('should return extension version from context', () => {
    expect(manager.getExtensionVersion()).toBe('2.24.2');
  });

  describe('getBundledQlRoot', () => {
    it('should return VSIX server/ path when bundle exists', () => {
      vi.mocked(accessSync).mockImplementation(() => undefined);
      expect(manager.getBundledQlRoot()).toBe('/mock/extension/server');
    });

    it('should fall back to monorepo server/ when VSIX bundle is missing', () => {
      let callCount = 0;
      vi.mocked(accessSync).mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error('ENOENT');
        return undefined;
      });
      const root = manager.getBundledQlRoot();
      expect(root).toContain('server');
    });

    it('should return undefined when no bundle exists', () => {
      vi.mocked(accessSync).mockImplementation(() => { throw new Error('ENOENT'); });
      expect(manager.getBundledQlRoot()).toBeUndefined();
    });
  });

  describe('ensureInstalled', () => {
    it('should skip npm install when VSIX bundle is present', async () => {
      // Bundle exists
      vi.mocked(accessSync).mockImplementation(() => undefined);

      const installed = await manager.ensureInstalled();

      expect(installed).toBe(false);
      expect(execFile).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('VSIX-bundled server'),
      );
    });

    it('should npm install when bundle is missing and nothing installed', async () => {
      // No bundle
      vi.mocked(accessSync).mockImplementation(() => { throw new Error('ENOENT'); });
      // Not installed
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));
      // npm succeeds
      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, callback: any) => {
          const cb = typeof _opts === 'function' ? _opts : callback;
          cb(null, '', '');
          return {} as any;
        },
      );

      const installed = await manager.ensureInstalled();

      expect(installed).toBe(true);
      expect(execFile).toHaveBeenCalled();
    });

    it('should skip npm install when bundle is missing but matching version installed', async () => {
      // No bundle
      vi.mocked(accessSync).mockImplementation(() => { throw new Error('ENOENT'); });
      // Already installed with matching version
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ version: '2.24.2' }));

      const installed = await manager.ensureInstalled();

      expect(installed).toBe(false);
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should upgrade npm install when bundle is missing and version differs', async () => {
      // No bundle
      vi.mocked(accessSync).mockImplementation(() => { throw new Error('ENOENT'); });
      // Old version installed
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ version: '2.24.1' }));
      // npm succeeds
      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, callback: any) => {
          const cb = typeof _opts === 'function' ? _opts : callback;
          cb(null, '', '');
          return {} as any;
        },
      );

      const installed = await manager.ensureInstalled();

      expect(installed).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('differs from target'),
      );
    });
  });

  it('should return undefined version when using latest', () => {
    expect(manager.getVersion()).toBeUndefined();
  });

  it('should be disposable', () => {
    expect(() => manager.dispose()).not.toThrow();
  });
});
