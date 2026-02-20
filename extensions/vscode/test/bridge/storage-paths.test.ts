import { describe, it, expect, beforeEach } from 'vitest';


import { StoragePaths } from '../../src/bridge/storage-paths';

function createMockContext() {
  return {
    globalStorageUri: { fsPath: '/mock/global-storage/advanced-security.vscode-codeql-development-mcp-server' },
    storageUri: { fsPath: '/mock/workspace-storage/advanced-security.vscode-codeql-development-mcp-server' },
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

  it('should compute the workspace database storage path', () => {
    const result = paths.getWorkspaceDatabaseStoragePath();
    expect(result).toBeDefined();
    expect(result).toContain('workspace-storage');
    expect(result).toContain('GitHub.vscode-codeql');
  });

  it('should return undefined workspace database path when no workspace is open', () => {
    const noWorkspaceCtx = { globalStorageUri: ctx.globalStorageUri } as any;
    const noWorkspacePaths = new StoragePaths(noWorkspaceCtx);
    expect(noWorkspacePaths.getWorkspaceDatabaseStoragePath()).toBeUndefined();
  });

  it('should return all database storage paths including workspace', () => {
    const all = paths.getAllDatabaseStoragePaths();
    expect(all).toHaveLength(2);
    expect(all[0]).toContain('global-storage');
    expect(all[1]).toContain('workspace-storage');
  });

  it('should return only global path in getAllDatabaseStoragePaths when no workspace', () => {
    const noWorkspaceCtx = { globalStorageUri: ctx.globalStorageUri } as any;
    const noWorkspacePaths = new StoragePaths(noWorkspaceCtx);
    const all = noWorkspacePaths.getAllDatabaseStoragePaths();
    expect(all).toHaveLength(1);
    expect(all[0]).toContain('global-storage');
  });

  it('should be disposable', () => {
    expect(() => paths.dispose()).not.toThrow();
  });
});
