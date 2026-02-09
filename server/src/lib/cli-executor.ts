/**
 * Generic CLI command execution utilities for CodeQL and QLT commands
 */

import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { basename, delimiter, dirname, isAbsolute } from 'path';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

export interface CLIExecutionResult {
  stdout: string;
  stderr: string;
  success: boolean;
  error?: string;
  exitCode?: number;
}

export interface CLIExecutionOptions {
  command: string;
  args: string[];
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

// Whitelist of allowed commands to prevent arbitrary command execution
const ALLOWED_COMMANDS = new Set([
  'codeql',
  'git',
  'node',
  'npm',
  'qlt',
  'which'
]);

// Additional commands allowed in test environments
let testCommands: Set<string> | null = null;

// Whitelist of safe environment variables to pass to child processes
// This prevents potentially malicious environment variables from being passed through
const SAFE_ENV_VARS = [
  'HOME',           // User home directory
  'LANG',           // Locale setting
  'LC_ALL',         // Locale setting
  'LC_CTYPE',       // Locale setting
  'PATH',           // Required to find executables
  'SHELL',          // User's shell (Unix)
  'TEMP',           // Temporary directory (Windows)
  'TERM',           // Terminal type (Unix)
  'TMP',            // Temporary directory (Windows)
  'TMPDIR',         // Temporary directory (Unix)
  'USER',           // Current user (Unix)
  'USERNAME',       // Current user (Windows)
] as const;

// Whitelist of safe environment variable prefixes
// These are needed for CodeQL and Node.js functionality
const SAFE_ENV_PREFIXES = [
  'CODEQL_',        // CodeQL-specific variables
  'NODE_',          // Node.js-specific variables (for npm, etc.)
] as const;

// Pattern for dangerous control characters in CLI arguments
// Rejected characters:
//   \x01-\x08: SOH through BS (start of heading, text, null control chars, backspace)
//   \x0B: Vertical tab - rarely used legitimately, can cause display issues
//   \x0C: Form feed - can cause unexpected page breaks in output
//   \x0E-\x1F: SO through US (shift out/in, device controls, separators)
// Allowed characters:
//   \x00: Null byte - handled separately for clearer error messaging
//   \x09: Horizontal tab - commonly used in file paths and arguments
//   \x0A: Newline (LF) - may appear in multi-line arguments
//   \x0D: Carriage return (CR) - may appear with newlines on Windows
// eslint-disable-next-line no-control-regex
const DANGEROUS_CONTROL_CHARS = /[\x01-\x08\x0B\x0C\x0E-\x1F]/;

/**
 * Enable test-specific commands for testing purposes
 * This should only be called in test environments
 */
export function enableTestCommands(): void {
  testCommands = new Set([
    'cat',
    'echo',
    'ls',
    'sh',
    'sleep'
  ]);
}

/**
 * Disable test-specific commands
 */
export function disableTestCommands(): void {
  testCommands = null;
}

/**
 * Check if a command is allowed
 */
function isCommandAllowed(command: string): boolean {
  return ALLOWED_COMMANDS.has(command) || (testCommands !== null && testCommands.has(command));
}

// Resolved CodeQL binary directory from CODEQL_PATH.
// When set, this directory is prepended to PATH for all child processes
// so that `execFile('codeql', ...)` finds the correct binary via execvp().
// Using PATH lookup (rather than an absolute path) is essential because
// execvp() handles shell-script shebangs correctly, whereas passing an
// absolute path to execFile() can fail with ENOENT for shell scripts.
let resolvedCodeQLDir: string | null = null;

// Cached result from resolveCodeQLBinary(). `undefined` means not yet resolved.
let resolvedBinaryResult: string | undefined;

/**
 * Resolve the CodeQL CLI binary path.
 *
 * Resolution order:
 * 1. `CODEQL_PATH` environment variable — must point to an existing file whose
 *    basename is `codeql` (or `codeql.exe` / `codeql.cmd` on Windows).
 *    The parent directory is prepended to PATH for child processes.
 * 2. Falls back to the bare `codeql` command (resolved via PATH at exec time).
 *
 * The resolved value is cached for the lifetime of the process. Call this once
 * at startup; subsequent calls are a no-op and return the cached value.
 */
export function resolveCodeQLBinary(): string {
  // Short-circuit if already resolved
  if (resolvedBinaryResult !== undefined) {
    return resolvedBinaryResult;
  }

  const envPath = process.env.CODEQL_PATH;

  if (!envPath) {
    resolvedCodeQLDir = null;
    resolvedBinaryResult = 'codeql';
    return resolvedBinaryResult;
  }

  // Validate the path points to a plausible CodeQL binary
  const base = basename(envPath).toLowerCase();
  const validBaseNames = ['codeql', 'codeql.exe', 'codeql.cmd'];
  if (!validBaseNames.includes(base)) {
    throw new Error(
      `CODEQL_PATH must point to a CodeQL CLI binary (expected basename: codeql), got: ${base}`
    );
  }

  // Require an absolute path to avoid ambiguity
  if (!isAbsolute(envPath)) {
    throw new Error(
      `CODEQL_PATH must be an absolute path, got: ${envPath}`
    );
  }

  // Verify the file exists
  if (!existsSync(envPath)) {
    throw new Error(
      `CODEQL_PATH points to a file that does not exist: ${envPath}`
    );
  }

  resolvedCodeQLDir = dirname(envPath);
  resolvedBinaryResult = 'codeql';
  logger.info(`CodeQL CLI resolved via CODEQL_PATH: ${envPath} (dir: ${resolvedCodeQLDir})`);
  return resolvedBinaryResult;
}

/**
 * Get the currently resolved CodeQL binary directory, or null if using PATH.
 */
export function getResolvedCodeQLDir(): string | null {
  return resolvedCodeQLDir;
}

/**
 * Reset the resolved CodeQL binary to the default (for testing only).
 */
export function resetResolvedCodeQLBinary(): void {
  resolvedCodeQLDir = null;
  resolvedBinaryResult = undefined;
}

/**
 * Validate that the resolved CodeQL binary is actually callable.
 *
 * Runs `codeql version --format=terse` and verifies the process exits
 * successfully. This catches the case where `CODEQL_PATH` is unset and
 * `codeql` is not on PATH — the server would otherwise start normally
 * but every tool invocation would fail.
 *
 * @returns The version string reported by the CodeQL CLI.
 * @throws Error if the binary is not reachable or returns a non-zero exit code.
 */
export async function validateCodeQLBinaryReachable(): Promise<string> {
  const binary = resolvedBinaryResult ?? 'codeql';
  const env = { ...process.env };
  if (resolvedCodeQLDir) {
    env.PATH = resolvedCodeQLDir + delimiter + (env.PATH || '');
  }

  try {
    const { stdout } = await execFileAsync(binary, ['version', '--format=terse'], {
      env,
      timeout: 15_000,
    });
    return stdout.trim();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `CodeQL CLI is not reachable (binary: ${binary}). ` +
      `Ensure codeql is on PATH or set the CODEQL_PATH environment variable ` +
      `to the absolute path of the CodeQL CLI binary. Details: ${message}`
    );
  }
}

