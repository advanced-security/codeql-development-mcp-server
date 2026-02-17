import { describe, it, expect, beforeEach } from 'vitest';


import { StoragePaths } from '../../src/bridge/storage-paths';

function createMockContext() {
  return {
    globalStorageUri: { fsPath: '/mock/global-storage/advanced-security.codeql-development-mcp-server-vscode' },
    storageUri: { fsPath: '/mock/workspace-storage/advanced-security.codeql-development-mcp-server-vscode' },
  } as any;
}

describe('StoragePaths', () => {
  let paths: StoragePaths;
  let ctx: any;

  beforeEach(() => {
    ctx = createMockContext();
    paths = new StoragePaths(ctx);
  });

  it('should be instantiable', () => {
    expect(paths).toBeDefined();
  });

  it('should compute the vscode-codeql global storage path', () => {
    const result = paths.getCodeqlGlobalStoragePath();
    // Should be a sibling directory to our extension's global storage
    expect(result).toContain('GitHub.vscode-codeql');
  });

  it('should compute the database storage path', () => {
    const result = paths.getDatabaseStoragePath();
    expect(result).toContain('GitHub.vscode-codeql');
  });

  it('should compute the query results storage path', () => {
    const result = paths.getQueryStoragePath();
    expect(result).toContain('queries');
  });

  it('should compute the variant analysis storage path', () => {
    const result = paths.getVariantAnalysisStoragePath();
    expect(result).toContain('variant-analyses');
  });

  it('should be disposable', () => {
    expect(() => paths.dispose()).not.toThrow();
  });
});
