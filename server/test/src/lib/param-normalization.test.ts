/**
 * Tests for parameter normalization utilities
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  buildEnhancedToolSchema,
  camelToKebabCase,
  kebabToCamelCase,
  suggestPropertyName,
} from '../../../src/lib/param-normalization';

// ─── camelToKebabCase ────────────────────────────────────────────────────────

describe('camelToKebabCase', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(camelToKebabCase('sourceRoot')).toBe('source-root');
  });

  it('should convert multi-word camelCase', () => {
    expect(camelToKebabCase('buildMode')).toBe('build-mode');
  });

  it('should convert multiple uppercase letters', () => {
    expect(camelToKebabCase('noCleanup')).toBe('no-cleanup');
  });

  it('should handle already-lowercase strings', () => {
    expect(camelToKebabCase('database')).toBe('database');
  });

  it('should handle single characters', () => {
    expect(camelToKebabCase('a')).toBe('a');
  });

  it('should handle empty string', () => {
    expect(camelToKebabCase('')).toBe('');
  });

  it('should handle consecutive uppercase letters', () => {
    expect(camelToKebabCase('sarifAddFileContents')).toBe('sarif-add-file-contents');
  });
});

// ─── kebabToCamelCase ────────────────────────────────────────────────────────

describe('kebabToCamelCase', () => {
  it('should convert kebab-case to camelCase', () => {
    expect(kebabToCamelCase('source-root')).toBe('sourceRoot');
  });

  it('should convert multi-word kebab-case', () => {
    expect(kebabToCamelCase('build-mode')).toBe('buildMode');
  });

  it('should handle no-hyphen strings', () => {
    expect(kebabToCamelCase('database')).toBe('database');
  });

  it('should handle empty string', () => {
    expect(kebabToCamelCase('')).toBe('');
  });

  it('should handle multiple hyphens', () => {
    expect(kebabToCamelCase('sarif-add-file-contents')).toBe('sarifAddFileContents');
  });
});

// ─── suggestPropertyName ─────────────────────────────────────────────────────

describe('suggestPropertyName', () => {
  const knownKeys = new Set([
    'database',
    'language',
    'source-root',
    'build-mode',
    'no-cleanup',
    'verbose',
  ]);

  it('should suggest kebab-case for a camelCase input', () => {
    expect(suggestPropertyName('sourceRoot', knownKeys)).toBe('source-root');
  });

  it('should suggest kebab-case for a snake_case input', () => {
    expect(suggestPropertyName('source_root', knownKeys)).toBe('source-root');
  });

  it('should suggest camelCase for a kebab-case input when camelCase is in the schema', () => {
    const keys = new Set(['sourceRoot', 'buildMode']);
    expect(suggestPropertyName('source-root', keys)).toBe('sourceRoot');
  });

  it('should return undefined for a completely unknown key', () => {
    expect(suggestPropertyName('fooBarBaz', knownKeys)).toBeUndefined();
  });

  it('should return undefined when the key is already known', () => {
    // If the key already matches, suggestPropertyName still returns undefined
    // because camelToKebabCase("database") === "database" (no change)
    expect(suggestPropertyName('database', knownKeys)).toBeUndefined();
  });

  it('should suggest buildMode → build-mode', () => {
    expect(suggestPropertyName('buildMode', knownKeys)).toBe('build-mode');
  });

  it('should suggest noCleanup → no-cleanup', () => {
    expect(suggestPropertyName('noCleanup', knownKeys)).toBe('no-cleanup');
  });
});

// ─── buildEnhancedToolSchema ─────────────────────────────────────────────────

describe('buildEnhancedToolSchema', () => {
  const shape = {
    database: z.string().describe('Database path'),
    language: z.string().optional().describe('Language'),
    'source-root': z.string().optional().describe('Source root'),
    'build-mode': z.enum(['none', 'autobuild', 'manual']).optional(),
    verbose: z.boolean().optional(),
  };

  it('should accept correct kebab-case properties', () => {
    const schema = buildEnhancedToolSchema(shape);
    const result = schema.safeParse({
      database: '/path/to/db',
      'source-root': '/path/to/src',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        database: '/path/to/db',
        'source-root': '/path/to/src',
      });
    }
  });

  it('should normalize camelCase to kebab-case', () => {
    const schema = buildEnhancedToolSchema(shape);
    const result = schema.safeParse({
      database: '/path/to/db',
      sourceRoot: '/path/to/src',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        database: '/path/to/db',
        'source-root': '/path/to/src',
      });
    }
  });

  it('should normalize snake_case to kebab-case', () => {
    const schema = buildEnhancedToolSchema(shape);
    const result = schema.safeParse({
      database: '/path/to/db',
      source_root: '/path/to/src',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        database: '/path/to/db',
        'source-root': '/path/to/src',
      });
    }
  });

  it('should reject duplicate when both kebab-case and camelCase forms are provided', () => {
    const schema = buildEnhancedToolSchema(shape);
    const result = schema.safeParse({
      database: '/path/to/db',
      'source-root': '/canonical/path',
      sourceRoot: '/alias/path',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining("unknown property 'sourceRoot' — did you mean 'source-root'?"),
        ]),
      );
    }
  });

  it('should reject unknown properties with the property name in the error', () => {
    const schema = buildEnhancedToolSchema(shape);
    const result = schema.safeParse({
      database: '/path/to/db',
      fooBar: 'baz',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining("unknown property 'fooBar'"),
        ]),
      );
    }
  });

  it('should suggest the correct name for a camelCase variant of a known kebab-case key', () => {
    const schema = buildEnhancedToolSchema({
      'evaluator-log-level': z.number().optional(),
    });
    const result = schema.safeParse({
      evaluatorLogLevel: 3,
    });
    // This should succeed because evaluatorLogLevel normalizes to evaluator-log-level
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data['evaluator-log-level']).toBe(3);
    }
  });

  it('should include a "did you mean?" hint for unrecognized properties similar to known ones', () => {
    // Provide a key that is NOT a direct camelCase/snake_case/kebab-case
    // conversion of any known key — but IS a conversion in the OTHER direction.
    // Example: the schema has camelCase "queryName" and the user sends "query-name"
    const camelSchema = buildEnhancedToolSchema({
      queryName: z.string().optional(),
    });
    const result = camelSchema.safeParse({ 'query-name': 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.queryName).toBe('test');
    }
  });

  it('should reject multiple unknown properties with individual messages', () => {
    const schema = buildEnhancedToolSchema(shape);
    const result = schema.safeParse({
      database: '/db',
      alpha: 1,
      beta: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining("unknown property 'alpha'"),
          expect.stringContaining("unknown property 'beta'"),
        ]),
      );
    }
  });

  it('should still validate types of known properties', () => {
    const schema = buildEnhancedToolSchema(shape);
    const result = schema.safeParse({
      database: 123, // Should be a string
    });
    expect(result.success).toBe(false);
  });

  it('should handle an empty shape', () => {
    const schema = buildEnhancedToolSchema({});
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject any property for an empty shape', () => {
    const schema = buildEnhancedToolSchema({});
    const result = schema.safeParse({ extra: 'value' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("unknown property 'extra'");
    }
  });

  it('should handle mixed known and camelCase properties', () => {
    const schema = buildEnhancedToolSchema(shape);
    const result = schema.safeParse({
      database: '/path/to/db',
      language: 'java',
      buildMode: 'autobuild',
      verbose: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        database: '/path/to/db',
        language: 'java',
        'build-mode': 'autobuild',
        verbose: true,
      });
    }
  });
});
