import { execFile } from 'child_process';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';
import type { CliResolver } from '../codeql/cli-resolver';
import type { ServerManager } from './server-manager';

export interface PackInstallOptions {
  /** Force reinstall even if lock files exist. */
  force?: boolean;
  /** Install only for specific languages. */
  languages?: string[];
}

/**
 * Installs CodeQL pack dependencies for the bundled tool query packs
 * shipped inside the VSIX (or, as fallback, in the locally-installed
 * `codeql-development-mcp-server` npm package).
 *
 * The VSIX bundles the qlpack source files (`.ql` + lock files) at
 * `<extensionRoot>/server/ql/<lang>/tools/src/`, and the npm install
 * mirrors them at `globalStorage/mcp-server/node_modules/.../ql/...`.
 * The bundled copy is always preferred so that the packs used by
 * `codeql pack install` match the server code running from the VSIX.
 *
 * When the detected CodeQL CLI version differs from the version the
 * VSIX was built against, the installer downloads pre-compiled packs
 * from GHCR for the matching CLI version via `codeql pack download`.
 * This ensures backwards compatibility across published CLI versions.
 *
 * CodeQL library dependencies (e.g. `codeql/javascript-all`) must be
 * fetched from GHCR via `codeql pack install`. This class automates
 * the `codeql-development-mcp-server-setup-packs` step documented in
 * the getting-started guide.
 */
export class PackInstaller extends DisposableObject {
  static readonly SUPPORTED_LANGUAGES = [
    'actions',
    'cpp',
    'csharp',
    'go',
    'java',
    'javascript',
    'python',
    'ruby',
    'swift',
  ] as const;

  /**
   * Maps CodeQL CLI versions to the ql-mcp tools pack version published
   * for that CLI release.  Each ql-mcp stable release is built against a
   * specific CodeQL CLI version, and the published pack version matches
   * the ql-mcp release version.
   *
   * Compatibility range: v2.24.0 (initial public release) through the
   * current release.
   */
  static readonly CLI_VERSION_TO_PACK_VERSION: ReadonlyMap<string, string> =
    new Map([
      ['2.24.0', '2.24.0'],
      ['2.24.1', '2.24.1'],
      ['2.24.2', '2.24.2'],
      ['2.24.3', '2.24.3'],
      ['2.25.0', '2.25.0'],
      ['2.25.1', '2.25.1'],
    ]);

  /** Pack scope/prefix for all ql-mcp tools packs on GHCR. */
  static readonly PACK_SCOPE = 'advanced-security';

  constructor(
    private readonly cliResolver: CliResolver,
    private readonly serverManager: ServerManager,
    private readonly logger: Logger,
  ) {
    super();
  }

  /**
   * Get the root directory for qlpack resolution.
   *
   * Prefers the bundled `server/` directory inside the VSIX so that the
   * packs installed match the server version. Falls back to the
   * npm-installed package root in `globalStorage` (for local dev or when
   * the VSIX bundle is missing).
   */
  private getQlpackRoot(): string {
    return this.serverManager.getBundledQlRoot()
      ?? this.serverManager.getPackageRoot();
  }

  /**
   * Get the qlpack source directories for all languages.
   */
  getQlpackPaths(): string[] {
    const root = this.getQlpackRoot();
    return PackInstaller.SUPPORTED_LANGUAGES.map((lang) =>
      join(root, 'ql', lang, 'tools', 'src'),
    );
  }

  /**
   * Derive the target CodeQL CLI version from the extension's own
   * package version.  The base version (X.Y.Z, stripping any
   * pre-release suffix like `-next.1`) corresponds to the CodeQL CLI
   * release the VSIX was built against.
   */
  getTargetCliVersion(): string {
    const extensionVersion = this.serverManager.getExtensionVersion();
    return PackInstaller.baseVersion(extensionVersion);
  }

  /**
   * Look up the ql-mcp tools pack version to download for a given
   * CodeQL CLI version.
   *
   * Returns the pack version string, or `undefined` if the CLI version
   * has no known compatible pack release.
   */
  static getPackVersionForCli(cliVersion: string): string | undefined {
    const base = PackInstaller.baseVersion(cliVersion);
    return PackInstaller.CLI_VERSION_TO_PACK_VERSION.get(base);
  }

