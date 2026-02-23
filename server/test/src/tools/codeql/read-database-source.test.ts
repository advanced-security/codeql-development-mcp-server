/**
 * Tests for read-database-source tool
 */

import AdmZip from 'adm-zip';
import { promises as fs } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  readDatabaseSource,
} from '../../../../src/tools/codeql/read-database-source';
import { cleanupTestTempDir, createTestTempDir } from '../../../utils/temp-dir';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_FILES: Record<string, string> = {
  'home/user/repo/src/Foo.java': [
    'package com.example;',
    '',
    'public class Foo {',
    '    public void bar() {',
    '        System.out.println("hello");',
    '    }',
    '}',
  ].join('\n'),
  'home/user/repo/src/Baz.java': 'public class Baz {}',
  'home/user/repo/lib/Util.java': 'public class Util {}',
};

/**
 * Create a temp database directory with a src.zip containing the sample files.
 */
async function createZipDatabase(dir: string): Promise<void> {
  await fs.writeFile(join(dir, 'codeql-database.yml'), 'primaryLanguage: java\n');
  const zip = new AdmZip();
  for (const [entry, content] of Object.entries(SAMPLE_FILES)) {
    zip.addFile(entry, Buffer.from(content, 'utf-8'));
  }
  zip.writeZip(join(dir, 'src.zip'));
}

/**
 * Create a temp database directory with a src/ directory containing the sample files.
 */
async function createDirDatabase(dir: string): Promise<void> {
  await fs.writeFile(join(dir, 'codeql-database.yml'), 'primaryLanguage: java\n');
  for (const [entryPath, content] of Object.entries(SAMPLE_FILES)) {
    const fullPath = join(dir, 'src', entryPath);
    await fs.mkdir(join(fullPath, '..'), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }
}

// ---------------------------------------------------------------------------
// src.zip tests
// ---------------------------------------------------------------------------

describe('readDatabaseSource (src.zip)', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTestTempDir('read-src-zip');
  });

  afterEach(() => {
    cleanupTestTempDir(dir);
  });

  it('lists all entries when filePath is omitted', async () => {
    await createZipDatabase(dir);

    const result = await readDatabaseSource({ databasePath: dir });

    expect(result).toMatchObject({
      sourceType: 'src.zip',
      totalEntries: 3,
      returnedEntries: 3,
      truncated: false,
    });
    const listing = result as { entries: string[] };
    expect(listing.entries).toHaveLength(3);
    expect(listing.entries).toContain('home/user/repo/src/Foo.java');
  });

  it('reads a file by exact archive path', async () => {
    await createZipDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      filePath: 'home/user/repo/lib/Util.java',
    });

    expect(result).toMatchObject({
      sourceType: 'src.zip',
      entryPath: 'home/user/repo/lib/Util.java',
      content: 'public class Util {}',
      totalLines: 1,
    });
  });

  it('resolves a file:// URI from a SARIF physicalLocation', async () => {
    await createZipDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      filePath: 'file:///home/user/repo/src/Baz.java',
    });

    expect(result).toMatchObject({
      entryPath: 'home/user/repo/src/Baz.java',
      content: 'public class Baz {}',
    });
  });

  it('applies startLine and endLine to slice the file', async () => {
    await createZipDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      filePath: 'home/user/repo/src/Foo.java',
      startLine: 3,
      endLine: 5,
    });

    const file = result as import('../../../../src/tools/codeql/read-database-source').DatabaseSourceFile;
    expect(file.startLine).toBe(3);
    expect(file.endLine).toBe(5);
    expect(file.content).toBe(
      ['public class Foo {', '    public void bar() {', '        System.out.println("hello");'].join(
        '\n',
      ),
    );
    expect(file.totalLines).toBe(7);
  });

  it('throws a helpful error when the requested file is not in the archive', async () => {
    await createZipDatabase(dir);

    await expect(
      readDatabaseSource({ databasePath: dir, filePath: 'does/not/exist.java' }),
    ).rejects.toThrow('File not found in src.zip');
  });

  it('throws when the database path does not exist', async () => {
    await expect(
      readDatabaseSource({ databasePath: '/nonexistent/db', filePath: 'Foo.java' }),
    ).rejects.toThrow('Database path does not exist');
  });

  it('throws when neither src.zip nor src/ is present', async () => {
    await fs.writeFile(join(dir, 'codeql-database.yml'), 'primaryLanguage: java\n');

    await expect(readDatabaseSource({ databasePath: dir })).rejects.toThrow(
      'No source archive found',
    );
  });
});

// ---------------------------------------------------------------------------
// src/ directory fallback tests
// ---------------------------------------------------------------------------

