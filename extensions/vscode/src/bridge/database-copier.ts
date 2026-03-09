import { existsSync } from 'fs';
import { cp, mkdir, readdir, rm, stat, unlink } from 'fs/promises';
import { join } from 'path';
import type { Logger } from '../common/logger';

/**
 * Copies CodeQL databases from `GitHub.vscode-codeql` extension storage
 * to a managed directory, removing `.lock` files that the CodeQL query
 * server creates in `<dataset>/default/cache/`.
 *
 * This avoids lock contention when the `ql-mcp` server runs CLI commands
 * against databases that are simultaneously registered by the
 * `vscode-codeql` query server.
 *
 * Each database is identified by its top-level directory name (which
 * contains `codeql-database.yml`). A database is only re-copied when its
 * source has been modified more recently than the existing copy.
 */
export class DatabaseCopier {
  constructor(
    private readonly destinationBase: string,
    private readonly logger: Logger,
  ) {}

  /**
   * Synchronise databases from one or more source directories into the
   * managed destination. Only databases that are newer than the existing
   * copy (or missing entirely) are re-copied.
   *
   * @returns The list of database paths in the managed destination that
   *          are ready for use (absolute paths).
   */
  async syncAll(sourceDirs: string[]): Promise<string[]> {
    try {
      await mkdir(this.destinationBase, { recursive: true });
    } catch (err) {
      this.logger.error(
        `Failed to create managed database directory ${this.destinationBase}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }

    const copied: string[] = [];

    for (const sourceDir of sourceDirs) {
      if (!existsSync(sourceDir)) {
        continue;
      }

      let entries: string[];
      try {
        entries = await readdir(sourceDir);
      } catch {
        continue;
      }

      for (const entry of entries) {
        const srcDbPath = join(sourceDir, entry);
        if (!(await isCodeQLDatabase(srcDbPath))) {
          continue;
        }

        const destDbPath = join(this.destinationBase, entry);

        if (await this.needsCopy(srcDbPath, destDbPath)) {
          await this.copyDatabase(srcDbPath, destDbPath);
        }

        if (await isCodeQLDatabase(destDbPath)) {
          copied.push(destDbPath);
        }
      }
    }

    return copied;
  }

  /**
   * Copy a single database directory, then strip any `.lock` files that
   * the CodeQL query server may have left behind.
   */
  private async copyDatabase(src: string, dest: string): Promise<void> {
    this.logger.info(`Copying database ${src} → ${dest}`);
    try {
      // Remove stale destination if present
      try {
        if (existsSync(dest)) {
          await rm(dest, { recursive: true, force: true });
        }
      } catch (rmErr) {
        this.logger.error(
          `Failed to remove stale destination ${dest}: ${rmErr instanceof Error ? rmErr.message : String(rmErr)}`,
        );
        return;
      }

      await cp(src, dest, { recursive: true });
      await removeLockFiles(dest);
      this.logger.info(`Database copied successfully: ${dest}`);
    } catch (err) {
      this.logger.error(
        `Failed to copy database ${src}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * A copy is needed when the destination does not exist, or the source
   * `codeql-database.yml` is newer than the destination's.
   */
  private async needsCopy(src: string, dest: string): Promise<boolean> {
    const destYml = join(dest, 'codeql-database.yml');
    if (!existsSync(destYml)) {
      return true;
    }

    const srcYml = join(src, 'codeql-database.yml');
    try {
      const srcMtime = (await stat(srcYml)).mtimeMs;
      const destMtime = (await stat(destYml)).mtimeMs;
      return srcMtime > destMtime;
    } catch {
      // If stat fails, re-copy to be safe
      return true;
    }
  }
}

/** Check whether a directory looks like a CodeQL database. */
async function isCodeQLDatabase(dirPath: string): Promise<boolean> {
  try {
    return (await stat(dirPath)).isDirectory() && existsSync(join(dirPath, 'codeql-database.yml'));
  } catch {
    return false;
  }
}

/**
 * Recursively remove all `.lock` files under the given directory.
 * These are empty sentinel files created by the CodeQL query server in
 * `<dataset>/default/cache/.lock`.
 */
async function removeLockFiles(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const st = await stat(fullPath);
      if (st.isDirectory()) {
        await removeLockFiles(fullPath);
      } else if (entry === '.lock') {
        await unlink(fullPath);
      }
    } catch {
      // Best-effort removal
    }
  }
}
