/**
 * CodeQL Server Manager
 *
 * Manages the lifecycle of CodeQL background server processes:
 * - language-server (LSP-based QL validation)
 * - query-server2   (query evaluation)
 * - cli-server      (JVM reuse for CLI commands)
 *
 * Servers are keyed by a hash of their configuration. When a caller requests
 * a server with a different configuration, the old server is shut down and a
 * new one is started. Session-specific cache directories provide isolation.
 */

import { mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  CLIServerConfig,
  CodeQLServerType,
  computeConfigHash,
  LanguageServerConfig,
  QueryServerConfig,
  ServerConfig,
} from './server-config';
import { CodeQLLanguageServer } from './language-server';
import { CodeQLQueryServer } from './query-server';
import { CodeQLCLIServer } from './cli-server';
import { getProjectTmpDir } from '../utils/temp-dir';
import { logger } from '../utils/logger';

/**
 * Entry in the managed servers map.
 */
interface ManagedServer {
  configHash: string;
  server: CodeQLCLIServer | CodeQLLanguageServer | CodeQLQueryServer;
  sessionId: string;
  type: CodeQLServerType;
}

/**
 * Options for creating a session-specific cache layout.
 */
export interface SessionCacheOptions {
  /** Override the session ID (defaults to a random UUID). */
  sessionId?: string;
}

/**
 * Manages CodeQL background server processes with config-aware caching.
 *
 * Callers should use `getLanguageServer()`, `getQueryServer()`, or
 * `getCLIServer()` to obtain a running server. If the requested
 * configuration differs from the currently running server of that type, the
 * old server is stopped and replaced.
 */
export class CodeQLServerManager {
  /** Keyed by `CodeQLServerType` — at most one per type at a time. */
  private servers = new Map<CodeQLServerType, ManagedServer>();

  /** In-flight `getOrRestart` promises, keyed by server type, to serialize concurrent calls. */
  private pendingStarts = new Map<CodeQLServerType, Promise<CodeQLCLIServer | CodeQLLanguageServer | CodeQLQueryServer>>();

  /** The session ID used for cache isolation. */
  private sessionId: string;

  /** Root directory for session-specific caches. */
  private sessionCacheDir: string;

  constructor(options?: SessionCacheOptions) {
    this.sessionId = options?.sessionId ?? randomUUID();
    this.sessionCacheDir = join(
      getProjectTmpDir('codeql-cache'),
      this.sessionId,
    );
    // Pre-create the cache directory tree
    for (const subdir of ['compilation-cache', 'logs', 'query-cache']) {
      mkdirSync(join(this.sessionCacheDir, subdir), { recursive: true });
    }
    logger.info(`CodeQLServerManager initialized (session: ${this.sessionId})`);
  }

  // ---- Public API ----

  /**
   * Get the current session ID.
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the session-specific cache directory.
   */
  getCacheDir(): string {
    return this.sessionCacheDir;
  }

  /**
   * Return the session-specific log directory.
   */
  getLogDir(): string {
    return join(this.sessionCacheDir, 'logs');
  }

  /**
   * Get or create a Language Server with the given configuration.
   *
   * If a language server is already running with the same config it is reused.
   * If the config has changed the old server is shut down first.
   */
  async getLanguageServer(config: LanguageServerConfig): Promise<CodeQLLanguageServer> {
    const enriched = this.enrichConfig(config) as LanguageServerConfig;
    return this.getOrRestart('language', enriched, () => {
      // Convert LanguageServerConfig to the LanguageServerOptions the existing class expects
      return new CodeQLLanguageServer({
        loglevel: enriched.loglevel,
        logdir: enriched.logdir,
        searchPath: enriched.searchPath,
        synchronous: enriched.synchronous,
        verbosity: enriched.verbosity,
      });
    }) as Promise<CodeQLLanguageServer>;
  }

  /**
   * Get or create a Query Server with the given configuration.
   */
  async getQueryServer(config: QueryServerConfig): Promise<CodeQLQueryServer> {
    const enriched = this.enrichConfig(config) as QueryServerConfig;
    return this.getOrRestart('query', enriched, () => {
      return new CodeQLQueryServer(enriched);
    }) as Promise<CodeQLQueryServer>;
  }

