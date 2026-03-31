/**
 * Tests for codeql_bqrs_interpret tool definition
 *
 * Validates the tool schema, including the database parameter for
 * source archive context and source-location-prefix auto-resolution.
 */

import { describe, expect, it } from 'vitest';
import { codeqlBqrsInterpretTool } from '../../../../src/tools/codeql/bqrs-interpret';

describe('codeql_bqrs_interpret tool definition', () => {
  it('should have correct tool name', () => {
    expect(codeqlBqrsInterpretTool.name).toBe('codeql_bqrs_interpret');
  });

  it('should use codeql bqrs interpret subcommand', () => {
    expect(codeqlBqrsInterpretTool.command).toBe('codeql');
    expect(codeqlBqrsInterpretTool.subcommand).toBe('bqrs interpret');
  });

  it('should have file as required positional input (string, not array)', () => {
    expect(codeqlBqrsInterpretTool.inputSchema).toHaveProperty('file');
    // Verify it's a string schema, not an array schema
    const fileSchema = codeqlBqrsInterpretTool.inputSchema.file;
    // Parse should accept a string
    expect(fileSchema.parse('/path/to/results.bqrs')).toBe('/path/to/results.bqrs');
    // Parse should reject an array
    expect(() => fileSchema.parse(['/path/to/results.bqrs'])).toThrow();
  });

  it('should support format parameter', () => {
    expect(codeqlBqrsInterpretTool.inputSchema).toHaveProperty('format');
  });

  it('should support database parameter (optional, for source archive context)', () => {
    expect(codeqlBqrsInterpretTool.inputSchema).toHaveProperty('database');
  });

  it('should support t parameter (query metadata key=value pairs)', () => {
    expect(codeqlBqrsInterpretTool.inputSchema).toHaveProperty('t');
  });

  it('should support output parameter', () => {
    expect(codeqlBqrsInterpretTool.inputSchema).toHaveProperty('output');
  });

  it('should have examples', () => {
    expect(codeqlBqrsInterpretTool.examples).toBeDefined();
    expect(codeqlBqrsInterpretTool.examples!.length).toBeGreaterThan(0);
  });

  it('should have a custom result processor', () => {
    expect(codeqlBqrsInterpretTool.resultProcessor).toBeDefined();
  });
});
