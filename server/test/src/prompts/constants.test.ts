/**
 * Tests for prompt constants module.
 *
 * Validates that:
 * 1. SUPPORTED_LANGUAGES is exported from the constants module.
 * 2. The shared constant is importable independently of workflow-prompts
 *    and prompt-completions, preventing circular dependencies.
 */

import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from '../../../src/prompts/constants';

describe('SUPPORTED_LANGUAGES (from constants module)', () => {
  it('should contain all expected languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(10);
  });

  it('should be sorted alphabetically', () => {
    const sorted = [...SUPPORTED_LANGUAGES].sort();
    expect(SUPPORTED_LANGUAGES).toEqual(sorted);
  });

  it.each(['actions', 'cpp', 'csharp', 'go', 'java', 'javascript', 'python', 'ruby', 'rust', 'swift'])(
    'should contain "%s"',
    (lang) => {
      expect(SUPPORTED_LANGUAGES).toContain(lang);
    },
  );
});
