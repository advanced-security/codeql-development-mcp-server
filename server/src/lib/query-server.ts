/**
 * CodeQL Query Server (query-server2) client.
 *
 * Manages a long-lived `codeql execute query-server2` process that evaluates
 * queries using a custom JSON-RPC protocol over stdio. Reusing the server
 * avoids repeated JVM startup for each query evaluation.
 *
 * Protocol: The query-server2 uses JSON-RPC with Content-Length headers
 * (same framing as LSP) over stdin/stdout.
 */

import { ChildProcess, spawn } from 'child_process';
import { delimiter } from 'path';
import { EventEmitter } from 'events';
import { clearTimeout, setTimeout } from 'timers';
import { buildQueryServerArgs, QueryServerConfig } from './server-config';
import { getResolvedCodeQLDir } from './cli-executor';
import { logger } from '../utils/logger';
import { waitForProcessReady } from '../utils/process-ready';

/**
 * A pending request awaiting a response from the query server.
 */
interface PendingRequest {
  reject: (_error: Error) => void;
  resolve: (_value: unknown) => void;
}

/**
 * Client for the CodeQL query-server2 process.
 *
 * Spawns `codeql execute query-server2` and communicates over stdin/stdout
 * using JSON-RPC with Content-Length framing.
 */
export class CodeQLQueryServer extends EventEmitter {
  private messageBuffer = '';
  private messageId = 1;
  private pendingRequests = new Map<number, PendingRequest>();
  private process: ChildProcess | null = null;
  private readonly config: QueryServerConfig;

  constructor(config: QueryServerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the query-server2 process.
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Query server is already running');
    }

    logger.info('Starting CodeQL Query Server (query-server2)...');

    const args = buildQueryServerArgs(this.config);

    // Build environment with CODEQL_PATH directory prepended to PATH
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

    this.process.stderr?.on('data', (data: Buffer) => {
      logger.debug('QueryServer2 stderr:', data.toString());
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleStdout(data);
    });

    this.process.on('error', (error: Error) => {
      logger.error('Query server process error:', error);
      this.emit('error', error);
    });

    this.process.on('exit', (code: number | null) => {
      logger.info(`Query server exited with code: ${code}`);
      this.rejectAllPending(new Error(`Query server exited with code: ${code}`));
      this.process = null;
      this.emit('exit', code);
    });

    // Wait for the JVM to initialise (resolves on first stderr/stdout output)
    await waitForProcessReady(this.process, 'CodeQL Query Server');
    logger.info('CodeQL Query Server started');
  }

  /**
   * Send a request to the query server and await the response.
   *
   * @param method - The JSON-RPC method name.
   * @param params - The method parameters.
   * @param timeoutMs - Request timeout in milliseconds (default: 300000 = 5 min).
   * @returns The result from the server.
   */
  sendRequest(method: string, params?: unknown, timeoutMs = 300_000): Promise<unknown> {
    const id = this.messageId++;
    const message = {
      id,
      jsonrpc: '2.0' as const,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { reject, resolve });

      try {
        this.sendRaw(message);
      } catch (error) {
        // Clean up immediately — sendRaw() failed so no response will arrive.
        this.pendingRequests.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Query server request timeout for method: ${method}`));
        }
      }, timeoutMs);

      // Clear the timeout when the promise settles
      const originalResolve = resolve;
      const originalReject = reject;
      const wrapped = {
        reject: (err: Error) => { clearTimeout(timer); originalReject(err); },
        resolve: (val: unknown) => { clearTimeout(timer); originalResolve(val); },
      };
      this.pendingRequests.set(id, wrapped);
    });
  }

  /**
   * Gracefully shut down the query server.
   */
  async shutdown(): Promise<void> {
    if (!this.process) {
      return;
    }

    logger.info('Shutting down CodeQL Query Server...');

    try {
      await this.sendRequest('shutdown', {}, 5000);
    } catch (error) {
      logger.warn('Error during query server graceful shutdown:', error);
    }

    // Force kill if process lingers
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
  }

  /**
   * Whether the query server process is running.
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  // ---- private helpers ----

  private handleStdout(data: Buffer): void {
    this.messageBuffer += data.toString();

    let headerEnd = this.messageBuffer.indexOf('\r\n\r\n');
    while (headerEnd !== -1) {
      const header = this.messageBuffer.substring(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length: (\d+)/);

      if (contentLengthMatch) {
        const contentLength = parseInt(contentLengthMatch[1]);
        const messageStart = headerEnd + 4;
        const messageEnd = messageStart + contentLength;

        if (this.messageBuffer.length >= messageEnd) {
          const messageContent = this.messageBuffer.substring(messageStart, messageEnd);
          this.messageBuffer = this.messageBuffer.substring(messageEnd);

          try {
            const message = JSON.parse(messageContent);
            this.handleMessage(message);
          } catch (error) {
            logger.error('Failed to parse query server message:', error);
          }

          headerEnd = this.messageBuffer.indexOf('\r\n\r\n');
        } else {
          break;
        }
      } else {
        logger.error('Invalid query server header:', header);
        this.messageBuffer = '';
        break;
      }
    }
  }

  private handleMessage(message: { error?: { message: string }; id?: number; method?: string; params?: unknown; result?: unknown }): void {
    logger.debug('QueryServer2 message:', message);

    // Handle responses
    if (message.id !== undefined && this.pendingRequests.has(Number(message.id))) {
      const pending = this.pendingRequests.get(Number(message.id))!;
      this.pendingRequests.delete(Number(message.id));

      if (message.error) {
        pending.reject(new Error(`Query server error: ${message.error.message}`));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    // Handle notifications (progress, etc.)
    if (message.method) {
      this.emit('notification', { method: message.method, params: message.params });
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  private sendRaw(message: object): void {
    if (!this.process?.stdin) {
      throw new Error('Query server is not running');
    }

    const body = JSON.stringify(message);
    const contentLength = Buffer.byteLength(body, 'utf8');
    const frame = `Content-Length: ${contentLength}\r\n\r\n${body}`;
    this.process.stdin.write(frame);
  }
}
