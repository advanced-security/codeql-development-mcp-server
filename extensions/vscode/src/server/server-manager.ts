import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { access, readFile, mkdir } from 'fs/promises';
import { accessSync, constants } from 'fs';
import { join } from 'path';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';

const NPM_PACKAGE_NAME = 'codeql-development-mcp-server';
const SERVER_SUBDIR = 'mcp-server';

/**
 * Relative path from the extension root to the bundled MCP server entry point.
 * The `vscode:prepublish` step copies `server/dist/` and `server/ql/` into the
 * extension so the VSIX is self-contained.
 */
const BUNDLED_SERVER_ENTRY = 'server/dist/codeql-development-mcp-server.js';

export interface InstallOptions {
  /** Force reinstall even if already installed. */
  force?: boolean;
  /** Specific version to install. Defaults to 'latest'. */
  version?: string;
}

/**
 * Manages the local npm installation of `codeql-development-mcp-server`
 * into the extension's global storage directory.
 *
 * The local install serves two purposes:
 *  1. Provides the qlpack source files so PackInstaller can run
 *     `codeql pack install` to fetch their CodeQL library dependencies.
 *  2. Provides a fallback entry point if the bundled server is missing.
 *
 * The MCP server is launched from the **bundled** copy inside the VSIX
 * (`server/dist/codeql-development-mcp-server.js`) so the extension is
 * fully self-contained. Override via `codeql-mcp.serverCommand` /
 * `codeql-mcp.serverArgs` settings for local development.
 */
export class ServerManager extends DisposableObject {
  private readonly storageRoot: string;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: Logger,
  ) {
    super();
    this.storageRoot = context.globalStorageUri.fsPath;
  }

  // ---------------------------------------------------------------------------
  // Local npm install (for qlpack access)
  // ---------------------------------------------------------------------------

  /** Directory where the npm package is installed locally. */
  getInstallDir(): string {
    return join(this.storageRoot, SERVER_SUBDIR);
  }

  /** Root of the installed npm package (contains ql/, dist/, etc.). */
  getPackageRoot(): string {
    return join(this.getInstallDir(), 'node_modules', NPM_PACKAGE_NAME);
  }

  /** Check if the npm package is installed locally. */
  async isInstalled(): Promise<boolean> {
    try {
      await access(
        join(this.getPackageRoot(), 'package.json'),
        constants.R_OK,
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Get the locally installed version, or undefined. */
  async getInstalledVersion(): Promise<string | undefined> {
    try {
      const content = await readFile(
        join(this.getPackageRoot(), 'package.json'),
        'utf-8',
      );
      const pkg = JSON.parse(content) as { version?: string };
      return pkg.version;
    } catch {
      return undefined;
    }
  }

  /**
   * Ensure the npm package is installed locally.
   * Returns `true` if a fresh install was performed.
   */
  async ensureInstalled(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    const targetVersion = config.get<string>('serverVersion', 'latest');

    if (await this.isInstalled()) {
      const current = await this.getInstalledVersion();
      if (targetVersion === 'latest' || current === targetVersion) {
        this.logger.info(`MCP server package already installed (v${current}).`);
        return false;
      }
    }

    await this.install({ version: targetVersion });
    return true;
  }

  /** Install (or reinstall) the npm package locally. */
  async install(options?: InstallOptions): Promise<void> {
    const version = options?.version ?? 'latest';
    const installDir = this.getInstallDir();
    const pkgSpec =
      version === 'latest'
        ? NPM_PACKAGE_NAME
        : `${NPM_PACKAGE_NAME}@${version}`;

    this.logger.info(`Installing ${pkgSpec} into ${installDir}...`);
    await mkdir(installDir, { recursive: true });
    await this.runNpm(['install', '--prefix', installDir, pkgSpec]);
    this.logger.info(`Successfully installed ${pkgSpec}.`);
  }

  // ---------------------------------------------------------------------------
  // Server launch configuration (for McpProvider)
  // ---------------------------------------------------------------------------

  /**
   * Absolute path to the bundled MCP server entry point inside the extension.
   * Returns `undefined` if the bundled server is not present (e.g. dev build
   * that hasn't run `vscode:prepublish` yet).
   */
  getBundledServerPath(): string | undefined {
    const extensionRoot = this.context.extensionUri.fsPath;
    const candidate = join(extensionRoot, BUNDLED_SERVER_ENTRY);
    try {
      accessSync(candidate, constants.R_OK);
      return candidate;
    } catch {
      return undefined;
    }
  }

  /**
   * Get the command used to launch the MCP server process.
   *
   * Default: `"node"` (runs the bundled server JS). Falls back to `"npx"`
   * if the bundled server is missing.
   * Override via `codeql-mcp.serverCommand` setting for local dev.
   */
  getCommand(): string {
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    const custom = config.get<string>('serverCommand');
    if (custom && custom !== 'node') {
      return custom;
    }
    // Use 'node' when bundled server exists, 'npx' as fallback
    return this.getBundledServerPath() ? 'node' : 'npx';
  }

  /**
   * Get the arguments for the MCP server launch command.
   *
   * Default: the bundled server entry point inside the VSIX. Falls back to
   * `npx -y codeql-development-mcp-server` if the bundle is missing.
   * Override via `codeql-mcp.serverArgs` for local development.
   */
  getArgs(): string[] {
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    const customArgs = config.get<string[]>('serverArgs');
    if (customArgs && customArgs.length > 0) {
      return customArgs;
    }
    // Use bundled server if available
    const bundled = this.getBundledServerPath();
    if (bundled) {
      return [bundled];
    }
    // Fallback: npx (for dev environments without a prepublish build)
    this.logger.warn(
      'Bundled MCP server not found; falling back to npx. ' +
      'Run "npm run build" from the repo root to bundle the server.',
    );
    const version = config.get<string>('serverVersion', 'latest');
    const pkg =
      version === 'latest'
        ? NPM_PACKAGE_NAME
        : `${NPM_PACKAGE_NAME}@${version}`;
    return ['-y', pkg];
  }

  /** Human-readable description of the current server launch config. */
  getDescription(): string {
    return `${this.getCommand()} ${this.getArgs().join(' ')}`;
  }

  /** Version string for the MCP definition, or undefined if using latest. */
  getVersion(): string | undefined {
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    const v = config.get<string>('serverVersion', 'latest');
    return v === 'latest' ? undefined : v;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private runNpm(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      execFile(npmCmd, args, { timeout: 120_000 }, (err, stdout, stderr) => {
        if (err) {
          this.logger.error(`npm ${args[0]} failed: ${stderr || err.message}`);
          reject(new Error(`npm ${args[0]} failed: ${stderr || err.message}`));
          return;
        }
        resolve(stdout);
      });
    });
  }
}
