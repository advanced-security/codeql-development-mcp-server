import * as vscode from 'vscode';
import { Logger } from './common/logger';
import { CliResolver } from './codeql/cli-resolver';
import { ServerManager } from './server/server-manager';
import { PackInstaller } from './server/pack-installer';
import { McpProvider } from './server/mcp-provider';
import { StoragePaths } from './bridge/storage-paths';
import { DatabaseWatcher } from './bridge/database-watcher';
import { QueryResultsWatcher } from './bridge/query-results-watcher';
import { EnvironmentBuilder } from './bridge/environment-builder';

/** API surface returned from activate() for testing and interop. */
export interface ExtensionApi {
  readonly mcpProvider: McpProvider;
}

const disposables: vscode.Disposable[] = [];

export async function activate(
  context: vscode.ExtensionContext,
): Promise<ExtensionApi> {
  const logger = new Logger();
  disposables.push(logger);
  logger.info('CodeQL Development MCP Server extension activating...');

  // --- Core components ---
  const cliResolver = new CliResolver(logger);
  const serverManager = new ServerManager(context, logger);
  const packInstaller = new PackInstaller(cliResolver, serverManager, logger);
  const storagePaths = new StoragePaths(context);
  const envBuilder = new EnvironmentBuilder(
    context,
    cliResolver,
    storagePaths,
    logger,
  );
  const mcpProvider = new McpProvider(serverManager, envBuilder, logger);

  disposables.push(cliResolver, serverManager, packInstaller, storagePaths, envBuilder, mcpProvider);

  // --- Bridge: filesystem watchers ---
  const config = vscode.workspace.getConfiguration('codeql-mcp');
  const watchEnabled = config.get<boolean>('watchCodeqlExtension', true);

  if (watchEnabled) {
    try {
      const dbWatcher = new DatabaseWatcher(storagePaths, logger);
      const queryWatcher = new QueryResultsWatcher(storagePaths, logger);
      disposables.push(dbWatcher, queryWatcher);

      // When databases or query results change, rebuild the environment and
      // notify the MCP provider that the server definition has changed.
      dbWatcher.onDidChange(() => {
        envBuilder.invalidate();
        mcpProvider.fireDidChange();
      });
      queryWatcher.onDidChange(() => {
        envBuilder.invalidate();
        mcpProvider.fireDidChange();
      });
    } catch (err) {
      logger.warn(
        `Failed to initialize file watchers: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // --- VS Code API event subscriptions ---

  // Re-probe CLI when extensions change (e.g. vscode-codeql installed/updated)
  context.subscriptions.push(
    vscode.extensions.onDidChange(() => {
      logger.info('Extensions changed — invalidating CLI resolver cache');
      cliResolver.invalidateCache();
      envBuilder.invalidate();
      mcpProvider.fireDidChange();
    }),
  );

  // Re-compute env when config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('codeql-mcp')) {
        logger.info('Configuration changed — rebuilding environment');
        envBuilder.invalidate();
        mcpProvider.fireDidChange();
      }
    }),
  );

  // Re-scan when workspace folders change
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      logger.info('Workspace folders changed — refreshing watchers');
      envBuilder.invalidate();
      mcpProvider.fireDidChange();
    }),
  );

  // --- Register MCP server definition provider ---
  logger.info('Registering ql-mcp MCP server definition provider...');
  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('ql-mcp', mcpProvider),
  );
  logger.info(
    'ql-mcp registered. The server will start when Copilot needs it, ' +
    'or start it manually via the MCP servers list.',
  );

  // --- Register commands ---
  context.subscriptions.push(
    vscode.commands.registerCommand('codeql-mcp.reinstallServer', async () => {
      logger.info('Reinstalling MCP server (user command)...');
      logger.show();
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'CodeQL MCP: Reinstalling server...' },
        async () => {
          await serverManager.install({ force: true });
          await packInstaller.installAll();
          mcpProvider.fireDidChange();
        },
      );
      vscode.window.showInformationMessage('CodeQL MCP Server reinstalled successfully.');
    }),
    vscode.commands.registerCommand('codeql-mcp.reinstallPacks', async () => {
      logger.info('Reinstalling CodeQL tool query packs (user command)...');
      logger.show();
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'CodeQL MCP: Installing query packs...' },
        async () => {
          await packInstaller.installAll({ force: true });
          mcpProvider.fireDidChange();
        },
      );
      vscode.window.showInformationMessage('CodeQL tool query packs reinstalled successfully.');
    }),
    vscode.commands.registerCommand('codeql-mcp.showStatus', async () => {
      const cliPath = await cliResolver.resolve();
      const version = await serverManager.getInstalledVersion();
      const lines = [
        `Launch: ${serverManager.getDescription()}`,
        `Local install: ${version ?? 'not yet installed'}`,
        `CodeQL CLI: ${cliPath ?? 'not found'}`,
        `vscode-codeql storage: ${storagePaths.getCodeqlGlobalStoragePath()}`,
        `Query results: ${storagePaths.getQueryStoragePath()}`,
      ];
      logger.info('--- Status ---');
      for (const line of lines) {
        logger.info(line);
      }
      logger.show();
      vscode.window.showInformationMessage(lines.join(' | '));
    }),
    vscode.commands.registerCommand('codeql-mcp.showLogs', () => {
      logger.show();
    }),
  );

  // --- Auto-install on activation ---
  const autoInstall = config.get<boolean>('autoInstall', true);
  if (autoInstall) {
    logger.info('Auto-install enabled — starting background setup...');
    logger.info(`Install directory: ${serverManager.getInstallDir?.() ?? 'unknown'}`);
    logger.info(`Server launch: ${serverManager.getDescription?.() ?? 'unknown'}`);
    // Run in background — don't block activation
    void (async () => {
      try {
        const freshInstall = await serverManager.ensureInstalled();
        if (freshInstall) {
          logger.info('Fresh npm install completed — running CodeQL pack setup...');
        } else {
          logger.info('npm package already present — checking CodeQL packs...');
        }
        await packInstaller.installAll();
        mcpProvider.fireDidChange();
        logger.info('✅ MCP server setup complete. Server is ready to be started.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`❌ Auto-install failed: ${msg}`);
        vscode.window.showErrorMessage(
          `CodeQL MCP setup failed: ${msg}. See "CodeQL MCP" output channel.`,
        );
      }
    })();
  } else {
    logger.info('Auto-install disabled via codeql-mcp.autoInstall setting.');
  }

  logger.info('CodeQL Development MCP Server extension activated.');
  return { mcpProvider };
}

export function deactivate(): void {
  for (const d of disposables) {
    try {
      d.dispose();
    } catch {
      // Best-effort cleanup
    }
  }
  disposables.length = 0;
}
