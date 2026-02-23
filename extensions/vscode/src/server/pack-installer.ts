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
   * Install CodeQL pack dependencies for all (or specified) languages.
   * Requires the npm package to be installed locally first (via ServerManager).
   */
  async installAll(options?: PackInstallOptions): Promise<void> {
    const codeqlPath = await this.cliResolver.resolve();
    if (!codeqlPath) {
      this.logger.warn(
        'CodeQL CLI not found — skipping pack installation. Install the CLI or set CODEQL_PATH.',
      );
      return;
    }

    const qlRoot = this.getQlpackRoot();
    const languages =
      options?.languages ?? [...PackInstaller.SUPPORTED_LANGUAGES];

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
}
