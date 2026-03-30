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
   * Monotonically increasing counter, bumped each time `fireDidChange()` is
   * called. Appended to the version string returned by
   * `provideMcpServerDefinitions()` so that VS Code sees a genuinely new
   * server definition and restarts the MCP server instead of only stopping it.
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

  /** Notify VS Code that the MCP server definitions have changed. */
  fireDidChange(): void {
    this._revision++;
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
   * Before any `fireDidChange()` call, returns the raw version from
   * `serverManager.getVersion()` (preserving the original behaviour).
   *
   * After one or more `fireDidChange()` calls, appends a `.N` revision
   * suffix so that the version is always different from the previous one.
   * This is essential because VS Code uses the version to decide whether to
   * restart a running server: if the version is unchanged, VS Code may stop
   * the server without restarting it.
   */
  private getEffectiveVersion(): string | undefined {
    if (this._revision === 0) {
      return this.serverManager.getVersion();
    }
    const base =
      this.serverManager.getVersion() ??
      this.serverManager.getExtensionVersion();
    return `${base}.${this._revision}`;
  }
}
