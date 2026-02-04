/**
 * Tests for prompt loader utilities
 */

import { describe, it, expect } from 'vitest';
import { loadPromptTemplate, processPromptTemplate } from '../../../src/prompts/prompt-loader';

describe('Prompt Loader', () => {
  describe('loadPromptTemplate', () => {
    it('should load an existing prompt template', () => {
      // The ql-tdd-basic.prompt.md should exist
      const result = loadPromptTemplate('ql-tdd-basic.prompt.md');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should not be the error fallback message
      expect(result).not.toContain('not available');
    });

    it('should return fallback message for non-existent template', () => {
      const result = loadPromptTemplate('non-existent-template.prompt.md');

      expect(result).toContain('not available');
      expect(result).toContain('non-existent-template.prompt.md');
    });

    it('should handle empty filename', () => {
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
