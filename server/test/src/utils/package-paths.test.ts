/**
 * Tests for package path resolution utilities.
 *
 * Validates that QL tool query pack paths resolve correctly across:
 * - Source layout (server/src/utils/)
 * - Bundle in monorepo (server/dist/)
 * - Bundle via npm install (<pkg>/dist/)
 */

import { describe, it, expect, afterEach } from 'vitest';
import { delimiter, resolve, sep } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  getPackageRootDir,
  getWorkspaceRootDir,
  resolveToolQueryPackPath,
  packageRootDir,
  workspaceRootDir,
  getPackageVersion,
  getUserWorkspaceDir,
  getUserWorkspaceDirs,
  computeRootLabels,
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
    const npmPath = '/usr/lib/node_modules/codeql-development-mcp-server/dist';
    const result = getPackageRootDir(npmPath);
    expect(result).toBe(resolve('/usr/lib/node_modules/codeql-development-mcp-server'));
  });

  it('should handle Windows-style paths with backslashes', () => {
    if (process.platform !== 'win32') {
      // path.resolve() treats backslashes as normal characters on POSIX;
      // this test is only meaningful on Windows where they are separators.
      return;
    }
    const winPath = 'C:\\Users\\user\\AppData\\Roaming\\npm\\node_modules\\codeql-development-mcp-server\\dist';
    const result = getPackageRootDir(winPath);
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
    const npmPkgRoot = '/usr/lib/node_modules/codeql-development-mcp-server';
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

describe('getPackageVersion', () => {
  it('should return a non-empty version string', () => {
    const version = getPackageVersion();
    expect(version).toBeTruthy();
    expect(typeof version).toBe('string');
  });

  it('should return the actual package.json version for the current runtime', () => {
    const version = getPackageVersion();
    // Read the actual package.json to verify
    const pkgPath = resolve(packageRootDir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    expect(version).toBe(pkg.version);
  });

  it('should cache the version on subsequent calls', () => {
    // Call it twice and verify we get the same result (cached)
    const version1 = getPackageVersion();
    const version2 = getPackageVersion();
    expect(version1).toBe(version2);
  });
});

describe('getUserWorkspaceDir', () => {
  const originalEnv = process.env.CODEQL_MCP_WORKSPACE;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CODEQL_MCP_WORKSPACE = originalEnv;
    } else {
      delete process.env.CODEQL_MCP_WORKSPACE;
    }
  });

  it('should return CODEQL_MCP_WORKSPACE when set', () => {
    const testPath = '/test/workspace/override';
    process.env.CODEQL_MCP_WORKSPACE = testPath;
    const result = getUserWorkspaceDir();
    expect(result).toBe(testPath);
  });

  it('should return workspace root when in monorepo (no env override)', () => {
    delete process.env.CODEQL_MCP_WORKSPACE;
    const result = getUserWorkspaceDir();
    // In monorepo, should return the workspace root (not packageRootDir)
    expect(result).toBe(workspaceRootDir);
  });

  // NOTE: Testing npm-installed layout behavior (process.cwd() fallback) requires
  // mocking workspaceRootDir === packageRootDir, which is difficult since they're
  // module-level constants computed at import time. The npm-installed behavior is
  // instead validated through integration tests where the package is actually
  // installed via npm in a non-monorepo layout.
});

describe('getUserWorkspaceDirs', () => {
  const originalFolders = process.env.CODEQL_MCP_WORKSPACE_FOLDERS;
  const originalWorkspace = process.env.CODEQL_MCP_WORKSPACE;

  afterEach(() => {
    if (originalFolders !== undefined) {
      process.env.CODEQL_MCP_WORKSPACE_FOLDERS = originalFolders;
    } else {
      delete process.env.CODEQL_MCP_WORKSPACE_FOLDERS;
    }
    if (originalWorkspace !== undefined) {
      process.env.CODEQL_MCP_WORKSPACE = originalWorkspace;
    } else {
      delete process.env.CODEQL_MCP_WORKSPACE;
    }
  });

  it('returns each entry of CODEQL_MCP_WORKSPACE_FOLDERS in order', () => {
    const a = resolve('/test/workspace/a');
    const b = resolve('/test/workspace/b');
    process.env.CODEQL_MCP_WORKSPACE_FOLDERS = [a, b].join(delimiter);
    expect(getUserWorkspaceDirs()).toEqual([a, b]);
  });

  it('trims whitespace and ignores empty entries', () => {
    const a = resolve('/test/workspace/a');
    const b = resolve('/test/workspace/b');
    process.env.CODEQL_MCP_WORKSPACE_FOLDERS = `  ${a} ${delimiter}${delimiter} ${b}  `;
    expect(getUserWorkspaceDirs()).toEqual([a, b]);
  });

  it('falls back to the single user workspace dir when unset', () => {
    delete process.env.CODEQL_MCP_WORKSPACE_FOLDERS;
    process.env.CODEQL_MCP_WORKSPACE = '/test/workspace/single';
    expect(getUserWorkspaceDirs()).toEqual(['/test/workspace/single']);
  });

  it('falls back when CODEQL_MCP_WORKSPACE_FOLDERS is empty or whitespace', () => {
    process.env.CODEQL_MCP_WORKSPACE_FOLDERS = `  ${delimiter} `;
    process.env.CODEQL_MCP_WORKSPACE = '/test/workspace/single';
    expect(getUserWorkspaceDirs()).toEqual(['/test/workspace/single']);
  });
});

describe('computeRootLabels', () => {
  it('uses the folder basename as the label when basenames are unique', () => {
    const a = resolve('/work/repo-a');
    const b = resolve('/work/repo-b');
    const labels = computeRootLabels([a, b]);
    expect(labels.get(a)).toBe('repo-a');
    expect(labels.get(b)).toBe('repo-b');
  });

  it('extends colliding basenames with parent segments until unique', () => {
    const a = resolve('/work/projA/queries');
    const b = resolve('/work/projB/queries');
    const labels = computeRootLabels([a, b]);
    expect(labels.get(a)).toBe(`projA${sep}queries`);
    expect(labels.get(b)).toBe(`projB${sep}queries`);
  });

  it('only extends the colliding roots, leaving unique ones at basename depth', () => {
    const a = resolve('/work/projA/queries');
    const b = resolve('/work/projB/queries');
    const c = resolve('/work/other');
    const labels = computeRootLabels([a, b, c]);
    expect(labels.get(a)).toBe(`projA${sep}queries`);
    expect(labels.get(b)).toBe(`projB${sep}queries`);
    expect(labels.get(c)).toBe('other');
  });

  it('returns the basename for a single root', () => {
    const a = resolve('/work/solo');
    const labels = computeRootLabels([a]);
    expect(labels.get(a)).toBe('solo');
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
