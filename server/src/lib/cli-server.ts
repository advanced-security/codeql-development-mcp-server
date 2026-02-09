/**
 * CodeQL CLI Server client.
 *
 * Manages a long-lived `codeql execute cli-server` process that executes CLI
 * commands without repeated JVM startup overhead. Commands are serialized as
 * JSON arrays followed by a NUL byte, and responses are NUL-terminated JSON.
 *
 * Inspired by the `CodeQLCliServer` class in github/vscode-codeql.
 */

import { ChildProcess, spawn } from 'child_process';
import { delimiter } from 'path';
import { EventEmitter } from 'events';
import { clearTimeout, setTimeout } from 'timers';
import { buildCLIServerArgs, CLIServerConfig } from './server-config';
import { getResolvedCodeQLDir } from './cli-executor';
import { logger } from '../utils/logger';
import { waitForProcessReady } from '../utils/process-ready';

/**
 * A queued command waiting to be sent to the CLI server.
 */
interface QueuedCommand {
  args: string[];
  reject: (_error: Error) => void;
  resolve: (_value: string) => void;
}

/**
 * Client for the CodeQL CLI Server process.
 *
 * The cli-server uses a simple NUL-delimited protocol:
 * - **Request**: JSON array of command arguments, followed by a NUL byte.
 * - **Response**: command stdout, terminated by a NUL byte on stdout.
 *                 stderr is forwarded as-is.
 */
export class CodeQLCLIServer extends EventEmitter {
  private commandInProgress = false;
  private commandQueue: Array<() => void> = [];
  private readonly config: CLIServerConfig;
  private currentReject: ((_error: Error) => void) | null = null;
  private currentResolve: ((_value: string) => void) | null = null;
  private nullBuffer = Buffer.alloc(1);
  private process: ChildProcess | null = null;
  private stdoutBuffer = '';

  constructor(config: CLIServerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the cli-server process.
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('CLI server is already running');
    }

    logger.info('Starting CodeQL CLI Server...');

    const args = buildCLIServerArgs(this.config);

    const spawnEnv = { ...process.env };
    const codeqlDir = getResolvedCodeQLDir();
    if (codeqlDir && spawnEnv.PATH) {
      spawnEnv.PATH = `${codeqlDir}${delimiter}${spawnEnv.PATH}`;
    } else if (codeqlDir) {
      spawnEnv.PATH = codeqlDir;
    }

    this.process = spawn('codeql', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: spawnEnv,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleStdout(data);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      logger.debug('CLIServer stderr:', data.toString());
    });

    this.process.on('error', (error: Error) => {
      logger.error('CLI server process error:', error);
      if (this.currentReject) {
        this.currentReject(error);
        this.currentReject = null;
        this.currentResolve = null;
      }
      this.emit('error', error);
    });

    this.process.on('exit', (code: number | null) => {
      logger.info(`CLI server exited with code: ${code}`);
      if (this.currentReject) {
        this.currentReject(new Error(`CLI server exited unexpectedly with code: ${code}`));
        this.currentReject = null;
        this.currentResolve = null;
      }
      this.process = null;
      this.emit('exit', code);
    });

    // Wait for the JVM to initialise (resolves on first stderr/stdout output)
    await waitForProcessReady(this.process, 'CodeQL CLI Server');
    logger.info('CodeQL CLI Server started');
  }

  /**
   * Run a CodeQL CLI command through the persistent server.
   *
   * Commands are serialized and queued; only one command runs at a time.
   *
   * @param args - The full command arguments (e.g. `['resolve', 'qlpacks']`).
   * @returns The stdout output from the command.
   */
  runCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const execute = () => {
        this.executeCommand({ args, reject, resolve });
      };

      if (this.commandInProgress) {
        this.commandQueue.push(execute);
      } else {
        execute();
      }
    });
  }

  /**
   * Gracefully shut down the CLI server.
   */
  async shutdown(): Promise<void> {
    if (!this.process) {
      return;
    }

    logger.info('Shutting down CodeQL CLI Server...');

    try {
      // Send shutdown command
      this.process.stdin?.write(JSON.stringify(['shutdown']), 'utf8');
      this.process.stdin?.write(this.nullBuffer);
    } catch (error) {
      logger.warn('Error during CLI server shutdown request:', error);
    }

    // Give it a moment, then force kill
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGTERM');
          this.process = null;
        }
        resolve();
      }, 2000);

      if (this.process) {
        this.process.once('exit', () => {
          clearTimeout(timer);
          this.process = null;
          resolve();
        });
      } else {
        clearTimeout(timer);
        resolve();
      }
    });

    this.commandInProgress = false;
    this.commandQueue = [];
    logger.info('CodeQL CLI Server stopped');
  }

  /**
   * Whether the CLI server process is running.
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  // ---- private helpers ----

  private executeCommand(cmd: QueuedCommand): void {
    if (!this.process?.stdin) {
      cmd.reject(new Error('CLI server is not running'));
      return;
    }

    this.commandInProgress = true;
    this.currentResolve = cmd.resolve;
    this.currentReject = cmd.reject;
    this.stdoutBuffer = '';

    try {
      this.process.stdin.write(JSON.stringify(cmd.args), 'utf8');
      this.process.stdin.write(this.nullBuffer);
    } catch (error) {
      this.commandInProgress = false;
      this.currentResolve = null;
      this.currentReject = null;
      cmd.reject(error instanceof Error ? error : new Error(String(error)));
      this.runNext();
    }
  }

  private handleStdout(data: Buffer): void {
    const str = data.toString();

    // Look for NUL byte delimiter
    const nulIndex = str.indexOf('\0');
    if (nulIndex === -1) {
      // No delimiter yet, accumulate
      this.stdoutBuffer += str;
      return;
    }

    // Found delimiter — command is complete
    this.stdoutBuffer += str.substring(0, nulIndex);
    const result = this.stdoutBuffer;
    this.stdoutBuffer = '';

    if (this.currentResolve) {
      this.currentResolve(result);
      this.currentResolve = null;
      this.currentReject = null;
    }

    this.commandInProgress = false;
    this.runNext();

    // Handle any remaining data after the NUL byte
    const remainder = str.substring(nulIndex + 1);
    if (remainder.length > 0) {
      this.stdoutBuffer = remainder;
    }
  }

  private runNext(): void {
    const next = this.commandQueue.shift();
    if (next) {
      next();
    }
  }
}