/**
 * Sanitize a CLI argument to prevent potential issues with special characters.
 * 
 * While execFile() does not spawn a shell (preventing shell injection), we still
 * validate arguments to:
 * 1. Reject null bytes that could truncate strings in C-based commands
 * 2. Reject control characters that could cause unexpected behavior
 * 3. Provide defense-in-depth against potential issues
 * 
 * @param arg - The argument to sanitize
 * @returns The sanitized argument
 * @throws Error if the argument contains dangerous characters
 */
export function sanitizeCLIArgument(arg: string): string {
  // Reject null bytes - these can truncate strings in C-based commands
  // Error message intentionally excludes argument content to avoid logging potentially sensitive data
  if (arg.includes('\0')) {
    throw new Error(`CLI argument contains null byte: argument rejected for security`);
  }
  
  // Reject control characters using the module-level constant pattern
  if (DANGEROUS_CONTROL_CHARS.test(arg)) {
    // Error message intentionally excludes argument content to avoid logging potentially sensitive data
    throw new Error(`CLI argument contains control characters: argument rejected for security`);
  }
  
  return arg;
}

/**
 * Sanitize an array of CLI arguments
 * @param args - The arguments to sanitize
 * @returns The sanitized arguments
 * @throws Error if any argument contains dangerous characters
 */
export function sanitizeCLIArguments(args: string[]): string[] {
  return args.map(sanitizeCLIArgument);
}

/**
 * Filter environment variables to only include safe ones
 * This prevents potentially malicious environment variables from being passed to child processes
 */
function getSafeEnvironment(additionalEnv?: Record<string, string>): Record<string, string> {
  const safeEnv: Record<string, string> = {};
  
  // Copy whitelisted environment variables from process.env
  for (const key of SAFE_ENV_VARS) {
    if (process.env[key] !== undefined) {
      safeEnv[key] = process.env[key]!;
    }
  }
  
  // Copy environment variables with whitelisted prefixes
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && SAFE_ENV_PREFIXES.some(prefix => key.startsWith(prefix))) {
      safeEnv[key] = value;
    }
  }
  
  // When CODEQL_PATH was set, prepend the resolved directory to PATH so that
  // `execFile('codeql', ...)` finds the user-specified binary via execvp().
  // This approach (PATH manipulation + bare command name) is essential because
  // execvp() handles shell-script shebangs correctly, whereas passing an
  // absolute path to execFile() fails with ENOENT for shell-script launchers.
  if (resolvedCodeQLDir && safeEnv.PATH) {
    safeEnv.PATH = `${resolvedCodeQLDir}${delimiter}${safeEnv.PATH}`;
  } else if (resolvedCodeQLDir) {
    safeEnv.PATH = resolvedCodeQLDir;
  }
  
  // Merge with explicitly provided environment variables
  // These are trusted as they come from the application code, not external sources
  if (additionalEnv) {
    Object.assign(safeEnv, additionalEnv);
  }
  
  return safeEnv;
}

