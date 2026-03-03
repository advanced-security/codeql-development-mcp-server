import { execFile } from 'child_process';
import { access, readdir, readFile } from 'fs/promises';
import { constants } from 'fs';
import { dirname, join } from 'path';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';

/** Expected binary name for the CodeQL CLI on the current platform. */
const CODEQL_BINARY_NAME = process.platform === 'win32' ? 'codeql.exe' : 'codeql';

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
 *  3. `vscode-codeql` managed distribution (via `distribution.json` hint
 *     or directory scan of `distribution*` folders)
 *  4. Known filesystem locations
 *
 * Results are cached. Call `invalidateCache()` when the environment changes
 * (e.g. `extensions.onDidChange` fires).
 */
export class CliResolver extends DisposableObject {
  private cachedPath: string | undefined | null = null; // null = not yet resolved

  constructor(
    private readonly logger: Logger,
    private readonly vsCodeCodeqlStoragePath?: string,
  ) {
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

    // Strategy 3: vscode-codeql managed distribution
    const distPath = await this.resolveFromVsCodeDistribution();
    if (distPath) {
      this.logger.info(`CodeQL CLI found via vscode-codeql distribution: ${distPath}`);
      this.cachedPath = distPath;
      return distPath;
    }

    // Strategy 4: known filesystem locations
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

  /**
   * Discover the CodeQL CLI binary from the `vscode-codeql` extension's
   * managed distribution directory.
   *
   * The `GitHub.vscode-codeql` extension downloads the CodeQL CLI into:
   *   `<globalStorage>/github.vscode-codeql/distribution<N>/codeql/codeql`
   *
   * where `<N>` is an incrementing folder index that increases each time
   * the extension upgrades the CLI. A `distribution.json` file in the
   * storage root contains a `folderIndex` property that identifies the
   * current distribution directory. We use that as a fast-path hint and
   * fall back to scanning for the highest-numbered `distribution*` folder.
   */
  private async resolveFromVsCodeDistribution(): Promise<string | undefined> {
    if (!this.vsCodeCodeqlStoragePath) return undefined;

    const parent = dirname(this.vsCodeCodeqlStoragePath);
    // VS Code stores the extension directory as either 'GitHub.vscode-codeql'
    // (original publisher casing) or 'github.vscode-codeql' (lowercased by VS Code
    // on some platforms/versions). Probe both to ensure discovery works on
    // case-sensitive filesystems.
    const candidatePaths = [
      ...new Set([
        this.vsCodeCodeqlStoragePath,
        join(parent, 'github.vscode-codeql'),
        join(parent, 'GitHub.vscode-codeql'),
      ]),
    ];

    for (const storagePath of candidatePaths) {
      try {
        // Fast path: read distribution.json for the exact folder index
        const hintPath = await this.resolveFromDistributionJson(storagePath);
        if (hintPath) return hintPath;
      } catch {
        this.logger.debug('distribution.json hint unavailable, falling back to directory scan');
      }

      // Fallback: scan for distribution* directories
      const scanPath = await this.resolveFromDistributionScan(storagePath);
      if (scanPath) return scanPath;
    }
    return undefined;
  }

  /**
   * Read `distribution.json` to get the current `folderIndex` and validate
   * the binary at the corresponding path.
   */
  private async resolveFromDistributionJson(storagePath: string): Promise<string | undefined> {
    const jsonPath = join(storagePath, 'distribution.json');
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content) as { folderIndex?: number };

    if (typeof data.folderIndex !== 'number') return undefined;

    const binaryPath = join(
      storagePath,
      `distribution${data.folderIndex}`,
      'codeql',
      CODEQL_BINARY_NAME,
    );
    const validated = await this.validateBinary(binaryPath);
    if (validated) {
      this.logger.debug(`Resolved CLI via distribution.json (folderIndex=${data.folderIndex})`);
      return binaryPath;
    }
    return undefined;
  }

  /**
   * Scan for `distribution*` directories sorted by numeric suffix (highest
   * first) and return the first one containing a valid `codeql` binary.
   */
  private async resolveFromDistributionScan(storagePath: string): Promise<string | undefined> {
    try {
      const entries = await readdir(storagePath, { withFileTypes: true });

      const distDirs = entries
        .filter(e => e.isDirectory() && /^distribution\d*$/.test(e.name))
        .map(e => ({
          name: e.name,
          num: parseInt(e.name.replace('distribution', '') || '0', 10),
        }))
        .sort((a, b) => b.num - a.num);

      for (const dir of distDirs) {
        const binaryPath = join(
          storagePath,
          dir.name,
          'codeql',
          CODEQL_BINARY_NAME,
        );
        const validated = await this.validateBinary(binaryPath);
        if (validated) {
          this.logger.debug(`Resolved CLI via distribution scan: ${dir.name}`);
          return binaryPath;
        }
      }
    } catch {
      this.logger.debug(
        `Could not scan vscode-codeql distribution directory: ${storagePath}`,
      );
    }
    return undefined;
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