  /**
   * Get or create a CLI Server with the given configuration.
   */
  async getCLIServer(config: CLIServerConfig): Promise<CodeQLCLIServer> {
    const enriched = this.enrichConfig(config) as CLIServerConfig;
    return this.getOrRestart('cli', enriched, () => {
      return new CodeQLCLIServer(enriched);
    }) as Promise<CodeQLCLIServer>;
  }

  /**
   * Shut down a specific server type.
   */
  async shutdownServer(type: CodeQLServerType): Promise<void> {
    const managed = this.servers.get(type);
    if (!managed) return;

    logger.info(`Shutting down ${type} server (session: ${managed.sessionId})`);
    await this.stopServer(managed);
    this.servers.delete(type);
  }

  /**
   * Shut down all managed servers.
   */
  async shutdownAll(): Promise<void> {
    logger.info(`Shutting down all servers for session: ${this.sessionId}`);
    const shutdownPromises = Array.from(this.servers.entries()).map(
      async ([type, managed]) => {
        try {
          await this.stopServer(managed);
        } catch (error) {
          logger.error(`Error shutting down ${type} server:`, error);
        }
      },
    );
    await Promise.all(shutdownPromises);
    this.servers.clear();
    logger.info('All servers shut down');
  }

  /**
   * Check whether a server of the given type is currently running.
   */
  isRunning(type: CodeQLServerType): boolean {
    const managed = this.servers.get(type);
    if (!managed) return false;
    return managed.server.isRunning();
  }

  /**
   * Get status information for all managed servers.
   */
  getStatus(): Record<CodeQLServerType, { configHash: string; running: boolean; sessionId: string } | null> {
    const status: Record<string, { configHash: string; running: boolean; sessionId: string } | null> = {
      cli: null,
      language: null,
      query: null,
    };
    for (const [type, managed] of this.servers) {
      status[type] = {
        configHash: managed.configHash,
        running: managed.server.isRunning(),
        sessionId: managed.sessionId,
      };
    }
    return status as Record<CodeQLServerType, { configHash: string; running: boolean; sessionId: string } | null>;
  }

  // ---- Private helpers ----

  /**
   * Eagerly start the language server so the JVM is warm when the first
   * LSP tool call arrives.  Uses the default configuration that
   * `lsp-handlers.ts` / `lsp-diagnostics.ts` would create on the first
   * `getLanguageServer()` call.  The server is stored in the managed-servers
   * map and reused by subsequent tool invocations.
   *
   * This is fire-and-forget: errors are logged but do not prevent the MCP
   * server from starting.
   */
  async warmUpLanguageServer(): Promise<void> {
    try {
      // Lazy-import to avoid circular dependency at module level
      const { packageRootDir } = await import('../utils/package-paths');
      const { resolve } = await import('path');

      const config: LanguageServerConfig = {
        checkErrors: 'ON_CHANGE',
        loglevel: 'WARN',
        searchPath: resolve(packageRootDir, 'ql'),
      };
      logger.info('Warming up language server (background JVM start)...');
      await this.getLanguageServer(config);
      logger.info('Language server warm-up complete');
    } catch (error) {
      logger.warn('Language server warm-up failed (will retry on first tool call):', error);
    }
  }

  /**
   * Eagerly start the CLI server so the JVM is warm when the first
   * `executeCodeQLCommand()` call routes through it.
   *
   * The CLI server uses only session-scoped `commonCaches` and `logdir`,
   * both injected by `enrichConfig()`.  Passing an empty config is
   * intentional — it matches what `executeCodeQLCommand()` will request.
   *
   * Fire-and-forget: errors are logged but do not block startup.
   */
  async warmUpCLIServer(): Promise<void> {
    try {
      logger.info('Warming up CLI server (background JVM start)...');
      await this.getCLIServer({});
      logger.info('CLI server warm-up complete');
    } catch (error) {
      logger.warn('CLI server warm-up failed (will retry on first tool call):', error);
    }
  }

