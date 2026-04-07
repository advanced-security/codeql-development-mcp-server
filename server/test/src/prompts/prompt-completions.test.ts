/**
 * Tests for prompt argument completion providers.
 *
 * Validates that:
 * 1. Language completions filter SUPPORTED_LANGUAGES correctly.
 * 2. File path completions discover .ql, .sarif, and database files.
 * 3. Pack root completions find directories with codeql-pack.yml.
 * 4. addCompletions() attaches completable metadata to the right fields.
 * 5. addCompletions() does not mutate the original schema objects.
 * 6. Fields without registered completers are passed through unchanged.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { isCompletable, getCompleter } from '@modelcontextprotocol/sdk/server/completable.js';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createTestTempDir, cleanupTestTempDir } from '../../utils/temp-dir';
import {
  addCompletions,
  completeLanguage,
  completeDatabasePath,
  completePackRoot,
  completeQueryPath,
  completeSarifPath,
} from '../../../src/prompts/prompt-completions';

// ─────────────────────────────────────────────────────────────────────────────
// completeLanguage
// ─────────────────────────────────────────────────────────────────────────────

describe('completeLanguage', () => {
  it('should return all languages for empty input', () => {
    const result = completeLanguage('');
    expect(result).toHaveLength(10);
    expect(result).toContain('javascript');
    expect(result).toContain('python');
  });

  it('should filter by prefix (case-insensitive)', () => {
    const result = completeLanguage('j');
    expect(result).toEqual(['java', 'javascript']);
  });

  it('should filter by prefix "py"', () => {
    const result = completeLanguage('py');
    expect(result).toEqual(['python']);
  });

  it('should return empty array for non-matching prefix', () => {
    const result = completeLanguage('zzz');
    expect(result).toEqual([]);
  });

  it('should handle uppercase input', () => {
    const result = completeLanguage('GO');
    expect(result).toEqual(['go']);
  });

  it('should handle null-ish input', () => {
    // completable() may pass empty string
    const result = completeLanguage('');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// completeQueryPath
// ─────────────────────────────────────────────────────────────────────────────

describe('completeQueryPath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestTempDir('complete-query');
    vi.stubEnv('CODEQL_MCP_WORKSPACE', tmpDir);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTestTempDir(tmpDir);
  });

  it('should find .ql files in workspace', async () => {
    writeFileSync(join(tmpDir, 'MyQuery.ql'), '');
    writeFileSync(join(tmpDir, 'AnotherQuery.ql'), '');
    writeFileSync(join(tmpDir, 'notaquery.txt'), '');

    const result = await completeQueryPath('');
    expect(result).toContain('AnotherQuery.ql');
    expect(result).toContain('MyQuery.ql');
    expect(result).not.toContain('notaquery.txt');
  });

  it('should find .qlref files in workspace', async () => {
    writeFileSync(join(tmpDir, 'test.qlref'), '');

    const result = await completeQueryPath('');
    expect(result).toContain('test.qlref');
  });

  it('should find .ql files in subdirectories', async () => {
    const subDir = join(tmpDir, 'src', 'queries');
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, 'deep.ql'), '');

    const result = await completeQueryPath('');
    expect(result).toContain(join('src', 'queries', 'deep.ql'));
  });

  it('should filter results by user input', async () => {
    writeFileSync(join(tmpDir, 'SqlInjection.ql'), '');
    writeFileSync(join(tmpDir, 'XssQuery.ql'), '');

    const result = await completeQueryPath('sql');
    expect(result).toContain('SqlInjection.ql');
    expect(result).not.toContain('XssQuery.ql');
  });

  it('should skip node_modules and .git directories', async () => {
    const nmDir = join(tmpDir, 'node_modules', 'pkg');
    mkdirSync(nmDir, { recursive: true });
    writeFileSync(join(nmDir, 'hidden.ql'), '');

    const gitDir = join(tmpDir, '.git', 'refs');
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(gitDir, 'secret.ql'), '');

    const result = await completeQueryPath('');
    expect(result).toEqual([]);
  });

  it('should return empty array when workspace has no .ql files', async () => {
    writeFileSync(join(tmpDir, 'readme.md'), '');

    const result = await completeQueryPath('');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// completeSarifPath
// ─────────────────────────────────────────────────────────────────────────────

describe('completeSarifPath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestTempDir('complete-sarif');
    vi.stubEnv('CODEQL_MCP_WORKSPACE', tmpDir);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTestTempDir(tmpDir);
  });

  it('should find .sarif files', async () => {
    writeFileSync(join(tmpDir, 'results.sarif'), '');

    const result = await completeSarifPath('');
    expect(result).toContain('results.sarif');
  });

  it('should find .sarif.json files', async () => {
    const subDir = join(tmpDir, 'output');
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, 'scan.sarif.json'), '');

    const result = await completeSarifPath('');
    expect(result).toContain(join('output', 'scan.sarif.json'));
  });

  it('should filter by user input', async () => {
    writeFileSync(join(tmpDir, 'sql.sarif'), '');
    writeFileSync(join(tmpDir, 'xss.sarif'), '');

    const result = await completeSarifPath('sql');
    expect(result).toContain('sql.sarif');
    expect(result).not.toContain('xss.sarif');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// completeDatabasePath
// ─────────────────────────────────────────────────────────────────────────────

describe('completeDatabasePath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestTempDir('complete-db');
    vi.stubEnv('CODEQL_MCP_WORKSPACE', tmpDir);
    vi.stubEnv('CODEQL_DATABASES_BASE_DIRS', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTestTempDir(tmpDir);
  });

  it('should find database directories from base dirs', async () => {
    const baseDir = join(tmpDir, 'databases');
    mkdirSync(join(baseDir, 'my-js-db'), { recursive: true });
    mkdirSync(join(baseDir, 'my-py-db'), { recursive: true });
    vi.stubEnv('CODEQL_DATABASES_BASE_DIRS', baseDir);

    const result = await completeDatabasePath('');
    expect(result).toContain(join(baseDir, 'my-js-db'));
    expect(result).toContain(join(baseDir, 'my-py-db'));
  });

  it('should filter database paths by input', async () => {
    const baseDir = join(tmpDir, 'databases');
    mkdirSync(join(baseDir, 'javascript-db'), { recursive: true });
    mkdirSync(join(baseDir, 'python-db'), { recursive: true });
    vi.stubEnv('CODEQL_DATABASES_BASE_DIRS', baseDir);

    const result = await completeDatabasePath('java');
    expect(result).toContain(join(baseDir, 'javascript-db'));
    expect(result).not.toContain(join(baseDir, 'python-db'));
  });

  it('should find -db suffixed directories in workspace', async () => {
    mkdirSync(join(tmpDir, 'project-db'));

    const result = await completeDatabasePath('');
    expect(result).toContain(join(tmpDir, 'project-db'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// completePackRoot
// ─────────────────────────────────────────────────────────────────────────────

describe('completePackRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestTempDir('complete-pack');
    vi.stubEnv('CODEQL_MCP_WORKSPACE', tmpDir);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTestTempDir(tmpDir);
  });

  it('should find directories containing codeql-pack.yml', async () => {
    const packDir = join(tmpDir, 'my-pack');
    mkdirSync(packDir, { recursive: true });
    writeFileSync(join(packDir, 'codeql-pack.yml'), 'name: test/pack');

    const result = await completePackRoot('');
    expect(result).toContain('my-pack');
  });

  it('should find nested pack directories', async () => {
    const nestedPack = join(tmpDir, 'src', 'queries', 'pack');
    mkdirSync(nestedPack, { recursive: true });
    writeFileSync(join(nestedPack, 'codeql-pack.yml'), 'name: nested/pack');

    const result = await completePackRoot('');
    expect(result).toContain(join('src', 'queries', 'pack'));
  });

  it('should filter by user input', async () => {
    const pack1 = join(tmpDir, 'js-pack');
    const pack2 = join(tmpDir, 'py-pack');
    mkdirSync(pack1, { recursive: true });
    mkdirSync(pack2, { recursive: true });
    writeFileSync(join(pack1, 'codeql-pack.yml'), '');
    writeFileSync(join(pack2, 'codeql-pack.yml'), '');

    const result = await completePackRoot('js');
    expect(result).toContain('js-pack');
    expect(result).not.toContain('py-pack');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addCompletions
// ─────────────────────────────────────────────────────────────────────────────

describe('addCompletions', () => {
  it('should attach completable metadata to language fields', () => {
    const shape = {
      language: z.string().describe('Programming language'),
    };

    const enhanced = addCompletions(shape);

    expect(isCompletable(enhanced.language)).toBe(true);
    expect(getCompleter(enhanced.language)).toBeDefined();
    expect(typeof getCompleter(enhanced.language)).toBe('function');
  });

  it('should attach completable metadata to queryPath fields', () => {
    const shape = {
      queryPath: z.string().describe('Path to the query'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.queryPath)).toBe(true);
  });

  it('should attach completable metadata to database fields', () => {
    const shape = {
      database: z.string().describe('Path to DB'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.database)).toBe(true);
  });

  it('should attach completable metadata to databasePath fields', () => {
    const shape = {
      databasePath: z.string().optional().describe('Path to DB'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.databasePath)).toBe(true);
  });

  it('should attach completable metadata to sarifPath fields', () => {
    const shape = {
      sarifPath: z.string().describe('Path to SARIF'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.sarifPath)).toBe(true);
  });

  it('should attach completable metadata to sarifPathA and sarifPathB', () => {
    const shape = {
      sarifPathA: z.string().describe('First SARIF'),
      sarifPathB: z.string().optional().describe('Second SARIF'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.sarifPathA)).toBe(true);
    expect(isCompletable(enhanced.sarifPathB)).toBe(true);
  });

  it('should attach completable metadata to workspaceUri fields', () => {
    const shape = {
      workspaceUri: z.string().optional().describe('Workspace URI'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.workspaceUri)).toBe(true);
  });

  it('should attach completable metadata to packRoot fields', () => {
    const shape = {
      packRoot: z.string().optional().describe('Pack root'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.packRoot)).toBe(true);
  });

  it('should pass through fields without registered completers', () => {
    const original = z.string().describe('Some other field');
    const shape = {
      queryName: original,
    };

    const enhanced = addCompletions(shape);
    // queryName has no completer, so it should be the same reference
    expect(enhanced.queryName).toBe(original);
    expect(isCompletable(enhanced.queryName)).toBe(false);
  });

  it('should not mutate the original schema objects', () => {
    const originalLanguage = z.string().describe('Language');
    const originalQueryName = z.string().describe('Name');
    const shape = {
      language: originalLanguage,
      queryName: originalQueryName,
    };

    addCompletions(shape);

    // The original objects must NOT have completable metadata
    expect(isCompletable(originalLanguage)).toBe(false);
    expect(isCompletable(originalQueryName)).toBe(false);
  });

  it('should preserve the description on completable fields', () => {
    const shape = {
      language: z.string().describe('Programming language for the query'),
      queryPath: z.string().describe('Path to the CodeQL query file'),
    };

    const enhanced = addCompletions(shape);
    expect(enhanced.language.description).toBe('Programming language for the query');
    expect(enhanced.queryPath.description).toBe('Path to the CodeQL query file');
  });

  it('should preserve optional status on completable fields', () => {
    const shape = {
      databasePath: z.string().optional().describe('Optional DB path'),
    };

    const enhanced = addCompletions(shape);
    // The cloned field should still be optional
    expect(enhanced.databasePath instanceof z.ZodOptional).toBe(true);
  });

  it('should handle a typical multi-field prompt shape', () => {
    const shape = {
      database: z.string().describe('Path to the CodeQL database'),
      language: z.string().describe('Programming language'),
      sourceFiles: z.string().optional().describe('Comma-separated source files'),
      sourceFunction: z.string().optional().describe('Function name'),
    };

    const enhanced = addCompletions(shape);

    expect(isCompletable(enhanced.database)).toBe(true);
    expect(isCompletable(enhanced.language)).toBe(true);
    expect(isCompletable(enhanced.sourceFiles)).toBe(false);
    expect(isCompletable(enhanced.sourceFunction)).toBe(false);
  });

  it('should return language completions via the attached completer', async () => {
    const shape = {
      language: z.string().describe('Language'),
    };

    const enhanced = addCompletions(shape);
    const completer = getCompleter(enhanced.language)!;

    const results = await completer('ja');
    expect(results).toEqual(['java', 'javascript']);
  });

  it('should handle ZodEnum language fields (raw schema without toPermissiveShape)', () => {
    // find_overlapping_queries and check_for_duplicated_code pass raw
    // schema.shape (with ZodEnum) rather than toPermissiveShape() output.
    const shape = {
      language: z.enum(['go', 'java', 'python']).describe('Language'),
      queryPath: z.string().describe('Path'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.language)).toBe(true);
    expect(isCompletable(enhanced.queryPath)).toBe(true);
    // Enum should be widened to string for the completable wrapper
    expect(enhanced.language instanceof z.ZodString).toBe(true);
  });

  it('should handle optional ZodEnum fields', () => {
    const shape = {
      language: z.enum(['go', 'java']).optional().describe('Optional lang'),
    };

    const enhanced = addCompletions(shape);
    expect(isCompletable(enhanced.language)).toBe(true);
    expect(enhanced.language instanceof z.ZodOptional).toBe(true);
  });
});
