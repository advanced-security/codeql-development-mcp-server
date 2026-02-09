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
import { waitForProcessReady } from '../utils/process-ready';

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
  loglevel?: 'ALL' | 'DEBUG' | 'ERROR' | 'INFO' | 'OFF' | 'TRACE' | 'WARN';
  synchronous?: boolean;
  verbosity?: 'errors' | 'progress' | 'progress+' | 'progress++' | 'progress+++' | 'warnings';
}

/**
 * Position in a text document (0-based line and character).
 */
export interface LSPPosition {
  character: number;
  line: number;
}

/**
 * A range in a text document.
 */
export interface LSPRange {
  end: LSPPosition;
  start: LSPPosition;
}

/**
 * A location in a resource (file URI + range).
 */
export interface LSPLocation {
  range: LSPRange;
  uri: string;
}

/**
 * Identifies a text document by its URI.
 */
export interface TextDocumentIdentifier {
  uri: string;
}

/**
 * A text document position (document + position within it).
 */
export interface TextDocumentPositionParams {
  position: LSPPosition;
  textDocument: TextDocumentIdentifier;
}

/**
 * A completion item returned by the language server.
 */
export interface CompletionItem {
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  kind?: number;
  label: string;
  sortText?: string;
}

export class CodeQLLanguageServer extends EventEmitter {
  private server: ChildProcess | null = null;
  private messageId = 1;
  private pendingResponses = new Map<number, { resolve: (_value: unknown) => void; reject: (_error: Error) => void }>();
  private isInitialized = false;
  private currentWorkspaceUri: string | undefined;
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

    // Wait for the JVM to initialise (resolves on first stderr/stdout output)
    await waitForProcessReady(this.server, 'CodeQL Language Server');
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

  /**
   * Initialize the language server with an optional workspace URI.
   *
   * If the server is already initialized with a different workspace, a
   * `workspace/didChangeWorkspaceFolders` notification is sent to update
   * the workspace context instead of requiring a full restart.
   */
  async initialize(workspaceUri?: string): Promise<void> {
    if (this.isInitialized) {
      // If workspace changed, notify the server
      if (workspaceUri && workspaceUri !== this.currentWorkspaceUri) {
        await this.updateWorkspace(workspaceUri);
      }
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
          completion: { completionItem: { snippetSupport: false } },
          definition: {},
          publishDiagnostics: {},
          references: {},
          synchronization: {
            didClose: true,
            didChange: true,
            didOpen: true,
          },
        },
        workspace: {
          workspaceFolders: true,
        },
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

    this.currentWorkspaceUri = workspaceUri;
    this.isInitialized = true;
    logger.info('CodeQL Language Server initialized successfully');
  }

  /**
   * Update the workspace folders on a running, initialized server.
   */
  private async updateWorkspace(newUri: string): Promise<void> {
    logger.info(`Updating workspace from ${this.currentWorkspaceUri} to ${newUri}`);

    const removed = this.currentWorkspaceUri
      ? [{ uri: this.currentWorkspaceUri, name: 'codeql-workspace' }]
      : [];

    this.sendNotification('workspace/didChangeWorkspaceFolders', {
      event: {
        added: [{ uri: newUri, name: 'codeql-workspace' }],
        removed,
      },
    });

    this.currentWorkspaceUri = newUri;
  }

  /**
   * Get the current workspace URI.
   */
  getWorkspaceUri(): string | undefined {
    return this.currentWorkspaceUri;
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

  // ---- LSP feature methods (issue #1) ----

  /**
   * Get code completions at a position in a document.
   */
  async getCompletions(params: TextDocumentPositionParams): Promise<CompletionItem[]> {
    if (!this.isInitialized) {
      throw new Error('Language server is not initialized');
    }
    if (!this.isRunning()) {
      throw new Error('Language server process is not running');
    }
    const result = await this.sendRequest('textDocument/completion', params);
    // The result may be a CompletionList or CompletionItem[]
    if (result && typeof result === 'object' && 'items' in (result as object)) {
      return (result as { items: CompletionItem[] }).items;
    }
    return (result as CompletionItem[]) || [];
  }

  /**
   * Find the definition(s) of a symbol at a position.
   */
  async getDefinition(params: TextDocumentPositionParams): Promise<LSPLocation[]> {
    if (!this.isInitialized) {
      throw new Error('Language server is not initialized');
    }
    if (!this.isRunning()) {
      throw new Error('Language server process is not running');
    }
    const result = await this.sendRequest('textDocument/definition', params);
    return this.normalizeLocations(result);
  }

  /**
   * Find all references to a symbol at a position.
   */
  async getReferences(params: TextDocumentPositionParams & { context?: { includeDeclaration: boolean } }): Promise<LSPLocation[]> {
    if (!this.isInitialized) {
      throw new Error('Language server is not initialized');
    }
    if (!this.isRunning()) {
      throw new Error('Language server process is not running');
    }
    const result = await this.sendRequest('textDocument/references', {
      ...params,
      context: params.context ?? { includeDeclaration: true },
    });
    return this.normalizeLocations(result);
  }

  /**
   * Open a text document in the language server.
   * The document must be opened before requesting completions, definitions, etc.
   */
  openDocument(uri: string, text: string, languageId = 'ql', version = 1): void {
    if (!this.isInitialized) {
      throw new Error('Language server is not initialized');
    }
    this.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId, version, text },
    });
  }

  /**
   * Close a text document in the language server.
   */
  closeDocument(uri: string): void {
    if (!this.isInitialized) {
      throw new Error('Language server is not initialized');
    }
    this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });
  }

  /**
   * Normalize a definition/references/implementation result to Location[].
   * The LSP spec allows Location | Location[] | LocationLink[].
   */
  private normalizeLocations(result: unknown): LSPLocation[] {
    if (!result) return [];
    if (Array.isArray(result)) {
      return result.map((item) => {
        // LocationLink has targetUri/targetRange
        if ('targetUri' in item) {
          return { uri: item.targetUri, range: item.targetRange } as LSPLocation;
        }
        return item as LSPLocation;
      });
    }
    // Single Location
    if (typeof result === 'object' && 'uri' in (result as object)) {
      return [result as LSPLocation];
    }
    return [];
  }

  async shutdown(): Promise<void> {
    if (!this.server) {
      return;
    }

    logger.info('Shutting down CodeQL Language Server...');

    try {
      await this.sendRequest('shutdown', {});
      if (this.server) {
        this.sendNotification('exit', {});
      }
    } catch (error) {
      logger.warn('Error during graceful shutdown:', error);
    }

    // Force kill if needed
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (this.server) {
          this.server.kill('SIGTERM');
        }
        resolve();
      }, 1000);

      if (this.server) {
        this.server.once('exit', () => {
          clearTimeout(timer);
          this.server = null;
          resolve();
        });
      } else {
        clearTimeout(timer);
        resolve();
      }
    });

    this.isInitialized = false;
  }

  isRunning(): boolean {
    return this.server !== null && !this.server.killed;
  }
}