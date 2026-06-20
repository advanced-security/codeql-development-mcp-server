/**
 * Tests for test-run tool, including diff-informed validation support.
 */

import { describe, it, expect } from 'vitest';
import { codeqlTestRunTool } from '../../../../src/tools/codeql/test-run';

describe('Test Run Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(codeqlTestRunTool.name).toBe('codeql_test_run');
    });

    it('should have correct command and subcommand', () => {
      expect(codeqlTestRunTool.command).toBe('codeql');
      expect(codeqlTestRunTool.subcommand).toBe('test run');
    });

    it('should have examples', () => {
      expect(codeqlTestRunTool.examples).toBeDefined();
      expect(codeqlTestRunTool.examples!.length).toBeGreaterThan(0);
    });
  });

  describe('Diff-informed and overlay schema', () => {
    it('should expose an optional boolean "check-diff-informed" parameter', () => {
      const checkDiffInformed = codeqlTestRunTool.inputSchema['check-diff-informed'];
      expect(checkDiffInformed).toBeDefined();
      expect(checkDiffInformed.isOptional()).toBe(true);
      expect(checkDiffInformed.safeParse(true).success).toBe(true);
      expect(checkDiffInformed.safeParse('not-a-boolean').success).toBe(false);
    });

    it('should expose an optional boolean "evaluate-as-overlay" parameter', () => {
      const evaluateAsOverlay = codeqlTestRunTool.inputSchema['evaluate-as-overlay'];
      expect(evaluateAsOverlay).toBeDefined();
      expect(evaluateAsOverlay.isOptional()).toBe(true);
      expect(evaluateAsOverlay.safeParse(true).success).toBe(true);
      expect(evaluateAsOverlay.safeParse('not-a-boolean').success).toBe(false);
    });

    it('should describe check-diff-informed in terms of diff-informed queries', () => {
      const description = codeqlTestRunTool.inputSchema['check-diff-informed'].description ?? '';
      expect(description.toLowerCase()).toContain('diff-informed');
    });
  });
});
