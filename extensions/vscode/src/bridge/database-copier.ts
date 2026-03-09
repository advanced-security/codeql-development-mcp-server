import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync } from 'fs';
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
  syncAll(sourceDirs: string[]): string[] {
    mkdirSync(this.destinationBase, { recursive: true });

    const copied: string[] = [];

    for (const sourceDir of sourceDirs) {
      if (!existsSync(sourceDir)) {
        continue;
      }

      let entries: string[];
      try {
        entries = readdirSync(sourceDir);
      } catch {
        continue;
      }

      for (const entry of entries) {
        const srcDbPath = join(sourceDir, entry);
        if (!isCodeQLDatabase(srcDbPath)) {
          continue;
        }

        const destDbPath = join(this.destinationBase, entry);

        if (this.needsCopy(srcDbPath, destDbPath)) {
          this.copyDatabase(srcDbPath, destDbPath);
        }

        copied.push(destDbPath);
      }
    }

    return copied;
  }

  /**
   * Copy a single database directory, then strip any `.lock` files that
   * the CodeQL query server may have left behind.
   */
  private copyDatabase(src: string, dest: string): void {
    this.logger.info(`Copying database ${src} → ${dest}`);
    try {
      // Remove stale destination if present
      if (existsSync(dest)) {
        rmSync(dest, { recursive: true, force: true });
      }

      cpSync(src, dest, { recursive: true });
      removeLockFiles(dest);
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
  private needsCopy(src: string, dest: string): boolean {
    const destYml = join(dest, 'codeql-database.yml');
    if (!existsSync(destYml)) {
      return true;
    }

    const srcYml = join(src, 'codeql-database.yml');
    try {
      const srcMtime = statSync(srcYml).mtimeMs;
      const destMtime = statSync(destYml).mtimeMs;
      return srcMtime > destMtime;
    } catch {
      // If stat fails, re-copy to be safe
      return true;
    }
  }
}

/** Check whether a directory looks like a CodeQL database. */
function isCodeQLDatabase(dirPath: string): boolean {
  try {
    return statSync(dirPath).isDirectory() && existsSync(join(dirPath, 'codeql-database.yml'));
  } catch {
    return false;
  }
}

/**
 * Recursively remove all `.lock` files under the given directory.
 * These are empty sentinel files created by the CodeQL query server in
 * `<dataset>/default/cache/.lock`.
 */
function removeLockFiles(dir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        removeLockFiles(fullPath);
      } else if (entry === '.lock') {
        unlinkSync(fullPath);
      }
    } catch {
      // Best-effort removal
    }
  }
}
