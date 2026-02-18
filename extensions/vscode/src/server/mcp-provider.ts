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
    this._onDidChange.fire();
  }

  async provideMcpServerDefinitions(
    _token: vscode.CancellationToken,
  ): Promise<vscode.McpStdioServerDefinition[]> {
    const command = this.serverManager.getCommand();
    const args = this.serverManager.getArgs();
    const env = await this.envBuilder.build();
    const version = this.serverManager.getVersion();

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
}
