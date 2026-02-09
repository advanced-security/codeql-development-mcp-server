/**
 * Tests for LSP tool handlers.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the server manager before importing handlers
const mockGetCompletions = vi.fn().mockResolvedValue([]);
const mockGetDefinition = vi.fn().mockResolvedValue([]);
const mockGetReferences = vi.fn().mockResolvedValue([]);
const mockOpenDocument = vi.fn();
const mockCloseDocument = vi.fn();
const mockInitialize = vi.fn().mockResolvedValue(undefined);

const mockLanguageServer = {
  closeDocument: mockCloseDocument,
  getCompletions: mockGetCompletions,
  getDefinition: mockGetDefinition,
  getReferences: mockGetReferences,
  initialize: mockInitialize,
  openDocument: mockOpenDocument,
};

vi.mock('../../../../src/lib/server-manager', () => ({
  getServerManager: vi.fn(() => ({
    getLanguageServer: vi.fn().mockResolvedValue(mockLanguageServer),
  })),
}));

vi.mock('../../../../src/utils/package-paths', () => ({
  getPackageRootDir: vi.fn(() => '/mock/pkg'),
  packageRootDir: '/mock/pkg',
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    readFileSync: vi.fn(() => 'import ql\nselect 1'),
  };
});

import {
  lspCompletion,
  lspDefinition,
  lspReferences,
} from '../../../../src/tools/lsp/lsp-handlers';

describe('lsp-handlers', () => {
  const baseParams = {
    character: 5,
    filePath: '/test/query.ql',
    line: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('lspCompletion', () => {
    it('should return completion items', async () => {
      mockGetCompletions.mockResolvedValueOnce([
        { label: 'exists', kind: 1 },
        { label: 'forall', kind: 1 },
      ]);

      const result = await lspCompletion(baseParams);

      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('exists');
      expect(mockOpenDocument).toHaveBeenCalled();
      expect(mockCloseDocument).toHaveBeenCalled();
    });

    it('should return empty array when no completions', async () => {
      mockGetCompletions.mockResolvedValueOnce([]);

      const result = await lspCompletion(baseParams);
      expect(result).toEqual([]);
    });

    it('should close document even if getCompletions throws', async () => {
      mockGetCompletions.mockRejectedValueOnce(new Error('completion error'));

      await expect(lspCompletion(baseParams)).rejects.toThrow('completion error');
      expect(mockCloseDocument).toHaveBeenCalled();
    });

    it('should pass workspace_uri through to initialize', async () => {
      mockGetCompletions.mockResolvedValueOnce([]);

      await lspCompletion({
        ...baseParams,
        workspaceUri: 'file:///custom/workspace',
      });

      expect(mockInitialize).toHaveBeenCalledWith('file:///custom/workspace');
    });

    it('should pass search_path through to server config', async () => {
      mockGetCompletions.mockResolvedValueOnce([]);

      await lspCompletion({
        ...baseParams,
        searchPath: '/custom/ql/path',
      });

      // Verify that the handler reached getCompletions
      expect(mockGetCompletions).toHaveBeenCalled();
    });
  });

  describe('lspDefinition', () => {
    it('should return definition locations', async () => {
      const mockLocation = {
        range: { end: { character: 10, line: 5 }, start: { character: 0, line: 5 } },
        uri: 'file:///test/def.ql',
      };
      mockGetDefinition.mockResolvedValueOnce([mockLocation]);

      const result = await lspDefinition(baseParams);

      expect(result).toHaveLength(1);
      expect(result[0].uri).toBe('file:///test/def.ql');
    });

    it('should return empty array when no definitions found', async () => {
      mockGetDefinition.mockResolvedValueOnce([]);

      const result = await lspDefinition(baseParams);
      expect(result).toEqual([]);
    });

    it('should return multiple definitions when available', async () => {
      const mockLocations = [
        { range: { end: { character: 10, line: 5 }, start: { character: 0, line: 5 } }, uri: 'file:///def1.ql' },
        { range: { end: { character: 8, line: 12 }, start: { character: 0, line: 12 } }, uri: 'file:///def2.qll' },
      ];
      mockGetDefinition.mockResolvedValueOnce(mockLocations);

      const result = await lspDefinition(baseParams);
      expect(result).toHaveLength(2);
      expect(result[0].uri).toBe('file:///def1.ql');
      expect(result[1].uri).toBe('file:///def2.qll');
    });

    it('should close document even if getDefinition throws', async () => {
      mockGetDefinition.mockRejectedValueOnce(new Error('definition error'));

      await expect(lspDefinition(baseParams)).rejects.toThrow('definition error');
      expect(mockCloseDocument).toHaveBeenCalled();
    });
  });

  describe('lspReferences', () => {
    it('should return reference locations', async () => {
      const mockLocations = [
        { range: { end: { character: 5, line: 1 }, start: { character: 0, line: 1 } }, uri: 'file:///a.ql' },
        { range: { end: { character: 5, line: 3 }, start: { character: 0, line: 3 } }, uri: 'file:///b.ql' },
      ];
      mockGetReferences.mockResolvedValueOnce(mockLocations);

      const result = await lspReferences(baseParams);

      expect(result).toHaveLength(2);
      expect(mockGetReferences).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { includeDeclaration: true },
        }),
      );
    });

    it('should return empty array when no references found', async () => {
      mockGetReferences.mockResolvedValueOnce([]);

      const result = await lspReferences(baseParams);
      expect(result).toEqual([]);
    });

    it('should always include declaration in references', async () => {
      mockGetReferences.mockResolvedValueOnce([]);

      await lspReferences(baseParams);

      expect(mockGetReferences).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { includeDeclaration: true },
        }),
      );
    });

    it('should close document even if getReferences throws', async () => {
      mockGetReferences.mockRejectedValueOnce(new Error('references error'));

      await expect(lspReferences(baseParams)).rejects.toThrow('references error');
      expect(mockCloseDocument).toHaveBeenCalled();
    });
  });

  describe('file content', () => {
    it('should use provided fileContent instead of reading from disk', async () => {
      mockGetCompletions.mockResolvedValueOnce([]);

      await lspCompletion({
        ...baseParams,
        fileContent: 'select 42',
      });

      expect(mockOpenDocument).toHaveBeenCalledWith(
        expect.any(String),
        'select 42',
      );
    });

    it('should read from disk when fileContent not provided', async () => {
      mockGetCompletions.mockResolvedValueOnce([]);

      await lspCompletion(baseParams);

      // readFileSync is mocked to return 'import ql\nselect 1'
      expect(mockOpenDocument).toHaveBeenCalledWith(
        expect.any(String),
        'import ql\nselect 1',
      );
    });
  });

  describe('document URI handling', () => {
    it('should convert absolute file paths to file:// URIs', async () => {
      mockGetCompletions.mockResolvedValueOnce([]);

      await lspCompletion({
        ...baseParams,
        filePath: '/absolute/path/query.ql',
      });

      const uri = mockOpenDocument.mock.calls[0][0];
      expect(uri).toMatch(/^file:\/\//);
      expect(uri).toContain('query.ql');
    });

    it('should pass correct position params', async () => {
      mockGetDefinition.mockResolvedValueOnce([]);

      await lspDefinition({
        character: 42,
        filePath: '/test/file.ql',
        line: 10,
      });

      expect(mockGetDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { character: 42, line: 10 },
        }),
      );
    });
  });
});
