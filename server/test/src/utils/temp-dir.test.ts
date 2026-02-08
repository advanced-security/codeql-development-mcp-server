/**
 * Tests for project-local temporary directory utilities
 */

import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, rmSync, statSync } from 'fs';
import { resolve, sep } from 'path';
import {
  createProjectTempDir,
  getProjectTmpBase,
  getProjectTmpDir,
} from '../../../src/utils/temp-dir';
import { getPackageRootDir } from '../../../src/utils/package-paths';

// Expected base: <packageRoot>/.tmp (packageRoot = server/ in monorepo)
const expectedBase = resolve(getPackageRootDir(), '.tmp');

// Collect directories created during tests for cleanup
const dirsToCleanup: string[] = [];

afterAll(() => {
  for (const dir of dirsToCleanup) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('getProjectTmpBase', () => {
  it('should return a path under the repo root', () => {
    const base = getProjectTmpBase();
    expect(base).toBe(expectedBase);
  });

  it('should create the directory on disk', () => {
    const base = getProjectTmpBase();
    expect(existsSync(base)).toBe(true);
  });

  it('should never point to the OS temp directory', () => {
    const base = getProjectTmpBase();
    // On macOS the OS tmpdir is /var/folders/... or /tmp
    // On Linux it is /tmp
    expect(base).not.toMatch(/^\/tmp/);
    expect(base).not.toMatch(/\/var\/folders/);
  });
});

describe('createProjectTempDir', () => {
  it('should create a uniquely named directory', () => {
    const dir = createProjectTempDir('unit-test-');
    dirsToCleanup.push(dir);

    expect(existsSync(dir)).toBe(true);
    expect(statSync(dir).isDirectory()).toBe(true);
  });

  it('should create directories under the project .tmp base', () => {
    const dir = createProjectTempDir('unit-test-');
    dirsToCleanup.push(dir);

    expect(dir.startsWith(expectedBase + sep) || dir.startsWith(expectedBase + '/')).toBe(true);
  });

  it('should return different paths on successive calls', () => {
    const dir1 = createProjectTempDir('unit-test-');
    const dir2 = createProjectTempDir('unit-test-');
    dirsToCleanup.push(dir1, dir2);

    expect(dir1).not.toBe(dir2);
  });
});

describe('getProjectTmpDir', () => {
  it('should return a named subdirectory under .tmp', () => {
    const dir = getProjectTmpDir('test-named-dir');
    dirsToCleanup.push(dir);

    expect(dir).toBe(resolve(expectedBase, 'test-named-dir'));
    expect(existsSync(dir)).toBe(true);
  });

  it('should return the same path on repeated calls', () => {
    const dir1 = getProjectTmpDir('test-stable-dir');
    const dir2 = getProjectTmpDir('test-stable-dir');
    dirsToCleanup.push(dir1);

    expect(dir1).toBe(dir2);
  });
});