  /**
   * Install CodeQL pack dependencies for all (or specified) languages.
   *
   * When `downloadForCliVersion` is `true` (the default), the installer
   * detects the actual CodeQL CLI version and, if it differs from what
   * the VSIX was built against, downloads pre-compiled packs from GHCR
   * for the matching CLI version.  When the CLI version matches, or when
   * downloading is disabled, falls back to `codeql pack install` on the
   * bundled pack sources.
   */
  async installAll(options?: PackInstallOptions & {
    /** Download packs matching the detected CLI version (default: true). */
    downloadForCliVersion?: boolean;
  }): Promise<void> {
    const codeqlPath = await this.cliResolver.resolve();
    if (!codeqlPath) {
      this.logger.warn(
        'CodeQL CLI not found — skipping pack installation. Install the CLI or set CODEQL_PATH.',
      );
      return;
    }

    const languages =
      options?.languages ?? [...PackInstaller.SUPPORTED_LANGUAGES];

    const downloadEnabled = options?.downloadForCliVersion ?? true;
    const actualCliVersion = this.cliResolver.getCliVersion();
    const targetCliVersion = this.getTargetCliVersion();

    if (downloadEnabled && actualCliVersion && actualCliVersion !== targetCliVersion) {
      this.logger.info(
        `CodeQL CLI version ${actualCliVersion} differs from VSIX target ${targetCliVersion}. ` +
        'Attempting to download compatible tool query packs...',
      );
      const downloaded = await this.downloadPacksForCliVersion(
        codeqlPath, actualCliVersion, languages,
      );
      if (downloaded) {
        return;
      }
      this.logger.info(
        'Pack download did not succeed for all languages — falling back to bundled pack install.',
      );
    }

    // Default path: install dependencies for bundled packs
    await this.installBundledPacks(codeqlPath, languages);
  }

  /**
   * Download pre-compiled tool query packs from GHCR for the specified
   * CodeQL CLI version.
   *
   * Returns `true` if all requested languages were downloaded
   * successfully, `false` otherwise.
   */
  async downloadPacksForCliVersion(
    codeqlPath: string,
    cliVersion: string,
    languages: string[],
  ): Promise<boolean> {
    const packVersion = PackInstaller.getPackVersionForCli(cliVersion);
    if (!packVersion) {
      this.logger.warn(
        `No known ql-mcp pack version for CodeQL CLI ${cliVersion}. ` +
        'Falling back to bundled packs.',
      );
      return false;
    }

    this.logger.info(
      `Downloading ql-mcp tool query packs v${packVersion} for CodeQL CLI ${cliVersion}...`,
    );

    let allSucceeded = true;
    for (const lang of languages) {
      const packRef =
        `${PackInstaller.PACK_SCOPE}/ql-mcp-${lang}-tools-src@${packVersion}`;
      this.logger.info(`Downloading ${packRef}...`);
      try {
        await this.runCodeqlPackDownload(codeqlPath, packRef);
        this.logger.info(`Downloaded ${packRef}.`);
      } catch (err) {
        this.logger.error(
          `Failed to download ${packRef}: ${err instanceof Error ? err.message : String(err)}`,
        );
        allSucceeded = false;
      }
    }
    return allSucceeded;
  }

  /**
   * Install pack dependencies for bundled packs using `codeql pack install`.
   * This is the original behaviour and serves as the fallback when pack
   * download is disabled or unavailable.
   */
  private async installBundledPacks(
    codeqlPath: string,
    languages: string[],
  ): Promise<void> {
    const qlRoot = this.getQlpackRoot();

    for (const lang of languages) {
      const packDir = join(qlRoot, 'ql', lang, 'tools', 'src');

      // Check if the pack directory exists
      try {
        await access(packDir, constants.R_OK);
      } catch {
        this.logger.debug(`Pack directory not found, skipping: ${packDir}`);
        continue;
      }

      this.logger.info(`Installing CodeQL pack dependencies for ${lang}...`);
      try {
        await this.runCodeqlPackInstall(codeqlPath, packDir);
        this.logger.info(`Pack dependencies installed for ${lang}.`);
      } catch (err) {
        this.logger.error(
          `Failed to install pack dependencies for ${lang}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /** Run `codeql pack install` for a single pack directory. */
  private runCodeqlPackInstall(
    codeqlPath: string,
    packDir: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        codeqlPath,
        ['pack', 'install', '--no-strict-mode', packDir],
        { timeout: 300_000 },
        (err, _stdout, stderr) => {
          if (err) {
            reject(
              new Error(`codeql pack install failed: ${stderr || err.message}`),
            );
            return;
          }
          resolve();
        },
      );
    });
  }

  /** Run `codeql pack download` for a pack reference (e.g. scope/name@version). */
  private runCodeqlPackDownload(
    codeqlPath: string,
    packRef: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        codeqlPath,
        ['pack', 'download', packRef],
        { timeout: 300_000 },
        (err, _stdout, stderr) => {
          if (err) {
            reject(
              new Error(`codeql pack download failed: ${stderr || err.message}`),
            );
            return;
          }
          resolve();
        },
      );
    });
  }

  /**
   * Strip any pre-release suffix from a semver string, returning
   * only the `MAJOR.MINOR.PATCH` portion.
   */
  static baseVersion(version: string): string {
    const stripped = version.startsWith('v') ? version.slice(1) : version;
    const match = /^(\d+\.\d+\.\d+)/.exec(stripped);
    return match ? match[1] : stripped;
  }
}
