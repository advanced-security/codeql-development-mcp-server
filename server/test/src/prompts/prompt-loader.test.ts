/**
 * Tests for prompt loader utilities
 */

import { describe, it, expect } from 'vitest';
import { loadPromptTemplate, processPromptTemplate } from '../../../src/prompts/prompt-loader';

/** All prompt template filenames that must be embedded in the bundle. */
const EXPECTED_PROMPT_FILES = [
  'document-codeql-query.prompt.md',
  'explain-codeql-query.prompt.md',
  'ql-lsp-iterative-development.prompt.md',
  'ql-tdd-advanced.prompt.md',
  'ql-tdd-basic.prompt.md',
  'sarif-rank-false-positives.prompt.md',
  'sarif-rank-true-positives.prompt.md',
  'tools-query-workflow.prompt.md',
  'workshop-creation-workflow.prompt.md',
];

describe('Prompt Loader', () => {
  describe('loadPromptTemplate', () => {
    it.each(EXPECTED_PROMPT_FILES)(
      'should load embedded prompt template: %s',
      (filename) => {
        const result = loadPromptTemplate(filename);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        // Should not be the fallback message
        expect(result).not.toContain('not available');
        expect(result).not.toContain('not found in embedded');
      },
    );

    it('should return fallback message for non-existent template', () => {
      const result = loadPromptTemplate('non-existent-template.prompt.md');

      expect(result).toContain('not available');
      expect(result).toContain('non-existent-template.prompt.md');
    });

    it('should return fallback message for empty filename', () => {
      const result = loadPromptTemplate('');

      expect(result).toContain('not available');
    });
  });

  describe('processPromptTemplate', () => {
    it('should replace double-brace variables', () => {
      const template = 'Hello, {{name}}! Welcome to {{place}}.';
      const result = processPromptTemplate(template, {
        name: 'Alice',
        place: 'Wonderland'
      });

      expect(result).toBe('Hello, Alice! Welcome to Wonderland.');
    });

    it('should replace single-brace variables', () => {
      const template = 'Hello, {name}! Welcome to {place}.';
      const result = processPromptTemplate(template, {
        name: 'Bob',
        place: 'Earth'
      });

      expect(result).toBe('Hello, Bob! Welcome to Earth.');
    });

    it('should handle mixed brace styles', () => {
      const template = '{{greeting}}, {name}!';
      const result = processPromptTemplate(template, {
        greeting: 'Hi',
        name: 'Charlie'
      });

      expect(result).toBe('Hi, Charlie!');
    });

    it('should replace multiple occurrences of same variable', () => {
      const template = '{name} likes {name} because {name} is awesome.';
      const result = processPromptTemplate(template, {
        name: 'Dave'
      });

      expect(result).toBe('Dave likes Dave because Dave is awesome.');
    });

    it('should leave unknown variables unchanged', () => {
      const template = 'Hello, {name}! Your score is {score}.';
      const result = processPromptTemplate(template, {
        name: 'Eve'
      });

      expect(result).toBe('Hello, Eve! Your score is {score}.');
    });

    it('should handle empty variables object', () => {
      const template = 'Hello, {name}!';
      const result = processPromptTemplate(template, {});

      expect(result).toBe('Hello, {name}!');
    });

    it('should handle empty template', () => {
      const result = processPromptTemplate('', { name: 'Test' });

      expect(result).toBe('');
    });

    it('should handle special characters in values', () => {
      const template = 'Path: {path}';
      const result = processPromptTemplate(template, {
        path: '/some/path/with-special_chars.123'
      });

      expect(result).toBe('Path: /some/path/with-special_chars.123');
    });
  });
});
