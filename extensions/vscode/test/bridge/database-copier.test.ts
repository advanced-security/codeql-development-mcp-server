import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DatabaseCopier } from '../../src/bridge/database-copier';

function createMockLogger() {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  } as any;
}

/**
 * Helper: create a minimal CodeQL database directory that contains
 * `codeql-database.yml` and an optional `.lock` file in the cache dir.
 */
function createFakeDatabase(
  parentDir: string,
  name: string,
  opts?: { withLock?: boolean },
): string {
  const dbDir = join(parentDir, name);
  mkdirSync(dbDir, { recursive: true });
  writeFileSync(join(dbDir, 'codeql-database.yml'), 'primaryLanguage: javascript\n');

  if (opts?.withLock) {
    const cacheDir = join(dbDir, 'db-javascript', 'default', 'cache');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, '.lock'), '');
  }

  return dbDir;
}

// Use project-local .tmp/ directory (gitignored)
const PROJECT_TMP_BASE = join(__dirname, '..', '..', '..', '..', '.tmp');

describe('DatabaseCopier', () => {
  let tmpDir: string;
  let sourceDir: string;
  let destDir: string;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mkdirSync(PROJECT_TMP_BASE, { recursive: true });
    tmpDir = mkdtempSync(join(PROJECT_TMP_BASE, 'db-copier-'));
    sourceDir = join(tmpDir, 'source');
    destDir = join(tmpDir, 'dest');
    mkdirSync(sourceDir, { recursive: true });
    logger = createMockLogger();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should be instantiable', () => {
    const copier = new DatabaseCopier(destDir, logger);
    expect(copier).toBeDefined();
  });

  it('should copy a database to the destination', async () => {
    createFakeDatabase(sourceDir, 'my-db');

    const copier = new DatabaseCopier(destDir, logger);
    const results = await copier.syncAll([sourceDir]);

    expect(results).toHaveLength(1);
    expect(results[0]).toBe(join(destDir, 'my-db'));
    expect(existsSync(join(destDir, 'my-db', 'codeql-database.yml'))).toBe(true);
  });

  it('should create the destination directory if it does not exist', async () => {
    createFakeDatabase(sourceDir, 'db-1');

    const copier = new DatabaseCopier(destDir, logger);
    await copier.syncAll([sourceDir]);

    expect(existsSync(destDir)).toBe(true);
  });

  it('should remove .lock files from the copy', async () => {
    createFakeDatabase(sourceDir, 'locked-db', { withLock: true });

    // Verify lock exists in source
    const srcLock = join(sourceDir, 'locked-db', 'db-javascript', 'default', 'cache', '.lock');
    expect(existsSync(srcLock)).toBe(true);

    const copier = new DatabaseCopier(destDir, logger);
    await copier.syncAll([sourceDir]);

    // Lock file should NOT exist in the copy
    const destLock = join(destDir, 'locked-db', 'db-javascript', 'default', 'cache', '.lock');
    expect(existsSync(destLock)).toBe(false);

    // But the rest of the database should still be there
    expect(existsSync(join(destDir, 'locked-db', 'codeql-database.yml'))).toBe(true);
    expect(existsSync(join(destDir, 'locked-db', 'db-javascript', 'default', 'cache'))).toBe(true);
  });

  it('should not re-copy a database that has not changed', async () => {
    createFakeDatabase(sourceDir, 'stable-db');

    const copier = new DatabaseCopier(destDir, logger);
    await copier.syncAll([sourceDir]);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Copying database'));

    logger.info.mockClear();
    await copier.syncAll([sourceDir]);

    // Second call should NOT log a copy (database unchanged)
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Copying database'));
  });

  it('should re-copy a database when source is newer', async () => {
    createFakeDatabase(sourceDir, 'updated-db');

    const copier = new DatabaseCopier(destDir, logger);
    await copier.syncAll([sourceDir]);

    // Advance the source codeql-database.yml mtime into the future
    const srcYml = join(sourceDir, 'updated-db', 'codeql-database.yml');
    const future = new Date(Date.now() + 10_000);
    utimesSync(srcYml, future, future);

    logger.info.mockClear();
    await copier.syncAll([sourceDir]);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Copying database'));
  });

  it('should handle multiple source directories', async () => {
    const sourceDir2 = join(tmpDir, 'source2');
    mkdirSync(sourceDir2, { recursive: true });

    createFakeDatabase(sourceDir, 'db-a');
    createFakeDatabase(sourceDir2, 'db-b');

    const copier = new DatabaseCopier(destDir, logger);
    const results = await copier.syncAll([sourceDir, sourceDir2]);

    expect(results).toHaveLength(2);
    expect(existsSync(join(destDir, 'db-a', 'codeql-database.yml'))).toBe(true);
    expect(existsSync(join(destDir, 'db-b', 'codeql-database.yml'))).toBe(true);
  });

  it('should skip non-existent source directories', async () => {
    const copier = new DatabaseCopier(destDir, logger);
    const results = await copier.syncAll(['/nonexistent/path']);

    expect(results).toHaveLength(0);
  });

  it('should skip directories that are not CodeQL databases', async () => {
    // Create a regular directory (no codeql-database.yml)
    const notADb = join(sourceDir, 'not-a-db');
    mkdirSync(notADb, { recursive: true });
    writeFileSync(join(notADb, 'README.md'), '# Not a database');

    const copier = new DatabaseCopier(destDir, logger);
    const results = await copier.syncAll([sourceDir]);

    expect(results).toHaveLength(0);
  });

  it('should not modify the source .lock files', async () => {
    createFakeDatabase(sourceDir, 'locked-db', { withLock: true });
    const srcLock = join(sourceDir, 'locked-db', 'db-javascript', 'default', 'cache', '.lock');

    const copier = new DatabaseCopier(destDir, logger);
    await copier.syncAll([sourceDir]);

    // Source lock file must remain untouched
    expect(existsSync(srcLock)).toBe(true);
  });

  it('should log an error and exclude database when copy fails', async () => {
    createFakeDatabase(sourceDir, 'bad-db');

    // Make the destination base directory read-only to prevent cp from writing
    mkdirSync(destDir, { mode: 0o444, recursive: true });

    const copier = new DatabaseCopier(destDir, logger);
    const results = await copier.syncAll([sourceDir]);

    // Restore permissions for cleanup
    const { chmod } = await import('fs/promises');
    await chmod(destDir, 0o755);

    // Should have logged the error
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to copy database'),
    );
    // Should NOT include the failed database in results
    expect(results).toHaveLength(0);
  });
});
