import * as vscode from 'vscode';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';
import type { ServerManager } from './server-manager';
import type { EnvironmentBuilder } from '../bridge/environment-builder';

/**
 * Implements `McpServerDefinitionProvider` to programmatically register
 * the `codeql-development-mcp-server` as an MCP server in VS Code.
 *
 * The server is launched from the bundled copy inside the VSIX by default
 * (`node server/dist/codeql-development-mcp-server.js`). Falls back to
 * `npx -y codeql-development-mcp-server` if the bundle is missing.
 * Override via `codeql-mcp.serverCommand` / `codeql-mcp.serverArgs` settings.
 */
export class McpProvider
  extends DisposableObject
  implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition>
{
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeMcpServerDefinitions = this._onDidChange.event;

  /**
   * Monotonically increasing counter, bumped by `requestRestart()`.
   * Appended to the version string so that VS Code sees a genuinely new
   * server definition and triggers a stop → restart cycle.
   */
  private _revision = 0;

  constructor(
    private readonly serverManager: ServerManager,
    private readonly envBuilder: EnvironmentBuilder,
    private readonly logger: Logger,
  ) {
    super();
    this.push(this._onDidChange);
  }

  /**
   * Soft notification: tell VS Code that definitions may have changed.
   *
   * Does NOT bump the version, so VS Code will re-query
   * `provideMcpServerDefinitions()` / `resolveMcpServerDefinition()` but
   * will NOT restart the server. Use for lightweight updates (file watcher
   * events, extension changes, background install completion) where the
   * running server can continue with its current environment.
   */
  fireDidChange(): void {
    this._onDidChange.fire();
  }

  /**
   * Request that VS Code restart the MCP server with a fresh environment.
   *
   * Bumps the internal revision counter so that the next call to
   * `provideMcpServerDefinitions()` returns a definition with a different
   * `version` string. VS Code compares the new version to the running
   * server's version and, seeing a change, triggers a stop → start cycle.
   *
   * Use for changes that require a server restart (configuration changes).
   */
  requestRestart(): void {
    this._revision++;
    this.logger.info(
      `Requesting ql-mcp restart (revision ${this._revision})...`,
    );
    this._onDidChange.fire();
  }

  async provideMcpServerDefinitions(
    _token: vscode.CancellationToken,
  ): Promise<vscode.McpStdioServerDefinition[]> {
    const command = this.serverManager.getCommand();
    const args = this.serverManager.getArgs();
    const env = await this.envBuilder.build();
    const version = this.getEffectiveVersion();

    this.logger.info(
      `Providing MCP server definition: ${command} ${args.join(' ')}`,
    );

    const definition = new vscode.McpStdioServerDefinition(
      'ql-mcp',
      command,
      args,
      env,
      version,
    );

    return [definition];
  }

  async resolveMcpServerDefinition(
    server: vscode.McpStdioServerDefinition,
    _token: vscode.CancellationToken,
  ): Promise<vscode.McpStdioServerDefinition | undefined> {
    // Refresh environment in case it changed since provideMcpServerDefinitions
    const env = await this.envBuilder.build();
    server.env = env;
    return server;
  }

  /**
   * Computes the version string for the MCP server definition.
   *
   * Always returns a concrete string so that VS Code has a reliable
   * baseline for version comparison.  When `serverManager.getVersion()`
   * returns `undefined` (the "latest" / unpinned case), the extension
   * version is used as the base instead.
   *
   * After one or more `requestRestart()` calls, a `.N` revision suffix
   * is appended so that the version is always different from the
   * previous one.  VS Code uses the version to decide whether to
   * restart a running server: a changed version triggers a stop → start
   * cycle.
   */
  private getEffectiveVersion(): string {
    const base =
      this.serverManager.getVersion() ??
      this.serverManager.getExtensionVersion();
    if (this._revision === 0) {
      return base;
    }
    return `${base}.${this._revision}`;
  }
}
