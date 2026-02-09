/**
 * Configuration types for CodeQL background server processes.
 *
 * CodeQL provides three background server types:
 * 1. language-server  – LSP-based QL validation (JSON-RPC over stdio)
 * 2. query-server2    – Query evaluation (custom protocol over stdio)
 * 3. cli-server       – JVM reuse for CLI commands (custom protocol over stdio)
 *
 * Each server type has its own configuration options, but they share common
 * settings like searchPath and commonCaches.
 */

import { createHash } from 'crypto';

/**
 * Server types supported by CodeQL.
 */
export type CodeQLServerType = 'cli' | 'language' | 'query';

/**
 * Common configuration shared across all server types.
 */
export interface BaseServerConfig {
  /** Path to QL packs (like `codeql query compile --search-path`). */
  searchPath?: string;
  /** Location for cached data (compilation plans, downloaded packs). */
  commonCaches?: string;
  /** Directory for detailed logs. */
  logdir?: string;
}

/**
 * Configuration for the CodeQL Language Server.
 */
export interface LanguageServerConfig extends BaseServerConfig {
  /** Error checking mode. Default: ON_CHANGE */
  checkErrors?: 'EXPLICIT' | 'ON_CHANGE';
  /** Log level for the language server. */
  loglevel?: 'ALL' | 'DEBUG' | 'ERROR' | 'INFO' | 'OFF' | 'TRACE' | 'WARN';
  /** Single-threaded execution. */
  synchronous?: boolean;
  /** Verbosity level for progress. */
  verbosity?: 'errors' | 'progress' | 'progress+' | 'progress++' | 'progress+++' | 'warnings';
}

/**
 * Configuration for the CodeQL Query Server (query-server2).
 */
export interface QueryServerConfig extends BaseServerConfig {
  /** Thread count. 0 = one per core, -N = leave N cores free. */
  threads?: number;
  /** Query evaluation timeout in seconds. */
  timeout?: number;
  /** Maximum disk cache size in MB for intermediate results. */
  maxDiskCache?: number;
  /** Path for structured evaluator performance logs. */
  evaluatorLog?: string;
  /** Include tuple counts in evaluation logs. */
  tupleCounting?: boolean;
  /** Enable debug mode. */
  debug?: boolean;
}

/**
 * Configuration for the CodeQL CLI Server.
 */
export interface CLIServerConfig extends BaseServerConfig {
  // cli-server has fewer options — just commonCaches and logdir.
}

/**
 * Union of all server configurations (discriminated by usage context).
 */
export type ServerConfig = CLIServerConfig | LanguageServerConfig | QueryServerConfig;

/**
 * Compute a deterministic hash for a server configuration.
 * Used to detect configuration changes that require a server restart.
 *
 * @param type - The server type.
 * @param config - The server configuration.
 * @returns A hex-encoded SHA-256 hash of the canonical JSON representation.
 */
export function computeConfigHash(type: CodeQLServerType, config: ServerConfig): string {
  // Deep-sort all keys to ensure deterministic serialization regardless of
  // property insertion order.
  const sortKeys = (_key: string, value: unknown): unknown => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  };
  const canonical = JSON.stringify({ config, type }, sortKeys);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Build command-line arguments for a language server from its configuration.
 */
export function buildLanguageServerArgs(config: LanguageServerConfig): string[] {
  const args: string[] = [
    'execute', 'language-server',
    `--check-errors=${config.checkErrors ?? 'ON_CHANGE'}`,
  ];

  if (config.searchPath) {
    args.push(`--search-path=${config.searchPath}`);
  }
  if (config.commonCaches) {
    args.push(`--common-caches=${config.commonCaches}`);
  }
  if (config.logdir) {
    args.push(`--logdir=${config.logdir}`);
  }
  if (config.loglevel) {
    args.push(`--loglevel=${config.loglevel}`);
  }
  if (config.synchronous) {
    args.push('--synchronous');
  }
  if (config.verbosity) {
    args.push(`--verbosity=${config.verbosity}`);
  }

  return args;
}

/**
 * Build command-line arguments for a query server from its configuration.
 */
export function buildQueryServerArgs(config: QueryServerConfig): string[] {
  const args: string[] = [
    'execute', 'query-server2',
  ];

  if (config.searchPath) {
    args.push(`--search-path=${config.searchPath}`);
  }
  if (config.commonCaches) {
    args.push(`--common-caches=${config.commonCaches}`);
  }
  if (config.logdir) {
    args.push(`--logdir=${config.logdir}`);
  }
  if (config.threads !== undefined) {
    args.push(`--threads=${config.threads}`);
  }
  if (config.timeout !== undefined) {
    args.push(`--timeout=${config.timeout}`);
  }
  if (config.maxDiskCache !== undefined) {
    args.push(`--max-disk-cache=${config.maxDiskCache}`);
  }
  if (config.evaluatorLog) {
    args.push(`--evaluator-log=${config.evaluatorLog}`);
  }
  if (config.debug) {
    args.push('--debug');
    args.push('--tuple-counting');
  } else if (config.tupleCounting) {
    args.push('--tuple-counting');
  }

  return args;
}

/**
 * Build command-line arguments for a CLI server from its configuration.
 */
export function buildCLIServerArgs(config: CLIServerConfig): string[] {
  const args: string[] = [
    'execute', 'cli-server',
  ];

  if (config.commonCaches) {
    args.push(`--common-caches=${config.commonCaches}`);
  }
  if (config.logdir) {
    args.push(`--logdir=${config.logdir}`);
  }

  return args;
}
