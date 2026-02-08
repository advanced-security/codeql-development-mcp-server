/**
 * CodeQL Language Server manager for LSP communication
 * Manages the lifecycle and communication with the CodeQL language server process
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { setTimeout, clearTimeout } from 'timers';
import { pathToFileURL } from 'url';
import { delimiter, join } from 'path';
import { logger } from '../utils/logger';
import { getPackageVersion } from '../utils/package-paths';
import { getProjectTmpDir } from '../utils/temp-dir';
import { getResolvedCodeQLDir } from './cli-executor';

export interface LSPMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number; // 1=Error, 2=Warning, 3=Information, 4=Hint
  source?: string;
  message: string;
  code?: string | number;
}

export interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: Diagnostic[];
}

export interface LanguageServerOptions {
  searchPath?: string;
  logdir?: string;
  loglevel?: 'OFF' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE' | 'ALL';
  synchronous?: boolean;
  verbosity?: 'errors' | 'warnings' | 'progress' | 'progress+' | 'progress++' | 'progress+++';
}

export class CodeQLLanguageServer extends EventEmitter {
  private server: ChildProcess | null = null;
  private messageId = 1;
  private pendingResponses = new Map<number, { resolve: (_value: unknown) => void; reject: (_error: Error) => void }>();
  private isInitialized = false;
  private messageBuffer = '';

  constructor(private _options: LanguageServerOptions = {}) {
    super();
  }

  async start(): Promise<void> {
    if (this.server) {
      throw new Error('Language server is already running');
    }

    logger.info('Starting CodeQL Language Server...');

    const args = [
      'execute', 'language-server',
      '--check-errors=ON_CHANGE'
    ];

    // Add optional arguments
    if (this._options.searchPath) {
      args.push(`--search-path=${this._options.searchPath}`);
    }
    if (this._options.logdir) {
      args.push(`--logdir=${this._options.logdir}`);
    }
    if (this._options.loglevel) {
      args.push(`--loglevel=${this._options.loglevel}`);
    }
    if (this._options.synchronous) {
      args.push('--synchronous');
    }
    if (this._options.verbosity) {
      args.push(`--verbosity=${this._options.verbosity}`);
    }

    // Build environment with CODEQL_PATH directory prepended to PATH
    // (mirrors the approach in cli-executor.ts getSafeEnvironment).
    const spawnEnv = { ...process.env };
    const codeqlDir = getResolvedCodeQLDir();
    if (codeqlDir && spawnEnv.PATH) {
      spawnEnv.PATH = `${codeqlDir}${delimiter}${spawnEnv.PATH}`;
    } else if (codeqlDir) {
      spawnEnv.PATH = codeqlDir;
    }

    this.server = spawn('codeql', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: spawnEnv
    });

    this.server.stderr?.on('data', (data) => {
      logger.debug('CodeQL LS stderr:', data.toString());
    });

    this.server.stdout?.on('data', (data) => {
      this.handleStdout(data);
    });

    this.server.on('error', (error) => {
      logger.error('CodeQL Language Server error:', error);
      this.emit('error', error);
    });

    this.server.on('exit', (code) => {
      logger.info('CodeQL Language Server exited with code:', code);
      this.server = null;
      this.isInitialized = false;
      this.emit('exit', code);
    });

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

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
            const message: LSPMessage = JSON.parse(messageContent);
            this.handleMessage(message);
          } catch (error) {
            logger.error('Failed to parse LSP message:', error, messageContent);
          }
          
          headerEnd = this.messageBuffer.indexOf('\r\n\r\n');
        } else {
          break;
        }
      } else {
        logger.error('Invalid LSP header:', header);
        this.messageBuffer = '';
        break;
      }
    }
  }

  private handleMessage(message: LSPMessage): void {
    logger.debug('Received LSP message:', message);

    // Handle responses to our requests
    if (message.id !== undefined && this.pendingResponses.has(Number(message.id))) {
      const pending = this.pendingResponses.get(Number(message.id))!;
      this.pendingResponses.delete(Number(message.id));
      
      if (message.error) {
        pending.reject(new Error(`LSP Error: ${message.error.message}`));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    // Handle notifications from server
    if (message.method === 'textDocument/publishDiagnostics') {
      this.emit('diagnostics', message.params as PublishDiagnosticsParams);
    }
  }

  private sendMessage(message: LSPMessage): void {
    if (!this.server?.stdin) {
      throw new Error('Language server is not running');
    }

    const messageStr = JSON.stringify(message);
    const contentLength = Buffer.byteLength(messageStr, 'utf8');
    const header = `Content-Length: ${contentLength}\r\n\r\n`;
    const fullMessage = header + messageStr;

    logger.debug('Sending LSP message:', fullMessage);
    this.server.stdin.write(fullMessage);
  }

  private sendRequest(method: string, params?: unknown): Promise<unknown> {
    const id = this.messageId++;
    const message: LSPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingResponses.set(id, { resolve, reject });
      this.sendMessage(message);
      
      // Add timeout
      setTimeout(() => {
        if (this.pendingResponses.has(id)) {
          this.pendingResponses.delete(id);
          reject(new Error(`LSP request timeout for method: ${method}`));
        }
      }, 10000); // 10 second timeout
    });
  }

  private sendNotification(method: string, params?: unknown): void {
    const message: LSPMessage = {
      jsonrpc: '2.0',
      method,
      params
    };
    this.sendMessage(message);
  }

  async initialize(workspaceUri?: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing CodeQL Language Server...');

    const initParams = {
      processId: process.pid,
      clientInfo: {
        name: 'codeql-development-mcp-server',
        version: getPackageVersion()
      },
      capabilities: {
        textDocument: {
          synchronization: {
            didOpen: true,
            didChange: true,
            didClose: true
          },
          publishDiagnostics: {}
        }
      }
    };

    if (workspaceUri) {
      (initParams as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [{
        uri: workspaceUri,
        name: 'codeql-workspace'
      }];
    }

    await this.sendRequest('initialize', initParams);
    this.sendNotification('initialized', {});
    
    this.isInitialized = true;
    logger.info('CodeQL Language Server initialized successfully');
  }

  async evaluateQL(qlCode: string, uri?: string): Promise<Diagnostic[]> {
    if (!this.isInitialized) {
      throw new Error('Language server is not initialized');
    }

    // Default to a project-local virtual URI rather than /tmp
    const documentUri = uri || pathToFileURL(join(getProjectTmpDir('lsp-eval'), 'eval.ql')).href;

    return new Promise((resolve, reject) => {
      let diagnosticsReceived = false;
      const timeout = setTimeout(() => {
        if (!diagnosticsReceived) {
          this.removeAllListeners('diagnostics');
          reject(new Error('Timeout waiting for diagnostics'));
        }
      }, 5000);

      // Listen for diagnostics
      const diagnosticsHandler = (params: PublishDiagnosticsParams) => {
        if (params.uri === documentUri) {
          diagnosticsReceived = true;
          clearTimeout(timeout);
          this.removeListener('diagnostics', diagnosticsHandler);

          // Close the document
          this.sendNotification('textDocument/didClose', {
            textDocument: { uri: documentUri }
          });

          resolve(params.diagnostics);
        }
      };

      this.on('diagnostics', diagnosticsHandler);

      // Open the document with the QL code
      this.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: documentUri,
          languageId: 'ql',
          version: 1,
          text: qlCode
        }
      });
    });
  }

  async shutdown(): Promise<void> {
    if (!this.server) {
      return;
    }

    logger.info('Shutting down CodeQL Language Server...');

    try {
      await this.sendRequest('shutdown', {});
      this.sendNotification('exit', {});
    } catch (error) {
      logger.warn('Error during graceful shutdown:', error);
    }

    // Force kill if needed
    setTimeout(() => {
      if (this.server) {
        this.server.kill('SIGTERM');
      }
    }, 1000);

    this.isInitialized = false;
  }

  isRunning(): boolean {
    return this.server !== null && !this.server.killed;
  }
}