/**
 * Tests for the shared scan-exclude module.
 *
 * Validates that:
 * 1. DEFAULT_SCAN_EXCLUDE_DIRS contains a comprehensive, consistent set.
 * 2. getScanExcludeDirs() returns defaults when no env var is set.
 * 3. getScanExcludeDirs() merges user-provided dirs from env var.
 * 4. getScanExcludeDirs() supports negation (removing defaults via `!`).
 * 5. isScanExcluded() checks membership correctly.
 * 6. The default set is a superset of the dirs previously in search-ql-code.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SCAN_EXCLUDE_DIRS,
  getScanExcludeDirs,
  isScanExcluded,
} from '../../../src/lib/scan-exclude';

describe('DEFAULT_SCAN_EXCLUDE_DIRS', () => {
  it('should contain .git', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('.git');
  });

  it('should contain .github', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('.github');
  });

  it('should contain .codeql', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('.codeql');
  });

  it('should contain node_modules', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('node_modules');
  });

  it('should contain build output directories', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('build');
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('dist');
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('out');
  });

  it('should contain coverage directory', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('coverage');
  });

  it('should contain common cache directories', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('.cache');
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('__pycache__');
  });

  it('should contain common vendor/dependency directories', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('vendor');
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('.yarn');
  });

  it('should contain language-specific build output directories', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('target');
  });

  it('should contain temporary file directories', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('.tmp');
  });

  it('should contain IDE config directories', () => {
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('.vscode');
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain('.idea');
  });

  it('should be a superset of the old search-ql-code SKIP_DIRS', () => {
    // search-ql-code.ts previously had: ['.codeql', 'node_modules', '.git']
    const oldSearchQlCodeDirs = ['.codeql', 'node_modules', '.git'];
    for (const dir of oldSearchQlCodeDirs) {
      expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain(dir);
    }
  });

  it('should be a superset of the old prompt-completions SKIP_DIRS', () => {
    // prompt-completions.ts previously had:
    // ['.git', '.github', '.tmp', 'build', 'coverage', 'dist', 'node_modules']
    const oldPromptCompletionsDirs = [
      '.git', '.github', '.tmp', 'build', 'coverage', 'dist', 'node_modules',
    ];
    for (const dir of oldPromptCompletionsDirs) {
      expect(DEFAULT_SCAN_EXCLUDE_DIRS).toContain(dir);
    }
  });

  it('should be sorted alphabetically', () => {
    const sorted = [...DEFAULT_SCAN_EXCLUDE_DIRS].sort();
    expect(DEFAULT_SCAN_EXCLUDE_DIRS).toEqual(sorted);
  });
});

describe('getScanExcludeDirs', () => {
  beforeEach(() => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return defaults when env var is not set', () => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', '');
    const result = getScanExcludeDirs();
    expect(result).toBeInstanceOf(Set);
    for (const dir of DEFAULT_SCAN_EXCLUDE_DIRS) {
      expect(result.has(dir)).toBe(true);
    }
  });

  it('should merge additional dirs from env var', () => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', 'custom-build,my-output');
    const result = getScanExcludeDirs();
    expect(result.has('custom-build')).toBe(true);
    expect(result.has('my-output')).toBe(true);
    // Defaults should still be present
    expect(result.has('.git')).toBe(true);
    expect(result.has('node_modules')).toBe(true);
  });

  it('should support negation to remove a default', () => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', '!build,!dist');
    const result = getScanExcludeDirs();
    expect(result.has('build')).toBe(false);
    expect(result.has('dist')).toBe(false);
    // Other defaults should still be present
    expect(result.has('.git')).toBe(true);
    expect(result.has('node_modules')).toBe(true);
  });

  it('should support both additions and negations', () => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', 'custom-dir,!coverage');
    const result = getScanExcludeDirs();
    expect(result.has('custom-dir')).toBe(true);
    expect(result.has('coverage')).toBe(false);
    expect(result.has('.git')).toBe(true);
  });

  it('should trim whitespace from entries', () => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', ' custom-dir , ! coverage ');
    const result = getScanExcludeDirs();
    expect(result.has('custom-dir')).toBe(true);
    expect(result.has('coverage')).toBe(false);
  });

  it('should ignore empty entries', () => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', 'custom,,another,');
    const result = getScanExcludeDirs();
    expect(result.has('custom')).toBe(true);
    expect(result.has('another')).toBe(true);
    expect(result.has('')).toBe(false);
  });
});

describe('isScanExcluded', () => {
  beforeEach(() => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return true for default excluded directories', () => {
    expect(isScanExcluded('node_modules')).toBe(true);
    expect(isScanExcluded('.git')).toBe(true);
    expect(isScanExcluded('dist')).toBe(true);
  });

  it('should return false for non-excluded directories', () => {
    expect(isScanExcluded('src')).toBe(false);
    expect(isScanExcluded('lib')).toBe(false);
    expect(isScanExcluded('queries')).toBe(false);
  });

  it('should respect env var additions', () => {
    vi.stubEnv('CODEQL_MCP_SCAN_EXCLUDE_DIRS', 'my-custom-dir');
    expect(isScanExcluded('my-custom-dir')).toBe(true);
  });

  it('should accept an explicit exclude set', () => {
    const customSet = new Set(['only-this']);
    expect(isScanExcluded('only-this', customSet)).toBe(true);
    expect(isScanExcluded('node_modules', customSet)).toBe(false);
  });
});