/**
 * Execute a CLI command and return the result.
 * 
 * Security: This function uses execFile() instead of exec() to avoid shell interpretation.
 * Arguments are passed directly to the executable as an array, preventing shell injection.
 * Additional security measures include:
 * - Command whitelist validation
 * - Shell metacharacter detection in command names
 * - CLI argument sanitization (null bytes, control characters)
 * - Environment variable filtering
 */
export async function executeCLICommand(options: CLIExecutionOptions): Promise<CLIExecutionResult> {
  try {
    const { command, args, cwd, timeout = 300000, env } = options; // 5 minute default timeout
    
    // Validate command is in the whitelist to prevent arbitrary command execution
    if (!isCommandAllowed(command)) {
      throw new Error(`Command not allowed: ${command}. Only whitelisted commands can be executed.`);
    }
    
    // Validate command to ensure it doesn't contain shell metacharacters
    if (command.includes(';') || command.includes('|') || command.includes('&') || 
        command.includes('$') || command.includes('`') || command.includes('\n') ||
        command.includes('\r')) {
      throw new Error(`Invalid command: contains shell metacharacters: ${command}`);
    }
    
    // Sanitize CLI arguments to prevent issues with special characters
    // This provides defense-in-depth even though execFile() doesn't use a shell
    const sanitizedArgs = sanitizeCLIArguments(args);
    
    logger.info(`Executing CLI command: ${command}`, { args: sanitizedArgs, cwd, timeout });
    
    const execOptions = {
      cwd,
      timeout,
      env: getSafeEnvironment(env),
    };
    
    // execFile() is used instead of exec() to avoid shell interpretation
    // Arguments are passed as an array, not interpolated into a command string
    const { stdout, stderr } = await execFileAsync(command, sanitizedArgs, execOptions);

    return {
      stdout,
      stderr,
      success: true,
      exitCode: 0
    };

  } catch (error: unknown) {
    logger.error('CLI command execution failed:', error);
    
    const err = error as Error & { code?: number; stdout?: string; stderr?: string };
    const errorMessage = err instanceof Error ? err.message : String(error);
    const exitCode = err.code || 1;
    
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || errorMessage,
      success: false,
      error: errorMessage,
      exitCode
    };
  }
}

/**
 * Build CodeQL command arguments with proper escaping
 */
export function buildCodeQLArgs(subcommand: string, options: Record<string, unknown>): string[] {
  const args = [subcommand];
  
  // Single-letter parameters that should use -key=value format (with equals sign)
  // Note: CodeQL CLI uses -t=key=value format for metadata, not -t key=value
  const singleLetterParams = new Set(['t', 'o', 'v', 'q', 'h', 'J']);
  
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) {
      continue;
    }
    
    const isSingleLetter = key.length === 1 && singleLetterParams.has(key);
    
    if (typeof value === 'boolean') {
      if (value) {
        args.push(isSingleLetter ? `-${key}` : `--${key}`);
      }
    } else if (Array.isArray(value)) {
      // Handle array values (e.g., multiple -t flags for metadata)
      for (const item of value) {
        if (isSingleLetter) {
          // For single-letter params like -t, use -key=value format
          args.push(`-${key}=${String(item)}`);
        } else {
          // For long params, use --key=value format
          args.push(`--${key}=${String(item)}`);
        }
      }
    } else {
      // Handle string, number, and other values
      if (isSingleLetter) {
        // For single-letter params, use -key=value format
        args.push(`-${key}=${String(value)}`);
      } else {
        args.push(`--${key}=${String(value)}`);
      }
    }
  }
  
  return args;
}

/**
 * Build QLT command arguments with proper escaping
 */
export function buildQLTArgs(subcommand: string, options: Record<string, unknown>): string[] {
  const args = [subcommand];
  
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) {
      continue;
    }
    
    if (typeof value === 'boolean') {
      if (value) {
        args.push(`--${key}`);
      }
    } else if (Array.isArray(value)) {
      // Handle array values
      for (const item of value) {
        args.push(`--${key}`, String(item));
      }
    } else {
      // Handle string, number, and other values
      args.push(`--${key}`, String(value));
    }
  }
  
  return args;
}

