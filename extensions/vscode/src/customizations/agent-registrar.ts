import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../common/logger';

/** Normalizes a file-system path for comparison (removes trailing sep, platform lower-case on Windows). */
function normalizePath(p: string): string {
  let n = path.normalize(p);
  // Remove trailing separator
  if (n.endsWith(path.sep) && n.length > 1) {
    n = n.slice(0, -1);
  }
  return process.platform === 'win32' ? n.toLowerCase() : n;
}

/**
 * Manages registration of `.agent.md` directories in `chat.agentFilesLocations`.
 *
 * Adds the extension's bundled `agents/` directory and any user-configured
 * additional directories to the VS Code configuration setting, and removes
 * them on dispose.
 */
export class AgentRegistrar implements vscode.Disposable {
  private readonly _bundledDir: string;
  private readonly _disposables: vscode.Disposable[] = [];
  private _addedKeys: Set<string> = new Set();

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _logger: Logger,
  ) {
    this._bundledDir = path.join(_context.extensionUri.fsPath, 'agents');
  }

  /** Registers bundled + additional agent dirs in chat.agentFilesLocations. */
  register(): void {
    const cfg = vscode.workspace.getConfiguration('codeql-mcp');
    const enabled = cfg.get<boolean>('agents.enabled', true);

    if (!enabled) {
      this._removeAddedKeys();
      return;
    }

    const additionalDirs = cfg.get<string[]>('additionalAgentDirs', []);

    const dirsToAdd = [this._bundledDir, ...additionalDirs];

    const chatCfg = vscode.workspace.getConfiguration('chat');
    const existing: Record<string, boolean> =
      this._normalizeLocations(chatCfg.get<unknown>('agentFilesLocations'));

    const updated = { ...existing };
    const newKeys: Set<string> = new Set();

    for (const dir of dirsToAdd) {
      const normalized = normalizePath(dir);
      if (!this._hasNormalizedKey(updated, normalized)) {
        updated[dir] = true;
        newKeys.add(dir);
      }
    }

    if (Object.keys(updated).length === Object.keys(existing).length) {
      // Nothing new to add; make sure we track the keys we added previously
      this._addedKeys = newKeys;
      return;
    }

    const target = this._configTarget();
    chatCfg.update('agentFilesLocations', updated, target).then(
      () => {
        this._addedKeys = newKeys;
        this._logger.info(
          `AgentRegistrar: registered ${newKeys.size} dir(s) in chat.agentFilesLocations`,
        );
      },
      (err: unknown) => {
        this._logger.warn(
          `AgentRegistrar: failed to update chat.agentFilesLocations: ${err instanceof Error ? err.message : String(err)}`,
        );
      },
    );
  }

  /** Subscribes to configuration and workspace folder changes. */
  startWatching(): void {
    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration('codeql-mcp.agents') ||
          e.affectsConfiguration('codeql-mcp.additionalAgentDirs')
        ) {
          this.register();
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.register();
      }),
    );
  }

  /** Returns current status for the showAgentsStatus command. */
  getStatus(): {
    enabled: boolean;
    bundledDir: string;
    additionalDirs: string[];
    effectiveLocations: string[];
  } {
    const cfg = vscode.workspace.getConfiguration('codeql-mcp');
    const enabled = cfg.get<boolean>('agents.enabled', true);
    const additionalDirs = cfg.get<string[]>('additionalAgentDirs', []);

    const chatCfg = vscode.workspace.getConfiguration('chat');
    const locations = this._normalizeLocations(chatCfg.get<unknown>('agentFilesLocations'));

    return {
      additionalDirs,
      bundledDir: this._bundledDir,
      effectiveLocations: Object.keys(locations),
      enabled,
    };
  }

  dispose(): void {
    this._removeAddedKeys();
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.length = 0;
  }

  // ---------- private helpers ----------

  private _normalizeLocations(value: unknown): Record<string, boolean> {
    if (!value || typeof value !== 'object') return {};
    if (Array.isArray(value)) {
      const obj: Record<string, boolean> = {};
      for (const entry of value) {
        if (typeof entry === 'string') obj[entry] = true;
      }
      return obj;
    }
    return value as Record<string, boolean>;
  }

  private _hasNormalizedKey(obj: Record<string, boolean>, normalized: string): boolean {
    return Object.keys(obj).some((k) => normalizePath(k) === normalized);
  }

  private _removeAddedKeys(): void {
    if (this._addedKeys.size === 0) return;

    const chatCfg = vscode.workspace.getConfiguration('chat');
    const existing = this._normalizeLocations(chatCfg.get<unknown>('agentFilesLocations'));
    const updated: Record<string, boolean> = {};

    for (const [k, v] of Object.entries(existing)) {
      if (!this._addedKeys.has(k)) {
        updated[k] = v;
      }
    }

    const target = this._configTarget();
    chatCfg.update('agentFilesLocations', updated, target).then(
      () => {
        this._logger.info('AgentRegistrar: removed registered agent dirs from chat.agentFilesLocations');
        this._addedKeys = new Set();
      },
      (err: unknown) => {
        this._logger.warn(
          `AgentRegistrar: failed to clean up chat.agentFilesLocations: ${err instanceof Error ? err.message : String(err)}`,
        );
      },
    );
  }

  private _configTarget(): vscode.ConfigurationTarget {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;
  }
}