  /**
   * Enrich a config with session-specific defaults for commonCaches and logdir.
   */
  private enrichConfig<T extends ServerConfig>(config: T): T {
    return {
      ...config,
      commonCaches: config.commonCaches ?? this.sessionCacheDir,
      logdir: config.logdir ?? this.getLogDir(),
    };
  }

  /**
   * Get an existing server if its config matches, otherwise stop the old
   * one and start a new server.
   *
   * Concurrent calls for the same server type are serialized via
   * `pendingStarts` to avoid spawning duplicate server processes.
   */
  private async getOrRestart(
    type: CodeQLServerType,
    config: ServerConfig,
    factory: () => CodeQLCLIServer | CodeQLLanguageServer | CodeQLQueryServer,
  ): Promise<CodeQLCLIServer | CodeQLLanguageServer | CodeQLQueryServer> {
    // If another call is already starting a server of this type, wait for it
    // to settle (success or failure) and then re-check whether the result is
    // still usable.
    const inflight = this.pendingStarts.get(type);
    if (inflight) {
      try { await inflight; } catch { /* swallow — original caller handles the rejection */ }
    }

    const work = this.doGetOrRestart(type, config, factory);
    this.pendingStarts.set(type, work);
    try {
      return await work;
    } finally {
      if (this.pendingStarts.get(type) === work) {
        this.pendingStarts.delete(type);
      }
    }
  }

  /**
   * Core logic for getOrRestart, separated to allow serialization.
   */
  private async doGetOrRestart(
    type: CodeQLServerType,
    config: ServerConfig,
    factory: () => CodeQLCLIServer | CodeQLLanguageServer | CodeQLQueryServer,
  ): Promise<CodeQLCLIServer | CodeQLLanguageServer | CodeQLQueryServer> {
    const hash = computeConfigHash(type, config);
    const existing = this.servers.get(type);

    // Reuse if config matches and server is still running
    if (existing && existing.configHash === hash && existing.server.isRunning()) {
      logger.debug(`Reusing existing ${type} server (hash: ${hash.substring(0, 8)})`);
      return existing.server;
    }

    // Config changed or server died — stop the old one
    if (existing) {
      logger.info(`${type} server config changed or dead, restarting...`);
      await this.stopServer(existing);
      this.servers.delete(type);
    }

    // Start a new server
    const server = factory();
    await server.start();

    this.servers.set(type, {
      configHash: hash,
      server,
      sessionId: this.sessionId,
      type,
    });

    logger.info(`${type} server started (hash: ${hash.substring(0, 8)})`);
    return server;
  }

  /**
   * Stop a managed server, ignoring errors.
   */
  private async stopServer(managed: ManagedServer): Promise<void> {
    try {
      await managed.server.shutdown();
    } catch (error) {
      logger.warn(`Error stopping ${managed.type} server:`, error);
      // Best-effort — don't propagate
    }
  }
}

/**
 * Global server manager singleton.
 *
 * Initialized lazily by `getServerManager()`. The MCP server entry point
 * should call `initServerManager()` at startup and `shutdownServerManager()`
 * at graceful shutdown.
 */
let globalServerManager: CodeQLServerManager | null = null;

/**
 * Initialize the global server manager (idempotent).
 */
export function initServerManager(options?: SessionCacheOptions): CodeQLServerManager {
  if (!globalServerManager) {
    globalServerManager = new CodeQLServerManager(options);
  }
  return globalServerManager;
}

/**
 * Get the global server manager, creating it if needed.
 */
export function getServerManager(): CodeQLServerManager {
  if (!globalServerManager) {
    globalServerManager = new CodeQLServerManager();
  }
  return globalServerManager;
}

/**
 * Shut down the global server manager and all its servers.
 */
export async function shutdownServerManager(): Promise<void> {
  if (globalServerManager) {
    await globalServerManager.shutdownAll();
    globalServerManager = null;
  }
}

/**
 * Reset the global server manager (for testing only).
 */
export function resetServerManager(): void {
  globalServerManager = null;
}
