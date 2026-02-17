import { execFile } from 'child_process';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';

/** Known filesystem locations where the CodeQL CLI may be installed. */
const KNOWN_LOCATIONS = [
  '/usr/local/bin/codeql',
  '/opt/homebrew/bin/codeql',
  `${process.env.HOME}/.codeql/codeql`,
  `${process.env.HOME}/codeql/codeql`,
];

/**
 * Resolves the absolute path to the CodeQL CLI binary.
 *
 * Detection strategy (in order):
 *  1. `CODEQL_PATH` environment variable
 *  2. `codeql` on `$PATH` (via `which`)
 *  3. Known filesystem locations
 *
 * Results are cached. Call `invalidateCache()` when the environment changes
 * (e.g. `extensions.onDidChange` fires).
 */
export class CliResolver extends DisposableObject {
  private cachedPath: string | undefined | null = null; // null = not yet resolved

  constructor(private readonly logger: Logger) {
    super();
  }

  /** Resolve the CodeQL CLI path. Returns `undefined` if not found. */
  async resolve(): Promise<string | undefined> {
    if (this.cachedPath !== null) {
      return this.cachedPath;
    }

    this.logger.debug('Resolving CodeQL CLI path...');

    // Strategy 1: CODEQL_PATH env var
    const envPath = process.env.CODEQL_PATH;
    if (envPath) {
      const validated = await this.validateBinary(envPath);
      if (validated) {
        this.logger.info(`CodeQL CLI found via CODEQL_PATH: ${envPath}`);
        this.cachedPath = envPath;
        return envPath;
      }
      this.logger.warn(`CODEQL_PATH is set to '${envPath}' but it is not a valid CodeQL binary.`);
    }

    // Strategy 2: which/command -v
    const whichPath = await this.resolveFromPath();
    if (whichPath) {
      this.logger.info(`CodeQL CLI found on PATH: ${whichPath}`);
      this.cachedPath = whichPath;
      return whichPath;
    }

    // Strategy 3: known filesystem locations
    for (const location of KNOWN_LOCATIONS) {
      const validated = await this.validateBinary(location);
      if (validated) {
        this.logger.info(`CodeQL CLI found at known location: ${location}`);
        this.cachedPath = location;
        return location;
      }
    }

    this.logger.warn('CodeQL CLI not found. Install it or set CODEQL_PATH.');
    this.cachedPath = undefined;
    return undefined;
  }

  /** Clear the cached path so the next `resolve()` re-probes. */
  invalidateCache(): void {
    this.cachedPath = null;
  }

  /** Check if a path exists and responds to `--version`. */
  private async validateBinary(binaryPath: string): Promise<boolean> {
    try {
      await access(binaryPath, constants.X_OK);
      await this.getVersion(binaryPath);
      return true;
    } catch {
      return false;
    }
  }

  /** Attempt to find `codeql` on PATH. */
  private resolveFromPath(): Promise<string | undefined> {
    return new Promise((resolve) => {
      const cmd = process.platform === 'win32' ? 'where' : 'which';
      execFile(cmd, ['codeql'], (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve(undefined);
          return;
        }
        resolve(stdout.trim().split('\n')[0]);
      });
    });
  }

  /** Run `codeql --version` to validate the binary. */
  private getVersion(binaryPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(binaryPath, ['--version'], (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stdout.trim());
      });
    });
  }
}
