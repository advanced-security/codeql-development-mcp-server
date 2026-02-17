import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { access, readFile, mkdir } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';

const NPM_PACKAGE_NAME = 'codeql-development-mcp-server';
const SERVER_SUBDIR = 'mcp-server';

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
 *  2. Provides a fallback entry point if npx is not available.
 *
 * The MCP server itself is launched via `npx -y codeql-development-mcp-server`
 * (the published npm package) — NOT the local install. This keeps a clean
 * separation between the extension and the MCP server code.
 *
 * To test with a local development build of the MCP server instead,
 * set `codeql-mcp.serverCommand` and `codeql-mcp.serverArgs` in settings.
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
   * Get the command used to launch the MCP server process.
   * Defaults to `"npx"`. Override via `codeql-mcp.serverCommand` setting
   * to use a local development build instead.
   */
  getCommand(): string {
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    return config.get<string>('serverCommand', 'npx');
  }

  /**
   * Get the arguments for the MCP server launch command.
   * Defaults to `["-y", "codeql-development-mcp-server"]` (or with
   * `@<version>` if `codeql-mcp.serverVersion` is pinned).
   * Override via `codeql-mcp.serverArgs` for local development.
   */
  getArgs(): string[] {
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    const customArgs = config.get<string[]>('serverArgs');
    if (customArgs && customArgs.length > 0) {
      return customArgs;
    }
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