describe('readDatabaseSource (src/ directory)', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTestTempDir('read-src-dir');
  });

  afterEach(() => {
    cleanupTestTempDir(dir);
  });

  it('lists all entries when filePath is omitted', async () => {
    await createDirDatabase(dir);

    const result = await readDatabaseSource({ databasePath: dir });

    expect(result).toMatchObject({
      sourceType: 'src/',
      totalEntries: 3,
      returnedEntries: 3,
      truncated: false,
    });
  });

  it('reads a file by relative path', async () => {
    await createDirDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      filePath: 'home/user/repo/lib/Util.java',
    });

    expect(result).toMatchObject({
      sourceType: 'src/',
      content: 'public class Util {}',
    });
  });

  it('applies startLine and endLine', async () => {
    await createDirDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      filePath: 'home/user/repo/src/Foo.java',
      startLine: 1,
      endLine: 2,
    });

    const file = result as import('../../../../src/tools/codeql/read-database-source').DatabaseSourceFile;
    expect(file.startLine).toBe(1);
    expect(file.endLine).toBe(2);
    expect(file.content).toBe('package com.example;\n');
  });

  it('throws a helpful error when the requested file is not in the directory', async () => {
    await createDirDatabase(dir);

    await expect(
      readDatabaseSource({ databasePath: dir, filePath: 'does/not/exist.java' }),
    ).rejects.toThrow('File not found in src/');
  });
});

// ---------------------------------------------------------------------------
// src.zip takes priority over src/
// ---------------------------------------------------------------------------

describe('readDatabaseSource (src.zip takes priority)', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTestTempDir('read-src-priority');
  });

  afterEach(() => {
    cleanupTestTempDir(dir);
  });

  it('prefers src.zip when both src.zip and src/ are present', async () => {
    await createZipDatabase(dir);
    // Also create a src/ directory (should be ignored)
    await fs.mkdir(join(dir, 'src'), { recursive: true });

    const result = await readDatabaseSource({ databasePath: dir });

    expect(result).toMatchObject({ sourceType: 'src.zip' });
  });
});

// ---------------------------------------------------------------------------
// Listing mode: prefix and maxEntries
// ---------------------------------------------------------------------------

describe('readDatabaseSource listing mode filtering', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTestTempDir('read-src-listing');
  });

  afterEach(() => {
    cleanupTestTempDir(dir);
  });

  it('filters entries by prefix', async () => {
    await createZipDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      prefix: 'home/user/repo/src/',
    });

    const listing = result as import('../../../../src/tools/codeql/read-database-source').DatabaseSourceListing;
    expect(listing.totalEntries).toBe(2);
    expect(listing.entries).toHaveLength(2);
    expect(listing.truncated).toBe(false);
    for (const entry of listing.entries) {
      expect(entry.startsWith('home/user/repo/src/')).toBe(true);
    }
  });

  it('truncates entries when maxEntries is set', async () => {
    await createZipDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      maxEntries: 2,
    });

    const listing = result as import('../../../../src/tools/codeql/read-database-source').DatabaseSourceListing;
    expect(listing.totalEntries).toBe(3);
    expect(listing.returnedEntries).toBe(2);
    expect(listing.entries).toHaveLength(2);
    expect(listing.truncated).toBe(true);
  });

  it('does not truncate when maxEntries exceeds total', async () => {
    await createZipDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      maxEntries: 100,
    });

    const listing = result as import('../../../../src/tools/codeql/read-database-source').DatabaseSourceListing;
    expect(listing.totalEntries).toBe(3);
    expect(listing.returnedEntries).toBe(3);
    expect(listing.truncated).toBe(false);
  });

  it('combines prefix and maxEntries', async () => {
    await createZipDatabase(dir);

    const result = await readDatabaseSource({
      databasePath: dir,
      prefix: 'home/user/repo/src/',
      maxEntries: 1,
    });

    const listing = result as import('../../../../src/tools/codeql/read-database-source').DatabaseSourceListing;
    expect(listing.totalEntries).toBe(2);
    expect(listing.returnedEntries).toBe(1);
    expect(listing.entries).toHaveLength(1);
    expect(listing.truncated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyLineRange validation
// ---------------------------------------------------------------------------

describe('readDatabaseSource line range validation', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTestTempDir('read-src-bad-range');
  });

  afterEach(() => {
    cleanupTestTempDir(dir);
  });

  it('throws when startLine is greater than endLine', async () => {
    await createZipDatabase(dir);

    await expect(
      readDatabaseSource({
        databasePath: dir,
        filePath: 'home/user/repo/src/Foo.java',
        startLine: 5,
        endLine: 2,
      }),
    ).rejects.toThrow('Invalid line range');
  });
});

// ---------------------------------------------------------------------------
// resolveEntryPath ambiguous suffix match
// ---------------------------------------------------------------------------

describe('readDatabaseSource ambiguous suffix match', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTestTempDir('read-src-ambiguous');
  });

  afterEach(() => {
    cleanupTestTempDir(dir);
  });

  it('picks the most specific (longest) suffix match', async () => {
    await fs.writeFile(join(dir, 'codeql-database.yml'), 'primaryLanguage: java\n');
    const zip = new AdmZip();
    zip.addFile('src/Foo.java', Buffer.from('short', 'utf-8'));
    zip.addFile('home/user/repo/src/Foo.java', Buffer.from('long path', 'utf-8'));
    zip.writeZip(join(dir, 'src.zip'));

    // Requesting 'src/Foo.java' matches both, but exact match wins
    const result = await readDatabaseSource({
      databasePath: dir,
      filePath: 'src/Foo.java',
    });

    const file = result as import('../../../../src/tools/codeql/read-database-source').DatabaseSourceFile;
    expect(file.entryPath).toBe('src/Foo.java');
    expect(file.content).toBe('short');
  });
});
