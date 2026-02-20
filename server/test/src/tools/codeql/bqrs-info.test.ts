/**
 * Tests for codeql_bqrs_info tool definition
 *
 * Validates that the tool schema matches the actual `codeql bqrs info` CLI
 * options, including pagination support for use with codeql_bqrs_decode.
 */

import { describe, expect, it } from 'vitest';
import { codeqlBqrsInfoTool } from '../../../../src/tools/codeql/bqrs-info';

describe('codeql_bqrs_info tool definition', () => {
  it('should have correct tool name', () => {
    expect(codeqlBqrsInfoTool.name).toBe('codeql_bqrs_info');
  });

  it('should use codeql bqrs info subcommand', () => {
    expect(codeqlBqrsInfoTool.command).toBe('codeql');
    expect(codeqlBqrsInfoTool.subcommand).toBe('bqrs info');
  });

  it('should have files as required positional input', () => {
    expect(codeqlBqrsInfoTool.inputSchema).toHaveProperty('files');
  });

  it('should support format parameter (text or json)', () => {
    expect(codeqlBqrsInfoTool.inputSchema).toHaveProperty('format');
  });

  it('should support paginate-rows for computing byte offsets', () => {
    expect(codeqlBqrsInfoTool.inputSchema).toHaveProperty('paginate-rows');
  });

  it('should support paginate-result-set for targeted pagination', () => {
    expect(codeqlBqrsInfoTool.inputSchema).toHaveProperty('paginate-result-set');
  });

  it('should have examples including pagination usage', () => {
    expect(codeqlBqrsInfoTool.examples).toBeDefined();
    expect(codeqlBqrsInfoTool.examples!.length).toBeGreaterThan(0);
    // At least one example should show pagination
    const paginationExample = codeqlBqrsInfoTool.examples!.find(
      (e) => e.includes('paginate-rows'),
    );
    expect(paginationExample).toBeDefined();
  });
});
