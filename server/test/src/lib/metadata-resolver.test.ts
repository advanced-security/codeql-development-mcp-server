/**
 * Tests for metadata-resolver module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveQueryMetadata } from '../../../src/lib/metadata-resolver.js';
import * as cliExecutor from '../../../src/lib/cli-executor.js';

// Mock the logger to suppress expected error output
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the cli-executor module
vi.mock('../../../src/lib/cli-executor.js', () => ({
  executeCodeQLCommand: vi.fn()
}));

describe('Metadata Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveQueryMetadata', () => {
    it('should resolve metadata for a valid query', async () => {
      const mockMetadata = {
        name: 'Test Query',
        description: 'A test query for testing',
        kind: 'problem',
        id: 'test-query',
        tags: ['test', 'example']
      };

      vi.mocked(cliExecutor.executeCodeQLCommand).mockResolvedValue({
        success: true,
        stdout: JSON.stringify(mockMetadata),
        stderr: '',
        exitCode: 0
      });

      const result = await resolveQueryMetadata('/path/to/query.ql');

      expect(result).toEqual(mockMetadata);
      expect(cliExecutor.executeCodeQLCommand).toHaveBeenCalledWith(
        'resolve metadata',
        { format: 'json' },
        ['/path/to/query.ql']
      );
    });

    it('should return null when command fails', async () => {
      vi.mocked(cliExecutor.executeCodeQLCommand).mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Error: Query file not found',
        exitCode: 1,
        error: 'Command failed'
      });

      const result = await resolveQueryMetadata('/path/to/missing.ql');

      expect(result).toBeNull();
    });

    it('should return null when JSON parsing fails', async () => {
      vi.mocked(cliExecutor.executeCodeQLCommand).mockResolvedValue({
        success: true,
        stdout: 'invalid json',
        stderr: '',
        exitCode: 0
      });

      const result = await resolveQueryMetadata('/path/to/query.ql');

      expect(result).toBeNull();
    });

    it('should handle metadata with array values', async () => {
      const mockMetadata = {
        name: 'Multi-tag Query',
        tags: ['security', 'performance', 'best-practice'],
        precision: ['high', 'medium']
      };

      vi.mocked(cliExecutor.executeCodeQLCommand).mockResolvedValue({
        success: true,
        stdout: JSON.stringify(mockMetadata),
        stderr: '',
        exitCode: 0
      });

      const result = await resolveQueryMetadata('/path/to/query.ql');

      expect(result).toEqual(mockMetadata);
      expect(Array.isArray(result?.tags)).toBe(true);
      expect(result?.tags).toHaveLength(3);
    });

    it('should return null on unexpected errors', async () => {
      vi.mocked(cliExecutor.executeCodeQLCommand).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await resolveQueryMetadata('/path/to/query.ql');

      expect(result).toBeNull();
    });
  });
});
