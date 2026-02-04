import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { validateCodeQLSyntax, validateFilePath } from '../../../src/lib/validation.js';
import { tmpdir } from 'os';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('CodeQL Validation', () => {
  test('should validate empty query as invalid', () => {
    const result = validateCodeQLSyntax('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Query cannot be empty');
  });

  test('should validate basic query structure', () => {
    const query = `
      from Method m
      where m.getName() = "test"
      select m
    `;
    const result = validateCodeQLSyntax(query);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should warn about missing from/select clauses', () => {
    const query = 'import java';
    const result = validateCodeQLSyntax(query);
    expect(result.warnings).toContain('Query should typically include "from" and "select" clauses');
  });

  test('should suggest adding metadata', () => {
    const query = `
      from Method m
      where m.getName() = "test"
      select m
    `;
    const result = validateCodeQLSyntax(query);
    expect(result.suggestions).toContain('Consider adding @name and @description metadata');
  });

  test('should not suggest metadata if already present', () => {
    const query = `
      /**
       * @name Test Query
       * @description Test description
       */
      from Method m
      where m.getName() = "test"
      select m
    `;
    const result = validateCodeQLSyntax(query);
    expect(result.suggestions).not.toContain('Consider adding @name and @description metadata');
  });
});

describe('File Path Validation', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `path-validation-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should accept valid relative path', () => {
    const testFile = 'test.sarif';
    writeFileSync(join(testDir, testFile), '{}');
    
    const validatedPath = validateFilePath(testFile, testDir);
    expect(validatedPath).toBe(join(testDir, testFile));
  });

  test('should accept valid absolute path within workspace', () => {
    const testFile = join(testDir, 'test.sarif');
    writeFileSync(testFile, '{}');
    
    const validatedPath = validateFilePath(testFile, testDir);
    expect(validatedPath).toBe(testFile);
  });

  test('should reject path traversal with ..', () => {
    expect(() => {
      validateFilePath('../../../etc/passwd', testDir);
    }).toThrow('path traversal detected');
  });

  test('should reject path outside workspace root', () => {
    const outsidePath = join(tmpdir(), 'outside.txt');
    
    expect(() => {
      validateFilePath(outsidePath, testDir);
    }).toThrow('outside the workspace root');
  });

  test('should reject path with .. in normalized path', () => {
    expect(() => {
      validateFilePath('subdir/../../etc/passwd', testDir);
    }).toThrow('path traversal detected');
  });

  test('should accept nested paths within workspace', () => {
    const nestedDir = join(testDir, 'nested', 'deep');
    mkdirSync(nestedDir, { recursive: true });
    const testFile = join(nestedDir, 'test.sarif');
    writeFileSync(testFile, '{}');
    
    const validatedPath = validateFilePath('nested/deep/test.sarif', testDir);
    expect(validatedPath).toBe(testFile);
  });
});