/**
 * CodeQL subcommands that MUST run as fresh processes.
 *
 * These cannot use the cli-server because they:
 * - Spawn extractors or other long-running child processes (database create, test extract)
 * - Produce multi-event NUL-delimited streams (test run)
 * - Are compound orchestration commands (database analyze)
 *
 * Everything else is routed through the persistent cli-server JVM for
 * sub-second execution instead of 2-5 s JVM cold-start per invocation.
 */
const FRESH_PROCESS_SUBCOMMANDS = new Set([
  'database analyze',
  'database create',
  'test extract',
  'test run',
]);

/**
 * Execute a CodeQL command.
 *
 * By default, commands are routed through the persistent `codeql execute
 * cli-server` process managed by {@link CodeQLServerManager}, eliminating
 * repeated JVM startup overhead (~2-5 s savings per call).
 *
 * Commands listed in {@link FRESH_PROCESS_SUBCOMMANDS} (e.g. `database create`,
 * `test run`) are always executed as fresh processes because they either spawn
 * child extractors, produce streaming output, or require a dedicated working
 * directory.
 *
 * If the cli-server is not available (e.g. during early startup before
 * `initServerManager()` is called), the function falls back transparently to
 * a fresh process.
 */
export async function executeCodeQLCommand(
  subcommand: string,
  options: Record<string, unknown>,
  additionalArgs: string[] = [],
  cwd?: string
): Promise<CLIExecutionResult> {
  const args = buildCodeQLArgs(subcommand, options);
  args.push(...additionalArgs);

  // Determine whether this subcommand can use the persistent cli-server.
  // Commands that need a specific CWD also must use a fresh process because
  // the cli-server's CWD is fixed at startup.
  const canUseCLIServer = !FRESH_PROCESS_SUBCOMMANDS.has(subcommand) && !cwd;

  if (canUseCLIServer) {
    try {
      // Lazy-import to avoid circular dependency at module level.
      // Use getServerManager() (not initServerManager()) — if the manager
      // hasn't been initialized yet (e.g. during tests or early startup),
      // this creates one, but we only attempt to *use* the cli-server if
      // it is already running (warmed up at MCP server startup).  We never
      // block on starting a new cli-server here — that would add JVM
      // startup latency to the first fresh-process-fallback call.
      const { getServerManager } = await import('./server-manager');
      const manager = getServerManager();

      if (manager.isRunning('cli')) {
        const cliServer = await manager.getCLIServer({});
        const sanitizedArgs = sanitizeCLIArguments(args);

        logger.info(`Executing CodeQL command via cli-server: ${subcommand}`, { args: sanitizedArgs });

        const stdout = await cliServer.runCommand(sanitizedArgs);

        return {
          stdout,
          stderr: '',
          success: true,
          exitCode: 0,
        };
      } else {
        logger.debug(`cli-server not yet running for "${subcommand}", using fresh process`);
      }
    } catch (error) {
      // If the cli-server call fails, check whether it's a command-level
      // error (the CLI returned non-zero) or a transport/startup error.
      // For transport errors we fall back to a fresh process; for command
      // errors we return the failure directly.
      const message = error instanceof Error ? error.message : String(error);

      // Transport-level errors that warrant a fallback:
      if (message.includes('CLI server is not running') ||
          message.includes('CLI server exited') ||
          message.includes('failed to start')) {
        logger.warn(`cli-server unavailable for "${subcommand}", falling back to fresh process: ${message}`);
        // Fall through to fresh-process execution below
      } else {
        // Command-level error — return it as a failed result
        logger.error(`cli-server command failed for "${subcommand}": ${message}`);
        return {
          stdout: '',
          stderr: message,
          success: false,
          error: message,
          exitCode: 1,
        };
      }
    }
  }

  // Fresh-process execution (for FRESH_PROCESS_SUBCOMMANDS, CWD-specific
  // calls, or as a fallback when the cli-server is unavailable).
  return executeCLICommand({
    command: 'codeql',
    args,
    cwd
  });
}

/**
 * Execute a QLT command
 */
export async function executeQLTCommand(
  subcommand: string, 
  options: Record<string, unknown>, 
  additionalArgs: string[] = []
): Promise<CLIExecutionResult> {
  const args = buildQLTArgs(subcommand, options);
  args.push(...additionalArgs);
  
  return executeCLICommand({
    command: 'qlt',
    args
  });
}

/**
 * Get help text for a CLI command
 */
export async function getCommandHelp(command: string, subcommand?: string): Promise<string> {
  const args = subcommand ? [subcommand, '--help'] : ['--help'];
  
  const result = await executeCLICommand({
    command,
    args
  });
  
  return result.stdout || result.stderr || 'No help available';
}

/**
 * Validate that a command exists on the system.
 */
export async function validateCommandExists(command: string): Promise<boolean> {
  try {
    const result = await executeCLICommand({
      command: 'which',
      args: [command]
    });
    return result.success;
  } catch {
    return false;
  }
}