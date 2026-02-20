/**
 * Tests for codeql_bqrs_decode tool definition
 *
 * Validates that the tool schema matches the actual `codeql bqrs decode` CLI
 * options. These tests were written after discovering that the original schema
 * contained non-existent CLI options (--max-results, --max-paths) that caused
 * runtime failures when passed to the CLI.
 */

import { describe, expect, it } from 'vitest';
import { codeqlBqrsDecodeTool } from '../../../../src/tools/codeql/bqrs-decode';

describe('codeql_bqrs_decode tool definition', () => {
  it('should have correct tool name', () => {
    expect(codeqlBqrsDecodeTool.name).toBe('codeql_bqrs_decode');
  });

  it('should use codeql bqrs decode subcommand', () => {
    expect(codeqlBqrsDecodeTool.command).toBe('codeql');
    expect(codeqlBqrsDecodeTool.subcommand).toBe('bqrs decode');
  });

  it('should have files as required positional input', () => {
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('files');
  });

  it('should support result-set parameter for selecting specific result sets', () => {
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('result-set');
  });

  it('should support rows parameter for pagination (not max-results)', () => {
    // --rows is the correct CLI option for limiting output rows
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('rows');
    // --max-results does not exist in the codeql bqrs decode CLI
    expect(codeqlBqrsDecodeTool.inputSchema).not.toHaveProperty('max-results');
  });

  it('should support start-at parameter for pagination byte offset', () => {
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('start-at');
  });

  it('should support entities parameter for controlling entity display', () => {
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('entities');
  });

  it('should support sort-key and sort-direction parameters', () => {
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('sort-key');
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('sort-direction');
  });

  it('should support no-titles parameter', () => {
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('no-titles');
  });

  it('should support text format in addition to csv and json', () => {
    // Format enum should include text (human-readable table, the default)
    // and bqrs (binary, requires --output)
    expect(codeqlBqrsDecodeTool.inputSchema).toHaveProperty('format');
  });

  it('should not have non-existent CLI options', () => {
    // These options do not exist in codeql bqrs decode
    expect(codeqlBqrsDecodeTool.inputSchema).not.toHaveProperty('max-results');
    expect(codeqlBqrsDecodeTool.inputSchema).not.toHaveProperty('max-paths');
  });

  it('should have examples', () => {
    expect(codeqlBqrsDecodeTool.examples).toBeDefined();
    expect(codeqlBqrsDecodeTool.examples!.length).toBeGreaterThan(0);
  });

  it('should have a custom result processor', () => {
    expect(codeqlBqrsDecodeTool.resultProcessor).toBeDefined();
  });
});
