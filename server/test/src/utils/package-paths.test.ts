/**
 * Tests for package path resolution utilities.
 *
 * Validates that QL tool query pack paths resolve correctly across:
 * - Source layout (server/src/utils/)
 * - Bundle in monorepo (server/dist/)
 * - Bundle via npm install (<pkg>/dist/)
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  getPackageRootDir,
  getWorkspaceRootDir,
  resolveToolQueryPackPath,
  packageRootDir,
  workspaceRootDir,
} from '../../../src/utils/package-paths';

describe('getPackageRootDir', () => {
  it('should resolve from source layout (src/lib/) to server/', () => {
    const result = getPackageRootDir('/project/server/src/lib');
    expect(result).toBe(resolve('/project/server'));
  });

  it('should resolve from source layout (src/utils/) to server/', () => {
    const result = getPackageRootDir('/project/server/src/utils');
    expect(result).toBe(resolve('/project/server'));
  });

  it('should resolve from bundle in monorepo (server/dist/) to server/', () => {
    const result = getPackageRootDir('/project/server/dist');
    expect(result).toBe(resolve('/project/server'));
  });

  it('should resolve from npm install (<pkg>/dist/) to <pkg>/', () => {
    const npmPath = '/usr/lib/node_modules/@advanced-security/codeql-development-mcp-server/dist';
    const result = getPackageRootDir(npmPath);
    expect(result).toBe(resolve('/usr/lib/node_modules/@advanced-security/codeql-development-mcp-server'));
  });

  it('should handle Windows-style paths with backslashes', () => {
    const winPath = 'C:\\Users\\user\\AppData\\Roaming\\npm\\node_modules\\@advanced-security\\codeql-development-mcp-server\\dist';
    const result = getPackageRootDir(winPath);
    // On Unix, resolve will still work with forward slashes
    expect(result).toContain('codeql-development-mcp-server');
    expect(result).not.toContain('dist');
  });

  it('should return a value for the current runtime (__dirname default)', () => {
    const result = getPackageRootDir();
    // When running tests from source, this should be the server/ directory
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('getWorkspaceRootDir', () => {
  it('should detect monorepo root when package.json with workspaces exists', () => {
    // In our test environment, we ARE in the monorepo, so workspace root is one
    // level above the package root (server/)
    const result = getWorkspaceRootDir(packageRootDir);
    expect(result).not.toBe(packageRootDir);
    // The workspace root should contain a package.json with workspaces
    const rootPkg = readFileSync(resolve(result, 'package.json'), 'utf8');
    expect(JSON.parse(rootPkg).workspaces).toBeDefined();
  });

  it('should fall back to package root when no monorepo parent exists', () => {
    // Use a path that has no monorepo parent
    const result = getWorkspaceRootDir('/tmp/fake-package');
    expect(result).toBe('/tmp/fake-package');
  });
});

describe('resolveToolQueryPackPath', () => {
  it('should resolve JavaScript tool pack path', () => {
    const result = resolveToolQueryPackPath('javascript', '/project/server');
    expect(result).toBe(resolve('/project/server/ql/javascript/tools/src'));
  });

  it('should resolve C++ tool pack path', () => {
    const result = resolveToolQueryPackPath('cpp', '/project/server');
    expect(result).toBe(resolve('/project/server/ql/cpp/tools/src'));
  });

  it('should resolve correctly for npm install layout', () => {
    const npmPkgRoot = '/usr/lib/node_modules/@advanced-security/codeql-development-mcp-server';
    const result = resolveToolQueryPackPath('python', npmPkgRoot);
    expect(result).toBe(resolve(npmPkgRoot, 'ql/python/tools/src'));
    // Critically: no 'server/' prefix in the path
    expect(result).not.toContain('/server/ql/');
  });

  it('should resolve to an existing directory for current runtime', () => {
    // When running from the monorepo, the ql/ directories should exist
    const result = resolveToolQueryPackPath('javascript');
    expect(existsSync(result)).toBe(true);
  });
});

describe('Pre-computed exports', () => {
  it('packageRootDir should be the server/ directory in monorepo', () => {
    expect(packageRootDir).toBeTruthy();
    // Should end with 'server' when running from monorepo
    expect(packageRootDir.replace(/\\/g, '/')).toMatch(/\/server$/);
  });

  it('workspaceRootDir should be the monorepo root', () => {
    expect(workspaceRootDir).toBeTruthy();
    expect(workspaceRootDir).not.toBe(packageRootDir);
  });
});
