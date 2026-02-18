/**
 * Tests for list_mrva_run_results tool
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createTestTempDir, cleanupTestTempDir } from '../../../utils/temp-dir';
import {
  discoverMrvaRunResults,
  MrvaRunResult,
} from '../../../../src/tools/codeql/list-mrva-run-results';

describe('list_mrva_run_results', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestTempDir('list-mrva-run-results');
  });

  afterEach(() => {
    cleanupTestTempDir(testDir);
  });

  describe('discoverMrvaRunResults', () => {
    it('should return empty array when no result dirs are provided', async () => {
      const result = await discoverMrvaRunResults([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when result dir does not exist', async () => {
      const result = await discoverMrvaRunResults([join(testDir, 'nonexistent')]);
      expect(result).toEqual([]);
    });

    it('should discover a single run with repository results', async () => {
      // Arrange: create a fake MRVA run directory
      const runDir = join(testDir, '20442');
      const repoDir = join(runDir, 'arduino', 'Arduino');
      const resultsDir = join(repoDir, 'results');
      mkdirSync(resultsDir, { recursive: true });
      writeFileSync(join(runDir, 'timestamp'), '2026-02-17T15:00:00Z');
      writeFileSync(
        join(runDir, 'repo_states.json'),
        JSON.stringify({ '919161': { repositoryId: 919161, downloadStatus: 'succeeded' } }),
      );
      writeFileSync(
        join(repoDir, 'repo_task.json'),
        JSON.stringify({
          repository: { id: 919161, fullName: 'arduino/Arduino', private: false },
          analysisStatus: 'succeeded',
          resultCount: 1,
          artifactSizeInBytes: 14311,
        }),
      );
      writeFileSync(join(resultsDir, 'results.sarif'), '{}');
      writeFileSync(join(resultsDir, 'results.bqrs'), '');

      // Act
      const result = await discoverMrvaRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].runId).toBe('20442');
      expect(result[0].timestamp).toBe('2026-02-17T15:00:00Z');
      expect(result[0].repositories).toHaveLength(1);
      expect(result[0].repositories[0].fullName).toBe('arduino/Arduino');
      expect(result[0].repositories[0].analysisStatus).toBe('succeeded');
      expect(result[0].repositories[0].resultCount).toBe(1);
      expect(result[0].repositories[0].hasSarif).toBe(true);
      expect(result[0].repositories[0].hasBqrs).toBe(true);
    });

    it('should discover multiple runs across multiple dirs', async () => {
      // Arrange
      const dir1 = join(testDir, 'dir1');
      const dir2 = join(testDir, 'dir2');
      const run1 = join(dir1, '10001');
      const run2 = join(dir2, '10002');
      mkdirSync(run1, { recursive: true });
      mkdirSync(run2, { recursive: true });
      writeFileSync(join(run1, 'timestamp'), 'ts1');
      writeFileSync(join(run2, 'timestamp'), 'ts2');

      // Act
      const result = await discoverMrvaRunResults([dir1, dir2]);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should filter by run ID', async () => {
      // Arrange
      for (const id of ['20438', '20440', '20442']) {
        const runDir = join(testDir, id);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'timestamp'), `ts-${id}`);
      }

      // Act
      const result = await discoverMrvaRunResults([testDir], '20440');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].runId).toBe('20440');
    });

    it('should skip non-numeric directories', async () => {
      // Arrange
      const notARun = join(testDir, 'exported-results');
      mkdirSync(notARun, { recursive: true });
      const alsoNotARun = join(testDir, 'some-text-dir');
      mkdirSync(alsoNotARun, { recursive: true });
      const realRun = join(testDir, '99999');
      mkdirSync(realRun, { recursive: true });
      writeFileSync(join(realRun, 'timestamp'), 'ts');

      // Act
      const result = await discoverMrvaRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].runId).toBe('99999');
    });

    it('should handle missing timestamp file gracefully', async () => {
      // Arrange
      const runDir = join(testDir, '12345');
      mkdirSync(runDir, { recursive: true });
      // No timestamp file

      // Act
      const result = await discoverMrvaRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBeUndefined();
    });

    it('should handle missing repo_task.json gracefully', async () => {
      // Arrange: repo directory without repo_task.json
      const runDir = join(testDir, '55555');
      const repoDir = join(runDir, 'owner', 'repo');
      mkdirSync(repoDir, { recursive: true });

      // Act
      const result = await discoverMrvaRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].repositories).toHaveLength(1);
      expect(result[0].repositories[0].fullName).toBe('owner/repo');
      expect(result[0].repositories[0].analysisStatus).toBeUndefined();
      expect(result[0].repositories[0].resultCount).toBeUndefined();
      expect(result[0].repositories[0].hasSarif).toBe(false);
      expect(result[0].repositories[0].hasBqrs).toBe(false);
    });

    it('should skip exported-results and .DS_Store directories', async () => {
      // Arrange
      const runDir = join(testDir, '77777');
      mkdirSync(join(runDir, 'exported-results'), { recursive: true });
      mkdirSync(join(runDir, '.DS_Store'), { recursive: true });
      const repoDir = join(runDir, 'owner', 'repo');
      mkdirSync(repoDir, { recursive: true });

      // Act
      const result = await discoverMrvaRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].repositories).toHaveLength(1);
      expect(result[0].repositories[0].fullName).toBe('owner/repo');
    });

    it('should discover multiple repositories in a single run', async () => {
      // Arrange
      const runDir = join(testDir, '30000');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'timestamp'), '2026-02-17T10:00:00Z');

      for (const [owner, repo, status, count] of [
        ['arduino', 'Arduino', 'succeeded', 5],
        ['google', 'guava', 'succeeded', 2],
        ['facebook', 'react', 'failed', 0],
      ] as const) {
        const repoDir = join(runDir, owner, repo);
        const resultsDir = join(repoDir, 'results');
        mkdirSync(resultsDir, { recursive: true });
        writeFileSync(
          join(repoDir, 'repo_task.json'),
          JSON.stringify({ analysisStatus: status, resultCount: count }),
        );
        if (status === 'succeeded') {
          writeFileSync(join(resultsDir, 'results.sarif'), '{}');
          writeFileSync(join(resultsDir, 'results.bqrs'), '');
        }
      }

      // Act
      const result = await discoverMrvaRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].repositories).toHaveLength(3);

      const arduino = result[0].repositories.find(
        (r: MrvaRunResult['repositories'][0]) => r.fullName === 'arduino/Arduino',
      );
      expect(arduino).toBeDefined();
      expect(arduino!.analysisStatus).toBe('succeeded');
      expect(arduino!.resultCount).toBe(5);
      expect(arduino!.hasSarif).toBe(true);
      expect(arduino!.hasBqrs).toBe(true);

      const react = result[0].repositories.find(
        (r: MrvaRunResult['repositories'][0]) => r.fullName === 'facebook/react',
      );
      expect(react).toBeDefined();
      expect(react!.analysisStatus).toBe('failed');
      expect(react!.resultCount).toBe(0);
      expect(react!.hasSarif).toBe(false);
      expect(react!.hasBqrs).toBe(false);
    });

    it('should handle run directory with no repositories', async () => {
      // Arrange: numeric directory with only files (no owner/repo subdirs)
      const runDir = join(testDir, '20438');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'timestamp'), '2026-01-01T00:00:00Z');

      // Act
      const result = await discoverMrvaRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].runId).toBe('20438');
      expect(result[0].repositories).toHaveLength(0);
    });
  });
});
