/**
 * Tests for list_codeql_databases tool
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createTestTempDir, cleanupTestTempDir } from '../../../utils/temp-dir';
import {
  DatabaseInfo,
  discoverDatabases,
} from '../../../../src/tools/codeql/list-databases';

describe('list_codeql_databases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestTempDir('list-databases');
  });

  afterEach(() => {
    cleanupTestTempDir(testDir);
  });

  describe('discoverDatabases', () => {
    it('should return empty array when no base dirs are provided', async () => {
      const result = await discoverDatabases([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when base dir does not exist', async () => {
      const result = await discoverDatabases([join(testDir, 'nonexistent')]);
      expect(result).toEqual([]);
    });

    it('should discover a database with codeql-database.yml', async () => {
      // Arrange: create a fake database directory
      const dbDir = join(testDir, 'my-database');
      mkdirSync(dbDir, { recursive: true });
      writeFileSync(
        join(dbDir, 'codeql-database.yml'),
        'primaryLanguage: javascript\ncreationMetadata:\n  cliVersion: "2.24.1"\n  creationTime: "2026-01-15T10:00:00Z"\n'
      );
      mkdirSync(join(dbDir, 'db-javascript'), { recursive: true });
      writeFileSync(join(dbDir, 'src.zip'), '');

      // Act
      const result = await discoverDatabases([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe(dbDir);
      expect(result[0].language).toBe('javascript');
      expect(result[0].cliVersion).toBe('2.24.1');
    });

    it('should discover multiple databases in a single base dir', async () => {
      // Arrange
      for (const name of ['db-java', 'db-python']) {
        const dbDir = join(testDir, name);
        mkdirSync(dbDir, { recursive: true });
        const lang = name.replace('db-', '');
        writeFileSync(
          join(dbDir, 'codeql-database.yml'),
          `primaryLanguage: ${lang}\n`
        );
      }

      // Act
      const result = await discoverDatabases([testDir]);

      // Assert
      expect(result).toHaveLength(2);
      const languages = result.map((d: DatabaseInfo) => d.language).sort();
      expect(languages).toEqual(['java', 'python']);
    });

    it('should discover databases across multiple base dirs', async () => {
      // Arrange
      const dir1 = join(testDir, 'dir1');
      const dir2 = join(testDir, 'dir2');
      const db1 = join(dir1, 'db-a');
      const db2 = join(dir2, 'db-b');
      for (const d of [db1, db2]) {
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, 'codeql-database.yml'), 'primaryLanguage: cpp\n');
      }

      // Act
      const result = await discoverDatabases([dir1, dir2]);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should skip directories without codeql-database.yml', async () => {
      // Arrange
      const notADb = join(testDir, 'not-a-db');
      mkdirSync(notADb, { recursive: true });
      writeFileSync(join(notADb, 'random-file.txt'), 'hello');

      const realDb = join(testDir, 'real-db');
      mkdirSync(realDb, { recursive: true });
      writeFileSync(join(realDb, 'codeql-database.yml'), 'primaryLanguage: go\n');

      // Act
      const result = await discoverDatabases([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].language).toBe('go');
    });

    it('should filter by language when specified', async () => {
      // Arrange
      for (const lang of ['javascript', 'python', 'java']) {
        const dbDir = join(testDir, `db-${lang}`);
        mkdirSync(dbDir, { recursive: true });
        writeFileSync(join(dbDir, 'codeql-database.yml'), `primaryLanguage: ${lang}\n`);
      }

      // Act
      const result = await discoverDatabases([testDir], 'python');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].language).toBe('python');
    });

    it('should skip files (not directories) in base dir', async () => {
      // Arrange
      writeFileSync(join(testDir, 'not-a-dir.txt'), 'hello');
      const dbDir = join(testDir, 'real-db');
      mkdirSync(dbDir, { recursive: true });
      writeFileSync(join(dbDir, 'codeql-database.yml'), 'primaryLanguage: ruby\n');

      // Act
      const result = await discoverDatabases([testDir]);

      // Assert
      expect(result).toHaveLength(1);
    });
  });
});
