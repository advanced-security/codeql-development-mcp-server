import * as fs from 'fs';
import * as path from 'path';
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

/** Status of bundled custom agents contributed by this extension. */
export interface BundledAgentsStatus {
  /** Absolute path to the `agents/` directory inside the installed extension. */
  readonly bundledDir: string;
  /** Entries declared under `contributes.chatAgents` in the extension manifest. */
  readonly contributedAgents: ReadonlyArray<{ readonly path: string }>;
}

/** API surface returned from activate() for testing and interop. */
export interface ExtensionApi {
  readonly mcpProvider: McpProvider;
  /**
   * Exposes the `EnvironmentBuilder` used to compute environment variables
   * passed to the MCP server. The bridge/workspace integration tests inspect
   * its output to verify that storage paths, workspace folders, and the
   * `CODEQL_PATH` resolution behave correctly without spawning the server.
   */
  readonly environmentBuilder: EnvironmentBuilder;
  /**
   * Exposes the `ServerManager` so the MCP-server integration tests can
   * assert the chosen launch command/args and report the installed version
   * without re-implementing the install lookup.
   */
  readonly serverManager: ServerManager;
  /**
   * Reads the bundled-agents status off disk via `context.extensionUri`. Used
   * by the `codeql-mcp.showAgentsStatus` command and by integration tests; the
   * helper deliberately avoids `context.extension` so it works regardless of
   * VS Code API surface drift.
   */
  getBundledAgentsStatus(): BundledAgentsStatus;
}

/**
 * Returns the bundled-agents status for the given extension context. Reads
 * `package.json` directly from `context.extensionUri.fsPath` so the helper
 * does not depend on `context.extension` or `vscode.extensions.getExtension`.
 */
export function readBundledAgentsStatus(
  context: vscode.ExtensionContext,
): BundledAgentsStatus {
  const extRoot = context.extensionUri.fsPath;
  const bundledDir = path.join(extRoot, 'agents');
  let contributedAgents: ReadonlyArray<{ readonly path: string }>;
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(extRoot, 'package.json'), 'utf8'),
    ) as { contributes?: { chatAgents?: ReadonlyArray<{ path: string }> } };
    contributedAgents = pkg.contributes?.chatAgents ?? [];
  } catch {
    contributedAgents = [];
  }
  return { bundledDir, contributedAgents };
}

const disposables: vscode.Disposable[] = [];

export async function activate(
  context: vscode.ExtensionContext,
): Promise<ExtensionApi> {
  const logger = new Logger();
  disposables.push(logger);
  logger.info('CodeQL Development MCP Server extension activating...');

  // --- Core components ---
  const storagePaths = new StoragePaths(context);
  const cliResolver = new CliResolver(logger, storagePaths.getCodeqlGlobalStoragePath());
  const serverManager = new ServerManager(context, logger);
  const packInstaller = new PackInstaller(cliResolver, serverManager, logger);
  const envBuilder = new EnvironmentBuilder(
    context,
    cliResolver,
    storagePaths,
    logger,
  );
  const mcpProvider = new McpProvider(serverManager, envBuilder, logger);

  disposables.push(cliResolver, serverManager, packInstaller, storagePaths, envBuilder, mcpProvider);

  // Built-in custom agents are contributed declaratively via
  // `contributes.chatAgents` in package.json. We deliberately do NOT register
  // the extension's absolute `agents/` path in `chat.agentFilesLocations` —
  // VS Code rejects absolute paths there (`Skipping invalid path (glob
  // patterns and absolute paths not supported)`), so doing so would silently
  // pollute user settings without making agents discoverable.

  // --- Bridge: filesystem watchers ---
  const config = vscode.workspace.getConfiguration('codeql-mcp');
  const watchEnabled = config.get<boolean>('watchCodeqlExtension', true);

  if (watchEnabled) {
    try {
      const dbWatcher = new DatabaseWatcher(storagePaths, logger);
      const queryWatcher = new QueryResultsWatcher(storagePaths, logger);
      disposables.push(dbWatcher, queryWatcher);

      // File-content changes (new databases, query results) do NOT require
      // a new MCP server definition.  The running server discovers files on
      // its own through filesystem scanning at tool invocation time.  The
      // definition only needs to change when the server binary, workspace
      // folder registration, or configuration changes.
      //
      // The watchers are still useful: they log file events for debugging
      // and DatabaseWatcher tracks known databases internally.
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
        logger.info('Configuration changed — requesting MCP server restart');
        mcpProvider.requestRestart();
      }
    }),
  );

  // Invalidate cached environment when workspace folders change.
  // VS Code itself manages MCP server lifecycle when roots change
  // (stopping and restarting the server as needed).  We just clear
  // the cached env so the next server start picks up updated folders.
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      logger.info('Workspace folders changed — invalidating environment cache');
      envBuilder.invalidate();
    }),
  );

  // --- Register MCP server definition provider ---
  logger.info('Registering ql-mcp MCP server definition provider...');
  try {
    context.subscriptions.push(
      vscode.lm.registerMcpServerDefinitionProvider('ql-mcp', mcpProvider),
    );
    logger.info(
      'ql-mcp registered. The server will start when Copilot needs it, ' +
      'or start it manually via the MCP servers list.',
    );
  } catch (err) {
    logger.warn(
      `Failed to register MCP server definition provider: ${err instanceof Error ? err.message : String(err)}. ` +
      'MCP server definitions will not be available. This may happen on older VS Code versions.',
    );
  }

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
    vscode.commands.registerCommand('codeql-mcp.showAgentsStatus', () => {
      const status = readBundledAgentsStatus(context);
      const lines = [
        `Bundled agents dir: ${status.bundledDir}`,
        `Contributed agents: ${status.contributedAgents.length}`,
        ...status.contributedAgents.map((c) => `  - ${c.path}`),
      ];
      logger.info('--- Agents Status ---');
      for (const line of lines) {
        logger.info(line);
      }
      logger.show();
      vscode.window.showInformationMessage(
        `CodeQL MCP: ${status.contributedAgents.length} bundled agent(s) contributed via package.json`,
      );
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
    const autoDownloadPacks = config.get<boolean>('autoDownloadPacks', true);
    // Run in background — don't block activation
    void (async () => {
      try {
        await serverManager.ensureInstalled();
        await packInstaller.installAll({ downloadForCliVersion: autoDownloadPacks });
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
  return {
    environmentBuilder: envBuilder,
    mcpProvider,
    serverManager,
    getBundledAgentsStatus: () => readBundledAgentsStatus(context),
  };
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
