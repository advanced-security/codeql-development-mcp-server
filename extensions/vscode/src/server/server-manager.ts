import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { access, readFile, mkdir } from 'fs/promises';
import { accessSync, constants, readFileSync } from 'fs';
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
 * Manages the MCP server lifecycle for the VS Code extension.
 *
 * When the extension is installed from a VSIX, the `vscode:prepublish`
 * step bundles `server/dist/`, `server/ql/`, and `server/package.json`
 * inside the extension root. In that case no npm install is needed —
 * the VSIX is fully self-contained.
 *
 * A local npm install into `globalStorage` is performed **only** as a
 * fallback when the bundled server is missing (e.g. running from the
 * Extension Development Host without a prepublish build). Override via
 * `codeql-mcp.serverCommand` / `codeql-mcp.serverArgs` settings for
 * local development.
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
   * Get the extension's own version from its packageJSON.
   *
   * Reads `package.json` from the extension root (`context.extensionUri`)
   * so that this works in all environments (VSIX, Extension Development
   * Host, and tests) without relying on `vscode.extensions.getExtension`.
   *
   * This is the version baked into the VSIX and is used to determine
   * whether the locally installed npm package is still up-to-date.
   */
  getExtensionVersion(): string {
    try {
      const pkgPath = join(this.context.extensionUri.fsPath, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
      return pkg.version ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Ensure the npm package is available locally.
   *
   * When the VSIX bundle is present (the normal installed case), no npm
   * install is needed — the bundle already ships `server/dist/`,
   * `server/ql/`, and `server/package.json`. Returns `false` immediately.
   *
   * When the bundle is missing (Extension Development Host without a
   * prepublish build), falls back to npm-installing the package into
   * `globalStorage`. Returns `true` if a fresh install was performed.
   */
  async ensureInstalled(): Promise<boolean> {
    // VSIX bundle or monorepo server is present — no npm install required.
    if (this.getBundledQlRoot()) {
      this.logger.info(
        `Using bundled server (v${this.getExtensionVersion()}). ` +
        'No npm install required.',
      );
      return false;
    }

    // Fallback: no bundle — install via npm.
    this.logger.info(
      'Bundled server not found — falling back to npm install...',
    );
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    const targetVersion = config.get<string>('serverVersion', 'latest');

    if (await this.isInstalled()) {
      const current = await this.getInstalledVersion();
      const effectiveTarget =
        targetVersion === 'latest' ? this.getExtensionVersion() : targetVersion;
      if (current === effectiveTarget) {
        this.logger.info(`MCP server package already installed (v${current}).`);
        return false;
      }
      this.logger.info(
        `Installed npm package (v${current}) differs from target (v${effectiveTarget}) — upgrading...`,
      );
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
   * Root of the `server/` directory, checked in two locations:
   *
   * 1. **VSIX layout**: `<extensionRoot>/server/` (created by `vscode:prepublish`)
   *    — the extension is self-contained, no npm install required.
   * 2. **Monorepo dev layout**: `<extensionRoot>/../../server/` — used when
   *    running from the Extension Development Host without a prepublish build.
   *
   * Returns the first location whose `server/package.json` is readable, or
   * `undefined` if neither location exists.
   */
  getBundledQlRoot(): string | undefined {
    const extensionRoot = this.context.extensionUri.fsPath;
    const candidate = join(extensionRoot, 'server');
    try {
      accessSync(join(candidate, 'package.json'), constants.R_OK);
      return candidate;
    } catch {
      // Not in VSIX layout — check monorepo
    }

    const monorepo = join(extensionRoot, '..', '..', 'server');
    try {
      accessSync(join(monorepo, 'package.json'), constants.R_OK);
      return monorepo;
    } catch {
      return undefined;
    }
  }

  /**
   * Absolute path to the MCP server entry point.
   *
   * Checks two locations:
   * 1. **VSIX layout**: `<extensionRoot>/server/dist/codeql-development-mcp-server.js`
   *    (created by `bundle:server` during `vscode:prepublish`)
   * 2. **Monorepo dev layout**: `<extensionRoot>/../../server/dist/codeql-development-mcp-server.js`
   *    (the adjacent server build when running from Extension Development Host)
   *
   * Returns `undefined` if neither location exists.
   */
  getBundledServerPath(): string | undefined {
    const extensionRoot = this.context.extensionUri.fsPath;

    // VSIX layout: server files bundled inside the extension
    const vsixCandidate = join(extensionRoot, BUNDLED_SERVER_ENTRY);
    try {
      accessSync(vsixCandidate, constants.R_OK);
      return vsixCandidate;
    } catch {
      // Not in VSIX layout — try monorepo
    }

    // Monorepo dev layout: extensions/vscode/../../server/dist/...
    const monorepoCandidate = join(extensionRoot, '..', '..', BUNDLED_SERVER_ENTRY);
    try {
      accessSync(monorepoCandidate, constants.R_OK);
      return monorepoCandidate;
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
