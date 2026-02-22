#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/utils/logger.ts
var logger;
var init_logger = __esm({
  "src/utils/logger.ts"() {
    "use strict";
    logger = {
      info: (message, ...args) => {
        console.error(`[INFO] ${(/* @__PURE__ */ new Date()).toISOString()} ${message}`, ...args);
      },
      error: (message, ...args) => {
        console.error(`[ERROR] ${(/* @__PURE__ */ new Date()).toISOString()} ${message}`, ...args);
      },
      warn: (message, ...args) => {
        console.error(`[WARN] ${(/* @__PURE__ */ new Date()).toISOString()} ${message}`, ...args);
      },
      debug: (message, ...args) => {
        if (process.env.DEBUG) {
          console.error(`[DEBUG] ${(/* @__PURE__ */ new Date()).toISOString()} ${message}`, ...args);
        }
      }
    };
  }
});

// src/lib/server-config.ts
import { createHash } from "crypto";
function computeConfigHash(type2, config) {
  const sortKeys = (_key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const sorted = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = value[k];
      }
      return sorted;
    }
    return value;
  };
  const canonical = JSON.stringify({ config, type: type2 }, sortKeys);
  return createHash("sha256").update(canonical).digest("hex");
}
function buildQueryServerArgs(config) {
  const args = [
    "execute",
    "query-server2"
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
  if (config.threads !== void 0) {
    args.push(`--threads=${config.threads}`);
  }
  if (config.timeout !== void 0) {
    args.push(`--timeout=${config.timeout}`);
  }
  if (config.maxDiskCache !== void 0) {
    args.push(`--max-disk-cache=${config.maxDiskCache}`);
  }
  if (config.evaluatorLog) {
    args.push(`--evaluator-log=${config.evaluatorLog}`);
  }
  if (config.debug) {
    args.push("--debug");
    args.push("--tuple-counting");
  } else if (config.tupleCounting) {
    args.push("--tuple-counting");
  }
  return args;
}
function buildCLIServerArgs(config) {
  const args = [
    "execute",
    "cli-server"
  ];
  if (config.commonCaches) {
    args.push(`--common-caches=${config.commonCaches}`);
  }
  if (config.logdir) {
    args.push(`--logdir=${config.logdir}`);
  }
  return args;
}
var init_server_config = __esm({
  "src/lib/server-config.ts"() {
    "use strict";
  }
});

// src/utils/package-paths.ts
var package_paths_exports = {};
__export(package_paths_exports, {
  getPackageRootDir: () => getPackageRootDir,
  getPackageVersion: () => getPackageVersion,
  getUserWorkspaceDir: () => getUserWorkspaceDir,
  getWorkspaceRootDir: () => getWorkspaceRootDir,
  packageRootDir: () => packageRootDir,
  resolveToolQueryPackPath: () => resolveToolQueryPackPath,
  workspaceRootDir: () => workspaceRootDir
});
import { dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
function isRunningFromSource(dir) {
  const normalized = dir.replace(/\\/g, "/");
  return /\/src(\/[^/]+)?$/.test(normalized);
}
function getPackageRootDir(currentDir = __dirname) {
  return isRunningFromSource(currentDir) ? resolve(currentDir, "..", "..") : resolve(currentDir, "..");
}
function getWorkspaceRootDir(packageRoot) {
  const pkgRoot = packageRoot ?? getPackageRootDir();
  const parentDir = resolve(pkgRoot, "..");
  try {
    const parentPkgPath = resolve(parentDir, "package.json");
    if (existsSync(parentPkgPath)) {
      const parentPkg = JSON.parse(readFileSync(parentPkgPath, "utf8"));
      if (parentPkg.workspaces) {
        return parentDir;
      }
    }
  } catch {
  }
  return pkgRoot;
}
function resolveToolQueryPackPath(language, packageRoot) {
  const pkgRoot = packageRoot ?? getPackageRootDir();
  return resolve(pkgRoot, "ql", language, "tools", "src");
}
function getPackageVersion() {
  if (_cachedVersion !== void 0) return _cachedVersion;
  try {
    const pkgPath = resolve(getPackageRootDir(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    _cachedVersion = pkg.version ?? "0.0.0";
  } catch {
    _cachedVersion = "0.0.0";
  }
  return _cachedVersion;
}
function getUserWorkspaceDir() {
  if (process.env.CODEQL_MCP_WORKSPACE) {
    return process.env.CODEQL_MCP_WORKSPACE;
  }
  if (workspaceRootDir === packageRootDir) {
    return process.cwd();
  }
  return workspaceRootDir;
}
var __filename, __dirname, _cachedVersion, packageRootDir, workspaceRootDir;
var init_package_paths = __esm({
  "src/utils/package-paths.ts"() {
    "use strict";
    __filename = fileURLToPath(import.meta.url);
    __dirname = dirname(__filename);
    packageRootDir = getPackageRootDir();
    workspaceRootDir = getWorkspaceRootDir(packageRootDir);
  }
});

// src/utils/temp-dir.ts
import { mkdirSync, mkdtempSync } from "fs";
import { isAbsolute, join, resolve as resolve2 } from "path";
function getProjectTmpBase() {
  mkdirSync(PROJECT_TMP_BASE, { recursive: true });
  return PROJECT_TMP_BASE;
}
function createProjectTempDir(prefix) {
  const base = getProjectTmpBase();
  return mkdtempSync(join(base, prefix));
}
function getProjectTmpDir(name) {
  const dir = join(getProjectTmpBase(), name);
  mkdirSync(dir, { recursive: true });
  return dir;
}
var PROJECT_TMP_BASE;
var init_temp_dir = __esm({
  "src/utils/temp-dir.ts"() {
    "use strict";
    init_package_paths();
    PROJECT_TMP_BASE = process.env.CODEQL_MCP_TMP_DIR ? isAbsolute(process.env.CODEQL_MCP_TMP_DIR) ? process.env.CODEQL_MCP_TMP_DIR : resolve2(process.cwd(), process.env.CODEQL_MCP_TMP_DIR) : join(getPackageRootDir(), ".tmp");
  }
});

// src/utils/process-ready.ts
import { clearTimeout, setTimeout as setTimeout2 } from "timers";
function waitForProcessReady(child, name, opts) {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
  return new Promise((resolve13, reject) => {
    let settled = false;
    const cleanup = () => {
      settled = true;
      child.stderr?.removeListener("data", onStderr);
      child.stdout?.removeListener("data", onStdout);
      child.removeListener("error", onError);
      child.removeListener("exit", onExit);
      clearTimeout(timer);
    };
    const onStderr = () => {
      if (settled) return;
      logger.debug(`${name}: ready (stderr output detected)`);
      cleanup();
      resolve13();
    };
    const onStdout = () => {
      if (settled) return;
      logger.debug(`${name}: ready (stdout output detected)`);
      cleanup();
      resolve13();
    };
    const onError = (error) => {
      if (settled) return;
      cleanup();
      reject(new Error(`${name} failed to start: ${error.message}`));
    };
    const onExit = (code) => {
      if (settled) return;
      cleanup();
      reject(new Error(`${name} exited before becoming ready (code: ${code})`));
    };
    const timer = setTimeout2(() => {
      if (settled) return;
      logger.warn(`${name}: readiness timeout (${timeoutMs} ms) \u2014 proceeding anyway`);
      cleanup();
      resolve13();
    }, timeoutMs);
    child.stderr?.on("data", onStderr);
    child.stdout?.on("data", onStdout);
    child.on("error", onError);
    child.on("exit", onExit);
    if (child.killed || child.exitCode !== null) {
      cleanup();
      reject(new Error(`${name} is not running (exitCode: ${child.exitCode})`));
    }
  });
}
var DEFAULT_READY_TIMEOUT_MS;
var init_process_ready = __esm({
  "src/utils/process-ready.ts"() {
    "use strict";
    init_logger();
    DEFAULT_READY_TIMEOUT_MS = 3e4;
  }
});

// src/lib/language-server.ts
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { setTimeout as setTimeout3, clearTimeout as clearTimeout2 } from "timers";
import { pathToFileURL } from "url";
import { delimiter, join as join2 } from "path";
var CodeQLLanguageServer;
var init_language_server = __esm({
  "src/lib/language-server.ts"() {
    "use strict";
    init_logger();
    init_package_paths();
    init_temp_dir();
    init_cli_executor();
    init_process_ready();
    CodeQLLanguageServer = class extends EventEmitter {
      constructor(_options = {}) {
        super();
        this._options = _options;
      }
      server = null;
      messageId = 1;
      pendingResponses = /* @__PURE__ */ new Map();
      isInitialized = false;
      currentWorkspaceUri;
      messageBuffer = "";
      async start() {
        if (this.server) {
          throw new Error("Language server is already running");
        }
        logger.info("Starting CodeQL Language Server...");
        const args = [
          "execute",
          "language-server",
          "--check-errors=ON_CHANGE"
        ];
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
          args.push("--synchronous");
        }
        if (this._options.verbosity) {
          args.push(`--verbosity=${this._options.verbosity}`);
        }
        const spawnEnv = { ...process.env };
        const codeqlDir = getResolvedCodeQLDir();
        if (codeqlDir && spawnEnv.PATH) {
          spawnEnv.PATH = `${codeqlDir}${delimiter}${spawnEnv.PATH}`;
        } else if (codeqlDir) {
          spawnEnv.PATH = codeqlDir;
        }
        this.server = spawn("codeql", args, {
          stdio: ["pipe", "pipe", "pipe"],
          env: spawnEnv
        });
        this.server.stderr?.on("data", (data) => {
          logger.debug("CodeQL LS stderr:", data.toString());
        });
        this.server.stdout?.on("data", (data) => {
          this.handleStdout(data);
        });
        this.server.on("error", (error) => {
          logger.error("CodeQL Language Server error:", error);
          this.emit("error", error);
        });
        this.server.on("exit", (code) => {
          logger.info("CodeQL Language Server exited with code:", code);
          this.server = null;
          this.isInitialized = false;
          this.emit("exit", code);
        });
        await waitForProcessReady(this.server, "CodeQL Language Server");
      }
      handleStdout(data) {
        this.messageBuffer += data.toString();
        let headerEnd = this.messageBuffer.indexOf("\r\n\r\n");
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
                logger.error("Failed to parse LSP message:", error, messageContent);
              }
              headerEnd = this.messageBuffer.indexOf("\r\n\r\n");
            } else {
              break;
            }
          } else {
            logger.error("Invalid LSP header:", header);
            this.messageBuffer = "";
            break;
          }
        }
      }
      handleMessage(message) {
        logger.debug("Received LSP message:", message);
        if (message.id !== void 0 && this.pendingResponses.has(Number(message.id))) {
          const pending = this.pendingResponses.get(Number(message.id));
          this.pendingResponses.delete(Number(message.id));
          if (message.error) {
            pending.reject(new Error(`LSP Error: ${message.error.message}`));
          } else {
            pending.resolve(message.result);
          }
          return;
        }
        if (message.method === "textDocument/publishDiagnostics") {
          this.emit("diagnostics", message.params);
        }
      }
      sendMessage(message) {
        if (!this.server?.stdin) {
          throw new Error("Language server is not running");
        }
        const messageStr = JSON.stringify(message);
        const contentLength = Buffer.byteLength(messageStr, "utf8");
        const header = `Content-Length: ${contentLength}\r
\r
`;
        const fullMessage = header + messageStr;
        logger.debug("Sending LSP message:", fullMessage);
        this.server.stdin.write(fullMessage);
      }
      sendRequest(method, params) {
        const id = this.messageId++;
        const message = {
          jsonrpc: "2.0",
          id,
          method,
          params
        };
        return new Promise((resolve13, reject) => {
          const timer = setTimeout3(() => {
            if (this.pendingResponses.has(id)) {
              this.pendingResponses.delete(id);
              reject(new Error(`LSP request timeout for method: ${method}`));
            }
          }, 6e4);
          this.pendingResponses.set(id, {
            reject: (err) => {
              clearTimeout2(timer);
              reject(err);
            },
            resolve: (val) => {
              clearTimeout2(timer);
              resolve13(val);
            }
          });
          this.sendMessage(message);
        });
      }
      sendNotification(method, params) {
        const message = {
          jsonrpc: "2.0",
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
      async initialize(workspaceUri) {
        if (this.isInitialized) {
          if (workspaceUri && workspaceUri !== this.currentWorkspaceUri) {
            await this.updateWorkspace(workspaceUri);
          }
          return;
        }
        logger.info("Initializing CodeQL Language Server...");
        const initParams = {
          processId: process.pid,
          clientInfo: {
            name: "codeql-development-mcp-server",
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
                didOpen: true
              }
            },
            workspace: {
              workspaceFolders: true
            }
          }
        };
        if (workspaceUri) {
          initParams.workspaceFolders = [{
            uri: workspaceUri,
            name: "codeql-workspace"
          }];
        }
        await this.sendRequest("initialize", initParams);
        this.sendNotification("initialized", {});
        this.currentWorkspaceUri = workspaceUri;
        this.isInitialized = true;
        logger.info("CodeQL Language Server initialized successfully");
      }
      /**
       * Update the workspace folders on a running, initialized server.
       */
      async updateWorkspace(newUri) {
        logger.info(`Updating workspace from ${this.currentWorkspaceUri} to ${newUri}`);
        const removed = this.currentWorkspaceUri ? [{ uri: this.currentWorkspaceUri, name: "codeql-workspace" }] : [];
        this.sendNotification("workspace/didChangeWorkspaceFolders", {
          event: {
            added: [{ uri: newUri, name: "codeql-workspace" }],
            removed
          }
        });
        this.currentWorkspaceUri = newUri;
      }
      /**
       * Get the current workspace URI.
       */
      getWorkspaceUri() {
        return this.currentWorkspaceUri;
      }
      async evaluateQL(qlCode, uri) {
        if (!this.isInitialized) {
          throw new Error("Language server is not initialized");
        }
        const documentUri = uri || pathToFileURL(join2(getProjectTmpDir("lsp-eval"), "eval.ql")).href;
        return new Promise((resolve13, reject) => {
          let diagnosticsReceived = false;
          const timeout = setTimeout3(() => {
            if (!diagnosticsReceived) {
              this.removeListener("diagnostics", diagnosticsHandler);
              reject(new Error("Timeout waiting for diagnostics"));
            }
          }, 9e4);
          const diagnosticsHandler = (params) => {
            if (params.uri === documentUri) {
              diagnosticsReceived = true;
              clearTimeout2(timeout);
              this.removeListener("diagnostics", diagnosticsHandler);
              this.sendNotification("textDocument/didClose", {
                textDocument: { uri: documentUri }
              });
              resolve13(params.diagnostics);
            }
          };
          this.on("diagnostics", diagnosticsHandler);
          this.sendNotification("textDocument/didOpen", {
            textDocument: {
              uri: documentUri,
              languageId: "ql",
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
      async getCompletions(params) {
        if (!this.isInitialized) {
          throw new Error("Language server is not initialized");
        }
        if (!this.isRunning()) {
          throw new Error("Language server process is not running");
        }
        const result = await this.sendRequest("textDocument/completion", params);
        if (result && typeof result === "object" && "items" in result) {
          return result.items;
        }
        return result || [];
      }
      /**
       * Find the definition(s) of a symbol at a position.
       */
      async getDefinition(params) {
        if (!this.isInitialized) {
          throw new Error("Language server is not initialized");
        }
        if (!this.isRunning()) {
          throw new Error("Language server process is not running");
        }
        const result = await this.sendRequest("textDocument/definition", params);
        return this.normalizeLocations(result);
      }
      /**
       * Find all references to a symbol at a position.
       */
      async getReferences(params) {
        if (!this.isInitialized) {
          throw new Error("Language server is not initialized");
        }
        if (!this.isRunning()) {
          throw new Error("Language server process is not running");
        }
        const result = await this.sendRequest("textDocument/references", {
          ...params,
          context: params.context ?? { includeDeclaration: true }
        });
        return this.normalizeLocations(result);
      }
      /**
       * Open a text document in the language server.
       * The document must be opened before requesting completions, definitions, etc.
       */
      openDocument(uri, text, languageId = "ql", version = 1) {
        if (!this.isInitialized) {
          throw new Error("Language server is not initialized");
        }
        this.sendNotification("textDocument/didOpen", {
          textDocument: { uri, languageId, version, text }
        });
      }
      /**
       * Close a text document in the language server.
       */
      closeDocument(uri) {
        if (!this.isInitialized) {
          throw new Error("Language server is not initialized");
        }
        this.sendNotification("textDocument/didClose", {
          textDocument: { uri }
        });
      }
      /**
       * Normalize a definition/references/implementation result to Location[].
       * The LSP spec allows Location | Location[] | LocationLink[].
       */
      normalizeLocations(result) {
        if (!result) return [];
        if (Array.isArray(result)) {
          return result.map((item) => {
            if ("targetUri" in item) {
              return { uri: item.targetUri, range: item.targetRange };
            }
            return item;
          });
        }
        if (typeof result === "object" && "uri" in result) {
          return [result];
        }
        return [];
      }
      async shutdown() {
        if (!this.server) {
          return;
        }
        logger.info("Shutting down CodeQL Language Server...");
        try {
          await this.sendRequest("shutdown", {});
          if (this.server) {
            this.sendNotification("exit", {});
          }
        } catch (error) {
          logger.warn("Error during graceful shutdown:", error);
        }
        await new Promise((resolve13) => {
          const timer = setTimeout3(() => {
            if (this.server) {
              this.server.kill("SIGTERM");
            }
            resolve13();
          }, 1e3);
          if (this.server) {
            this.server.once("exit", () => {
              clearTimeout2(timer);
              this.server = null;
              resolve13();
            });
          } else {
            clearTimeout2(timer);
            resolve13();
          }
        });
        this.isInitialized = false;
      }
      isRunning() {
        return this.server !== null && !this.server.killed;
      }
    };
  }
});

// src/lib/query-server.ts
import { spawn as spawn2 } from "child_process";
import { delimiter as delimiter2 } from "path";
import { EventEmitter as EventEmitter2 } from "events";
import { clearTimeout as clearTimeout3, setTimeout as setTimeout4 } from "timers";
var CodeQLQueryServer;
var init_query_server = __esm({
  "src/lib/query-server.ts"() {
    "use strict";
    init_server_config();
    init_cli_executor();
    init_logger();
    init_process_ready();
    CodeQLQueryServer = class extends EventEmitter2 {
      messageBuffer = "";
      messageId = 1;
      pendingRequests = /* @__PURE__ */ new Map();
      process = null;
      config;
      constructor(config) {
        super();
        this.config = config;
      }
      /**
       * Start the query-server2 process.
       */
      async start() {
        if (this.process) {
          throw new Error("Query server is already running");
        }
        logger.info("Starting CodeQL Query Server (query-server2)...");
        const args = buildQueryServerArgs(this.config);
        const spawnEnv = { ...process.env };
        const codeqlDir = getResolvedCodeQLDir();
        if (codeqlDir && spawnEnv.PATH) {
          spawnEnv.PATH = `${codeqlDir}${delimiter2}${spawnEnv.PATH}`;
        } else if (codeqlDir) {
          spawnEnv.PATH = codeqlDir;
        }
        this.process = spawn2("codeql", args, {
          stdio: ["pipe", "pipe", "pipe"],
          env: spawnEnv
        });
        this.process.stderr?.on("data", (data) => {
          logger.debug("QueryServer2 stderr:", data.toString());
        });
        this.process.stdout?.on("data", (data) => {
          this.handleStdout(data);
        });
        this.process.on("error", (error) => {
          logger.error("Query server process error:", error);
          this.emit("error", error);
        });
        this.process.on("exit", (code) => {
          logger.info(`Query server exited with code: ${code}`);
          this.rejectAllPending(new Error(`Query server exited with code: ${code}`));
          this.process = null;
          this.emit("exit", code);
        });
        await waitForProcessReady(this.process, "CodeQL Query Server");
        logger.info("CodeQL Query Server started");
      }
      /**
       * Send a request to the query server and await the response.
       *
       * @param method - The JSON-RPC method name.
       * @param params - The method parameters.
       * @param timeoutMs - Request timeout in milliseconds (default: 300000 = 5 min).
       * @returns The result from the server.
       */
      sendRequest(method, params, timeoutMs = 3e5) {
        const id = this.messageId++;
        const message = {
          id,
          jsonrpc: "2.0",
          method,
          params
        };
        return new Promise((resolve13, reject) => {
          this.pendingRequests.set(id, { reject, resolve: resolve13 });
          try {
            this.sendRaw(message);
          } catch (error) {
            this.pendingRequests.delete(id);
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
          }
          const timer = setTimeout4(() => {
            if (this.pendingRequests.has(id)) {
              this.pendingRequests.delete(id);
              reject(new Error(`Query server request timeout for method: ${method}`));
            }
          }, timeoutMs);
          const originalResolve = resolve13;
          const originalReject = reject;
          const wrapped = {
            reject: (err) => {
              clearTimeout3(timer);
              originalReject(err);
            },
            resolve: (val) => {
              clearTimeout3(timer);
              originalResolve(val);
            }
          };
          this.pendingRequests.set(id, wrapped);
        });
      }
      /**
       * Gracefully shut down the query server.
       */
      async shutdown() {
        if (!this.process) {
          return;
        }
        logger.info("Shutting down CodeQL Query Server...");
        try {
          await this.sendRequest("shutdown", {}, 5e3);
        } catch (error) {
          logger.warn("Error during query server graceful shutdown:", error);
        }
        await new Promise((resolve13) => {
          const timer = setTimeout4(() => {
            if (this.process) {
              this.process.kill("SIGTERM");
              this.process = null;
            }
            resolve13();
          }, 2e3);
          if (this.process) {
            this.process.once("exit", () => {
              clearTimeout3(timer);
              this.process = null;
              resolve13();
            });
          } else {
            clearTimeout3(timer);
            resolve13();
          }
        });
      }
      /**
       * Whether the query server process is running.
       */
      isRunning() {
        return this.process !== null && !this.process.killed;
      }
      // ---- private helpers ----
      handleStdout(data) {
        this.messageBuffer += data.toString();
        let headerEnd = this.messageBuffer.indexOf("\r\n\r\n");
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
                logger.error("Failed to parse query server message:", error);
              }
              headerEnd = this.messageBuffer.indexOf("\r\n\r\n");
            } else {
              break;
            }
          } else {
            logger.error("Invalid query server header:", header);
            this.messageBuffer = "";
            break;
          }
        }
      }
      handleMessage(message) {
        logger.debug("QueryServer2 message:", message);
        if (message.id !== void 0 && this.pendingRequests.has(Number(message.id))) {
          const pending = this.pendingRequests.get(Number(message.id));
          this.pendingRequests.delete(Number(message.id));
          if (message.error) {
            pending.reject(new Error(`Query server error: ${message.error.message}`));
          } else {
            pending.resolve(message.result);
          }
          return;
        }
        if (message.method) {
          this.emit("notification", { method: message.method, params: message.params });
        }
      }
      rejectAllPending(error) {
        for (const [id, pending] of this.pendingRequests) {
          pending.reject(error);
          this.pendingRequests.delete(id);
        }
      }
      sendRaw(message) {
        if (!this.process?.stdin) {
          throw new Error("Query server is not running");
        }
        const body = JSON.stringify(message);
        const contentLength = Buffer.byteLength(body, "utf8");
        const frame = `Content-Length: ${contentLength}\r
\r
${body}`;
        this.process.stdin.write(frame);
      }
    };
  }
});

// src/lib/cli-server.ts
import { spawn as spawn3 } from "child_process";
import { delimiter as delimiter3 } from "path";
import { EventEmitter as EventEmitter3 } from "events";
import { clearTimeout as clearTimeout4, setTimeout as setTimeout5 } from "timers";
var CodeQLCLIServer;
var init_cli_server = __esm({
  "src/lib/cli-server.ts"() {
    "use strict";
    init_server_config();
    init_cli_executor();
    init_logger();
    init_process_ready();
    CodeQLCLIServer = class extends EventEmitter3 {
      commandInProgress = false;
      commandQueue = [];
      config;
      currentReject = null;
      currentResolve = null;
      nullBuffer = Buffer.alloc(1);
      process = null;
      stdoutBuffer = "";
      constructor(config) {
        super();
        this.config = config;
      }
      /**
       * Start the cli-server process.
       */
      async start() {
        if (this.process) {
          throw new Error("CLI server is already running");
        }
        logger.info("Starting CodeQL CLI Server...");
        const args = buildCLIServerArgs(this.config);
        const spawnEnv = { ...process.env };
        const codeqlDir = getResolvedCodeQLDir();
        if (codeqlDir && spawnEnv.PATH) {
          spawnEnv.PATH = `${codeqlDir}${delimiter3}${spawnEnv.PATH}`;
        } else if (codeqlDir) {
          spawnEnv.PATH = codeqlDir;
        }
        this.process = spawn3("codeql", args, {
          stdio: ["pipe", "pipe", "pipe"],
          env: spawnEnv
        });
        this.process.stdout?.on("data", (data) => {
          this.handleStdout(data);
        });
        this.process.stderr?.on("data", (data) => {
          logger.debug("CLIServer stderr:", data.toString());
        });
        this.process.on("error", (error) => {
          logger.error("CLI server process error:", error);
          if (this.currentReject) {
            this.currentReject(error);
            this.currentReject = null;
            this.currentResolve = null;
          }
          this.emit("error", error);
        });
        this.process.on("exit", (code) => {
          logger.info(`CLI server exited with code: ${code}`);
          if (this.currentReject) {
            this.currentReject(new Error(`CLI server exited unexpectedly with code: ${code}`));
            this.currentReject = null;
            this.currentResolve = null;
          }
          this.process = null;
          this.emit("exit", code);
        });
        await waitForProcessReady(this.process, "CodeQL CLI Server");
        logger.info("CodeQL CLI Server started");
      }
      /**
       * Run a CodeQL CLI command through the persistent server.
       *
       * Commands are serialized and queued; only one command runs at a time.
       *
       * @param args - The full command arguments (e.g. `['resolve', 'qlpacks']`).
       * @returns The stdout output from the command.
       */
      runCommand(args) {
        return new Promise((resolve13, reject) => {
          const execute = () => {
            this.executeCommand({ args, reject, resolve: resolve13 });
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
      async shutdown() {
        if (!this.process) {
          return;
        }
        logger.info("Shutting down CodeQL CLI Server...");
        try {
          this.process.stdin?.write(JSON.stringify(["shutdown"]), "utf8");
          this.process.stdin?.write(this.nullBuffer);
        } catch (error) {
          logger.warn("Error during CLI server shutdown request:", error);
        }
        await new Promise((resolve13) => {
          const timer = setTimeout5(() => {
            if (this.process) {
              this.process.kill("SIGTERM");
              this.process = null;
            }
            resolve13();
          }, 2e3);
          if (this.process) {
            this.process.once("exit", () => {
              clearTimeout4(timer);
              this.process = null;
              resolve13();
            });
          } else {
            clearTimeout4(timer);
            resolve13();
          }
        });
        this.commandInProgress = false;
        this.commandQueue = [];
        logger.info("CodeQL CLI Server stopped");
      }
      /**
       * Whether the CLI server process is running.
       */
      isRunning() {
        return this.process !== null && !this.process.killed;
      }
      // ---- private helpers ----
      executeCommand(cmd) {
        if (!this.process?.stdin) {
          cmd.reject(new Error("CLI server is not running"));
          return;
        }
        this.commandInProgress = true;
        this.currentResolve = cmd.resolve;
        this.currentReject = cmd.reject;
        try {
          this.process.stdin.write(JSON.stringify(cmd.args), "utf8");
          this.process.stdin.write(this.nullBuffer);
        } catch (error) {
          this.commandInProgress = false;
          this.currentResolve = null;
          this.currentReject = null;
          cmd.reject(error instanceof Error ? error : new Error(String(error)));
          this.runNext();
        }
      }
      handleStdout(data) {
        this.stdoutBuffer += data.toString();
        let nulIndex = this.stdoutBuffer.indexOf("\0");
        while (nulIndex !== -1) {
          const result = this.stdoutBuffer.substring(0, nulIndex);
          this.stdoutBuffer = this.stdoutBuffer.substring(nulIndex + 1);
          if (this.currentResolve) {
            this.currentResolve(result);
            this.currentResolve = null;
            this.currentReject = null;
          }
          this.commandInProgress = false;
          this.runNext();
          nulIndex = this.stdoutBuffer.indexOf("\0");
        }
      }
      runNext() {
        const next = this.commandQueue.shift();
        if (next) {
          next();
        }
      }
    };
  }
});

// src/lib/server-manager.ts
var server_manager_exports = {};
__export(server_manager_exports, {
  CodeQLServerManager: () => CodeQLServerManager,
  getServerManager: () => getServerManager,
  initServerManager: () => initServerManager,
  resetServerManager: () => resetServerManager,
  shutdownServerManager: () => shutdownServerManager
});
import { mkdirSync as mkdirSync2 } from "fs";
import { join as join3 } from "path";
import { randomUUID } from "crypto";
function initServerManager(options) {
  if (!globalServerManager) {
    globalServerManager = new CodeQLServerManager(options);
  }
  return globalServerManager;
}
function getServerManager() {
  if (!globalServerManager) {
    globalServerManager = new CodeQLServerManager();
  }
  return globalServerManager;
}
async function shutdownServerManager() {
  if (globalServerManager) {
    await globalServerManager.shutdownAll();
    globalServerManager = null;
  }
}
function resetServerManager() {
  globalServerManager = null;
}
var CodeQLServerManager, globalServerManager;
var init_server_manager = __esm({
  "src/lib/server-manager.ts"() {
    "use strict";
    init_server_config();
    init_language_server();
    init_query_server();
    init_cli_server();
    init_temp_dir();
    init_logger();
    CodeQLServerManager = class {
      /** Keyed by `CodeQLServerType` — at most one per type at a time. */
      servers = /* @__PURE__ */ new Map();
      /** In-flight `getOrRestart` promises, keyed by server type, to serialize concurrent calls. */
      pendingStarts = /* @__PURE__ */ new Map();
      /** The session ID used for cache isolation. */
      sessionId;
      /** Root directory for session-specific caches. */
      sessionCacheDir;
      constructor(options) {
        this.sessionId = options?.sessionId ?? randomUUID();
        this.sessionCacheDir = join3(
          getProjectTmpDir("codeql-cache"),
          this.sessionId
        );
        for (const subdir of ["compilation-cache", "logs", "query-cache"]) {
          mkdirSync2(join3(this.sessionCacheDir, subdir), { recursive: true });
        }
        logger.info(`CodeQLServerManager initialized (session: ${this.sessionId})`);
      }
      // ---- Public API ----
      /**
       * Get the current session ID.
       */
      getSessionId() {
        return this.sessionId;
      }
      /**
       * Get the session-specific cache directory.
       */
      getCacheDir() {
        return this.sessionCacheDir;
      }
      /**
       * Return the session-specific log directory.
       */
      getLogDir() {
        return join3(this.sessionCacheDir, "logs");
      }
      /**
       * Get or create a Language Server with the given configuration.
       *
       * If a language server is already running with the same config it is reused.
       * If the config has changed the old server is shut down first.
       */
      async getLanguageServer(config) {
        const enriched = this.enrichConfig(config);
        return this.getOrRestart("language", enriched, () => {
          return new CodeQLLanguageServer({
            loglevel: enriched.loglevel,
            logdir: enriched.logdir,
            searchPath: enriched.searchPath,
            synchronous: enriched.synchronous,
            verbosity: enriched.verbosity
          });
        });
      }
      /**
       * Get or create a Query Server with the given configuration.
       */
      async getQueryServer(config) {
        const enriched = this.enrichConfig(config);
        return this.getOrRestart("query", enriched, () => {
          return new CodeQLQueryServer(enriched);
        });
      }
      /**
       * Get or create a CLI Server with the given configuration.
       */
      async getCLIServer(config) {
        const enriched = this.enrichConfig(config);
        return this.getOrRestart("cli", enriched, () => {
          return new CodeQLCLIServer(enriched);
        });
      }
      /**
       * Shut down a specific server type.
       */
      async shutdownServer(type2) {
        const managed = this.servers.get(type2);
        if (!managed) return;
        logger.info(`Shutting down ${type2} server (session: ${managed.sessionId})`);
        await this.stopServer(managed);
        this.servers.delete(type2);
      }
      /**
       * Shut down all managed servers.
       */
      async shutdownAll() {
        logger.info(`Shutting down all servers for session: ${this.sessionId}`);
        const shutdownPromises = Array.from(this.servers.entries()).map(
          async ([type2, managed]) => {
            try {
              await this.stopServer(managed);
            } catch (error) {
              logger.error(`Error shutting down ${type2} server:`, error);
            }
          }
        );
        await Promise.all(shutdownPromises);
        this.servers.clear();
        logger.info("All servers shut down");
      }
      /**
       * Check whether a server of the given type is currently running.
       */
      isRunning(type2) {
        const managed = this.servers.get(type2);
        if (!managed) return false;
        return managed.server.isRunning();
      }
      /**
       * Get status information for all managed servers.
       */
      getStatus() {
        const status = {
          cli: null,
          language: null,
          query: null
        };
        for (const [type2, managed] of this.servers) {
          status[type2] = {
            configHash: managed.configHash,
            running: managed.server.isRunning(),
            sessionId: managed.sessionId
          };
        }
        return status;
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
      async warmUpLanguageServer() {
        try {
          const { packageRootDir: packageRootDir2 } = await Promise.resolve().then(() => (init_package_paths(), package_paths_exports));
          const { resolve: resolve13 } = await import("path");
          const config = {
            checkErrors: "ON_CHANGE",
            loglevel: "WARN",
            searchPath: resolve13(packageRootDir2, "ql")
          };
          logger.info("Warming up language server (background JVM start)...");
          await this.getLanguageServer(config);
          logger.info("Language server warm-up complete");
        } catch (error) {
          logger.warn("Language server warm-up failed (will retry on first tool call):", error);
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
      async warmUpCLIServer() {
        try {
          logger.info("Warming up CLI server (background JVM start)...");
          await this.getCLIServer({});
          logger.info("CLI server warm-up complete");
        } catch (error) {
          logger.warn("CLI server warm-up failed (will retry on first tool call):", error);
        }
      }
      /**
       * Enrich a config with session-specific defaults for commonCaches and logdir.
       */
      enrichConfig(config) {
        return {
          ...config,
          commonCaches: config.commonCaches ?? this.sessionCacheDir,
          logdir: config.logdir ?? this.getLogDir()
        };
      }
      /**
       * Get an existing server if its config matches, otherwise stop the old
       * one and start a new server.
       *
       * Concurrent calls for the same server type are serialized via
       * `pendingStarts` to avoid spawning duplicate server processes.
       */
      async getOrRestart(type2, config, factory) {
        const inflight = this.pendingStarts.get(type2);
        if (inflight) {
          try {
            await inflight;
          } catch {
          }
        }
        const work = this.doGetOrRestart(type2, config, factory);
        this.pendingStarts.set(type2, work);
        try {
          return await work;
        } finally {
          try {
            await work;
          } catch {
          }
          if (this.pendingStarts.get(type2) === work) {
            this.pendingStarts.delete(type2);
          }
        }
      }
      /**
       * Core logic for getOrRestart, separated to allow serialization.
       */
      async doGetOrRestart(type2, config, factory) {
        const hash = computeConfigHash(type2, config);
        const existing = this.servers.get(type2);
        if (existing && existing.configHash === hash && existing.server.isRunning()) {
          logger.debug(`Reusing existing ${type2} server (hash: ${hash.substring(0, 8)})`);
          return existing.server;
        }
        if (existing) {
          logger.info(`${type2} server config changed or dead, restarting...`);
          await this.stopServer(existing);
          this.servers.delete(type2);
        }
        const server = factory();
        await server.start();
        this.servers.set(type2, {
          configHash: hash,
          server,
          sessionId: this.sessionId,
          type: type2
        });
        logger.info(`${type2} server started (hash: ${hash.substring(0, 8)})`);
        return server;
      }
      /**
       * Stop a managed server, ignoring errors.
       */
      async stopServer(managed) {
        try {
          await managed.server.shutdown();
        } catch (error) {
          logger.warn(`Error stopping ${managed.type} server:`, error);
        }
      }
    };
    globalServerManager = null;
  }
});

// src/lib/cli-executor.ts
var cli_executor_exports = {};
__export(cli_executor_exports, {
  buildCodeQLArgs: () => buildCodeQLArgs,
  buildQLTArgs: () => buildQLTArgs,
  disableTestCommands: () => disableTestCommands,
  enableTestCommands: () => enableTestCommands,
  executeCLICommand: () => executeCLICommand,
  executeCodeQLCommand: () => executeCodeQLCommand,
  executeQLTCommand: () => executeQLTCommand,
  getCommandHelp: () => getCommandHelp,
  getResolvedCodeQLDir: () => getResolvedCodeQLDir,
  resetResolvedCodeQLBinary: () => resetResolvedCodeQLBinary,
  resolveCodeQLBinary: () => resolveCodeQLBinary,
  sanitizeCLIArgument: () => sanitizeCLIArgument,
  sanitizeCLIArguments: () => sanitizeCLIArguments,
  validateCodeQLBinaryReachable: () => validateCodeQLBinaryReachable,
  validateCommandExists: () => validateCommandExists
});
import { execFile } from "child_process";
import { existsSync as existsSync2 } from "fs";
import { basename, delimiter as delimiter4, dirname as dirname2, isAbsolute as isAbsolute2 } from "path";
import { promisify } from "util";
function enableTestCommands() {
  testCommands = /* @__PURE__ */ new Set([
    "cat",
    "echo",
    "ls",
    "sh",
    "sleep"
  ]);
}
function disableTestCommands() {
  testCommands = null;
}
function isCommandAllowed(command) {
  return ALLOWED_COMMANDS.has(command) || testCommands !== null && testCommands.has(command);
}
function resolveCodeQLBinary() {
  if (resolvedBinaryResult !== void 0) {
    return resolvedBinaryResult;
  }
  const envPath = process.env.CODEQL_PATH;
  if (!envPath) {
    resolvedCodeQLDir = null;
    resolvedBinaryResult = "codeql";
    return resolvedBinaryResult;
  }
  const base = basename(envPath).toLowerCase();
  const validBaseNames = ["codeql", "codeql.exe", "codeql.cmd"];
  if (!validBaseNames.includes(base)) {
    throw new Error(
      `CODEQL_PATH must point to a CodeQL CLI binary (expected basename: codeql), got: ${base}`
    );
  }
  if (!isAbsolute2(envPath)) {
    throw new Error(
      `CODEQL_PATH must be an absolute path, got: ${envPath}`
    );
  }
  if (!existsSync2(envPath)) {
    throw new Error(
      `CODEQL_PATH points to a file that does not exist: ${envPath}`
    );
  }
  resolvedCodeQLDir = dirname2(envPath);
  resolvedBinaryResult = "codeql";
  logger.info(`CodeQL CLI resolved via CODEQL_PATH: ${envPath} (dir: ${resolvedCodeQLDir})`);
  return resolvedBinaryResult;
}
function getResolvedCodeQLDir() {
  return resolvedCodeQLDir;
}
function resetResolvedCodeQLBinary() {
  resolvedCodeQLDir = null;
  resolvedBinaryResult = void 0;
}
async function validateCodeQLBinaryReachable() {
  const binary2 = resolvedBinaryResult ?? "codeql";
  const env = { ...process.env };
  if (resolvedCodeQLDir) {
    env.PATH = resolvedCodeQLDir + delimiter4 + (env.PATH || "");
  }
  try {
    const { stdout } = await execFileAsync(binary2, ["version", "--format=terse"], {
      env,
      timeout: 15e3
    });
    return stdout.trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `CodeQL CLI is not reachable (binary: ${binary2}). Ensure codeql is on PATH or set the CODEQL_PATH environment variable to the absolute path of the CodeQL CLI binary. Details: ${message}`,
      { cause: err }
    );
  }
}
function sanitizeCLIArgument(arg) {
  if (arg.includes("\0")) {
    throw new Error(`CLI argument contains null byte: argument rejected for security`);
  }
  if (DANGEROUS_CONTROL_CHARS.test(arg)) {
    throw new Error(`CLI argument contains control characters: argument rejected for security`);
  }
  return arg;
}
function sanitizeCLIArguments(args) {
  return args.map(sanitizeCLIArgument);
}
function getSafeEnvironment(additionalEnv) {
  const safeEnv = {};
  for (const key of SAFE_ENV_VARS) {
    if (process.env[key] !== void 0) {
      safeEnv[key] = process.env[key];
    }
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== void 0 && SAFE_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      safeEnv[key] = value;
    }
  }
  if (resolvedCodeQLDir && safeEnv.PATH) {
    safeEnv.PATH = `${resolvedCodeQLDir}${delimiter4}${safeEnv.PATH}`;
  } else if (resolvedCodeQLDir) {
    safeEnv.PATH = resolvedCodeQLDir;
  }
  if (additionalEnv) {
    Object.assign(safeEnv, additionalEnv);
  }
  return safeEnv;
}
async function executeCLICommand(options) {
  try {
    const { command, args, cwd, timeout = 3e5, env } = options;
    if (!isCommandAllowed(command)) {
      throw new Error(`Command not allowed: ${command}. Only whitelisted commands can be executed.`);
    }
    if (command.includes(";") || command.includes("|") || command.includes("&") || command.includes("$") || command.includes("`") || command.includes("\n") || command.includes("\r")) {
      throw new Error(`Invalid command: contains shell metacharacters: ${command}`);
    }
    const sanitizedArgs = sanitizeCLIArguments(args);
    logger.info(`Executing CLI command: ${command}`, { args: sanitizedArgs, cwd, timeout });
    const execOptions = {
      cwd,
      timeout,
      env: getSafeEnvironment(env)
    };
    const { stdout, stderr } = await execFileAsync(command, sanitizedArgs, execOptions);
    return {
      stdout,
      stderr,
      success: true,
      exitCode: 0
    };
  } catch (error) {
    logger.error("CLI command execution failed:", error);
    const err = error;
    const errorMessage = err instanceof Error ? err.message : String(error);
    const exitCode = err.code || 1;
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || errorMessage,
      success: false,
      error: errorMessage,
      exitCode
    };
  }
}
function buildCodeQLArgs(subcommand, options) {
  const args = [subcommand];
  const singleLetterParams = /* @__PURE__ */ new Set(["t", "o", "v", "q", "h", "J"]);
  for (const [key, value] of Object.entries(options)) {
    if (value === void 0 || value === null) {
      continue;
    }
    const isSingleLetter = key.length === 1 && singleLetterParams.has(key);
    if (typeof value === "boolean") {
      if (value) {
        args.push(isSingleLetter ? `-${key}` : `--${key}`);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (isSingleLetter) {
          args.push(`-${key}=${String(item)}`);
        } else {
          args.push(`--${key}=${String(item)}`);
        }
      }
    } else {
      if (isSingleLetter) {
        args.push(`-${key}=${String(value)}`);
      } else {
        args.push(`--${key}=${String(value)}`);
      }
    }
  }
  return args;
}
function buildQLTArgs(subcommand, options) {
  const args = [subcommand];
  for (const [key, value] of Object.entries(options)) {
    if (value === void 0 || value === null) {
      continue;
    }
    if (typeof value === "boolean") {
      if (value) {
        args.push(`--${key}`);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        args.push(`--${key}`, String(item));
      }
    } else {
      args.push(`--${key}`, String(value));
    }
  }
  return args;
}
async function executeCodeQLCommand(subcommand, options, additionalArgs = [], cwd) {
  const args = buildCodeQLArgs(subcommand, options);
  args.push(...additionalArgs);
  const canUseCLIServer = !FRESH_PROCESS_SUBCOMMANDS.has(subcommand) && !cwd;
  if (canUseCLIServer) {
    try {
      const { getServerManager: getServerManager2 } = await Promise.resolve().then(() => (init_server_manager(), server_manager_exports));
      const manager = getServerManager2();
      if (manager.isRunning("cli")) {
        const cliServer = await manager.getCLIServer({});
        const sanitizedArgs = sanitizeCLIArguments(args);
        logger.info(`Executing CodeQL command via cli-server: ${subcommand}`, { args: sanitizedArgs });
        const stdout = await cliServer.runCommand(sanitizedArgs);
        return {
          stdout,
          stderr: "",
          success: true,
          exitCode: 0
        };
      } else {
        logger.debug(`cli-server not yet running for "${subcommand}", using fresh process`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("CLI server is not running") || message.includes("CLI server exited") || message.includes("failed to start")) {
        logger.warn(`cli-server unavailable for "${subcommand}", falling back to fresh process: ${message}`);
      } else {
        logger.error(`cli-server command failed for "${subcommand}": ${message}`);
        return {
          stdout: "",
          stderr: message,
          success: false,
          error: message,
          exitCode: 1
        };
      }
    }
  }
  return executeCLICommand({
    command: "codeql",
    args,
    cwd,
    timeout: 0
  });
}
async function executeQLTCommand(subcommand, options, additionalArgs = []) {
  const args = buildQLTArgs(subcommand, options);
  args.push(...additionalArgs);
  return executeCLICommand({
    command: "qlt",
    args
  });
}
async function getCommandHelp(command, subcommand) {
  const args = subcommand ? [subcommand, "--help"] : ["--help"];
  const result = await executeCLICommand({
    command,
    args
  });
  return result.stdout || result.stderr || "No help available";
}
async function validateCommandExists(command) {
  try {
    const result = await executeCLICommand({
      command: "which",
      args: [command]
    });
    return result.success;
  } catch {
    return false;
  }
}
var execFileAsync, ALLOWED_COMMANDS, testCommands, SAFE_ENV_VARS, SAFE_ENV_PREFIXES, DANGEROUS_CONTROL_CHARS, resolvedCodeQLDir, resolvedBinaryResult, FRESH_PROCESS_SUBCOMMANDS;
var init_cli_executor = __esm({
  "src/lib/cli-executor.ts"() {
    "use strict";
    init_logger();
    execFileAsync = promisify(execFile);
    ALLOWED_COMMANDS = /* @__PURE__ */ new Set([
      "codeql",
      "git",
      "node",
      "npm",
      "qlt",
      "which"
    ]);
    testCommands = null;
    SAFE_ENV_VARS = [
      "HOME",
      // User home directory
      "LANG",
      // Locale setting
      "LC_ALL",
      // Locale setting
      "LC_CTYPE",
      // Locale setting
      "PATH",
      // Required to find executables
      "SHELL",
      // User's shell (Unix)
      "TEMP",
      // Temporary directory (Windows)
      "TERM",
      // Terminal type (Unix)
      "TMP",
      // Temporary directory (Windows)
      "TMPDIR",
      // Temporary directory (Unix)
      "USER",
      // Current user (Unix)
      "USERNAME"
      // Current user (Windows)
    ];
    SAFE_ENV_PREFIXES = [
      "CODEQL_",
      // CodeQL-specific variables
      "NODE_"
      // Node.js-specific variables (for npm, etc.)
    ];
    DANGEROUS_CONTROL_CHARS = /[\x01-\x08\x0B\x0C\x0E-\x1F]/;
    resolvedCodeQLDir = null;
    FRESH_PROCESS_SUBCOMMANDS = /* @__PURE__ */ new Set([
      "database analyze",
      "database create",
      "test extract",
      "test run"
    ]);
  }
});

// ../node_modules/adm-zip/util/constants.js
var require_constants = __commonJS({
  "../node_modules/adm-zip/util/constants.js"(exports, module) {
    module.exports = {
      /* The local file header */
      LOCHDR: 30,
      // LOC header size
      LOCSIG: 67324752,
      // "PK\003\004"
      LOCVER: 4,
      // version needed to extract
      LOCFLG: 6,
      // general purpose bit flag
      LOCHOW: 8,
      // compression method
      LOCTIM: 10,
      // modification time (2 bytes time, 2 bytes date)
      LOCCRC: 14,
      // uncompressed file crc-32 value
      LOCSIZ: 18,
      // compressed size
      LOCLEN: 22,
      // uncompressed size
      LOCNAM: 26,
      // filename length
      LOCEXT: 28,
      // extra field length
      /* The Data descriptor */
      EXTSIG: 134695760,
      // "PK\007\008"
      EXTHDR: 16,
      // EXT header size
      EXTCRC: 4,
      // uncompressed file crc-32 value
      EXTSIZ: 8,
      // compressed size
      EXTLEN: 12,
      // uncompressed size
      /* The central directory file header */
      CENHDR: 46,
      // CEN header size
      CENSIG: 33639248,
      // "PK\001\002"
      CENVEM: 4,
      // version made by
      CENVER: 6,
      // version needed to extract
      CENFLG: 8,
      // encrypt, decrypt flags
      CENHOW: 10,
      // compression method
      CENTIM: 12,
      // modification time (2 bytes time, 2 bytes date)
      CENCRC: 16,
      // uncompressed file crc-32 value
      CENSIZ: 20,
      // compressed size
      CENLEN: 24,
      // uncompressed size
      CENNAM: 28,
      // filename length
      CENEXT: 30,
      // extra field length
      CENCOM: 32,
      // file comment length
      CENDSK: 34,
      // volume number start
      CENATT: 36,
      // internal file attributes
      CENATX: 38,
      // external file attributes (host system dependent)
      CENOFF: 42,
      // LOC header offset
      /* The entries in the end of central directory */
      ENDHDR: 22,
      // END header size
      ENDSIG: 101010256,
      // "PK\005\006"
      ENDSUB: 8,
      // number of entries on this disk
      ENDTOT: 10,
      // total number of entries
      ENDSIZ: 12,
      // central directory size in bytes
      ENDOFF: 16,
      // offset of first CEN header
      ENDCOM: 20,
      // zip file comment length
      END64HDR: 20,
      // zip64 END header size
      END64SIG: 117853008,
      // zip64 Locator signature, "PK\006\007"
      END64START: 4,
      // number of the disk with the start of the zip64
      END64OFF: 8,
      // relative offset of the zip64 end of central directory
      END64NUMDISKS: 16,
      // total number of disks
      ZIP64SIG: 101075792,
      // zip64 signature, "PK\006\006"
      ZIP64HDR: 56,
      // zip64 record minimum size
      ZIP64LEAD: 12,
      // leading bytes at the start of the record, not counted by the value stored in ZIP64SIZE
      ZIP64SIZE: 4,
      // zip64 size of the central directory record
      ZIP64VEM: 12,
      // zip64 version made by
      ZIP64VER: 14,
      // zip64 version needed to extract
      ZIP64DSK: 16,
      // zip64 number of this disk
      ZIP64DSKDIR: 20,
      // number of the disk with the start of the record directory
      ZIP64SUB: 24,
      // number of entries on this disk
      ZIP64TOT: 32,
      // total number of entries
      ZIP64SIZB: 40,
      // zip64 central directory size in bytes
      ZIP64OFF: 48,
      // offset of start of central directory with respect to the starting disk number
      ZIP64EXTRA: 56,
      // extensible data sector
      /* Compression methods */
      STORED: 0,
      // no compression
      SHRUNK: 1,
      // shrunk
      REDUCED1: 2,
      // reduced with compression factor 1
      REDUCED2: 3,
      // reduced with compression factor 2
      REDUCED3: 4,
      // reduced with compression factor 3
      REDUCED4: 5,
      // reduced with compression factor 4
      IMPLODED: 6,
      // imploded
      // 7 reserved for Tokenizing compression algorithm
      DEFLATED: 8,
      // deflated
      ENHANCED_DEFLATED: 9,
      // enhanced deflated
      PKWARE: 10,
      // PKWare DCL imploded
      // 11 reserved by PKWARE
      BZIP2: 12,
      //  compressed using BZIP2
      // 13 reserved by PKWARE
      LZMA: 14,
      // LZMA
      // 15-17 reserved by PKWARE
      IBM_TERSE: 18,
      // compressed using IBM TERSE
      IBM_LZ77: 19,
      // IBM LZ77 z
      AES_ENCRYPT: 99,
      // WinZIP AES encryption method
      /* General purpose bit flag */
      // values can obtained with expression 2**bitnr
      FLG_ENC: 1,
      // Bit 0: encrypted file
      FLG_COMP1: 2,
      // Bit 1, compression option
      FLG_COMP2: 4,
      // Bit 2, compression option
      FLG_DESC: 8,
      // Bit 3, data descriptor
      FLG_ENH: 16,
      // Bit 4, enhanced deflating
      FLG_PATCH: 32,
      // Bit 5, indicates that the file is compressed patched data.
      FLG_STR: 64,
      // Bit 6, strong encryption (patented)
      // Bits 7-10: Currently unused.
      FLG_EFS: 2048,
      // Bit 11: Language encoding flag (EFS)
      // Bit 12: Reserved by PKWARE for enhanced compression.
      // Bit 13: encrypted the Central Directory (patented).
      // Bits 14-15: Reserved by PKWARE.
      FLG_MSK: 4096,
      // mask header values
      /* Load type */
      FILE: 2,
      BUFFER: 1,
      NONE: 0,
      /* 4.5 Extensible data fields */
      EF_ID: 0,
      EF_SIZE: 2,
      /* Header IDs */
      ID_ZIP64: 1,
      ID_AVINFO: 7,
      ID_PFS: 8,
      ID_OS2: 9,
      ID_NTFS: 10,
      ID_OPENVMS: 12,
      ID_UNIX: 13,
      ID_FORK: 14,
      ID_PATCH: 15,
      ID_X509_PKCS7: 20,
      ID_X509_CERTID_F: 21,
      ID_X509_CERTID_C: 22,
      ID_STRONGENC: 23,
      ID_RECORD_MGT: 24,
      ID_X509_PKCS7_RL: 25,
      ID_IBM1: 101,
      ID_IBM2: 102,
      ID_POSZIP: 18064,
      EF_ZIP64_OR_32: 4294967295,
      EF_ZIP64_OR_16: 65535,
      EF_ZIP64_SUNCOMP: 0,
      EF_ZIP64_SCOMP: 8,
      EF_ZIP64_RHO: 16,
      EF_ZIP64_DSN: 24
    };
  }
});

// ../node_modules/adm-zip/util/errors.js
var require_errors = __commonJS({
  "../node_modules/adm-zip/util/errors.js"(exports) {
    var errors = {
      /* Header error messages */
      INVALID_LOC: "Invalid LOC header (bad signature)",
      INVALID_CEN: "Invalid CEN header (bad signature)",
      INVALID_END: "Invalid END header (bad signature)",
      /* Descriptor */
      DESCRIPTOR_NOT_EXIST: "No descriptor present",
      DESCRIPTOR_UNKNOWN: "Unknown descriptor format",
      DESCRIPTOR_FAULTY: "Descriptor data is malformed",
      /* ZipEntry error messages*/
      NO_DATA: "Nothing to decompress",
      BAD_CRC: "CRC32 checksum failed {0}",
      FILE_IN_THE_WAY: "There is a file in the way: {0}",
      UNKNOWN_METHOD: "Invalid/unsupported compression method",
      /* Inflater error messages */
      AVAIL_DATA: "inflate::Available inflate data did not terminate",
      INVALID_DISTANCE: "inflate::Invalid literal/length or distance code in fixed or dynamic block",
      TO_MANY_CODES: "inflate::Dynamic block code description: too many length or distance codes",
      INVALID_REPEAT_LEN: "inflate::Dynamic block code description: repeat more than specified lengths",
      INVALID_REPEAT_FIRST: "inflate::Dynamic block code description: repeat lengths with no first length",
      INCOMPLETE_CODES: "inflate::Dynamic block code description: code lengths codes incomplete",
      INVALID_DYN_DISTANCE: "inflate::Dynamic block code description: invalid distance code lengths",
      INVALID_CODES_LEN: "inflate::Dynamic block code description: invalid literal/length code lengths",
      INVALID_STORE_BLOCK: "inflate::Stored block length did not match one's complement",
      INVALID_BLOCK_TYPE: "inflate::Invalid block type (type == 3)",
      /* ADM-ZIP error messages */
      CANT_EXTRACT_FILE: "Could not extract the file",
      CANT_OVERRIDE: "Target file already exists",
      DISK_ENTRY_TOO_LARGE: "Number of disk entries is too large",
      NO_ZIP: "No zip file was loaded",
      NO_ENTRY: "Entry doesn't exist",
      DIRECTORY_CONTENT_ERROR: "A directory cannot have content",
      FILE_NOT_FOUND: 'File not found: "{0}"',
      NOT_IMPLEMENTED: "Not implemented",
      INVALID_FILENAME: "Invalid filename",
      INVALID_FORMAT: "Invalid or unsupported zip format. No END header found",
      INVALID_PASS_PARAM: "Incompatible password parameter",
      WRONG_PASSWORD: "Wrong Password",
      /* ADM-ZIP */
      COMMENT_TOO_LONG: "Comment is too long",
      // Comment can be max 65535 bytes long (NOTE: some non-US characters may take more space)
      EXTRA_FIELD_PARSE_ERROR: "Extra field parsing error"
    };
    function E(message) {
      return function(...args) {
        if (args.length) {
          message = message.replace(/\{(\d)\}/g, (_, n) => args[n] || "");
        }
        return new Error("ADM-ZIP: " + message);
      };
    }
    for (const msg of Object.keys(errors)) {
      exports[msg] = E(errors[msg]);
    }
  }
});

// ../node_modules/adm-zip/util/utils.js
var require_utils = __commonJS({
  "../node_modules/adm-zip/util/utils.js"(exports, module) {
    var fsystem = __require("fs");
    var pth = __require("path");
    var Constants = require_constants();
    var Errors = require_errors();
    var isWin = typeof process === "object" && "win32" === process.platform;
    var is_Obj = (obj) => typeof obj === "object" && obj !== null;
    var crcTable = new Uint32Array(256).map((t, c) => {
      for (let k = 0; k < 8; k++) {
        if ((c & 1) !== 0) {
          c = 3988292384 ^ c >>> 1;
        } else {
          c >>>= 1;
        }
      }
      return c >>> 0;
    });
    function Utils(opts) {
      this.sep = pth.sep;
      this.fs = fsystem;
      if (is_Obj(opts)) {
        if (is_Obj(opts.fs) && typeof opts.fs.statSync === "function") {
          this.fs = opts.fs;
        }
      }
    }
    module.exports = Utils;
    Utils.prototype.makeDir = function(folder) {
      const self = this;
      function mkdirSync10(fpath) {
        let resolvedPath = fpath.split(self.sep)[0];
        fpath.split(self.sep).forEach(function(name) {
          if (!name || name.substr(-1, 1) === ":") return;
          resolvedPath += self.sep + name;
          var stat;
          try {
            stat = self.fs.statSync(resolvedPath);
          } catch (e) {
            self.fs.mkdirSync(resolvedPath);
          }
          if (stat && stat.isFile()) throw Errors.FILE_IN_THE_WAY(`"${resolvedPath}"`);
        });
      }
      mkdirSync10(folder);
    };
    Utils.prototype.writeFileTo = function(path4, content, overwrite, attr) {
      const self = this;
      if (self.fs.existsSync(path4)) {
        if (!overwrite) return false;
        var stat = self.fs.statSync(path4);
        if (stat.isDirectory()) {
          return false;
        }
      }
      var folder = pth.dirname(path4);
      if (!self.fs.existsSync(folder)) {
        self.makeDir(folder);
      }
      var fd;
      try {
        fd = self.fs.openSync(path4, "w", 438);
      } catch (e) {
        self.fs.chmodSync(path4, 438);
        fd = self.fs.openSync(path4, "w", 438);
      }
      if (fd) {
        try {
          self.fs.writeSync(fd, content, 0, content.length, 0);
        } finally {
          self.fs.closeSync(fd);
        }
      }
      self.fs.chmodSync(path4, attr || 438);
      return true;
    };
    Utils.prototype.writeFileToAsync = function(path4, content, overwrite, attr, callback) {
      if (typeof attr === "function") {
        callback = attr;
        attr = void 0;
      }
      const self = this;
      self.fs.exists(path4, function(exist) {
        if (exist && !overwrite) return callback(false);
        self.fs.stat(path4, function(err, stat) {
          if (exist && stat.isDirectory()) {
            return callback(false);
          }
          var folder = pth.dirname(path4);
          self.fs.exists(folder, function(exists) {
            if (!exists) self.makeDir(folder);
            self.fs.open(path4, "w", 438, function(err2, fd) {
              if (err2) {
                self.fs.chmod(path4, 438, function() {
                  self.fs.open(path4, "w", 438, function(err3, fd2) {
                    self.fs.write(fd2, content, 0, content.length, 0, function() {
                      self.fs.close(fd2, function() {
                        self.fs.chmod(path4, attr || 438, function() {
                          callback(true);
                        });
                      });
                    });
                  });
                });
              } else if (fd) {
                self.fs.write(fd, content, 0, content.length, 0, function() {
                  self.fs.close(fd, function() {
                    self.fs.chmod(path4, attr || 438, function() {
                      callback(true);
                    });
                  });
                });
              } else {
                self.fs.chmod(path4, attr || 438, function() {
                  callback(true);
                });
              }
            });
          });
        });
      });
    };
    Utils.prototype.findFiles = function(path4) {
      const self = this;
      function findSync(dir, pattern, recursive) {
        if (typeof pattern === "boolean") {
          recursive = pattern;
          pattern = void 0;
        }
        let files = [];
        self.fs.readdirSync(dir).forEach(function(file) {
          const path5 = pth.join(dir, file);
          const stat = self.fs.statSync(path5);
          if (!pattern || pattern.test(path5)) {
            files.push(pth.normalize(path5) + (stat.isDirectory() ? self.sep : ""));
          }
          if (stat.isDirectory() && recursive) files = files.concat(findSync(path5, pattern, recursive));
        });
        return files;
      }
      return findSync(path4, void 0, true);
    };
    Utils.prototype.findFilesAsync = function(dir, cb) {
      const self = this;
      let results = [];
      self.fs.readdir(dir, function(err, list) {
        if (err) return cb(err);
        let list_length = list.length;
        if (!list_length) return cb(null, results);
        list.forEach(function(file) {
          file = pth.join(dir, file);
          self.fs.stat(file, function(err2, stat) {
            if (err2) return cb(err2);
            if (stat) {
              results.push(pth.normalize(file) + (stat.isDirectory() ? self.sep : ""));
              if (stat.isDirectory()) {
                self.findFilesAsync(file, function(err3, res) {
                  if (err3) return cb(err3);
                  results = results.concat(res);
                  if (!--list_length) cb(null, results);
                });
              } else {
                if (!--list_length) cb(null, results);
              }
            }
          });
        });
      });
    };
    Utils.prototype.getAttributes = function() {
    };
    Utils.prototype.setAttributes = function() {
    };
    Utils.crc32update = function(crc, byte) {
      return crcTable[(crc ^ byte) & 255] ^ crc >>> 8;
    };
    Utils.crc32 = function(buf) {
      if (typeof buf === "string") {
        buf = Buffer.from(buf, "utf8");
      }
      let len = buf.length;
      let crc = ~0;
      for (let off = 0; off < len; ) crc = Utils.crc32update(crc, buf[off++]);
      return ~crc >>> 0;
    };
    Utils.methodToString = function(method) {
      switch (method) {
        case Constants.STORED:
          return "STORED (" + method + ")";
        case Constants.DEFLATED:
          return "DEFLATED (" + method + ")";
        default:
          return "UNSUPPORTED (" + method + ")";
      }
    };
    Utils.canonical = function(path4) {
      if (!path4) return "";
      const safeSuffix = pth.posix.normalize("/" + path4.split("\\").join("/"));
      return pth.join(".", safeSuffix);
    };
    Utils.zipnamefix = function(path4) {
      if (!path4) return "";
      const safeSuffix = pth.posix.normalize("/" + path4.split("\\").join("/"));
      return pth.posix.join(".", safeSuffix);
    };
    Utils.findLast = function(arr, callback) {
      if (!Array.isArray(arr)) throw new TypeError("arr is not array");
      const len = arr.length >>> 0;
      for (let i = len - 1; i >= 0; i--) {
        if (callback(arr[i], i, arr)) {
          return arr[i];
        }
      }
      return void 0;
    };
    Utils.sanitize = function(prefix, name) {
      prefix = pth.resolve(pth.normalize(prefix));
      var parts = name.split("/");
      for (var i = 0, l = parts.length; i < l; i++) {
        var path4 = pth.normalize(pth.join(prefix, parts.slice(i, l).join(pth.sep)));
        if (path4.indexOf(prefix) === 0) {
          return path4;
        }
      }
      return pth.normalize(pth.join(prefix, pth.basename(name)));
    };
    Utils.toBuffer = function toBuffer(input, encoder) {
      if (Buffer.isBuffer(input)) {
        return input;
      } else if (input instanceof Uint8Array) {
        return Buffer.from(input);
      } else {
        return typeof input === "string" ? encoder(input) : Buffer.alloc(0);
      }
    };
    Utils.readBigUInt64LE = function(buffer, index) {
      var slice = Buffer.from(buffer.slice(index, index + 8));
      slice.swap64();
      return parseInt(`0x${slice.toString("hex")}`);
    };
    Utils.fromDOS2Date = function(val) {
      return new Date((val >> 25 & 127) + 1980, Math.max((val >> 21 & 15) - 1, 0), Math.max(val >> 16 & 31, 1), val >> 11 & 31, val >> 5 & 63, (val & 31) << 1);
    };
    Utils.fromDate2DOS = function(val) {
      let date = 0;
      let time = 0;
      if (val.getFullYear() > 1979) {
        date = (val.getFullYear() - 1980 & 127) << 9 | val.getMonth() + 1 << 5 | val.getDate();
        time = val.getHours() << 11 | val.getMinutes() << 5 | val.getSeconds() >> 1;
      }
      return date << 16 | time;
    };
    Utils.isWin = isWin;
    Utils.crcTable = crcTable;
  }
});

// ../node_modules/adm-zip/util/fattr.js
var require_fattr = __commonJS({
  "../node_modules/adm-zip/util/fattr.js"(exports, module) {
    var pth = __require("path");
    module.exports = function(path4, { fs: fs3 }) {
      var _path = path4 || "", _obj = newAttr(), _stat = null;
      function newAttr() {
        return {
          directory: false,
          readonly: false,
          hidden: false,
          executable: false,
          mtime: 0,
          atime: 0
        };
      }
      if (_path && fs3.existsSync(_path)) {
        _stat = fs3.statSync(_path);
        _obj.directory = _stat.isDirectory();
        _obj.mtime = _stat.mtime;
        _obj.atime = _stat.atime;
        _obj.executable = (73 & _stat.mode) !== 0;
        _obj.readonly = (128 & _stat.mode) === 0;
        _obj.hidden = pth.basename(_path)[0] === ".";
      } else {
        console.warn("Invalid path: " + _path);
      }
      return {
        get directory() {
          return _obj.directory;
        },
        get readOnly() {
          return _obj.readonly;
        },
        get hidden() {
          return _obj.hidden;
        },
        get mtime() {
          return _obj.mtime;
        },
        get atime() {
          return _obj.atime;
        },
        get executable() {
          return _obj.executable;
        },
        decodeAttributes: function() {
        },
        encodeAttributes: function() {
        },
        toJSON: function() {
          return {
            path: _path,
            isDirectory: _obj.directory,
            isReadOnly: _obj.readonly,
            isHidden: _obj.hidden,
            isExecutable: _obj.executable,
            mTime: _obj.mtime,
            aTime: _obj.atime
          };
        },
        toString: function() {
          return JSON.stringify(this.toJSON(), null, "	");
        }
      };
    };
  }
});

// ../node_modules/adm-zip/util/decoder.js
var require_decoder = __commonJS({
  "../node_modules/adm-zip/util/decoder.js"(exports, module) {
    module.exports = {
      efs: true,
      encode: (data) => Buffer.from(data, "utf8"),
      decode: (data) => data.toString("utf8")
    };
  }
});

// ../node_modules/adm-zip/util/index.js
var require_util = __commonJS({
  "../node_modules/adm-zip/util/index.js"(exports, module) {
    module.exports = require_utils();
    module.exports.Constants = require_constants();
    module.exports.Errors = require_errors();
    module.exports.FileAttr = require_fattr();
    module.exports.decoder = require_decoder();
  }
});

// ../node_modules/adm-zip/headers/entryHeader.js
var require_entryHeader = __commonJS({
  "../node_modules/adm-zip/headers/entryHeader.js"(exports, module) {
    var Utils = require_util();
    var Constants = Utils.Constants;
    module.exports = function() {
      var _verMade = 20, _version = 10, _flags = 0, _method = 0, _time = 0, _crc = 0, _compressedSize = 0, _size = 0, _fnameLen = 0, _extraLen = 0, _comLen = 0, _diskStart = 0, _inattr = 0, _attr = 0, _offset = 0;
      _verMade |= Utils.isWin ? 2560 : 768;
      _flags |= Constants.FLG_EFS;
      const _localHeader = {
        extraLen: 0
      };
      const uint32 = (val) => Math.max(0, val) >>> 0;
      const uint16 = (val) => Math.max(0, val) & 65535;
      const uint8 = (val) => Math.max(0, val) & 255;
      _time = Utils.fromDate2DOS(/* @__PURE__ */ new Date());
      return {
        get made() {
          return _verMade;
        },
        set made(val) {
          _verMade = val;
        },
        get version() {
          return _version;
        },
        set version(val) {
          _version = val;
        },
        get flags() {
          return _flags;
        },
        set flags(val) {
          _flags = val;
        },
        get flags_efs() {
          return (_flags & Constants.FLG_EFS) > 0;
        },
        set flags_efs(val) {
          if (val) {
            _flags |= Constants.FLG_EFS;
          } else {
            _flags &= ~Constants.FLG_EFS;
          }
        },
        get flags_desc() {
          return (_flags & Constants.FLG_DESC) > 0;
        },
        set flags_desc(val) {
          if (val) {
            _flags |= Constants.FLG_DESC;
          } else {
            _flags &= ~Constants.FLG_DESC;
          }
        },
        get method() {
          return _method;
        },
        set method(val) {
          switch (val) {
            case Constants.STORED:
              this.version = 10;
            case Constants.DEFLATED:
            default:
              this.version = 20;
          }
          _method = val;
        },
        get time() {
          return Utils.fromDOS2Date(this.timeval);
        },
        set time(val) {
          this.timeval = Utils.fromDate2DOS(val);
        },
        get timeval() {
          return _time;
        },
        set timeval(val) {
          _time = uint32(val);
        },
        get timeHighByte() {
          return uint8(_time >>> 8);
        },
        get crc() {
          return _crc;
        },
        set crc(val) {
          _crc = uint32(val);
        },
        get compressedSize() {
          return _compressedSize;
        },
        set compressedSize(val) {
          _compressedSize = uint32(val);
        },
        get size() {
          return _size;
        },
        set size(val) {
          _size = uint32(val);
        },
        get fileNameLength() {
          return _fnameLen;
        },
        set fileNameLength(val) {
          _fnameLen = val;
        },
        get extraLength() {
          return _extraLen;
        },
        set extraLength(val) {
          _extraLen = val;
        },
        get extraLocalLength() {
          return _localHeader.extraLen;
        },
        set extraLocalLength(val) {
          _localHeader.extraLen = val;
        },
        get commentLength() {
          return _comLen;
        },
        set commentLength(val) {
          _comLen = val;
        },
        get diskNumStart() {
          return _diskStart;
        },
        set diskNumStart(val) {
          _diskStart = uint32(val);
        },
        get inAttr() {
          return _inattr;
        },
        set inAttr(val) {
          _inattr = uint32(val);
        },
        get attr() {
          return _attr;
        },
        set attr(val) {
          _attr = uint32(val);
        },
        // get Unix file permissions
        get fileAttr() {
          return (_attr || 0) >> 16 & 4095;
        },
        get offset() {
          return _offset;
        },
        set offset(val) {
          _offset = uint32(val);
        },
        get encrypted() {
          return (_flags & Constants.FLG_ENC) === Constants.FLG_ENC;
        },
        get centralHeaderSize() {
          return Constants.CENHDR + _fnameLen + _extraLen + _comLen;
        },
        get realDataOffset() {
          return _offset + Constants.LOCHDR + _localHeader.fnameLen + _localHeader.extraLen;
        },
        get localHeader() {
          return _localHeader;
        },
        loadLocalHeaderFromBinary: function(input) {
          var data = input.slice(_offset, _offset + Constants.LOCHDR);
          if (data.readUInt32LE(0) !== Constants.LOCSIG) {
            throw Utils.Errors.INVALID_LOC();
          }
          _localHeader.version = data.readUInt16LE(Constants.LOCVER);
          _localHeader.flags = data.readUInt16LE(Constants.LOCFLG);
          _localHeader.method = data.readUInt16LE(Constants.LOCHOW);
          _localHeader.time = data.readUInt32LE(Constants.LOCTIM);
          _localHeader.crc = data.readUInt32LE(Constants.LOCCRC);
          _localHeader.compressedSize = data.readUInt32LE(Constants.LOCSIZ);
          _localHeader.size = data.readUInt32LE(Constants.LOCLEN);
          _localHeader.fnameLen = data.readUInt16LE(Constants.LOCNAM);
          _localHeader.extraLen = data.readUInt16LE(Constants.LOCEXT);
          const extraStart = _offset + Constants.LOCHDR + _localHeader.fnameLen;
          const extraEnd = extraStart + _localHeader.extraLen;
          return input.slice(extraStart, extraEnd);
        },
        loadFromBinary: function(data) {
          if (data.length !== Constants.CENHDR || data.readUInt32LE(0) !== Constants.CENSIG) {
            throw Utils.Errors.INVALID_CEN();
          }
          _verMade = data.readUInt16LE(Constants.CENVEM);
          _version = data.readUInt16LE(Constants.CENVER);
          _flags = data.readUInt16LE(Constants.CENFLG);
          _method = data.readUInt16LE(Constants.CENHOW);
          _time = data.readUInt32LE(Constants.CENTIM);
          _crc = data.readUInt32LE(Constants.CENCRC);
          _compressedSize = data.readUInt32LE(Constants.CENSIZ);
          _size = data.readUInt32LE(Constants.CENLEN);
          _fnameLen = data.readUInt16LE(Constants.CENNAM);
          _extraLen = data.readUInt16LE(Constants.CENEXT);
          _comLen = data.readUInt16LE(Constants.CENCOM);
          _diskStart = data.readUInt16LE(Constants.CENDSK);
          _inattr = data.readUInt16LE(Constants.CENATT);
          _attr = data.readUInt32LE(Constants.CENATX);
          _offset = data.readUInt32LE(Constants.CENOFF);
        },
        localHeaderToBinary: function() {
          var data = Buffer.alloc(Constants.LOCHDR);
          data.writeUInt32LE(Constants.LOCSIG, 0);
          data.writeUInt16LE(_version, Constants.LOCVER);
          data.writeUInt16LE(_flags, Constants.LOCFLG);
          data.writeUInt16LE(_method, Constants.LOCHOW);
          data.writeUInt32LE(_time, Constants.LOCTIM);
          data.writeUInt32LE(_crc, Constants.LOCCRC);
          data.writeUInt32LE(_compressedSize, Constants.LOCSIZ);
          data.writeUInt32LE(_size, Constants.LOCLEN);
          data.writeUInt16LE(_fnameLen, Constants.LOCNAM);
          data.writeUInt16LE(_localHeader.extraLen, Constants.LOCEXT);
          return data;
        },
        centralHeaderToBinary: function() {
          var data = Buffer.alloc(Constants.CENHDR + _fnameLen + _extraLen + _comLen);
          data.writeUInt32LE(Constants.CENSIG, 0);
          data.writeUInt16LE(_verMade, Constants.CENVEM);
          data.writeUInt16LE(_version, Constants.CENVER);
          data.writeUInt16LE(_flags, Constants.CENFLG);
          data.writeUInt16LE(_method, Constants.CENHOW);
          data.writeUInt32LE(_time, Constants.CENTIM);
          data.writeUInt32LE(_crc, Constants.CENCRC);
          data.writeUInt32LE(_compressedSize, Constants.CENSIZ);
          data.writeUInt32LE(_size, Constants.CENLEN);
          data.writeUInt16LE(_fnameLen, Constants.CENNAM);
          data.writeUInt16LE(_extraLen, Constants.CENEXT);
          data.writeUInt16LE(_comLen, Constants.CENCOM);
          data.writeUInt16LE(_diskStart, Constants.CENDSK);
          data.writeUInt16LE(_inattr, Constants.CENATT);
          data.writeUInt32LE(_attr, Constants.CENATX);
          data.writeUInt32LE(_offset, Constants.CENOFF);
          return data;
        },
        toJSON: function() {
          const bytes = function(nr) {
            return nr + " bytes";
          };
          return {
            made: _verMade,
            version: _version,
            flags: _flags,
            method: Utils.methodToString(_method),
            time: this.time,
            crc: "0x" + _crc.toString(16).toUpperCase(),
            compressedSize: bytes(_compressedSize),
            size: bytes(_size),
            fileNameLength: bytes(_fnameLen),
            extraLength: bytes(_extraLen),
            commentLength: bytes(_comLen),
            diskNumStart: _diskStart,
            inAttr: _inattr,
            attr: _attr,
            offset: _offset,
            centralHeaderSize: bytes(Constants.CENHDR + _fnameLen + _extraLen + _comLen)
          };
        },
        toString: function() {
          return JSON.stringify(this.toJSON(), null, "	");
        }
      };
    };
  }
});

// ../node_modules/adm-zip/headers/mainHeader.js
var require_mainHeader = __commonJS({
  "../node_modules/adm-zip/headers/mainHeader.js"(exports, module) {
    var Utils = require_util();
    var Constants = Utils.Constants;
    module.exports = function() {
      var _volumeEntries = 0, _totalEntries = 0, _size = 0, _offset = 0, _commentLength = 0;
      return {
        get diskEntries() {
          return _volumeEntries;
        },
        set diskEntries(val) {
          _volumeEntries = _totalEntries = val;
        },
        get totalEntries() {
          return _totalEntries;
        },
        set totalEntries(val) {
          _totalEntries = _volumeEntries = val;
        },
        get size() {
          return _size;
        },
        set size(val) {
          _size = val;
        },
        get offset() {
          return _offset;
        },
        set offset(val) {
          _offset = val;
        },
        get commentLength() {
          return _commentLength;
        },
        set commentLength(val) {
          _commentLength = val;
        },
        get mainHeaderSize() {
          return Constants.ENDHDR + _commentLength;
        },
        loadFromBinary: function(data) {
          if ((data.length !== Constants.ENDHDR || data.readUInt32LE(0) !== Constants.ENDSIG) && (data.length < Constants.ZIP64HDR || data.readUInt32LE(0) !== Constants.ZIP64SIG)) {
            throw Utils.Errors.INVALID_END();
          }
          if (data.readUInt32LE(0) === Constants.ENDSIG) {
            _volumeEntries = data.readUInt16LE(Constants.ENDSUB);
            _totalEntries = data.readUInt16LE(Constants.ENDTOT);
            _size = data.readUInt32LE(Constants.ENDSIZ);
            _offset = data.readUInt32LE(Constants.ENDOFF);
            _commentLength = data.readUInt16LE(Constants.ENDCOM);
          } else {
            _volumeEntries = Utils.readBigUInt64LE(data, Constants.ZIP64SUB);
            _totalEntries = Utils.readBigUInt64LE(data, Constants.ZIP64TOT);
            _size = Utils.readBigUInt64LE(data, Constants.ZIP64SIZE);
            _offset = Utils.readBigUInt64LE(data, Constants.ZIP64OFF);
            _commentLength = 0;
          }
        },
        toBinary: function() {
          var b = Buffer.alloc(Constants.ENDHDR + _commentLength);
          b.writeUInt32LE(Constants.ENDSIG, 0);
          b.writeUInt32LE(0, 4);
          b.writeUInt16LE(_volumeEntries, Constants.ENDSUB);
          b.writeUInt16LE(_totalEntries, Constants.ENDTOT);
          b.writeUInt32LE(_size, Constants.ENDSIZ);
          b.writeUInt32LE(_offset, Constants.ENDOFF);
          b.writeUInt16LE(_commentLength, Constants.ENDCOM);
          b.fill(" ", Constants.ENDHDR);
          return b;
        },
        toJSON: function() {
          const offset = function(nr, len) {
            let offs = nr.toString(16).toUpperCase();
            while (offs.length < len) offs = "0" + offs;
            return "0x" + offs;
          };
          return {
            diskEntries: _volumeEntries,
            totalEntries: _totalEntries,
            size: _size + " bytes",
            offset: offset(_offset, 4),
            commentLength: _commentLength
          };
        },
        toString: function() {
          return JSON.stringify(this.toJSON(), null, "	");
        }
      };
    };
  }
});

// ../node_modules/adm-zip/headers/index.js
var require_headers = __commonJS({
  "../node_modules/adm-zip/headers/index.js"(exports) {
    exports.EntryHeader = require_entryHeader();
    exports.MainHeader = require_mainHeader();
  }
});

// ../node_modules/adm-zip/methods/deflater.js
var require_deflater = __commonJS({
  "../node_modules/adm-zip/methods/deflater.js"(exports, module) {
    module.exports = function(inbuf) {
      var zlib = __require("zlib");
      var opts = { chunkSize: (parseInt(inbuf.length / 1024) + 1) * 1024 };
      return {
        deflate: function() {
          return zlib.deflateRawSync(inbuf, opts);
        },
        deflateAsync: function(callback) {
          var tmp = zlib.createDeflateRaw(opts), parts = [], total = 0;
          tmp.on("data", function(data) {
            parts.push(data);
            total += data.length;
          });
          tmp.on("end", function() {
            var buf = Buffer.alloc(total), written = 0;
            buf.fill(0);
            for (var i = 0; i < parts.length; i++) {
              var part = parts[i];
              part.copy(buf, written);
              written += part.length;
            }
            callback && callback(buf);
          });
          tmp.end(inbuf);
        }
      };
    };
  }
});

// ../node_modules/adm-zip/methods/inflater.js
var require_inflater = __commonJS({
  "../node_modules/adm-zip/methods/inflater.js"(exports, module) {
    var version = +(process.versions ? process.versions.node : "").split(".")[0] || 0;
    module.exports = function(inbuf, expectedLength) {
      var zlib = __require("zlib");
      const option = version >= 15 && expectedLength > 0 ? { maxOutputLength: expectedLength } : {};
      return {
        inflate: function() {
          return zlib.inflateRawSync(inbuf, option);
        },
        inflateAsync: function(callback) {
          var tmp = zlib.createInflateRaw(option), parts = [], total = 0;
          tmp.on("data", function(data) {
            parts.push(data);
            total += data.length;
          });
          tmp.on("end", function() {
            var buf = Buffer.alloc(total), written = 0;
            buf.fill(0);
            for (var i = 0; i < parts.length; i++) {
              var part = parts[i];
              part.copy(buf, written);
              written += part.length;
            }
            callback && callback(buf);
          });
          tmp.end(inbuf);
        }
      };
    };
  }
});

// ../node_modules/adm-zip/methods/zipcrypto.js
var require_zipcrypto = __commonJS({
  "../node_modules/adm-zip/methods/zipcrypto.js"(exports, module) {
    "use strict";
    var { randomFillSync } = __require("crypto");
    var Errors = require_errors();
    var crctable = new Uint32Array(256).map((t, crc) => {
      for (let j = 0; j < 8; j++) {
        if (0 !== (crc & 1)) {
          crc = crc >>> 1 ^ 3988292384;
        } else {
          crc >>>= 1;
        }
      }
      return crc >>> 0;
    });
    var uMul = (a, b) => Math.imul(a, b) >>> 0;
    var crc32update = (pCrc32, bval) => {
      return crctable[(pCrc32 ^ bval) & 255] ^ pCrc32 >>> 8;
    };
    var genSalt = () => {
      if ("function" === typeof randomFillSync) {
        return randomFillSync(Buffer.alloc(12));
      } else {
        return genSalt.node();
      }
    };
    genSalt.node = () => {
      const salt = Buffer.alloc(12);
      const len = salt.length;
      for (let i = 0; i < len; i++) salt[i] = Math.random() * 256 & 255;
      return salt;
    };
    var config = {
      genSalt
    };
    function Initkeys(pw) {
      const pass = Buffer.isBuffer(pw) ? pw : Buffer.from(pw);
      this.keys = new Uint32Array([305419896, 591751049, 878082192]);
      for (let i = 0; i < pass.length; i++) {
        this.updateKeys(pass[i]);
      }
    }
    Initkeys.prototype.updateKeys = function(byteValue) {
      const keys = this.keys;
      keys[0] = crc32update(keys[0], byteValue);
      keys[1] += keys[0] & 255;
      keys[1] = uMul(keys[1], 134775813) + 1;
      keys[2] = crc32update(keys[2], keys[1] >>> 24);
      return byteValue;
    };
    Initkeys.prototype.next = function() {
      const k = (this.keys[2] | 2) >>> 0;
      return uMul(k, k ^ 1) >> 8 & 255;
    };
    function make_decrypter(pwd) {
      const keys = new Initkeys(pwd);
      return function(data) {
        const result = Buffer.alloc(data.length);
        let pos = 0;
        for (let c of data) {
          result[pos++] = keys.updateKeys(c ^ keys.next());
        }
        return result;
      };
    }
    function make_encrypter(pwd) {
      const keys = new Initkeys(pwd);
      return function(data, result, pos = 0) {
        if (!result) result = Buffer.alloc(data.length);
        for (let c of data) {
          const k = keys.next();
          result[pos++] = c ^ k;
          keys.updateKeys(c);
        }
        return result;
      };
    }
    function decrypt(data, header, pwd) {
      if (!data || !Buffer.isBuffer(data) || data.length < 12) {
        return Buffer.alloc(0);
      }
      const decrypter = make_decrypter(pwd);
      const salt = decrypter(data.slice(0, 12));
      const verifyByte = (header.flags & 8) === 8 ? header.timeHighByte : header.crc >>> 24;
      if (salt[11] !== verifyByte) {
        throw Errors.WRONG_PASSWORD();
      }
      return decrypter(data.slice(12));
    }
    function _salter(data) {
      if (Buffer.isBuffer(data) && data.length >= 12) {
        config.genSalt = function() {
          return data.slice(0, 12);
        };
      } else if (data === "node") {
        config.genSalt = genSalt.node;
      } else {
        config.genSalt = genSalt;
      }
    }
    function encrypt(data, header, pwd, oldlike = false) {
      if (data == null) data = Buffer.alloc(0);
      if (!Buffer.isBuffer(data)) data = Buffer.from(data.toString());
      const encrypter = make_encrypter(pwd);
      const salt = config.genSalt();
      salt[11] = header.crc >>> 24 & 255;
      if (oldlike) salt[10] = header.crc >>> 16 & 255;
      const result = Buffer.alloc(data.length + 12);
      encrypter(salt, result);
      return encrypter(data, result, 12);
    }
    module.exports = { decrypt, encrypt, _salter };
  }
});

// ../node_modules/adm-zip/methods/index.js
var require_methods = __commonJS({
  "../node_modules/adm-zip/methods/index.js"(exports) {
    exports.Deflater = require_deflater();
    exports.Inflater = require_inflater();
    exports.ZipCrypto = require_zipcrypto();
  }
});

// ../node_modules/adm-zip/zipEntry.js
var require_zipEntry = __commonJS({
  "../node_modules/adm-zip/zipEntry.js"(exports, module) {
    var Utils = require_util();
    var Headers = require_headers();
    var Constants = Utils.Constants;
    var Methods = require_methods();
    module.exports = function(options, input) {
      var _centralHeader = new Headers.EntryHeader(), _entryName = Buffer.alloc(0), _comment = Buffer.alloc(0), _isDirectory = false, uncompressedData = null, _extra = Buffer.alloc(0), _extralocal = Buffer.alloc(0), _efs = true;
      const opts = options;
      const decoder = typeof opts.decoder === "object" ? opts.decoder : Utils.decoder;
      _efs = decoder.hasOwnProperty("efs") ? decoder.efs : false;
      function getCompressedDataFromZip() {
        if (!input || !(input instanceof Uint8Array)) {
          return Buffer.alloc(0);
        }
        _extralocal = _centralHeader.loadLocalHeaderFromBinary(input);
        return input.slice(_centralHeader.realDataOffset, _centralHeader.realDataOffset + _centralHeader.compressedSize);
      }
      function crc32OK(data) {
        if (!_centralHeader.flags_desc) {
          if (Utils.crc32(data) !== _centralHeader.localHeader.crc) {
            return false;
          }
        } else {
          const descriptor = {};
          const dataEndOffset = _centralHeader.realDataOffset + _centralHeader.compressedSize;
          if (input.readUInt32LE(dataEndOffset) == Constants.LOCSIG || input.readUInt32LE(dataEndOffset) == Constants.CENSIG) {
            throw Utils.Errors.DESCRIPTOR_NOT_EXIST();
          }
          if (input.readUInt32LE(dataEndOffset) == Constants.EXTSIG) {
            descriptor.crc = input.readUInt32LE(dataEndOffset + Constants.EXTCRC);
            descriptor.compressedSize = input.readUInt32LE(dataEndOffset + Constants.EXTSIZ);
            descriptor.size = input.readUInt32LE(dataEndOffset + Constants.EXTLEN);
          } else if (input.readUInt16LE(dataEndOffset + 12) === 19280) {
            descriptor.crc = input.readUInt32LE(dataEndOffset + Constants.EXTCRC - 4);
            descriptor.compressedSize = input.readUInt32LE(dataEndOffset + Constants.EXTSIZ - 4);
            descriptor.size = input.readUInt32LE(dataEndOffset + Constants.EXTLEN - 4);
          } else {
            throw Utils.Errors.DESCRIPTOR_UNKNOWN();
          }
          if (descriptor.compressedSize !== _centralHeader.compressedSize || descriptor.size !== _centralHeader.size || descriptor.crc !== _centralHeader.crc) {
            throw Utils.Errors.DESCRIPTOR_FAULTY();
          }
          if (Utils.crc32(data) !== descriptor.crc) {
            return false;
          }
        }
        return true;
      }
      function decompress(async, callback, pass) {
        if (typeof callback === "undefined" && typeof async === "string") {
          pass = async;
          async = void 0;
        }
        if (_isDirectory) {
          if (async && callback) {
            callback(Buffer.alloc(0), Utils.Errors.DIRECTORY_CONTENT_ERROR());
          }
          return Buffer.alloc(0);
        }
        var compressedData = getCompressedDataFromZip();
        if (compressedData.length === 0) {
          if (async && callback) callback(compressedData);
          return compressedData;
        }
        if (_centralHeader.encrypted) {
          if ("string" !== typeof pass && !Buffer.isBuffer(pass)) {
            throw Utils.Errors.INVALID_PASS_PARAM();
          }
          compressedData = Methods.ZipCrypto.decrypt(compressedData, _centralHeader, pass);
        }
        var data = Buffer.alloc(_centralHeader.size);
        switch (_centralHeader.method) {
          case Utils.Constants.STORED:
            compressedData.copy(data);
            if (!crc32OK(data)) {
              if (async && callback) callback(data, Utils.Errors.BAD_CRC());
              throw Utils.Errors.BAD_CRC();
            } else {
              if (async && callback) callback(data);
              return data;
            }
          case Utils.Constants.DEFLATED:
            var inflater = new Methods.Inflater(compressedData, _centralHeader.size);
            if (!async) {
              const result = inflater.inflate(data);
              result.copy(data, 0);
              if (!crc32OK(data)) {
                throw Utils.Errors.BAD_CRC(`"${decoder.decode(_entryName)}"`);
              }
              return data;
            } else {
              inflater.inflateAsync(function(result) {
                result.copy(result, 0);
                if (callback) {
                  if (!crc32OK(result)) {
                    callback(result, Utils.Errors.BAD_CRC());
                  } else {
                    callback(result);
                  }
                }
              });
            }
            break;
          default:
            if (async && callback) callback(Buffer.alloc(0), Utils.Errors.UNKNOWN_METHOD());
            throw Utils.Errors.UNKNOWN_METHOD();
        }
      }
      function compress(async, callback) {
        if ((!uncompressedData || !uncompressedData.length) && Buffer.isBuffer(input)) {
          if (async && callback) callback(getCompressedDataFromZip());
          return getCompressedDataFromZip();
        }
        if (uncompressedData.length && !_isDirectory) {
          var compressedData;
          switch (_centralHeader.method) {
            case Utils.Constants.STORED:
              _centralHeader.compressedSize = _centralHeader.size;
              compressedData = Buffer.alloc(uncompressedData.length);
              uncompressedData.copy(compressedData);
              if (async && callback) callback(compressedData);
              return compressedData;
            default:
            case Utils.Constants.DEFLATED:
              var deflater = new Methods.Deflater(uncompressedData);
              if (!async) {
                var deflated = deflater.deflate();
                _centralHeader.compressedSize = deflated.length;
                return deflated;
              } else {
                deflater.deflateAsync(function(data) {
                  compressedData = Buffer.alloc(data.length);
                  _centralHeader.compressedSize = data.length;
                  data.copy(compressedData);
                  callback && callback(compressedData);
                });
              }
              deflater = null;
              break;
          }
        } else if (async && callback) {
          callback(Buffer.alloc(0));
        } else {
          return Buffer.alloc(0);
        }
      }
      function readUInt64LE(buffer, offset) {
        return (buffer.readUInt32LE(offset + 4) << 4) + buffer.readUInt32LE(offset);
      }
      function parseExtra(data) {
        try {
          var offset = 0;
          var signature, size, part;
          while (offset + 4 < data.length) {
            signature = data.readUInt16LE(offset);
            offset += 2;
            size = data.readUInt16LE(offset);
            offset += 2;
            part = data.slice(offset, offset + size);
            offset += size;
            if (Constants.ID_ZIP64 === signature) {
              parseZip64ExtendedInformation(part);
            }
          }
        } catch (error) {
          throw Utils.Errors.EXTRA_FIELD_PARSE_ERROR();
        }
      }
      function parseZip64ExtendedInformation(data) {
        var size, compressedSize, offset, diskNumStart;
        if (data.length >= Constants.EF_ZIP64_SCOMP) {
          size = readUInt64LE(data, Constants.EF_ZIP64_SUNCOMP);
          if (_centralHeader.size === Constants.EF_ZIP64_OR_32) {
            _centralHeader.size = size;
          }
        }
        if (data.length >= Constants.EF_ZIP64_RHO) {
          compressedSize = readUInt64LE(data, Constants.EF_ZIP64_SCOMP);
          if (_centralHeader.compressedSize === Constants.EF_ZIP64_OR_32) {
            _centralHeader.compressedSize = compressedSize;
          }
        }
        if (data.length >= Constants.EF_ZIP64_DSN) {
          offset = readUInt64LE(data, Constants.EF_ZIP64_RHO);
          if (_centralHeader.offset === Constants.EF_ZIP64_OR_32) {
            _centralHeader.offset = offset;
          }
        }
        if (data.length >= Constants.EF_ZIP64_DSN + 4) {
          diskNumStart = data.readUInt32LE(Constants.EF_ZIP64_DSN);
          if (_centralHeader.diskNumStart === Constants.EF_ZIP64_OR_16) {
            _centralHeader.diskNumStart = diskNumStart;
          }
        }
      }
      return {
        get entryName() {
          return decoder.decode(_entryName);
        },
        get rawEntryName() {
          return _entryName;
        },
        set entryName(val) {
          _entryName = Utils.toBuffer(val, decoder.encode);
          var lastChar = _entryName[_entryName.length - 1];
          _isDirectory = lastChar === 47 || lastChar === 92;
          _centralHeader.fileNameLength = _entryName.length;
        },
        get efs() {
          if (typeof _efs === "function") {
            return _efs(this.entryName);
          } else {
            return _efs;
          }
        },
        get extra() {
          return _extra;
        },
        set extra(val) {
          _extra = val;
          _centralHeader.extraLength = val.length;
          parseExtra(val);
        },
        get comment() {
          return decoder.decode(_comment);
        },
        set comment(val) {
          _comment = Utils.toBuffer(val, decoder.encode);
          _centralHeader.commentLength = _comment.length;
          if (_comment.length > 65535) throw Utils.Errors.COMMENT_TOO_LONG();
        },
        get name() {
          var n = decoder.decode(_entryName);
          return _isDirectory ? n.substr(n.length - 1).split("/").pop() : n.split("/").pop();
        },
        get isDirectory() {
          return _isDirectory;
        },
        getCompressedData: function() {
          return compress(false, null);
        },
        getCompressedDataAsync: function(callback) {
          compress(true, callback);
        },
        setData: function(value) {
          uncompressedData = Utils.toBuffer(value, Utils.decoder.encode);
          if (!_isDirectory && uncompressedData.length) {
            _centralHeader.size = uncompressedData.length;
            _centralHeader.method = Utils.Constants.DEFLATED;
            _centralHeader.crc = Utils.crc32(value);
            _centralHeader.changed = true;
          } else {
            _centralHeader.method = Utils.Constants.STORED;
          }
        },
        getData: function(pass) {
          if (_centralHeader.changed) {
            return uncompressedData;
          } else {
            return decompress(false, null, pass);
          }
        },
        getDataAsync: function(callback, pass) {
          if (_centralHeader.changed) {
            callback(uncompressedData);
          } else {
            decompress(true, callback, pass);
          }
        },
        set attr(attr) {
          _centralHeader.attr = attr;
        },
        get attr() {
          return _centralHeader.attr;
        },
        set header(data) {
          _centralHeader.loadFromBinary(data);
        },
        get header() {
          return _centralHeader;
        },
        packCentralHeader: function() {
          _centralHeader.flags_efs = this.efs;
          _centralHeader.extraLength = _extra.length;
          var header = _centralHeader.centralHeaderToBinary();
          var addpos = Utils.Constants.CENHDR;
          _entryName.copy(header, addpos);
          addpos += _entryName.length;
          _extra.copy(header, addpos);
          addpos += _centralHeader.extraLength;
          _comment.copy(header, addpos);
          return header;
        },
        packLocalHeader: function() {
          let addpos = 0;
          _centralHeader.flags_efs = this.efs;
          _centralHeader.extraLocalLength = _extralocal.length;
          const localHeaderBuf = _centralHeader.localHeaderToBinary();
          const localHeader = Buffer.alloc(localHeaderBuf.length + _entryName.length + _centralHeader.extraLocalLength);
          localHeaderBuf.copy(localHeader, addpos);
          addpos += localHeaderBuf.length;
          _entryName.copy(localHeader, addpos);
          addpos += _entryName.length;
          _extralocal.copy(localHeader, addpos);
          addpos += _extralocal.length;
          return localHeader;
        },
        toJSON: function() {
          const bytes = function(nr) {
            return "<" + (nr && nr.length + " bytes buffer" || "null") + ">";
          };
          return {
            entryName: this.entryName,
            name: this.name,
            comment: this.comment,
            isDirectory: this.isDirectory,
            header: _centralHeader.toJSON(),
            compressedData: bytes(input),
            data: bytes(uncompressedData)
          };
        },
        toString: function() {
          return JSON.stringify(this.toJSON(), null, "	");
        }
      };
    };
  }
});

// ../node_modules/adm-zip/zipFile.js
var require_zipFile = __commonJS({
  "../node_modules/adm-zip/zipFile.js"(exports, module) {
    var ZipEntry = require_zipEntry();
    var Headers = require_headers();
    var Utils = require_util();
    module.exports = function(inBuffer, options) {
      var entryList = [], entryTable = {}, _comment = Buffer.alloc(0), mainHeader = new Headers.MainHeader(), loadedEntries = false;
      var password = null;
      const temporary = /* @__PURE__ */ new Set();
      const opts = options;
      const { noSort, decoder } = opts;
      if (inBuffer) {
        readMainHeader(opts.readEntries);
      } else {
        loadedEntries = true;
      }
      function makeTemporaryFolders() {
        const foldersList = /* @__PURE__ */ new Set();
        for (const elem of Object.keys(entryTable)) {
          const elements = elem.split("/");
          elements.pop();
          if (!elements.length) continue;
          for (let i = 0; i < elements.length; i++) {
            const sub = elements.slice(0, i + 1).join("/") + "/";
            foldersList.add(sub);
          }
        }
        for (const elem of foldersList) {
          if (!(elem in entryTable)) {
            const tempfolder = new ZipEntry(opts);
            tempfolder.entryName = elem;
            tempfolder.attr = 16;
            tempfolder.temporary = true;
            entryList.push(tempfolder);
            entryTable[tempfolder.entryName] = tempfolder;
            temporary.add(tempfolder);
          }
        }
      }
      function readEntries() {
        loadedEntries = true;
        entryTable = {};
        if (mainHeader.diskEntries > (inBuffer.length - mainHeader.offset) / Utils.Constants.CENHDR) {
          throw Utils.Errors.DISK_ENTRY_TOO_LARGE();
        }
        entryList = new Array(mainHeader.diskEntries);
        var index = mainHeader.offset;
        for (var i = 0; i < entryList.length; i++) {
          var tmp = index, entry = new ZipEntry(opts, inBuffer);
          entry.header = inBuffer.slice(tmp, tmp += Utils.Constants.CENHDR);
          entry.entryName = inBuffer.slice(tmp, tmp += entry.header.fileNameLength);
          if (entry.header.extraLength) {
            entry.extra = inBuffer.slice(tmp, tmp += entry.header.extraLength);
          }
          if (entry.header.commentLength) entry.comment = inBuffer.slice(tmp, tmp + entry.header.commentLength);
          index += entry.header.centralHeaderSize;
          entryList[i] = entry;
          entryTable[entry.entryName] = entry;
        }
        temporary.clear();
        makeTemporaryFolders();
      }
      function readMainHeader(readNow) {
        var i = inBuffer.length - Utils.Constants.ENDHDR, max = Math.max(0, i - 65535), n = max, endStart = inBuffer.length, endOffset = -1, commentEnd = 0;
        const trailingSpace = typeof opts.trailingSpace === "boolean" ? opts.trailingSpace : false;
        if (trailingSpace) max = 0;
        for (i; i >= n; i--) {
          if (inBuffer[i] !== 80) continue;
          if (inBuffer.readUInt32LE(i) === Utils.Constants.ENDSIG) {
            endOffset = i;
            commentEnd = i;
            endStart = i + Utils.Constants.ENDHDR;
            n = i - Utils.Constants.END64HDR;
            continue;
          }
          if (inBuffer.readUInt32LE(i) === Utils.Constants.END64SIG) {
            n = max;
            continue;
          }
          if (inBuffer.readUInt32LE(i) === Utils.Constants.ZIP64SIG) {
            endOffset = i;
            endStart = i + Utils.readBigUInt64LE(inBuffer, i + Utils.Constants.ZIP64SIZE) + Utils.Constants.ZIP64LEAD;
            break;
          }
        }
        if (endOffset == -1) throw Utils.Errors.INVALID_FORMAT();
        mainHeader.loadFromBinary(inBuffer.slice(endOffset, endStart));
        if (mainHeader.commentLength) {
          _comment = inBuffer.slice(commentEnd + Utils.Constants.ENDHDR);
        }
        if (readNow) readEntries();
      }
      function sortEntries() {
        if (entryList.length > 1 && !noSort) {
          entryList.sort((a, b) => a.entryName.toLowerCase().localeCompare(b.entryName.toLowerCase()));
        }
      }
      return {
        /**
         * Returns an array of ZipEntry objects existent in the current opened archive
         * @return Array
         */
        get entries() {
          if (!loadedEntries) {
            readEntries();
          }
          return entryList.filter((e) => !temporary.has(e));
        },
        /**
         * Archive comment
         * @return {String}
         */
        get comment() {
          return decoder.decode(_comment);
        },
        set comment(val) {
          _comment = Utils.toBuffer(val, decoder.encode);
          mainHeader.commentLength = _comment.length;
        },
        getEntryCount: function() {
          if (!loadedEntries) {
            return mainHeader.diskEntries;
          }
          return entryList.length;
        },
        forEach: function(callback) {
          this.entries.forEach(callback);
        },
        /**
         * Returns a reference to the entry with the given name or null if entry is inexistent
         *
         * @param entryName
         * @return ZipEntry
         */
        getEntry: function(entryName) {
          if (!loadedEntries) {
            readEntries();
          }
          return entryTable[entryName] || null;
        },
        /**
         * Adds the given entry to the entry list
         *
         * @param entry
         */
        setEntry: function(entry) {
          if (!loadedEntries) {
            readEntries();
          }
          entryList.push(entry);
          entryTable[entry.entryName] = entry;
          mainHeader.totalEntries = entryList.length;
        },
        /**
         * Removes the file with the given name from the entry list.
         *
         * If the entry is a directory, then all nested files and directories will be removed
         * @param entryName
         * @returns {void}
         */
        deleteFile: function(entryName, withsubfolders = true) {
          if (!loadedEntries) {
            readEntries();
          }
          const entry = entryTable[entryName];
          const list = this.getEntryChildren(entry, withsubfolders).map((child) => child.entryName);
          list.forEach(this.deleteEntry);
        },
        /**
         * Removes the entry with the given name from the entry list.
         *
         * @param {string} entryName
         * @returns {void}
         */
        deleteEntry: function(entryName) {
          if (!loadedEntries) {
            readEntries();
          }
          const entry = entryTable[entryName];
          const index = entryList.indexOf(entry);
          if (index >= 0) {
            entryList.splice(index, 1);
            delete entryTable[entryName];
            mainHeader.totalEntries = entryList.length;
          }
        },
        /**
         *  Iterates and returns all nested files and directories of the given entry
         *
         * @param entry
         * @return Array
         */
        getEntryChildren: function(entry, subfolders = true) {
          if (!loadedEntries) {
            readEntries();
          }
          if (typeof entry === "object") {
            if (entry.isDirectory && subfolders) {
              const list = [];
              const name = entry.entryName;
              for (const zipEntry of entryList) {
                if (zipEntry.entryName.startsWith(name)) {
                  list.push(zipEntry);
                }
              }
              return list;
            } else {
              return [entry];
            }
          }
          return [];
        },
        /**
         *  How many child elements entry has
         *
         * @param {ZipEntry} entry
         * @return {integer}
         */
        getChildCount: function(entry) {
          if (entry && entry.isDirectory) {
            const list = this.getEntryChildren(entry);
            return list.includes(entry) ? list.length - 1 : list.length;
          }
          return 0;
        },
        /**
         * Returns the zip file
         *
         * @return Buffer
         */
        compressToBuffer: function() {
          if (!loadedEntries) {
            readEntries();
          }
          sortEntries();
          const dataBlock = [];
          const headerBlocks = [];
          let totalSize = 0;
          let dindex = 0;
          mainHeader.size = 0;
          mainHeader.offset = 0;
          let totalEntries = 0;
          for (const entry of this.entries) {
            const compressedData = entry.getCompressedData();
            entry.header.offset = dindex;
            const localHeader = entry.packLocalHeader();
            const dataLength = localHeader.length + compressedData.length;
            dindex += dataLength;
            dataBlock.push(localHeader);
            dataBlock.push(compressedData);
            const centralHeader = entry.packCentralHeader();
            headerBlocks.push(centralHeader);
            mainHeader.size += centralHeader.length;
            totalSize += dataLength + centralHeader.length;
            totalEntries++;
          }
          totalSize += mainHeader.mainHeaderSize;
          mainHeader.offset = dindex;
          mainHeader.totalEntries = totalEntries;
          dindex = 0;
          const outBuffer = Buffer.alloc(totalSize);
          for (const content of dataBlock) {
            content.copy(outBuffer, dindex);
            dindex += content.length;
          }
          for (const content of headerBlocks) {
            content.copy(outBuffer, dindex);
            dindex += content.length;
          }
          const mh = mainHeader.toBinary();
          if (_comment) {
            _comment.copy(mh, Utils.Constants.ENDHDR);
          }
          mh.copy(outBuffer, dindex);
          inBuffer = outBuffer;
          loadedEntries = false;
          return outBuffer;
        },
        toAsyncBuffer: function(onSuccess, onFail, onItemStart, onItemEnd) {
          try {
            if (!loadedEntries) {
              readEntries();
            }
            sortEntries();
            const dataBlock = [];
            const centralHeaders = [];
            let totalSize = 0;
            let dindex = 0;
            let totalEntries = 0;
            mainHeader.size = 0;
            mainHeader.offset = 0;
            const compress2Buffer = function(entryLists) {
              if (entryLists.length > 0) {
                const entry = entryLists.shift();
                const name = entry.entryName + entry.extra.toString();
                if (onItemStart) onItemStart(name);
                entry.getCompressedDataAsync(function(compressedData) {
                  if (onItemEnd) onItemEnd(name);
                  entry.header.offset = dindex;
                  const localHeader = entry.packLocalHeader();
                  const dataLength = localHeader.length + compressedData.length;
                  dindex += dataLength;
                  dataBlock.push(localHeader);
                  dataBlock.push(compressedData);
                  const centalHeader = entry.packCentralHeader();
                  centralHeaders.push(centalHeader);
                  mainHeader.size += centalHeader.length;
                  totalSize += dataLength + centalHeader.length;
                  totalEntries++;
                  compress2Buffer(entryLists);
                });
              } else {
                totalSize += mainHeader.mainHeaderSize;
                mainHeader.offset = dindex;
                mainHeader.totalEntries = totalEntries;
                dindex = 0;
                const outBuffer = Buffer.alloc(totalSize);
                dataBlock.forEach(function(content) {
                  content.copy(outBuffer, dindex);
                  dindex += content.length;
                });
                centralHeaders.forEach(function(content) {
                  content.copy(outBuffer, dindex);
                  dindex += content.length;
                });
                const mh = mainHeader.toBinary();
                if (_comment) {
                  _comment.copy(mh, Utils.Constants.ENDHDR);
                }
                mh.copy(outBuffer, dindex);
                inBuffer = outBuffer;
                loadedEntries = false;
                onSuccess(outBuffer);
              }
            };
            compress2Buffer(Array.from(this.entries));
          } catch (e) {
            onFail(e);
          }
        }
      };
    };
  }
});

// ../node_modules/adm-zip/adm-zip.js
var require_adm_zip = __commonJS({
  "../node_modules/adm-zip/adm-zip.js"(exports, module) {
    var Utils = require_util();
    var pth = __require("path");
    var ZipEntry = require_zipEntry();
    var ZipFile = require_zipFile();
    var get_Bool = (...val) => Utils.findLast(val, (c) => typeof c === "boolean");
    var get_Str = (...val) => Utils.findLast(val, (c) => typeof c === "string");
    var get_Fun = (...val) => Utils.findLast(val, (c) => typeof c === "function");
    var defaultOptions = {
      // option "noSort" : if true it disables files sorting
      noSort: false,
      // read entries during load (initial loading may be slower)
      readEntries: false,
      // default method is none
      method: Utils.Constants.NONE,
      // file system
      fs: null
    };
    module.exports = function(input, options) {
      let inBuffer = null;
      const opts = Object.assign(/* @__PURE__ */ Object.create(null), defaultOptions);
      if (input && "object" === typeof input) {
        if (!(input instanceof Uint8Array)) {
          Object.assign(opts, input);
          input = opts.input ? opts.input : void 0;
          if (opts.input) delete opts.input;
        }
        if (Buffer.isBuffer(input)) {
          inBuffer = input;
          opts.method = Utils.Constants.BUFFER;
          input = void 0;
        }
      }
      Object.assign(opts, options);
      const filetools = new Utils(opts);
      if (typeof opts.decoder !== "object" || typeof opts.decoder.encode !== "function" || typeof opts.decoder.decode !== "function") {
        opts.decoder = Utils.decoder;
      }
      if (input && "string" === typeof input) {
        if (filetools.fs.existsSync(input)) {
          opts.method = Utils.Constants.FILE;
          opts.filename = input;
          inBuffer = filetools.fs.readFileSync(input);
        } else {
          throw Utils.Errors.INVALID_FILENAME();
        }
      }
      const _zip = new ZipFile(inBuffer, opts);
      const { canonical, sanitize, zipnamefix } = Utils;
      function getEntry(entry) {
        if (entry && _zip) {
          var item;
          if (typeof entry === "string") item = _zip.getEntry(pth.posix.normalize(entry));
          if (typeof entry === "object" && typeof entry.entryName !== "undefined" && typeof entry.header !== "undefined") item = _zip.getEntry(entry.entryName);
          if (item) {
            return item;
          }
        }
        return null;
      }
      function fixPath(zipPath) {
        const { join: join20, normalize, sep: sep2 } = pth.posix;
        return join20(".", normalize(sep2 + zipPath.split("\\").join(sep2) + sep2));
      }
      function filenameFilter(filterfn) {
        if (filterfn instanceof RegExp) {
          return /* @__PURE__ */ (function(rx) {
            return function(filename) {
              return rx.test(filename);
            };
          })(filterfn);
        } else if ("function" !== typeof filterfn) {
          return () => true;
        }
        return filterfn;
      }
      const relativePath = (local, entry) => {
        let lastChar = entry.slice(-1);
        lastChar = lastChar === filetools.sep ? filetools.sep : "";
        return pth.relative(local, entry) + lastChar;
      };
      return {
        /**
         * Extracts the given entry from the archive and returns the content as a Buffer object
         * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
         * @param {Buffer|string} [pass] - password
         * @return Buffer or Null in case of error
         */
        readFile: function(entry, pass) {
          var item = getEntry(entry);
          return item && item.getData(pass) || null;
        },
        /**
         * Returns how many child elements has on entry (directories) on files it is always 0
         * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
         * @returns {integer}
         */
        childCount: function(entry) {
          const item = getEntry(entry);
          if (item) {
            return _zip.getChildCount(item);
          }
        },
        /**
         * Asynchronous readFile
         * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
         * @param {callback} callback
         *
         * @return Buffer or Null in case of error
         */
        readFileAsync: function(entry, callback) {
          var item = getEntry(entry);
          if (item) {
            item.getDataAsync(callback);
          } else {
            callback(null, "getEntry failed for:" + entry);
          }
        },
        /**
         * Extracts the given entry from the archive and returns the content as plain text in the given encoding
         * @param {ZipEntry|string} entry - ZipEntry object or String with the full path of the entry
         * @param {string} encoding - Optional. If no encoding is specified utf8 is used
         *
         * @return String
         */
        readAsText: function(entry, encoding) {
          var item = getEntry(entry);
          if (item) {
            var data = item.getData();
            if (data && data.length) {
              return data.toString(encoding || "utf8");
            }
          }
          return "";
        },
        /**
         * Asynchronous readAsText
         * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
         * @param {callback} callback
         * @param {string} [encoding] - Optional. If no encoding is specified utf8 is used
         *
         * @return String
         */
        readAsTextAsync: function(entry, callback, encoding) {
          var item = getEntry(entry);
          if (item) {
            item.getDataAsync(function(data, err) {
              if (err) {
                callback(data, err);
                return;
              }
              if (data && data.length) {
                callback(data.toString(encoding || "utf8"));
              } else {
                callback("");
              }
            });
          } else {
            callback("");
          }
        },
        /**
         * Remove the entry from the file or the entry and all it's nested directories and files if the given entry is a directory
         *
         * @param {ZipEntry|string} entry
         * @returns {void}
         */
        deleteFile: function(entry, withsubfolders = true) {
          var item = getEntry(entry);
          if (item) {
            _zip.deleteFile(item.entryName, withsubfolders);
          }
        },
        /**
         * Remove the entry from the file or directory without affecting any nested entries
         *
         * @param {ZipEntry|string} entry
         * @returns {void}
         */
        deleteEntry: function(entry) {
          var item = getEntry(entry);
          if (item) {
            _zip.deleteEntry(item.entryName);
          }
        },
        /**
         * Adds a comment to the zip. The zip must be rewritten after adding the comment.
         *
         * @param {string} comment
         */
        addZipComment: function(comment) {
          _zip.comment = comment;
        },
        /**
         * Returns the zip comment
         *
         * @return String
         */
        getZipComment: function() {
          return _zip.comment || "";
        },
        /**
         * Adds a comment to a specified zipEntry. The zip must be rewritten after adding the comment
         * The comment cannot exceed 65535 characters in length
         *
         * @param {ZipEntry} entry
         * @param {string} comment
         */
        addZipEntryComment: function(entry, comment) {
          var item = getEntry(entry);
          if (item) {
            item.comment = comment;
          }
        },
        /**
         * Returns the comment of the specified entry
         *
         * @param {ZipEntry} entry
         * @return String
         */
        getZipEntryComment: function(entry) {
          var item = getEntry(entry);
          if (item) {
            return item.comment || "";
          }
          return "";
        },
        /**
         * Updates the content of an existing entry inside the archive. The zip must be rewritten after updating the content
         *
         * @param {ZipEntry} entry
         * @param {Buffer} content
         */
        updateFile: function(entry, content) {
          var item = getEntry(entry);
          if (item) {
            item.setData(content);
          }
        },
        /**
         * Adds a file from the disk to the archive
         *
         * @param {string} localPath File to add to zip
         * @param {string} [zipPath] Optional path inside the zip
         * @param {string} [zipName] Optional name for the file
         * @param {string} [comment] Optional file comment
         */
        addLocalFile: function(localPath2, zipPath, zipName, comment) {
          if (filetools.fs.existsSync(localPath2)) {
            zipPath = zipPath ? fixPath(zipPath) : "";
            const p = pth.win32.basename(pth.win32.normalize(localPath2));
            zipPath += zipName ? zipName : p;
            const _attr = filetools.fs.statSync(localPath2);
            const data = _attr.isFile() ? filetools.fs.readFileSync(localPath2) : Buffer.alloc(0);
            if (_attr.isDirectory()) zipPath += filetools.sep;
            this.addFile(zipPath, data, comment, _attr);
          } else {
            throw Utils.Errors.FILE_NOT_FOUND(localPath2);
          }
        },
        /**
         * Callback for showing if everything was done.
         *
         * @callback doneCallback
         * @param {Error} err - Error object
         * @param {boolean} done - was request fully completed
         */
        /**
         * Adds a file from the disk to the archive
         *
         * @param {(object|string)} options - options object, if it is string it us used as localPath.
         * @param {string} options.localPath - Local path to the file.
         * @param {string} [options.comment] - Optional file comment.
         * @param {string} [options.zipPath] - Optional path inside the zip
         * @param {string} [options.zipName] - Optional name for the file
         * @param {doneCallback} callback - The callback that handles the response.
         */
        addLocalFileAsync: function(options2, callback) {
          options2 = typeof options2 === "object" ? options2 : { localPath: options2 };
          const localPath2 = pth.resolve(options2.localPath);
          const { comment } = options2;
          let { zipPath, zipName } = options2;
          const self = this;
          filetools.fs.stat(localPath2, function(err, stats) {
            if (err) return callback(err, false);
            zipPath = zipPath ? fixPath(zipPath) : "";
            const p = pth.win32.basename(pth.win32.normalize(localPath2));
            zipPath += zipName ? zipName : p;
            if (stats.isFile()) {
              filetools.fs.readFile(localPath2, function(err2, data) {
                if (err2) return callback(err2, false);
                self.addFile(zipPath, data, comment, stats);
                return setImmediate(callback, void 0, true);
              });
            } else if (stats.isDirectory()) {
              zipPath += filetools.sep;
              self.addFile(zipPath, Buffer.alloc(0), comment, stats);
              return setImmediate(callback, void 0, true);
            }
          });
        },
        /**
         * Adds a local directory and all its nested files and directories to the archive
         *
         * @param {string} localPath - local path to the folder
         * @param {string} [zipPath] - optional path inside zip
         * @param {(RegExp|function)} [filter] - optional RegExp or Function if files match will be included.
         */
        addLocalFolder: function(localPath2, zipPath, filter) {
          filter = filenameFilter(filter);
          zipPath = zipPath ? fixPath(zipPath) : "";
          localPath2 = pth.normalize(localPath2);
          if (filetools.fs.existsSync(localPath2)) {
            const items = filetools.findFiles(localPath2);
            const self = this;
            if (items.length) {
              for (const filepath of items) {
                const p = pth.join(zipPath, relativePath(localPath2, filepath));
                if (filter(p)) {
                  self.addLocalFile(filepath, pth.dirname(p));
                }
              }
            }
          } else {
            throw Utils.Errors.FILE_NOT_FOUND(localPath2);
          }
        },
        /**
         * Asynchronous addLocalFolder
         * @param {string} localPath
         * @param {callback} callback
         * @param {string} [zipPath] optional path inside zip
         * @param {RegExp|function} [filter] optional RegExp or Function if files match will
         *               be included.
         */
        addLocalFolderAsync: function(localPath2, callback, zipPath, filter) {
          filter = filenameFilter(filter);
          zipPath = zipPath ? fixPath(zipPath) : "";
          localPath2 = pth.normalize(localPath2);
          var self = this;
          filetools.fs.open(localPath2, "r", function(err) {
            if (err && err.code === "ENOENT") {
              callback(void 0, Utils.Errors.FILE_NOT_FOUND(localPath2));
            } else if (err) {
              callback(void 0, err);
            } else {
              var items = filetools.findFiles(localPath2);
              var i = -1;
              var next = function() {
                i += 1;
                if (i < items.length) {
                  var filepath = items[i];
                  var p = relativePath(localPath2, filepath).split("\\").join("/");
                  p = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
                  if (filter(p)) {
                    filetools.fs.stat(filepath, function(er0, stats) {
                      if (er0) callback(void 0, er0);
                      if (stats.isFile()) {
                        filetools.fs.readFile(filepath, function(er1, data) {
                          if (er1) {
                            callback(void 0, er1);
                          } else {
                            self.addFile(zipPath + p, data, "", stats);
                            next();
                          }
                        });
                      } else {
                        self.addFile(zipPath + p + "/", Buffer.alloc(0), "", stats);
                        next();
                      }
                    });
                  } else {
                    process.nextTick(() => {
                      next();
                    });
                  }
                } else {
                  callback(true, void 0);
                }
              };
              next();
            }
          });
        },
        /**
         * Adds a local directory and all its nested files and directories to the archive
         *
         * @param {object | string} options - options object, if it is string it us used as localPath.
         * @param {string} options.localPath - Local path to the folder.
         * @param {string} [options.zipPath] - optional path inside zip.
         * @param {RegExp|function} [options.filter] - optional RegExp or Function if files match will be included.
         * @param {function|string} [options.namefix] - optional function to help fix filename
         * @param {doneCallback} callback - The callback that handles the response.
         *
         */
        addLocalFolderAsync2: function(options2, callback) {
          const self = this;
          options2 = typeof options2 === "object" ? options2 : { localPath: options2 };
          localPath = pth.resolve(fixPath(options2.localPath));
          let { zipPath, filter, namefix } = options2;
          if (filter instanceof RegExp) {
            filter = /* @__PURE__ */ (function(rx) {
              return function(filename) {
                return rx.test(filename);
              };
            })(filter);
          } else if ("function" !== typeof filter) {
            filter = function() {
              return true;
            };
          }
          zipPath = zipPath ? fixPath(zipPath) : "";
          if (namefix == "latin1") {
            namefix = (str2) => str2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
          }
          if (typeof namefix !== "function") namefix = (str2) => str2;
          const relPathFix = (entry) => pth.join(zipPath, namefix(relativePath(localPath, entry)));
          const fileNameFix = (entry) => pth.win32.basename(pth.win32.normalize(namefix(entry)));
          filetools.fs.open(localPath, "r", function(err) {
            if (err && err.code === "ENOENT") {
              callback(void 0, Utils.Errors.FILE_NOT_FOUND(localPath));
            } else if (err) {
              callback(void 0, err);
            } else {
              filetools.findFilesAsync(localPath, function(err2, fileEntries) {
                if (err2) return callback(err2);
                fileEntries = fileEntries.filter((dir) => filter(relPathFix(dir)));
                if (!fileEntries.length) callback(void 0, false);
                setImmediate(
                  fileEntries.reverse().reduce(function(next, entry) {
                    return function(err3, done) {
                      if (err3 || done === false) return setImmediate(next, err3, false);
                      self.addLocalFileAsync(
                        {
                          localPath: entry,
                          zipPath: pth.dirname(relPathFix(entry)),
                          zipName: fileNameFix(entry)
                        },
                        next
                      );
                    };
                  }, callback)
                );
              });
            }
          });
        },
        /**
         * Adds a local directory and all its nested files and directories to the archive
         *
         * @param {string} localPath - path where files will be extracted
         * @param {object} props - optional properties
         * @param {string} [props.zipPath] - optional path inside zip
         * @param {RegExp|function} [props.filter] - optional RegExp or Function if files match will be included.
         * @param {function|string} [props.namefix] - optional function to help fix filename
         */
        addLocalFolderPromise: function(localPath2, props) {
          return new Promise((resolve13, reject) => {
            this.addLocalFolderAsync2(Object.assign({ localPath: localPath2 }, props), (err, done) => {
              if (err) reject(err);
              if (done) resolve13(this);
            });
          });
        },
        /**
         * Allows you to create a entry (file or directory) in the zip file.
         * If you want to create a directory the entryName must end in / and a null buffer should be provided.
         * Comment and attributes are optional
         *
         * @param {string} entryName
         * @param {Buffer | string} content - file content as buffer or utf8 coded string
         * @param {string} [comment] - file comment
         * @param {number | object} [attr] - number as unix file permissions, object as filesystem Stats object
         */
        addFile: function(entryName, content, comment, attr) {
          entryName = zipnamefix(entryName);
          let entry = getEntry(entryName);
          const update = entry != null;
          if (!update) {
            entry = new ZipEntry(opts);
            entry.entryName = entryName;
          }
          entry.comment = comment || "";
          const isStat = "object" === typeof attr && attr instanceof filetools.fs.Stats;
          if (isStat) {
            entry.header.time = attr.mtime;
          }
          var fileattr = entry.isDirectory ? 16 : 0;
          let unix = entry.isDirectory ? 16384 : 32768;
          if (isStat) {
            unix |= 4095 & attr.mode;
          } else if ("number" === typeof attr) {
            unix |= 4095 & attr;
          } else {
            unix |= entry.isDirectory ? 493 : 420;
          }
          fileattr = (fileattr | unix << 16) >>> 0;
          entry.attr = fileattr;
          entry.setData(content);
          if (!update) _zip.setEntry(entry);
          return entry;
        },
        /**
         * Returns an array of ZipEntry objects representing the files and folders inside the archive
         *
         * @param {string} [password]
         * @returns Array
         */
        getEntries: function(password) {
          _zip.password = password;
          return _zip ? _zip.entries : [];
        },
        /**
         * Returns a ZipEntry object representing the file or folder specified by ``name``.
         *
         * @param {string} name
         * @return ZipEntry
         */
        getEntry: function(name) {
          return getEntry(name);
        },
        getEntryCount: function() {
          return _zip.getEntryCount();
        },
        forEach: function(callback) {
          return _zip.forEach(callback);
        },
        /**
         * Extracts the given entry to the given targetPath
         * If the entry is a directory inside the archive, the entire directory and it's subdirectories will be extracted
         *
         * @param {string|ZipEntry} entry - ZipEntry object or String with the full path of the entry
         * @param {string} targetPath - Target folder where to write the file
         * @param {boolean} [maintainEntryPath=true] - If maintainEntryPath is true and the entry is inside a folder, the entry folder will be created in targetPath as well. Default is TRUE
         * @param {boolean} [overwrite=false] - If the file already exists at the target path, the file will be overwriten if this is true.
         * @param {boolean} [keepOriginalPermission=false] - The file will be set as the permission from the entry if this is true.
         * @param {string} [outFileName] - String If set will override the filename of the extracted file (Only works if the entry is a file)
         *
         * @return Boolean
         */
        extractEntryTo: function(entry, targetPath, maintainEntryPath, overwrite, keepOriginalPermission, outFileName) {
          overwrite = get_Bool(false, overwrite);
          keepOriginalPermission = get_Bool(false, keepOriginalPermission);
          maintainEntryPath = get_Bool(true, maintainEntryPath);
          outFileName = get_Str(keepOriginalPermission, outFileName);
          var item = getEntry(entry);
          if (!item) {
            throw Utils.Errors.NO_ENTRY();
          }
          var entryName = canonical(item.entryName);
          var target = sanitize(targetPath, outFileName && !item.isDirectory ? outFileName : maintainEntryPath ? entryName : pth.basename(entryName));
          if (item.isDirectory) {
            var children = _zip.getEntryChildren(item);
            children.forEach(function(child) {
              if (child.isDirectory) return;
              var content2 = child.getData();
              if (!content2) {
                throw Utils.Errors.CANT_EXTRACT_FILE();
              }
              var name = canonical(child.entryName);
              var childName = sanitize(targetPath, maintainEntryPath ? name : pth.basename(name));
              const fileAttr2 = keepOriginalPermission ? child.header.fileAttr : void 0;
              filetools.writeFileTo(childName, content2, overwrite, fileAttr2);
            });
            return true;
          }
          var content = item.getData(_zip.password);
          if (!content) throw Utils.Errors.CANT_EXTRACT_FILE();
          if (filetools.fs.existsSync(target) && !overwrite) {
            throw Utils.Errors.CANT_OVERRIDE();
          }
          const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
          filetools.writeFileTo(target, content, overwrite, fileAttr);
          return true;
        },
        /**
         * Test the archive
         * @param {string} [pass]
         */
        test: function(pass) {
          if (!_zip) {
            return false;
          }
          for (var entry in _zip.entries) {
            try {
              if (entry.isDirectory) {
                continue;
              }
              var content = _zip.entries[entry].getData(pass);
              if (!content) {
                return false;
              }
            } catch (err) {
              return false;
            }
          }
          return true;
        },
        /**
         * Extracts the entire archive to the given location
         *
         * @param {string} targetPath Target location
         * @param {boolean} [overwrite=false] If the file already exists at the target path, the file will be overwriten if this is true.
         *                  Default is FALSE
         * @param {boolean} [keepOriginalPermission=false] The file will be set as the permission from the entry if this is true.
         *                  Default is FALSE
         * @param {string|Buffer} [pass] password
         */
        extractAllTo: function(targetPath, overwrite, keepOriginalPermission, pass) {
          keepOriginalPermission = get_Bool(false, keepOriginalPermission);
          pass = get_Str(keepOriginalPermission, pass);
          overwrite = get_Bool(false, overwrite);
          if (!_zip) throw Utils.Errors.NO_ZIP();
          _zip.entries.forEach(function(entry) {
            var entryName = sanitize(targetPath, canonical(entry.entryName));
            if (entry.isDirectory) {
              filetools.makeDir(entryName);
              return;
            }
            var content = entry.getData(pass);
            if (!content) {
              throw Utils.Errors.CANT_EXTRACT_FILE();
            }
            const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
            filetools.writeFileTo(entryName, content, overwrite, fileAttr);
            try {
              filetools.fs.utimesSync(entryName, entry.header.time, entry.header.time);
            } catch (err) {
              throw Utils.Errors.CANT_EXTRACT_FILE();
            }
          });
        },
        /**
         * Asynchronous extractAllTo
         *
         * @param {string} targetPath Target location
         * @param {boolean} [overwrite=false] If the file already exists at the target path, the file will be overwriten if this is true.
         *                  Default is FALSE
         * @param {boolean} [keepOriginalPermission=false] The file will be set as the permission from the entry if this is true.
         *                  Default is FALSE
         * @param {function} callback The callback will be executed when all entries are extracted successfully or any error is thrown.
         */
        extractAllToAsync: function(targetPath, overwrite, keepOriginalPermission, callback) {
          callback = get_Fun(overwrite, keepOriginalPermission, callback);
          keepOriginalPermission = get_Bool(false, keepOriginalPermission);
          overwrite = get_Bool(false, overwrite);
          if (!callback) {
            return new Promise((resolve13, reject) => {
              this.extractAllToAsync(targetPath, overwrite, keepOriginalPermission, function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve13(this);
                }
              });
            });
          }
          if (!_zip) {
            callback(Utils.Errors.NO_ZIP());
            return;
          }
          targetPath = pth.resolve(targetPath);
          const getPath = (entry) => sanitize(targetPath, pth.normalize(canonical(entry.entryName)));
          const getError = (msg, file) => new Error(msg + ': "' + file + '"');
          const dirEntries = [];
          const fileEntries = [];
          _zip.entries.forEach((e) => {
            if (e.isDirectory) {
              dirEntries.push(e);
            } else {
              fileEntries.push(e);
            }
          });
          for (const entry of dirEntries) {
            const dirPath = getPath(entry);
            const dirAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
            try {
              filetools.makeDir(dirPath);
              if (dirAttr) filetools.fs.chmodSync(dirPath, dirAttr);
              filetools.fs.utimesSync(dirPath, entry.header.time, entry.header.time);
            } catch (er) {
              callback(getError("Unable to create folder", dirPath));
            }
          }
          fileEntries.reverse().reduce(function(next, entry) {
            return function(err) {
              if (err) {
                next(err);
              } else {
                const entryName = pth.normalize(canonical(entry.entryName));
                const filePath = sanitize(targetPath, entryName);
                entry.getDataAsync(function(content, err_1) {
                  if (err_1) {
                    next(err_1);
                  } else if (!content) {
                    next(Utils.Errors.CANT_EXTRACT_FILE());
                  } else {
                    const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
                    filetools.writeFileToAsync(filePath, content, overwrite, fileAttr, function(succ) {
                      if (!succ) {
                        next(getError("Unable to write file", filePath));
                      }
                      filetools.fs.utimes(filePath, entry.header.time, entry.header.time, function(err_2) {
                        if (err_2) {
                          next(getError("Unable to set times", filePath));
                        } else {
                          next();
                        }
                      });
                    });
                  }
                });
              }
            };
          }, callback)();
        },
        /**
         * Writes the newly created zip file to disk at the specified location or if a zip was opened and no ``targetFileName`` is provided, it will overwrite the opened zip
         *
         * @param {string} targetFileName
         * @param {function} callback
         */
        writeZip: function(targetFileName, callback) {
          if (arguments.length === 1) {
            if (typeof targetFileName === "function") {
              callback = targetFileName;
              targetFileName = "";
            }
          }
          if (!targetFileName && opts.filename) {
            targetFileName = opts.filename;
          }
          if (!targetFileName) return;
          var zipData = _zip.compressToBuffer();
          if (zipData) {
            var ok = filetools.writeFileTo(targetFileName, zipData, true);
            if (typeof callback === "function") callback(!ok ? new Error("failed") : null, "");
          }
        },
        /**
                 *
                 * @param {string} targetFileName
                 * @param {object} [props]
                 * @param {boolean} [props.overwrite=true] If the file already exists at the target path, the file will be overwriten if this is true.
                 * @param {boolean} [props.perm] The file will be set as the permission from the entry if this is true.
        
                 * @returns {Promise<void>}
                 */
        writeZipPromise: function(targetFileName, props) {
          const { overwrite, perm } = Object.assign({ overwrite: true }, props);
          return new Promise((resolve13, reject) => {
            if (!targetFileName && opts.filename) targetFileName = opts.filename;
            if (!targetFileName) reject("ADM-ZIP: ZIP File Name Missing");
            this.toBufferPromise().then((zipData) => {
              const ret = (done) => done ? resolve13(done) : reject("ADM-ZIP: Wasn't able to write zip file");
              filetools.writeFileToAsync(targetFileName, zipData, overwrite, perm, ret);
            }, reject);
          });
        },
        /**
         * @returns {Promise<Buffer>} A promise to the Buffer.
         */
        toBufferPromise: function() {
          return new Promise((resolve13, reject) => {
            _zip.toAsyncBuffer(resolve13, reject);
          });
        },
        /**
         * Returns the content of the entire zip file as a Buffer object
         *
         * @prop {function} [onSuccess]
         * @prop {function} [onFail]
         * @prop {function} [onItemStart]
         * @prop {function} [onItemEnd]
         * @returns {Buffer}
         */
        toBuffer: function(onSuccess, onFail, onItemStart, onItemEnd) {
          if (typeof onSuccess === "function") {
            _zip.toAsyncBuffer(onSuccess, onFail, onItemStart, onItemEnd);
            return null;
          }
          return _zip.compressToBuffer();
        }
      };
    };
  }
});

// src/codeql-development-mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { realpathSync } from "fs";
import { resolve as resolve12 } from "path";
import { pathToFileURL as pathToFileURL5 } from "url";

// src/tools/codeql/bqrs-decode.ts
import { z as z2 } from "zod";

// src/lib/cli-tool-registry.ts
init_cli_executor();
init_logger();
import { z } from "zod";

// src/lib/query-results-evaluator.ts
init_cli_executor();
init_logger();
import { writeFileSync, readFileSync as readFileSync2 } from "fs";
import { dirname as dirname3, isAbsolute as isAbsolute3 } from "path";
import { mkdirSync as mkdirSync3 } from "fs";
var BUILT_IN_EVALUATORS = {
  "json-decode": "JSON format decoder for query results",
  "csv-decode": "CSV format decoder for query results",
  "mermaid-graph": "Mermaid diagram generator for @kind graph queries (like PrintAST)"
};
async function extractQueryMetadata(queryPath) {
  try {
    const queryContent = readFileSync2(queryPath, "utf-8");
    const metadata = {};
    const kindMatch = queryContent.match(/@kind\s+([^\s]+)/);
    if (kindMatch) metadata.kind = kindMatch[1];
    const nameMatch = queryContent.match(/@name\s+(.+)/);
    if (nameMatch) metadata.name = nameMatch[1].trim();
    const descMatch = queryContent.match(/@description\s+(.+)/);
    if (descMatch) metadata.description = descMatch[1].trim();
    const idMatch = queryContent.match(/@id\s+(.+)/);
    if (idMatch) metadata.id = idMatch[1].trim();
    const tagsMatch = queryContent.match(/@tags\s+(.+)/);
    if (tagsMatch) {
      metadata.tags = tagsMatch[1].split(/\s+/).filter((t) => t.length > 0);
    }
    return metadata;
  } catch (error) {
    logger.error("Failed to extract query metadata:", error);
    return {};
  }
}
async function evaluateWithJsonDecoder(bqrsPath, outputPath) {
  try {
    const result = await executeCodeQLCommand(
      "bqrs decode",
      { format: "json" },
      [bqrsPath]
    );
    if (!result.success) {
      return {
        success: false,
        error: `Failed to decode BQRS file: ${result.stderr || result.error}`
      };
    }
    const defaultOutputPath = outputPath || bqrsPath.replace(".bqrs", ".json");
    mkdirSync3(dirname3(defaultOutputPath), { recursive: true });
    writeFileSync(defaultOutputPath, result.stdout);
    return {
      success: true,
      outputPath: defaultOutputPath,
      content: result.stdout
    };
  } catch (error) {
    return {
      success: false,
      error: `JSON evaluation failed: ${error}`
    };
  }
}
async function evaluateWithCsvDecoder(bqrsPath, outputPath) {
  try {
    const result = await executeCodeQLCommand(
      "bqrs decode",
      { format: "csv" },
      [bqrsPath]
    );
    if (!result.success) {
      return {
        success: false,
        error: `Failed to decode BQRS file: ${result.stderr || result.error}`
      };
    }
    const defaultOutputPath = outputPath || bqrsPath.replace(".bqrs", ".csv");
    mkdirSync3(dirname3(defaultOutputPath), { recursive: true });
    writeFileSync(defaultOutputPath, result.stdout);
    return {
      success: true,
      outputPath: defaultOutputPath,
      content: result.stdout
    };
  } catch (error) {
    return {
      success: false,
      error: `CSV evaluation failed: ${error}`
    };
  }
}
async function evaluateWithMermaidGraph(bqrsPath, queryPath, outputPath) {
  try {
    const metadata = await extractQueryMetadata(queryPath);
    if (metadata.kind !== "graph") {
      logger.error(`Query is not a graph query (kind: ${metadata.kind}), mermaid-graph evaluation is only for @kind graph queries`);
      return {
        success: false,
        error: `Query is not a graph query (kind: ${metadata.kind}), mermaid-graph evaluation is only for @kind graph queries`
      };
    }
    const jsonResult = await executeCodeQLCommand(
      "bqrs decode",
      { format: "json" },
      [bqrsPath]
    );
    if (!jsonResult.success) {
      return {
        success: false,
        error: `Failed to decode BQRS file: ${jsonResult.stderr || jsonResult.error}`
      };
    }
    let queryResults;
    try {
      queryResults = JSON.parse(jsonResult.stdout);
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse query results JSON: ${parseError}`
      };
    }
    const mermaidContent = generateMermaidFromGraphResults(queryResults, metadata);
    const defaultOutputPath = outputPath || bqrsPath.replace(".bqrs", ".md");
    mkdirSync3(dirname3(defaultOutputPath), { recursive: true });
    writeFileSync(defaultOutputPath, mermaidContent);
    return {
      success: true,
      outputPath: defaultOutputPath,
      content: mermaidContent
    };
  } catch (error) {
    return {
      success: false,
      error: `Mermaid graph evaluation failed: ${error}`
    };
  }
}
function generateMermaidFromGraphResults(queryResults, metadata) {
  const queryName = sanitizeMarkdown(metadata.name || "CodeQL Query Results");
  const queryDesc = sanitizeMarkdown(metadata.description || "Graph visualization of CodeQL query results");
  let mermaidContent = `# ${queryName}

${queryDesc}

`;
  if (!queryResults || typeof queryResults !== "object") {
    mermaidContent += "```mermaid\ngraph TD\n    A[No Results]\n```\n";
    return mermaidContent;
  }
  const tuples = queryResults.tuples || queryResults;
  if (!Array.isArray(tuples) || tuples.length === 0) {
    mermaidContent += "```mermaid\ngraph TD\n    A[No Graph Data]\n```\n";
    return mermaidContent;
  }
  mermaidContent += "```mermaid\ngraph TD\n";
  const nodes = /* @__PURE__ */ new Set();
  const edges = /* @__PURE__ */ new Set();
  tuples.forEach((tuple, index) => {
    if (Array.isArray(tuple) && tuple.length >= 2) {
      const source = sanitizeNodeId(tuple[0]?.toString() || `node_${index}_0`);
      const target = sanitizeNodeId(tuple[1]?.toString() || `node_${index}_1`);
      const label = tuple[2]?.toString() || "";
      nodes.add(source);
      nodes.add(target);
      const edgeId = `${source}_${target}`;
      if (!edges.has(edgeId)) {
        if (label) {
          mermaidContent += `    ${source} -->|${sanitizeLabel(label)}| ${target}
`;
        } else {
          mermaidContent += `    ${source} --> ${target}
`;
        }
        edges.add(edgeId);
      }
    } else if (typeof tuple === "object" && tuple !== null) {
      const source = sanitizeNodeId(tuple.source?.toString() || tuple.from?.toString() || `node_${index}_src`);
      const target = sanitizeNodeId(tuple.target?.toString() || tuple.to?.toString() || `node_${index}_tgt`);
      const label = tuple.label?.toString() || tuple.relation?.toString() || "";
      nodes.add(source);
      nodes.add(target);
      const edgeId = `${source}_${target}`;
      if (!edges.has(edgeId)) {
        if (label) {
          mermaidContent += `    ${source} -->|${sanitizeLabel(label)}| ${target}
`;
        } else {
          mermaidContent += `    ${source} --> ${target}
`;
        }
        edges.add(edgeId);
      }
    }
  });
  if (edges.size === 0 && nodes.size > 0) {
    const nodeArray = Array.from(nodes).slice(0, 10);
    nodeArray.forEach((node, index) => {
      if (index === 0) {
        mermaidContent += `    ${node}[${sanitizeLabel(node)}]
`;
      } else {
        mermaidContent += `    ${nodeArray[0]} --> ${node}
`;
      }
    });
  }
  mermaidContent += "```\n\n";
  mermaidContent += `## Query Statistics

`;
  mermaidContent += `- Total nodes: ${nodes.size}
`;
  mermaidContent += `- Total edges: ${edges.size}
`;
  mermaidContent += `- Total tuples processed: ${tuples.length}
`;
  return mermaidContent;
}
function sanitizeNodeId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^(\d)/, "n$1").substring(0, 50);
}
function sanitizeLabel(label) {
  return label.replace(/[|"`<>\n\r\t]/g, "").replace(/\s+/g, " ").trim().substring(0, 30);
}
function sanitizeMarkdown(content) {
  return content.replace(/[<>"`]/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim().substring(0, 100);
}
async function evaluateQueryResults(bqrsPath, queryPath, evaluationFunction, outputPath) {
  try {
    const evalFunc = evaluationFunction || "json-decode";
    logger.info(`Evaluating query results with function: ${evalFunc}`);
    switch (evalFunc) {
      case "json-decode":
        return await evaluateWithJsonDecoder(bqrsPath, outputPath);
      case "csv-decode":
        return await evaluateWithCsvDecoder(bqrsPath, outputPath);
      case "mermaid-graph":
        return await evaluateWithMermaidGraph(bqrsPath, queryPath, outputPath);
      default:
        if (isAbsolute3(evalFunc)) {
          return await evaluateWithCustomScript(bqrsPath, queryPath, evalFunc, outputPath);
        } else {
          return {
            success: false,
            error: `Unknown evaluation function: ${evalFunc}. Available built-in functions: ${Object.keys(BUILT_IN_EVALUATORS).join(", ")}`
          };
        }
    }
  } catch (error) {
    return {
      success: false,
      error: `Query evaluation failed: ${error}`
    };
  }
}
async function evaluateWithCustomScript(_bqrsPath, _queryPath, _scriptPath, _outputPath) {
  return {
    success: false,
    error: "Custom evaluation scripts are not yet implemented"
  };
}

// src/lib/log-directory-manager.ts
init_temp_dir();
import { mkdirSync as mkdirSync4, existsSync as existsSync3 } from "fs";
import { join as join4, resolve as resolve3 } from "path";
import { randomBytes } from "crypto";
function ensurePathWithinBase(baseDir, targetPath) {
  const absBase = resolve3(baseDir);
  const absTarget = resolve3(targetPath);
  if (!absTarget.startsWith(absBase + "/") && absTarget !== absBase) {
    throw new Error(`Provided log directory is outside the allowed base directory: ${absBase}`);
  }
  return absTarget;
}
function getOrCreateLogDirectory(logDir) {
  const baseLogDir = process.env.CODEQL_QUERY_LOG_DIR || getProjectTmpDir("query-logs");
  if (logDir) {
    const absLogDir = ensurePathWithinBase(baseLogDir, logDir);
    if (!existsSync3(absLogDir)) {
      mkdirSync4(absLogDir, { recursive: true });
    }
    return absLogDir;
  }
  if (!existsSync3(baseLogDir)) {
    mkdirSync4(baseLogDir, { recursive: true });
  }
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const uniqueId = randomBytes(4).toString("hex");
  const uniqueLogDir = join4(baseLogDir, `query-run-${timestamp2}-${uniqueId}`);
  mkdirSync4(uniqueLogDir, { recursive: true });
  return uniqueLogDir;
}

// src/lib/cli-tool-registry.ts
init_package_paths();
init_temp_dir();
import { writeFileSync as writeFileSync2, rmSync, existsSync as existsSync4, mkdirSync as mkdirSync5 } from "fs";
import { basename as basename2, dirname as dirname4, isAbsolute as isAbsolute4, join as join5, resolve as resolve4 } from "path";
var defaultCLIResultProcessor = (result, _params) => {
  if (!result.success) {
    return `Command failed (exit code ${result.exitCode || "unknown"}):
${result.error || result.stderr}`;
  }
  let output = "";
  if (result.stdout) {
    output += result.stdout;
  }
  if (result.stderr) {
    if (output) {
      output += "\n\nWarnings/Info:\n";
    }
    output += result.stderr;
  }
  if (!output) {
    output = "Command executed successfully (no output)";
  }
  return output;
};
function registerCLITool(server, definition) {
  const {
    name,
    description,
    command,
    subcommand,
    inputSchema,
    resultProcessor = defaultCLIResultProcessor
  } = definition;
  server.tool(
    name,
    description,
    inputSchema,
    async (params) => {
      const tempDirsToCleanup = [];
      try {
        logger.info(`Executing CLI tool: ${name}`, { command, subcommand, params });
        const formatShouldBePassedToCLI = name === "codeql_bqrs_interpret" || name === "codeql_bqrs_decode" || name === "codeql_bqrs_info" || name === "codeql_generate_query-help" || name === "codeql_database_analyze";
        const extractedParams = formatShouldBePassedToCLI ? {
          _positional: params._positional || [],
          files: params.files,
          file: params.file,
          dir: params.dir,
          packDir: params.packDir,
          tests: params.tests,
          query: params.query,
          queryName: params.queryName,
          queryLanguage: params.queryLanguage,
          queryPack: params.queryPack,
          sourceFiles: params.sourceFiles,
          sourceFunction: params.sourceFunction,
          targetFunction: params.targetFunction,
          interpretedOutput: params.interpretedOutput,
          evaluationFunction: params.evaluationFunction,
          evaluationOutput: params.evaluationOutput,
          directory: params.directory,
          logDir: params.logDir,
          qlref: params.qlref
        } : {
          _positional: params._positional || [],
          files: params.files,
          file: params.file,
          dir: params.dir,
          packDir: params.packDir,
          tests: params.tests,
          query: params.query,
          queryName: params.queryName,
          queryLanguage: params.queryLanguage,
          queryPack: params.queryPack,
          sourceFiles: params.sourceFiles,
          sourceFunction: params.sourceFunction,
          targetFunction: params.targetFunction,
          format: params.format,
          interpretedOutput: params.interpretedOutput,
          evaluationFunction: params.evaluationFunction,
          evaluationOutput: params.evaluationOutput,
          directory: params.directory,
          logDir: params.logDir,
          qlref: params.qlref
        };
        const {
          _positional = [],
          files,
          file,
          dir,
          packDir,
          tests,
          query,
          queryName,
          queryLanguage: _queryLanguage,
          queryPack: _queryPack,
          sourceFiles,
          sourceFunction,
          targetFunction,
          format: _format,
          interpretedOutput: _interpretedOutput,
          evaluationFunction: _evaluationFunction,
          evaluationOutput: _evaluationOutput,
          directory,
          logDir: customLogDir,
          qlref
        } = extractedParams;
        const options = { ...params };
        Object.keys(extractedParams).forEach((key) => delete options[key]);
        let positionalArgs = Array.isArray(_positional) ? _positional : [_positional];
        if (files && Array.isArray(files)) {
          positionalArgs = [...positionalArgs, ...files];
        }
        if (file && name.startsWith("codeql_bqrs_")) {
          positionalArgs = [...positionalArgs, file];
        }
        if (qlref && name === "codeql_resolve_qlref") {
          positionalArgs = [...positionalArgs, qlref];
        }
        if (options.database && name === "codeql_resolve_database") {
          positionalArgs = [...positionalArgs, options.database];
          delete options.database;
        }
        if (options.database && name === "codeql_database_create") {
          positionalArgs = [...positionalArgs, options.database];
          delete options.database;
        }
        if (name === "codeql_database_analyze") {
          if (options.database) {
            positionalArgs = [...positionalArgs, options.database];
            delete options.database;
          }
          if (options.queries) {
            positionalArgs = [...positionalArgs, options.queries];
            delete options.queries;
          }
        }
        if (query && name === "codeql_generate_query-help") {
          positionalArgs = [...positionalArgs, query];
        }
        if (dir && name === "codeql_pack_ls") {
          positionalArgs = [...positionalArgs, dir];
        }
        switch (name) {
          case "codeql_test_accept":
          case "codeql_test_extract":
          case "codeql_test_run":
          case "codeql_resolve_tests":
            if (tests && Array.isArray(tests)) {
              const userDir = getUserWorkspaceDir();
              positionalArgs = [...positionalArgs, ...tests.map(
                (t) => isAbsolute4(t) ? t : resolve4(userDir, t)
              )];
            }
            break;
          case "codeql_query_run": {
            if (options.database && typeof options.database === "string" && !isAbsolute4(options.database)) {
              options.database = resolve4(getUserWorkspaceDir(), options.database);
              logger.info(`Resolved database path to: ${options.database}`);
            }
            const resolvedQuery = await resolveQueryPath(params, logger);
            if (resolvedQuery) {
              positionalArgs = [...positionalArgs, resolvedQuery];
            } else if (query) {
              positionalArgs = [...positionalArgs, query];
            }
            if (queryName === "PrintAST" && sourceFiles) {
              const filePaths = sourceFiles.split(",").map((f) => f.trim());
              let tempDir;
              let csvPath;
              try {
                tempDir = createProjectTempDir("codeql-external-");
                tempDirsToCleanup.push(tempDir);
                csvPath = join5(tempDir, "selectedSourceFiles.csv");
                const csvContent = filePaths.join("\n") + "\n";
                writeFileSync2(csvPath, csvContent, "utf8");
              } catch (err) {
                logger.error(`Failed to create external predicate CSV for PrintAST query at path ${csvPath || "[unknown]"}: ${err instanceof Error ? err.message : String(err)}`);
                throw err;
              }
              const currentExternal = options.external || [];
              const externalArray = Array.isArray(currentExternal) ? currentExternal : [currentExternal];
              externalArray.push(`selectedSourceFiles=${csvPath}`);
              options.external = externalArray;
              logger.info(`Created external predicate CSV at ${csvPath} for files: ${filePaths.join(", ")}`);
            }
            if (queryName === "CallGraphFrom" && sourceFunction) {
              const functionNames = sourceFunction.split(",").map((f) => f.trim());
              let tempDir;
              let csvPath;
              try {
                tempDir = createProjectTempDir("codeql-external-");
                tempDirsToCleanup.push(tempDir);
                csvPath = join5(tempDir, "sourceFunction.csv");
                const csvContent = functionNames.join("\n") + "\n";
                writeFileSync2(csvPath, csvContent, "utf8");
              } catch (err) {
                logger.error(`Failed to create external predicate CSV for CallGraphFrom query at path ${csvPath || "[unknown]"}: ${err instanceof Error ? err.message : String(err)}`);
                throw err;
              }
              const currentExternal = options.external || [];
              const externalArray = Array.isArray(currentExternal) ? currentExternal : [currentExternal];
              externalArray.push(`sourceFunction=${csvPath}`);
              options.external = externalArray;
              logger.info(`Created external predicate CSV at ${csvPath} for functions: ${functionNames.join(", ")}`);
            }
            if (queryName === "CallGraphTo" && targetFunction) {
              const functionNames = targetFunction.split(",").map((f) => f.trim());
              let tempDir;
              let csvPath;
              try {
                tempDir = createProjectTempDir("codeql-external-");
                tempDirsToCleanup.push(tempDir);
                csvPath = join5(tempDir, "targetFunction.csv");
                const csvContent = functionNames.join("\n") + "\n";
                writeFileSync2(csvPath, csvContent, "utf8");
              } catch (err) {
                logger.error(`Failed to create external predicate CSV for CallGraphTo query at path ${csvPath || "[unknown]"}: ${err instanceof Error ? err.message : String(err)}`);
                throw err;
              }
              const currentExternal = options.external || [];
              const externalArray = Array.isArray(currentExternal) ? currentExternal : [currentExternal];
              externalArray.push(`targetFunction=${csvPath}`);
              options.external = externalArray;
              logger.info(`Created external predicate CSV at ${csvPath} for functions: ${functionNames.join(", ")}`);
            }
            break;
          }
          case "codeql_query_compile":
          case "codeql_resolve_metadata":
            if (query) {
              positionalArgs = [...positionalArgs, query];
            }
            break;
          case "codeql_resolve_queries":
            if (directory) {
              positionalArgs = [...positionalArgs, directory];
            }
            break;
          default:
            break;
        }
        let queryLogDir;
        if (name === "codeql_query_run" || name === "codeql_test_run" || name === "codeql_database_analyze") {
          queryLogDir = getOrCreateLogDirectory(customLogDir);
          logger.info(`Using log directory for ${name}: ${queryLogDir}`);
          const timestampPath = join5(queryLogDir, "timestamp");
          writeFileSync2(timestampPath, Date.now().toString(), "utf8");
          options.logdir = queryLogDir;
          if (!options.verbosity) {
            options.verbosity = "progress+";
          }
          if (!options["evaluator-log"]) {
            options["evaluator-log"] = join5(queryLogDir, "evaluator-log.jsonl");
          }
          if (options["tuple-counting"] === void 0) {
            options["tuple-counting"] = true;
          }
          if (name === "codeql_query_run") {
            if (!options.output) {
              options.output = join5(queryLogDir, "results.bqrs");
            }
          }
          if (options.output && typeof options.output === "string") {
            const outputDir = dirname4(options.output);
            mkdirSync5(outputDir, { recursive: true });
          }
        }
        let result;
        if (command === "codeql") {
          let cwd;
          if ((name === "codeql_pack_install" || name === "codeql_pack_ls") && (dir || packDir)) {
            const rawCwd = dir || packDir;
            cwd = isAbsolute4(rawCwd) ? rawCwd : resolve4(getUserWorkspaceDir(), rawCwd);
          }
          const defaultExamplesPath = resolve4(packageRootDir, "ql", "javascript", "examples");
          const additionalPacksPath = process.env.CODEQL_ADDITIONAL_PACKS || (existsSync4(defaultExamplesPath) ? defaultExamplesPath : void 0);
          if (additionalPacksPath && (name === "codeql_test_run" || name === "codeql_query_run" || name === "codeql_query_compile" || name === "codeql_database_analyze")) {
            options["additional-packs"] = additionalPacksPath;
          }
          if (name === "codeql_test_run") {
            options["keep-databases"] = true;
          }
          result = await executeCodeQLCommand(subcommand, options, positionalArgs, cwd);
        } else if (command === "qlt") {
          result = await executeQLTCommand(subcommand, options, positionalArgs);
        } else {
          throw new Error(`Unsupported command: ${command}`);
        }
        if (name === "codeql_query_run" && result.success && queryLogDir) {
          const bqrsPath = options.output;
          const sarifPath = join5(queryLogDir, "results-interpreted.sarif");
          const queryFilePath = positionalArgs.length > 0 ? positionalArgs[positionalArgs.length - 1] : void 0;
          if (existsSync4(bqrsPath) && queryFilePath) {
            try {
              const sarifResult = await interpretBQRSFile(
                bqrsPath,
                queryFilePath,
                "sarif-latest",
                sarifPath,
                logger
              );
              if (sarifResult.success) {
                logger.info(`Generated SARIF interpretation at ${sarifPath}`);
              } else {
                logger.warn(`SARIF interpretation returned error: ${sarifResult.error || sarifResult.stderr}`);
              }
            } catch (error) {
              logger.warn(`Failed to generate SARIF interpretation: ${error}`);
            }
          } else if (existsSync4(bqrsPath) && !queryFilePath) {
            logger.warn("Skipping SARIF interpretation: query file path not available");
          }
          result = await processQueryRunResults(result, params, logger);
        }
        if ((name === "codeql_query_run" || name === "codeql_database_analyze") && result.success && queryLogDir) {
          const evalLogPath = options["evaluator-log"];
          if (evalLogPath && existsSync4(evalLogPath)) {
            try {
              const summaryPath = evalLogPath.replace(/\.jsonl$/, ".summary.jsonl");
              const summaryResult = await executeCodeQLCommand(
                "generate log-summary",
                { format: "predicates" },
                [evalLogPath, summaryPath]
              );
              if (summaryResult.success) {
                logger.info(`Generated evaluator log summary at ${summaryPath}`);
              }
            } catch (error) {
              logger.warn(`Failed to generate evaluator log summary: ${error}`);
            }
          }
        }
        const processedResult = resultProcessor(result, params);
        return {
          content: [{
            type: "text",
            text: processedResult
          }],
          isError: !result.success
        };
      } catch (error) {
        logger.error(`Error in CLI tool ${name}:`, error);
        return {
          content: [{
            type: "text",
            text: `Failed to execute CLI tool: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      } finally {
        for (const tempDir of tempDirsToCleanup) {
          try {
            rmSync(tempDir, { recursive: true, force: true });
            logger.info(`Cleaned up temporary directory: ${tempDir}`);
          } catch (cleanupError) {
            logger.error(`Failed to clean up temporary directory ${tempDir}:`, cleanupError);
          }
        }
      }
    }
  );
}
var createCodeQLSchemas = {
  database: () => z.string().describe("Path to the CodeQL database"),
  query: () => z.string().describe("Path to the CodeQL query file (.ql)"),
  output: () => z.string().optional().describe("Output file path"),
  outputFormat: () => z.enum(["csv", "json", "bqrs", "sarif-latest", "sarifv2.1.0"]).optional().describe("Output format for results"),
  language: () => z.string().optional().describe("Programming language"),
  threads: () => z.number().optional().describe("Number of threads to use"),
  ram: () => z.number().optional().describe("Amount of RAM to use (MB)"),
  timeout: () => z.number().optional().describe("Timeout in seconds"),
  verbose: () => z.boolean().optional().describe("Enable verbose output"),
  additionalArgs: () => z.array(z.string()).optional().describe("Additional command-line arguments"),
  positionalArgs: () => z.array(z.string()).optional().describe("Positional arguments").transform((val) => ({ _positional: val }))
};
var createBQRSResultProcessor = () => (result, params) => {
  if (!result.success) {
    return defaultCLIResultProcessor(result, params);
  }
  let output = result.stdout;
  if (params.output) {
    output += `

Results saved to: ${params.output}`;
  }
  if (result.stderr) {
    output += `

Additional information:
${result.stderr}`;
  }
  return output;
};
var createDatabaseResultProcessor = () => (result, params) => {
  if (!result.success) {
    return defaultCLIResultProcessor(result, params);
  }
  let output = "Database creation completed successfully";
  if (params.database || params._positional) {
    const dbPath = params.database || (Array.isArray(params._positional) ? params._positional[0] : params._positional);
    output += `

Database location: ${dbPath}`;
  }
  if (result.stdout) {
    output += `

Output:
${result.stdout}`;
  }
  if (result.stderr) {
    output += `

Additional information:
${result.stderr}`;
  }
  return output;
};
async function resolveQueryPath(params, logger2) {
  const { queryName, queryLanguage, queryPack, query } = params;
  if (queryName && query) {
    logger2.error('Cannot use both "query" and "queryName" parameters simultaneously. Use either "query" for direct file path OR "queryName" + "queryLanguage" for tool queries.');
    throw new Error('Cannot use both "query" and "queryName" parameters simultaneously. Use either "query" for direct file path OR "queryName" + "queryLanguage" for tool queries.');
  }
  if (!queryName) {
    return query || null;
  }
  if (!queryLanguage) {
    logger2.error("queryLanguage is required when using queryName parameter. Supported languages: actions, cpp, csharp, go, java, javascript, python, ruby, swift");
    throw new Error("queryLanguage is required when using queryName parameter. Supported languages: actions, cpp, csharp, go, java, javascript, python, ruby, swift");
  }
  try {
    const defaultPackPath = resolveToolQueryPackPath(queryLanguage);
    const packPath = queryPack || defaultPackPath;
    logger2.info(`Resolving query: ${queryName} for language: ${queryLanguage} in pack: ${packPath}`);
    const { executeCodeQLCommand: executeCodeQLCommand2 } = await Promise.resolve().then(() => (init_cli_executor(), cli_executor_exports));
    const resolveResult = await executeCodeQLCommand2(
      "resolve queries",
      { format: "json" },
      [packPath]
    );
    if (!resolveResult.success) {
      logger2.error("Failed to resolve queries:", resolveResult.stderr || resolveResult.error);
      throw new Error(`Failed to resolve queries: ${resolveResult.stderr || resolveResult.error}`);
    }
    let resolvedQueries;
    try {
      resolvedQueries = JSON.parse(resolveResult.stdout);
    } catch (parseError) {
      logger2.error("Failed to parse resolve queries output:", parseError);
      throw new Error("Failed to parse resolve queries output", { cause: parseError });
    }
    const matchingQuery = resolvedQueries.find((queryPath) => {
      const fileName = basename2(queryPath);
      return fileName === `${queryName}.ql`;
    });
    if (!matchingQuery) {
      logger2.error(`Query "${queryName}.ql" not found in pack "${packPath}". Available queries:`, resolvedQueries.map((q) => basename2(q)));
      throw new Error(`Query "${queryName}.ql" not found in pack "${packPath}"`);
    }
    logger2.info(`Resolved query "${queryName}" to: ${matchingQuery}`);
    return matchingQuery;
  } catch (error) {
    logger2.error("Error resolving query path:", error);
    throw error;
  }
}
async function interpretBQRSFile(bqrsPath, queryPath, format, outputPath, logger2) {
  try {
    const metadata = await extractQueryMetadata(queryPath);
    const missingFields = [];
    if (!metadata.id) missingFields.push("id");
    if (!metadata.kind) missingFields.push("kind");
    if (missingFields.length > 0) {
      return {
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "",
        error: `Query metadata is incomplete. Missing required field(s): ${missingFields.join(", ")}. Ensure the query file contains @id and @kind metadata.`
      };
    }
    const sanitizedKind = (metadata.kind || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const sanitizedId = (metadata.id || "").replace(/[^a-zA-Z0-9_/:-]/g, "");
    const graphFormats = ["graphtext", "dgml", "dot"];
    if (graphFormats.includes(format) && metadata.kind !== "graph") {
      return {
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "",
        error: `Format '${format}' is only compatible with @kind graph queries, but this query has @kind ${metadata.kind}`
      };
    }
    mkdirSync5(dirname4(outputPath), { recursive: true });
    const params = {
      format,
      output: outputPath,
      t: [`kind=${sanitizedKind}`, `id=${sanitizedId}`]
    };
    logger2.info(`Interpreting BQRS file ${bqrsPath} with format ${format} to ${outputPath}`);
    const result = await executeCodeQLCommand(
      "bqrs interpret",
      params,
      [bqrsPath]
    );
    return result;
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: "",
      error: `Failed to interpret BQRS file: ${error}`
    };
  }
}
function getDefaultExtension(format) {
  switch (format) {
    case "sarif-latest":
    case "sarifv2.1.0":
      return ".sarif";
    case "csv":
      return ".csv";
    case "graphtext":
      return ".txt";
    case "dgml":
      return ".dgml";
    case "dot":
      return ".dot";
    default:
      return ".txt";
  }
}
async function processQueryRunResults(result, params, logger2) {
  try {
    const { format, interpretedOutput, evaluationFunction, evaluationOutput, output, query, queryName, queryLanguage } = params;
    if (!format && !evaluationFunction) {
      return result;
    }
    if (!output) {
      return result;
    }
    const bqrsPath = output;
    let queryPath = null;
    if (query) {
      queryPath = query;
    } else if (queryName && queryLanguage) {
      queryPath = await resolveQueryPath(params, logger2);
    }
    if (!queryPath) {
      logger2.error("Cannot determine query path for interpretation/evaluation");
      return {
        ...result,
        stdout: result.stdout + "\n\nWarning: Query interpretation skipped - could not determine query path"
      };
    }
    if (format) {
      const outputFormat = format;
      let outputFilePath = interpretedOutput;
      if (!outputFilePath) {
        const ext = getDefaultExtension(outputFormat);
        outputFilePath = bqrsPath.replace(".bqrs", ext);
      }
      logger2.info(`Interpreting query results from ${bqrsPath} with format: ${outputFormat}`);
      const interpretResult = await interpretBQRSFile(
        bqrsPath,
        queryPath,
        outputFormat,
        outputFilePath,
        logger2
      );
      if (interpretResult.success) {
        let enhancedOutput = result.stdout;
        enhancedOutput += `

Query results interpreted successfully with format: ${outputFormat}`;
        enhancedOutput += `
Interpreted output saved to: ${outputFilePath}`;
        return {
          ...result,
          stdout: enhancedOutput
        };
      } else {
        logger2.error("Query interpretation failed:", interpretResult.error);
        return {
          ...result,
          stdout: result.stdout + `

Warning: Query interpretation failed - ${interpretResult.error || interpretResult.stderr}`
        };
      }
    }
    if (evaluationFunction) {
      logger2.info(`Using deprecated evaluationFunction parameter. Consider using format parameter instead.`);
      logger2.info(`Evaluating query results from ${bqrsPath} using function: ${evaluationFunction}`);
      const evaluationResult = await evaluateQueryResults(
        bqrsPath,
        queryPath,
        evaluationFunction,
        evaluationOutput
      );
      if (evaluationResult.success) {
        let enhancedOutput = result.stdout;
        if (evaluationResult.outputPath) {
          enhancedOutput += `

Query evaluation completed successfully.`;
          enhancedOutput += `
Evaluation output saved to: ${evaluationResult.outputPath}`;
        }
        if (evaluationResult.content) {
          enhancedOutput += `

=== Query Results Evaluation ===
`;
          enhancedOutput += evaluationResult.content;
        }
        return {
          ...result,
          stdout: enhancedOutput
        };
      } else {
        logger2.error("Query evaluation failed:", evaluationResult.error);
        return {
          ...result,
          stdout: result.stdout + `

Warning: Query evaluation failed - ${evaluationResult.error}`
        };
      }
    }
    return result;
  } catch (error) {
    logger2.error("Error in query results processing:", error);
    return {
      ...result,
      stdout: result.stdout + `

Warning: Query processing error - ${error}`
    };
  }
}

// src/tools/codeql/bqrs-decode.ts
var codeqlBqrsDecodeTool = {
  name: "codeql_bqrs_decode",
  description: "Decode BQRS result files to human-readable formats (text, csv, json). Typical workflow: (1) use list_query_run_results to find BQRS paths from previous codeql_query_run or codeql_database_analyze runs, (2) use codeql_bqrs_info to discover result sets and column schemas, (3) decode specific result sets with this tool. For large result sets, use --rows to paginate.",
  command: "codeql",
  subcommand: "bqrs decode",
  inputSchema: {
    files: z2.array(z2.string()).describe("BQRS file(s) to decode"),
    output: createCodeQLSchemas.output(),
    format: z2.enum(["csv", "json", "text", "bqrs"]).optional().describe("Output format: text (human-readable table, default), csv, json (streaming JSON), or bqrs (binary, requires --output)"),
    "result-set": z2.string().optional().describe("Decode a specific result set by name (use codeql_bqrs_info to list available sets). If omitted, all result sets are decoded."),
    "sort-key": z2.string().optional().describe("Sort by column(s): comma-separated column indices (0-based)"),
    "sort-direction": z2.string().optional().describe('Sort direction(s): comma-separated "asc" or "desc" per column'),
    "no-titles": z2.boolean().optional().describe("Omit column titles for text and csv formats"),
    entities: z2.string().optional().describe("Control entity column display: comma-separated list of url, string, id, all"),
    rows: z2.number().optional().describe("Maximum number of rows to output (for pagination). Use with --start-at for paging."),
    "start-at": z2.number().optional().describe('Byte offset to start decoding from (get from codeql_bqrs_info or previous JSON output "next" pointer). Must be used with --rows.'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql bqrs decode --format=csv --output=results.csv results.bqrs",
    "codeql bqrs decode --format=json --rows=100 results.bqrs",
    "codeql bqrs decode --result-set=#select --format=csv results.bqrs",
    "codeql bqrs decode --format=json --entities=url,string results.bqrs"
  ],
  resultProcessor: createBQRSResultProcessor()
};

// src/tools/codeql/bqrs-info.ts
import { z as z3 } from "zod";
var codeqlBqrsInfoTool = {
  name: "codeql_bqrs_info",
  description: 'Get metadata about BQRS result files: lists result sets, column names/types, and row counts. Use before codeql_bqrs_decode to discover available result sets (e.g., "#select", "edges", "nodes"). BQRS files are found at <runDir>/results.bqrs \u2014 use list_query_run_results to discover them. Use --format=json with --paginate-rows to get byte offsets for paginated decoding with codeql_bqrs_decode --start-at.',
  command: "codeql",
  subcommand: "bqrs info",
  inputSchema: {
    files: z3.array(z3.string()).describe("BQRS file(s) to examine"),
    format: z3.enum(["text", "json"]).optional().describe("Output format: text (default) or json. Use json for machine-readable output and pagination offset computation."),
    "paginate-rows": z3.number().optional().describe("Compute byte offsets for pagination at intervals of this many rows. Use with --format=json. Offsets can be passed to codeql_bqrs_decode --start-at."),
    "paginate-result-set": z3.string().optional().describe("Compute pagination offsets only for this result set name"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql bqrs info results.bqrs",
    "codeql bqrs info --format=json results.bqrs",
    "codeql bqrs info --format=json --paginate-rows=100 --paginate-result-set=#select results.bqrs"
  ],
  resultProcessor: createBQRSResultProcessor()
};

// src/tools/codeql/bqrs-interpret.ts
import { z as z4 } from "zod";
var codeqlBqrsInterpretTool = {
  name: "codeql_bqrs_interpret",
  description: "Interpret BQRS result files according to query metadata and generate output in specified formats (CSV, SARIF, graph formats)",
  command: "codeql",
  subcommand: "bqrs interpret",
  inputSchema: {
    file: z4.string().describe("The BQRS file to interpret"),
    format: z4.enum(["csv", "sarif-latest", "sarifv2.1.0", "graphtext", "dgml", "dot"]).describe("Output format: csv (comma-separated), sarif-latest/sarifv2.1.0 (SARIF), graphtext/dgml/dot (graph formats, only for @kind graph queries)"),
    output: createCodeQLSchemas.output(),
    t: z4.array(z4.string()).describe('Query metadata key=value pairs. At least "kind" and "id" must be specified (e.g., ["kind=graph", "id=js/print-ast"])'),
    "max-paths": z4.number().optional().describe("Maximum number of paths to produce for each alert with paths (default: 4)"),
    "sarif-add-file-contents": z4.boolean().optional().describe("[SARIF only] Include full file contents for all files referenced in results"),
    "sarif-add-snippets": z4.boolean().optional().describe("[SARIF only] Include code snippets for each location with context"),
    "sarif-group-rules-by-pack": z4.boolean().optional().describe("[SARIF only] Place rule objects under their QL pack in tool.extensions property"),
    "sarif-multicause-markdown": z4.boolean().optional().describe("[SARIF only] Include multi-cause alerts as Markdown-formatted lists"),
    "sarif-category": z4.string().optional().describe("[SARIF only] Category for this analysis (distinguishes multiple analyses on same code)"),
    "csv-location-format": z4.enum(["uri", "line-column", "offset-length"]).optional().describe("[CSV only] Format for locations in CSV output (default: line-column)"),
    "dot-location-url-format": z4.string().optional().describe("[DOT only] Format string for file location URLs (placeholders: {path}, {start:line}, {start:column}, {end:line}, {end:column}, {offset}, {length})"),
    threads: z4.number().optional().describe("Number of threads for computing paths (0 = one per core, -N = leave N cores unused)"),
    "column-kind": z4.enum(["utf8", "utf16", "utf32", "bytes"]).optional().describe("[SARIF only] Column kind for interpreting location columns"),
    "unicode-new-lines": z4.boolean().optional().describe("[SARIF only] Whether unicode newlines (U+2028, U+2029) are considered as newlines"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql bqrs interpret --format=sarif-latest --output=results.sarif -t kind=problem -t id=js/sql-injection results.bqrs",
    "codeql bqrs interpret --format=graphtext --output=ast.txt -t kind=graph -t id=js/print-ast results.bqrs",
    "codeql bqrs interpret --format=csv --csv-location-format=line-column --output=results.csv -t kind=problem -t id=js/xss results.bqrs",
    "codeql bqrs interpret --format=dot --output=graph.dot -t kind=graph -t id=java/call-graph results.bqrs",
    "codeql bqrs interpret --format=sarif-latest --sarif-add-snippets --sarif-category=security --output=results.sarif -t kind=path-problem -t id=go/path-injection results.bqrs"
  ],
  resultProcessor: createBQRSResultProcessor()
};

// src/tools/codeql/database-analyze.ts
import { z as z5 } from "zod";
var codeqlDatabaseAnalyzeTool = {
  name: "codeql_database_analyze",
  description: "Run queries or query suites against CodeQL databases. Produces evaluator logs, BQRS results, and optionally SARIF output. Use list_codeql_databases to discover available databases, and register_database to register new ones. After analysis completes, use list_query_run_results to find result artifacts, then codeql_bqrs_info and codeql_bqrs_decode to inspect results.",
  command: "codeql",
  subcommand: "database analyze",
  inputSchema: {
    database: z5.string().describe("Path to the CodeQL database"),
    queries: z5.string().describe("Queries or query suite to run"),
    output: z5.string().optional().describe("Output file path"),
    format: z5.enum(["csv", "json", "sarif-latest", "sarifv2.1.0"]).optional().describe("Output format for results"),
    "download-location": z5.string().optional().describe("Location to download missing dependencies"),
    threads: z5.number().optional().describe("Number of threads to use"),
    ram: z5.number().optional().describe("Amount of RAM to use (MB)"),
    timeout: z5.number().optional().describe("Timeout in seconds"),
    logDir: z5.string().optional().describe("Custom directory for analysis execution logs (overrides CODEQL_QUERY_LOG_DIR environment variable). If not provided, uses CODEQL_QUERY_LOG_DIR or defaults to .tmp/query-logs/<unique-id>"),
    "evaluator-log": z5.string().optional().describe("Path to save evaluator log. If not provided and logDir is set, defaults to <logDir>/evaluator-log.jsonl"),
    "tuple-counting": z5.boolean().optional().describe("Display tuple counts for each evaluation step in evaluator logs"),
    "evaluator-log-level": z5.number().min(1).max(5).optional().describe("Evaluator log verbosity level (1-5, default 5)"),
    rerun: z5.boolean().optional().describe("Force re-evaluation of queries even if BQRS results already exist in the database. Without this, cached results are reused."),
    verbose: z5.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z5.array(z5.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql database analyze mydb queries.qls --format=sarif-latest --output=results.sarif",
    "codeql database analyze mydb codeql/java-queries --format=csv",
    "codeql database analyze mydb queries.qls --format=sarif-latest --output=results.sarif --rerun --tuple-counting"
  ]
};

// src/tools/codeql/database-create.ts
import { z as z6 } from "zod";
var codeqlDatabaseCreateTool = {
  name: "codeql_database_create",
  description: "Create a CodeQL database from source code",
  command: "codeql",
  subcommand: "database create",
  inputSchema: {
    database: z6.string().describe("Database path/name to create"),
    language: z6.string().optional().describe("Programming language(s) to extract"),
    "source-root": z6.string().optional().describe("Root directory of source code"),
    command: z6.string().optional().describe("Build command for compiled languages"),
    "build-mode": z6.enum(["none", "autobuild", "manual"]).optional().describe("Build mode: none (interpreted langs), autobuild, or manual"),
    threads: z6.number().optional().describe("Number of threads to use"),
    ram: z6.number().optional().describe("Amount of RAM to use (MB)"),
    verbose: z6.boolean().optional().describe("Enable verbose output"),
    overwrite: z6.boolean().optional().describe("Overwrite existing database if it exists"),
    "no-cleanup": z6.boolean().optional().describe("Skip database cleanup after finalization"),
    additionalArgs: z6.array(z6.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql database create --language=java --source-root=/path/to/project mydb",
    'codeql database create --language=cpp --command="make all" mydb',
    "codeql database create --language=python,javascript mydb"
  ],
  resultProcessor: createDatabaseResultProcessor()
};

// src/tools/codeql/find-class-position.ts
init_logger();
import { z as z7 } from "zod";
import { readFile } from "fs/promises";
async function findClassPosition(filepath, className) {
  try {
    const content = await readFile(filepath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const classNameRegex = new RegExp(`\\bclass\\s+(${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`);
      const match = classNameRegex.exec(line);
      if (match) {
        const start_line = i + 1;
        const classNameStart = match.index + match[0].indexOf(match[1]);
        const start_col = classNameStart + 1;
        const end_col = start_col + className.length - 1;
        return {
          start_line,
          start_col,
          end_line: start_line,
          end_col
        };
      }
    }
    throw new Error(`Class name '${className}' not found in file: ${filepath}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found in file")) {
      throw error;
    }
    throw new Error(`Failed to read or parse file ${filepath}: ${error instanceof Error ? error.message : "Unknown error"}`, { cause: error });
  }
}
function registerFindClassPositionTool(server) {
  server.tool(
    "find_class_position",
    "Finds startline, startcol, endline endcol of a class for quickeval",
    {
      file: z7.string().describe("Path to the .ql file to search"),
      name: z7.string().describe("Name of the class to find")
    },
    async ({ file, name }) => {
      try {
        const position = await findClassPosition(file, name);
        return {
          content: [{ type: "text", text: JSON.stringify(position, null, 2) }]
        };
      } catch (error) {
        logger.error("Error finding class position:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/find-predicate-position.ts
init_logger();
import { z as z8 } from "zod";
import { readFile as readFile2 } from "fs/promises";
async function findPredicatePosition(filepath, predicateName) {
  try {
    const content = await readFile2(filepath, "utf-8");
    const lines = content.split("\n");
    const escapedName = predicateName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const predicateKeywordRegex = new RegExp(`\\bpredicate\\s+(${escapedName})\\s*\\(`);
      let match = predicateKeywordRegex.exec(line);
      if (!match) {
        const returnTypeRegex = new RegExp(`(?:^|\\s)(?:abstract\\s+)?(?:cached\\s+)?(?:private\\s+)?(?:deprecated\\s+)?(?:\\w+)\\s+(${escapedName})\\s*\\(`);
        match = returnTypeRegex.exec(line);
      }
      if (match) {
        const start_line = i + 1;
        const predicateNameStart = match.index + match[0].indexOf(match[1]);
        const start_col = predicateNameStart + 1;
        const end_col = start_col + predicateName.length - 1;
        return {
          start_line,
          start_col,
          end_line: start_line,
          end_col
        };
      }
    }
    throw new Error(`Predicate name '${predicateName}' not found in file: ${filepath}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found in file")) {
      throw error;
    }
    throw new Error(`Failed to read or parse file ${filepath}: ${error instanceof Error ? error.message : "Unknown error"}`, { cause: error });
  }
}
function registerFindPredicatePositionTool(server) {
  server.tool(
    "find_predicate_position",
    "Finds startline, startcol, endline endcol of a predicate for quickeval",
    {
      file: z8.string().describe("Path to the .ql file to search"),
      name: z8.string().describe("Name of the predicate to find")
    },
    async ({ file, name }) => {
      try {
        const position = await findPredicatePosition(file, name);
        return {
          content: [{ type: "text", text: JSON.stringify(position, null, 2) }]
        };
      } catch (error) {
        logger.error("Error finding predicate position:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/find-query-files.ts
import { z as z9 } from "zod";

// src/lib/query-file-finder.ts
import * as fs from "fs";
import * as path from "path";

// ../node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark) return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer) return null;
  if (!options.maxLength) options.maxLength = 79;
  if (typeof options.indent !== "number") options.indent = 1;
  if (typeof options.linesBefore !== "number") options.linesBefore = 3;
  if (typeof options.linesAfter !== "number") options.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  var result = "", i, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i = 1; i <= options.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
  for (i = 1; i <= options.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit) implicit = implicit.concat(definition.implicit);
    if (definition.explicit) explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
function setProperty(object, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object[key] = value;
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
var i;
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common.repeat("\n", emptyLines);
      }
    } else {
      state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null) return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1;
var QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (
    // ns-plain-safe
    (inblock ? (
      // c = flow-in
      cIsNsCharOrWhitespace
    ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
  );
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
var STYLE_PLAIN = 1;
var STYLE_SINGLE = 2;
var STYLE_LITERAL = 3;
var STYLE_FOLDED = 4;
var STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = (function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(
      string,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  })();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === "\n";
  var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = (function() {
    var nextLF = string.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  })();
  var prevMoreIndented = string[0] === "\n" || string[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ") return line;
  var breakRe = / [^ ]/g;
  var match;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i];
      if (char >= 65536) result += string[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "") pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024) pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length; index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid) return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(
        state.tag[0] === "!" ? state.tag.slice(1) : state.tag
      ).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs) getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
  return "";
}
var dump_1 = dump$1;
var dumper = {
  dump: dump_1
};
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var load = loader.load;
var loadAll = loader.loadAll;
var dump = dumper.dump;
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");

// src/lib/metadata-resolver.ts
init_cli_executor();
init_logger();
async function resolveQueryMetadata(queryPath) {
  try {
    logger.info(`Resolving metadata for query: ${queryPath}`);
    const result = await executeCodeQLCommand(
      "resolve metadata",
      { format: "json" },
      [queryPath]
    );
    if (!result.success) {
      logger.error(`Failed to resolve metadata for ${queryPath}:`, result.stderr || result.error);
      return null;
    }
    try {
      const metadata = JSON.parse(result.stdout);
      return metadata;
    } catch (parseError) {
      logger.error(`Failed to parse metadata JSON for ${queryPath}:`, parseError);
      return null;
    }
  } catch (error) {
    logger.error(`Error resolving metadata for ${queryPath}:`, error);
    return null;
  }
}

// src/lib/query-file-finder.ts
var LANGUAGE_EXTENSIONS = {
  actions: "yml",
  cpp: "cpp",
  csharp: "cs",
  go: "go",
  java: "java",
  javascript: "js",
  python: "py",
  ruby: "rb",
  swift: "swift",
  typescript: "ts"
};
var KNOWN_LANGUAGES = Object.keys(LANGUAGE_EXTENSIONS);
function getLanguageExtension(language) {
  return LANGUAGE_EXTENSIONS[language.toLowerCase()] || "txt";
}
function inferLanguageFromPath(queryPath) {
  const parts = queryPath.split(path.sep);
  for (const part of parts) {
    if (KNOWN_LANGUAGES.includes(part.toLowerCase())) {
      return part.toLowerCase();
    }
  }
  return "unknown";
}
function findNearestQlpack(startPath) {
  let currentPath = startPath;
  const root = path.parse(currentPath).root;
  while (currentPath !== root) {
    for (const packFile of ["codeql-pack.yml", "qlpack.yml"]) {
      const packPath = path.join(currentPath, packFile);
      if (fs.existsSync(packPath) && fs.statSync(packPath).isFile()) {
        return packPath;
      }
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
}
function readQlpackMetadata(qlpackPath) {
  try {
    const content = fs.readFileSync(qlpackPath, "utf-8");
    const parsed = load(content);
    return parsed;
  } catch (_error) {
    return null;
  }
}
function checkFile(filePath) {
  try {
    const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    return {
      exists,
      path: filePath
      // Always return path, whether it exists or not
    };
  } catch {
    return {
      exists: false,
      path: filePath
      // Return the path even on error
    };
  }
}
function checkDirectory(dirPath) {
  try {
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    return {
      exists,
      path: dirPath
      // Always return path, whether it exists or not
    };
  } catch {
    return {
      exists: false,
      path: dirPath
      // Return the path even on error
    };
  }
}
function findTestCodeFiles(testDir, queryName, language) {
  if (!fs.existsSync(testDir)) {
    return [];
  }
  try {
    const files = fs.readdirSync(testDir);
    const languageExt = getLanguageExtension(language);
    const testFiles = [];
    const allValidExtensions = [.../* @__PURE__ */ new Set([...Object.values(LANGUAGE_EXTENSIONS), "yaml"])];
    for (const file of files) {
      const filePath = path.join(testDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        if (file === `${queryName}.${languageExt}`) {
          testFiles.push(filePath);
        } else if (!file.endsWith(".qlref") && !file.endsWith(".expected") && !file.endsWith(".actual")) {
          const ext = path.extname(file).slice(1);
          if (ext === languageExt || allValidExtensions.includes(ext)) {
            testFiles.push(filePath);
          }
        }
      }
    }
    return testFiles;
  } catch {
    return [];
  }
}
async function findCodeQLQueryFiles(queryFilePath, language, resolveMetadata = true) {
  const absoluteQueryPath = path.resolve(queryFilePath);
  const queryName = path.basename(absoluteQueryPath, ".ql");
  const queryDir = path.dirname(absoluteQueryPath);
  const detectedLanguage = language || inferLanguageFromPath(absoluteQueryPath);
  const queryPath = checkFile(absoluteQueryPath);
  const queryDirectory = checkDirectory(queryDir);
  const mdPath = path.join(queryDir, `${queryName}.md`);
  const qhelpPath = path.join(queryDir, `${queryName}.qhelp`);
  const mdInfo = checkFile(mdPath);
  const qhelpInfo = checkFile(qhelpPath);
  const documentationPath = mdInfo.exists ? mdInfo : qhelpInfo.exists ? qhelpInfo : {
    exists: false,
    path: mdPath
    // Suggest .md as the default
  };
  const qspecPath = path.join(queryDir, `${queryName}.qspec`);
  const specificationPath = checkFile(qspecPath);
  let testDir;
  if (queryDir.includes(`${path.sep}src${path.sep}`)) {
    const parts = queryDir.split(path.sep);
    const srcIndex = parts.lastIndexOf("src");
    if (srcIndex !== -1) {
      parts[srcIndex] = "test";
      testDir = parts.join(path.sep);
    } else {
      testDir = path.join(path.dirname(queryDir), "test", queryName);
    }
  } else {
    testDir = path.join(path.dirname(queryDir), "test", queryName);
  }
  const testDirectory = checkDirectory(testDir);
  const qlrefPath = path.join(testDir, `${queryName}.qlref`);
  const qlrefInfo = checkFile(qlrefPath);
  const testCodePaths = findTestCodeFiles(testDir, queryName, detectedLanguage);
  const expectedPath = path.join(testDir, `${queryName}.expected`);
  const expectedResultsPath = checkFile(expectedPath);
  const actualPath = path.join(testDir, `${queryName}.actual`);
  const actualResultsPath = checkFile(actualPath);
  const testprojPath = path.join(testDir, `${queryName}.testproj`);
  const testDatabasePath = checkDirectory(testprojPath);
  const missingFiles = [];
  if (!queryPath.exists) missingFiles.push(queryPath.path);
  if (!documentationPath.exists) missingFiles.push(documentationPath.path);
  if (!specificationPath.exists) missingFiles.push(specificationPath.path);
  if (!testDirectory.exists) missingFiles.push(testDirectory.path);
  if (!qlrefInfo.exists) missingFiles.push(qlrefInfo.path);
  if (testCodePaths.length === 0) missingFiles.push(path.join(testDir, `${queryName}.${getLanguageExtension(detectedLanguage)}`));
  if (!expectedResultsPath.exists) missingFiles.push(expectedResultsPath.path);
  const allFilesExist = missingFiles.length === 0;
  let metadata;
  if (resolveMetadata && queryPath.exists) {
    const resolvedMetadata = await resolveQueryMetadata(absoluteQueryPath);
    if (resolvedMetadata) {
      metadata = resolvedMetadata;
    }
  }
  let packMetadata;
  const queryPackPath = findNearestQlpack(queryDir);
  const queryPackDir = queryPackPath ? path.dirname(queryPackPath) : queryDir;
  if (queryPackPath) {
    const parsed = readQlpackMetadata(queryPackPath);
    if (parsed) {
      packMetadata = parsed;
    }
  }
  const testPackPath = findNearestQlpack(testDir);
  const testPackDir = testPackPath ? path.dirname(testPackPath) : testDir;
  return {
    queryName,
    language: detectedLanguage,
    allFilesExist,
    files: {
      query: {
        dir: queryDirectory.path,
        doc: path.basename(documentationPath.path),
        packDir: queryPackDir,
        query: path.basename(queryPath.path),
        spec: path.basename(specificationPath.path)
      },
      test: {
        actual: path.basename(actualResultsPath.path),
        dir: testDirectory.path,
        expected: path.basename(expectedResultsPath.path),
        packDir: testPackDir,
        qlref: path.basename(qlrefInfo.path),
        testCode: testCodePaths,
        testDatabaseDir: testDatabasePath.path
      }
    },
    metadata,
    missingFiles,
    packMetadata,
    status: {
      actualResultsExist: actualResultsPath.exists,
      documentationExists: documentationPath.exists,
      expectedResultsExist: expectedResultsPath.exists,
      hasTestCode: testCodePaths.length > 0,
      qlrefExists: qlrefInfo.exists,
      queryExists: queryPath.exists,
      specificationExists: specificationPath.exists,
      testDatabaseDirExists: testDatabasePath.exists,
      testDirectoryExists: testDirectory.exists
    }
  };
}

// src/tools/codeql/find-query-files.ts
init_logger();
function registerFindCodeQLQueryFilesTool(server) {
  server.tool(
    "find_codeql_query_files",
    "Find and track all files and directories related to a CodeQL query, including resolved metadata",
    {
      queryPath: z9.string().describe("Path to the CodeQL query file (.ql)"),
      language: z9.string().optional().describe("Programming language (optional, will be inferred if not provided)"),
      resolveMetadata: z9.boolean().optional().describe("Whether to resolve query metadata (default: true)")
    },
    async ({ queryPath, language, resolveMetadata }) => {
      try {
        const result = await findCodeQLQueryFiles(
          queryPath,
          language,
          resolveMetadata !== false
          // Default to true if not specified
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error("Error finding CodeQL query files:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/generate-log-summary.ts
import { z as z10 } from "zod";
var codeqlGenerateLogSummaryTool = {
  name: "codeql_generate_log-summary",
  description: "Create a summary of a structured JSON evaluator event log file",
  command: "codeql",
  subcommand: "generate log-summary",
  inputSchema: {
    inputLog: z10.string().describe("Path to the evaluator log file to summarize"),
    outputFile: z10.string().optional().describe("Path to write the summary (optional, defaults to stdout)"),
    format: z10.enum(["text", "predicates", "overall"]).optional().describe("Output format: text (human-readable), predicates (JSON), or overall (stats)"),
    "minify-output": z10.boolean().optional().describe("Minify JSON output"),
    utc: z10.boolean().optional().describe("Force UTC timestamps"),
    "deduplicate-stage-summaries": z10.boolean().optional().describe("Deduplicate stage summaries"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql generate log-summary --format=text -- evaluator-log.json.txt summary.txt",
    "codeql generate log-summary --format=predicates --minify-output -- evaluator-log.json.txt",
    "codeql generate log-summary --format=overall -- evaluator-log.json.txt overall-stats.json"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/generate-query-help.ts
import { z as z11 } from "zod";
var codeqlGenerateQueryHelpTool = {
  name: "codeql_generate_query-help",
  description: "Generate query help documentation from QLDoc comments",
  command: "codeql",
  subcommand: "generate query-help",
  inputSchema: {
    query: z11.string().describe("Path to the query file to generate help for"),
    outputFile: z11.string().optional().describe("Path to write the help documentation"),
    format: z11.enum(["markdown", "text", "html"]).optional().describe("Output format for the help documentation"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql generate query-help -- MyQuery.ql",
    "codeql generate query-help --format=markdown -- MyQuery.ql help.md",
    "codeql generate query-help --format=html -- MyQuery.ql help.html"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/list-databases.ts
import { existsSync as existsSync6, readdirSync as readdirSync2, readFileSync as readFileSync4, statSync as statSync2 } from "fs";
import { join as join7 } from "path";
import { z as z12 } from "zod";

// src/lib/discovery-config.ts
function parsePathList(envValue) {
  if (!envValue) {
    return [];
  }
  return envValue.split(":").map((p) => p.trim()).filter((p) => p.length > 0);
}
function getDatabaseBaseDirs() {
  return parsePathList(process.env.CODEQL_DATABASES_BASE_DIRS);
}
function getMrvaRunResultsDirs() {
  return parsePathList(process.env.CODEQL_MRVA_RUN_RESULTS_DIRS);
}
function getQueryRunResultsDirs() {
  return parsePathList(process.env.CODEQL_QUERY_RUN_RESULTS_DIRS);
}

// src/tools/codeql/list-databases.ts
init_logger();
function parseDatabaseYml(ymlPath) {
  try {
    const content = readFileSync4(ymlPath, "utf-8");
    const info = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const key = trimmed.substring(0, colonIdx).trim();
      const value = trimmed.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
      switch (key) {
        case "primaryLanguage":
          info.language = value;
          break;
        case "cliVersion":
          info.cliVersion = value;
          break;
        case "creationTime":
          info.creationTime = value;
          break;
      }
    }
    return info;
  } catch {
    return {};
  }
}
async function discoverDatabases(baseDirs, language) {
  const databases = [];
  for (const baseDir of baseDirs) {
    if (!existsSync6(baseDir)) {
      continue;
    }
    let entries;
    try {
      entries = readdirSync2(baseDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = join7(baseDir, entry);
      try {
        if (!statSync2(entryPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }
      const ymlPath = join7(entryPath, "codeql-database.yml");
      if (!existsSync6(ymlPath)) {
        continue;
      }
      const metadata = parseDatabaseYml(ymlPath);
      if (language && metadata.language !== language) {
        continue;
      }
      databases.push({
        cliVersion: metadata.cliVersion,
        creationTime: metadata.creationTime,
        language: metadata.language,
        name: entry,
        path: entryPath
      });
    }
  }
  return databases;
}
function registerListDatabasesTool(server) {
  server.tool(
    "list_codeql_databases",
    "List CodeQL databases discovered in configured base directories (set via CODEQL_DATABASES_BASE_DIRS env var). Returns path, language, CLI version, and creation time for each database. Use the returned database paths with codeql_query_run or codeql_database_analyze to run queries against them.",
    {
      language: z12.string().optional().describe('Filter databases by language (e.g., "javascript", "python")')
    },
    async ({ language }) => {
      try {
        const baseDirs = getDatabaseBaseDirs();
        if (baseDirs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No database base directories configured. Set the CODEQL_DATABASES_BASE_DIRS environment variable to a colon-separated list of directories to search."
              }
            ]
          };
        }
        const databases = await discoverDatabases(baseDirs, language);
        if (databases.length === 0) {
          const filterMsg = language ? ` for language "${language}"` : "";
          return {
            content: [
              {
                type: "text",
                text: `No CodeQL databases found${filterMsg} in: ${baseDirs.join(", ")}`
              }
            ]
          };
        }
        const lines = [
          `Found ${databases.length} CodeQL database(s):`,
          "",
          ...databases.map((db) => {
            const parts = [`  ${db.name}`];
            parts.push(`    Path: ${db.path}`);
            if (db.language) parts.push(`    Language: ${db.language}`);
            if (db.cliVersion) parts.push(`    CLI Version: ${db.cliVersion}`);
            if (db.creationTime) parts.push(`    Created: ${db.creationTime}`);
            return parts.join("\n");
          })
        ];
        return {
          content: [{ type: "text", text: lines.join("\n") }]
        };
      } catch (error) {
        logger.error("Error listing databases:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/list-mrva-run-results.ts
import { existsSync as existsSync7, readdirSync as readdirSync3, readFileSync as readFileSync5, statSync as statSync3 } from "fs";
import { join as join8 } from "path";
import { z as z13 } from "zod";
init_logger();
var NUMERIC_DIR_PATTERN = /^\d+$/;
var SKIP_DIRS = /* @__PURE__ */ new Set([".DS_Store", "exported-results"]);
async function discoverMrvaRunResults(resultsDirs, runId) {
  const results = [];
  for (const dir of resultsDirs) {
    if (!existsSync7(dir)) {
      continue;
    }
    let entries;
    try {
      entries = readdirSync3(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = join8(dir, entry);
      try {
        if (!statSync3(entryPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }
      if (!NUMERIC_DIR_PATTERN.test(entry)) {
        continue;
      }
      if (runId && entry !== runId) {
        continue;
      }
      let timestamp2;
      const timestampPath = join8(entryPath, "timestamp");
      if (existsSync7(timestampPath)) {
        try {
          timestamp2 = readFileSync5(timestampPath, "utf-8").trim();
        } catch {
        }
      }
      const repositories = discoverRepoResults(entryPath);
      results.push({
        path: entryPath,
        repositories,
        runId: entry,
        timestamp: timestamp2
      });
    }
  }
  return results;
}
function discoverRepoResults(runPath) {
  const repos = [];
  let ownerEntries;
  try {
    ownerEntries = readdirSync3(runPath);
  } catch {
    return repos;
  }
  for (const ownerEntry of ownerEntries) {
    if (SKIP_DIRS.has(ownerEntry)) {
      continue;
    }
    const ownerPath = join8(runPath, ownerEntry);
    try {
      if (!statSync3(ownerPath).isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    let repoEntries;
    try {
      repoEntries = readdirSync3(ownerPath);
    } catch {
      continue;
    }
    for (const repoEntry of repoEntries) {
      const repoPath = join8(ownerPath, repoEntry);
      try {
        if (!statSync3(repoPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }
      const fullName = `${ownerEntry}/${repoEntry}`;
      let analysisStatus;
      let resultCount;
      const repoTaskPath = join8(repoPath, "repo_task.json");
      if (existsSync7(repoTaskPath)) {
        try {
          const raw = readFileSync5(repoTaskPath, "utf-8");
          const task = JSON.parse(raw);
          if (typeof task.analysisStatus === "string") {
            analysisStatus = task.analysisStatus;
          }
          if (typeof task.resultCount === "number") {
            resultCount = task.resultCount;
          }
        } catch {
        }
      }
      const hasSarif = existsSync7(join8(repoPath, "results", "results.sarif"));
      const hasBqrs = existsSync7(join8(repoPath, "results", "results.bqrs"));
      repos.push({
        analysisStatus,
        fullName,
        hasBqrs,
        hasSarif,
        resultCount
      });
    }
  }
  return repos;
}
function registerListMrvaRunResultsTool(server) {
  server.tool(
    "list_mrva_run_results",
    "List discovered MRVA (Multi-Repository Variant Analysis) run results (set via CODEQL_MRVA_RUN_RESULTS_DIRS env var). Returns run ID, timestamp, repositories scanned, analysis status, and available artifacts for each run.",
    {
      runId: z13.string().optional().describe('Filter results by run ID (e.g., "20442")')
    },
    async ({ runId }) => {
      try {
        const resultsDirs = getMrvaRunResultsDirs();
        if (resultsDirs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No MRVA run results directories configured. Set the CODEQL_MRVA_RUN_RESULTS_DIRS environment variable to a colon-separated list of directories to search."
              }
            ]
          };
        }
        const runs = await discoverMrvaRunResults(resultsDirs, runId);
        if (runs.length === 0) {
          const filterMsg = runId ? ` for run ID "${runId}"` : "";
          return {
            content: [
              {
                type: "text",
                text: `No MRVA run results found${filterMsg} in: ${resultsDirs.join(", ")}`
              }
            ]
          };
        }
        const lines = [
          `Found ${runs.length} MRVA run result(s):`,
          "",
          ...runs.map((run) => {
            const parts = [`  Run ${run.runId}`];
            parts.push(`    Path: ${run.path}`);
            if (run.timestamp) parts.push(`    Timestamp: ${run.timestamp}`);
            parts.push(`    Repositories: ${run.repositories.length}`);
            for (const repo of run.repositories) {
              const artifacts = [];
              if (repo.hasSarif) artifacts.push("sarif");
              if (repo.hasBqrs) artifacts.push("bqrs");
              const status = repo.analysisStatus ?? "unknown";
              const count = repo.resultCount !== void 0 ? `, ${repo.resultCount} result(s)` : "";
              parts.push(`      ${repo.fullName} [${status}${count}] artifacts: ${artifacts.length > 0 ? artifacts.join(", ") : "none"}`);
            }
            return parts.join("\n");
          })
        ];
        return {
          content: [{ type: "text", text: lines.join("\n") }]
        };
      } catch (error) {
        logger.error("Error listing MRVA run results:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/list-query-run-results.ts
import { existsSync as existsSync8, readdirSync as readdirSync4, readFileSync as readFileSync6, statSync as statSync4 } from "fs";
import { join as join9 } from "path";
import { z as z14 } from "zod";
init_logger();
var QUERY_RUN_DIR_PATTERN = /^(.+\.ql)-(.+)$/;
var RUN_QUERY_PATTERN = /runQuery called with\s+(\S+)/;
var DBSCHEME_DB_PATH_PATTERN = /--dbscheme=(.+?)\/db-(\w+)\//;
var DBSCHEME_LANGUAGE_PATTERN = /semmlecode\.(\w+)\.dbscheme/;
var QLPACK_LANGUAGE_PATTERN = /codeql\/(\w+)-all\//;
function parseQueryLogMetadata(logContent) {
  const metadata = {};
  const runQueryMatch = RUN_QUERY_PATTERN.exec(logContent);
  if (runQueryMatch) {
    metadata.queryPath = runQueryMatch[1];
  }
  const dbPathMatch = DBSCHEME_DB_PATH_PATTERN.exec(logContent);
  if (dbPathMatch) {
    metadata.databasePath = dbPathMatch[1];
    metadata.language = dbPathMatch[2];
  }
  if (!metadata.language) {
    const langMatch = DBSCHEME_LANGUAGE_PATTERN.exec(logContent);
    if (langMatch) {
      metadata.language = langMatch[1];
    }
  }
  if (!metadata.language) {
    const packMatch = QLPACK_LANGUAGE_PATTERN.exec(logContent);
    if (packMatch) {
      metadata.language = packMatch[1];
    }
  }
  return metadata;
}
async function discoverQueryRunResults(resultsDirs, filter) {
  const normalizedFilter = typeof filter === "string" ? { queryName: filter } : filter;
  const results = [];
  for (const dir of resultsDirs) {
    if (!existsSync8(dir)) {
      continue;
    }
    let entries;
    try {
      entries = readdirSync4(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = join9(dir, entry);
      try {
        if (!statSync4(entryPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }
      const match = QUERY_RUN_DIR_PATTERN.exec(entry);
      if (!match) {
        continue;
      }
      const [, name, runId] = match;
      if (normalizedFilter?.queryName && name !== normalizedFilter.queryName) {
        continue;
      }
      const hasEvaluatorLog = existsSync8(join9(entryPath, "evaluator-log.jsonl"));
      const hasBqrs = existsSync8(join9(entryPath, "results.bqrs"));
      const hasSarif = existsSync8(join9(entryPath, "results-interpreted.sarif"));
      const hasQueryLog = existsSync8(join9(entryPath, "query.log"));
      const hasSummaryLog = existsSync8(join9(entryPath, "evaluator-log.summary.jsonl"));
      let timestamp2;
      const timestampPath = join9(entryPath, "timestamp");
      if (existsSync8(timestampPath)) {
        try {
          timestamp2 = readFileSync6(timestampPath, "utf-8").trim();
        } catch {
        }
      }
      let metadata = {};
      if (hasQueryLog) {
        try {
          const logContent = readFileSync6(join9(entryPath, "query.log"), "utf-8");
          metadata = parseQueryLogMetadata(logContent);
        } catch {
        }
      }
      if (normalizedFilter?.language && metadata.language !== normalizedFilter.language) {
        continue;
      }
      if (normalizedFilter?.queryPath) {
        if (!metadata.queryPath) {
          continue;
        }
        const filterPath = normalizedFilter.queryPath;
        const isExact = filterPath.startsWith("/");
        if (isExact) {
          if (metadata.queryPath !== filterPath) {
            continue;
          }
        } else {
          if (!metadata.queryPath.toLowerCase().includes(filterPath.toLowerCase())) {
            continue;
          }
        }
      }
      results.push({
        databasePath: metadata.databasePath,
        hasBqrs,
        hasEvaluatorLog,
        hasQueryLog,
        hasSarif,
        hasSummaryLog,
        language: metadata.language,
        path: entryPath,
        queryName: name,
        queryPath: metadata.queryPath,
        runId,
        timestamp: timestamp2
      });
    }
  }
  return results;
}
function registerListQueryRunResultsTool(server) {
  server.tool(
    "list_query_run_results",
    "List discovered query run result directories (set via CODEQL_QUERY_RUN_RESULTS_DIRS env var). Returns path, query name, timestamp, language, query file path, and available artifacts (evaluator-log, bqrs, sarif, query.log, summary) for each run. Filter by queryName, language, or queryPath to narrow results. Use the returned BQRS paths with codeql_bqrs_decode or codeql_bqrs_info to inspect query results.",
    {
      language: z14.string().optional().describe(
        'Filter by CodeQL language (e.g., "javascript", "python", "java"). Extracted from the database path in query.log. Runs without a query.log are excluded when this filter is set.'
      ),
      queryName: z14.string().optional().describe('Filter results by query name (e.g., "UI5Xss.ql")'),
      queryPath: z14.string().optional().describe(
        "Filter by query file path. Absolute paths match exactly; relative paths/substrings match case-insensitively. Requires query.log to be present."
      )
    },
    async ({ language, queryName, queryPath }) => {
      try {
        const resultsDirs = getQueryRunResultsDirs();
        if (resultsDirs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No query run results directories configured. Set the CODEQL_QUERY_RUN_RESULTS_DIRS environment variable to a colon-separated list of directories to search."
              }
            ]
          };
        }
        const filter = {};
        if (queryName) filter.queryName = queryName;
        if (language) filter.language = language;
        if (queryPath) filter.queryPath = queryPath;
        const runs = await discoverQueryRunResults(
          resultsDirs,
          Object.keys(filter).length > 0 ? filter : void 0
        );
        if (runs.length === 0) {
          const filterParts = [];
          if (queryName) filterParts.push(`query "${queryName}"`);
          if (language) filterParts.push(`language "${language}"`);
          if (queryPath) filterParts.push(`path "${queryPath}"`);
          const filterMsg = filterParts.length > 0 ? ` for ${filterParts.join(", ")}` : "";
          return {
            content: [
              {
                type: "text",
                text: `No query run results found${filterMsg} in: ${resultsDirs.join(", ")}`
              }
            ]
          };
        }
        const lines = [
          `Found ${runs.length} query run result(s):`,
          "",
          ...runs.map((run) => {
            const artifacts = [];
            if (run.hasEvaluatorLog) artifacts.push("evaluator-log");
            if (run.hasSummaryLog) artifacts.push("summary-log");
            if (run.hasBqrs) artifacts.push("bqrs");
            if (run.hasSarif) artifacts.push("sarif");
            if (run.hasQueryLog) artifacts.push("query-log");
            const parts = [`  ${run.queryName} (${run.runId})`];
            parts.push(`    Path: ${run.path}`);
            if (run.timestamp) parts.push(`    Timestamp: ${run.timestamp}`);
            if (run.language) parts.push(`    Language: ${run.language}`);
            if (run.queryPath) parts.push(`    Query: ${run.queryPath}`);
            if (run.databasePath) parts.push(`    Database: ${run.databasePath}`);
            parts.push(`    Artifacts: ${artifacts.length > 0 ? artifacts.join(", ") : "none"}`);
            if (run.hasBqrs) parts.push(`    BQRS: ${join9(run.path, "results.bqrs")}`);
            return parts.join("\n");
          })
        ];
        return {
          content: [{ type: "text", text: lines.join("\n") }]
        };
      } catch (error) {
        logger.error("Error listing query run results:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/pack-install.ts
import { z as z15 } from "zod";
var codeqlPackInstallTool = {
  name: "codeql_pack_install",
  description: "Install CodeQL pack dependencies",
  command: "codeql",
  subcommand: "pack install",
  inputSchema: {
    packDir: z15.string().optional().describe("Directory containing qlpack.yml (default: current)"),
    force: z15.boolean().optional().describe("Force reinstall of dependencies"),
    "no-strict-mode": z15.boolean().optional().describe("Allow non-strict dependency resolution"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql pack install",
    "codeql pack install --force /path/to/pack",
    "codeql pack install --no-strict-mode"
  ]
};

// src/tools/codeql/pack-ls.ts
import { z as z16 } from "zod";
var codeqlPackLsTool = {
  name: "codeql_pack_ls",
  description: "List CodeQL packs under some local directory path",
  command: "codeql",
  subcommand: "pack ls",
  inputSchema: {
    dir: z16.string().optional().describe("The root directory of the package or workspace, defaults to the current working directory"),
    format: z16.enum(["text", "json"]).optional().describe("Output format: text (default) or json"),
    groups: z16.string().optional().describe("List of CodeQL pack groups to include or exclude"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql pack ls -- .",
    "codeql pack ls --format=json -- /path/to/pack-directory",
    "codeql pack ls --format=json --groups=queries,tests -- ."
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/profile-codeql-query-from-logs.ts
import { existsSync as existsSync9, mkdirSync as mkdirSync6, writeFileSync as writeFileSync3 } from "fs";
import { basename as basename4, dirname as dirname6, join as join10 } from "path";
import { z as z17 } from "zod";

// src/lib/evaluator-log-parser.ts
init_logger();
import { readFileSync as readFileSync7 } from "fs";
function detectLogFormat(firstEvent) {
  if (typeof firstEvent.type === "string") {
    return "raw";
  }
  return "summary";
}
function splitJsonObjects(content) {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const parts = trimmed.split(/\n\}\s*\n\s*\{/);
  if (parts.length === 1) {
    return [trimmed];
  }
  return parts.map((part, idx) => {
    if (idx === 0) {
      return part + "\n}";
    }
    if (idx === parts.length - 1) {
      return "{\n" + part;
    }
    return "{\n" + part + "\n}";
  });
}
function parseJsonObjects(logPath) {
  const content = readFileSync7(logPath, "utf-8");
  const objectStrings = splitJsonObjects(content);
  const results = [];
  for (const objStr of objectStrings) {
    try {
      results.push(JSON.parse(objStr));
    } catch {
      logger.warn(
        `Failed to parse evaluator log object: ${objStr.substring(0, 120)}...`
      );
    }
  }
  return results;
}
function parseRawEvaluatorLog(logPath) {
  const events = parseJsonObjects(logPath);
  let codeqlVersion;
  const queryStartEvents = /* @__PURE__ */ new Map();
  const predicateStartEvents = /* @__PURE__ */ new Map();
  const queryPredicates = /* @__PURE__ */ new Map();
  const queryEndNanoTimes = /* @__PURE__ */ new Map();
  const queryCacheHits = /* @__PURE__ */ new Map();
  let firstQueryEventId;
  for (const event of events) {
    const eventType = event.type;
    switch (eventType) {
      case "LOG_HEADER": {
        codeqlVersion = event.codeqlVersion;
        break;
      }
      case "QUERY_STARTED": {
        const eid = event.eventId;
        const qName = event.queryName || "unknown";
        queryStartEvents.set(eid, {
          queryName: qName,
          nanoTime: event.nanoTime
        });
        queryPredicates.set(eid, []);
        queryCacheHits.set(eid, 0);
        if (firstQueryEventId === void 0) {
          firstQueryEventId = eid;
        }
        break;
      }
      case "QUERY_COMPLETED": {
        const startEid = event.startEvent;
        queryEndNanoTimes.set(startEid, event.nanoTime);
        break;
      }
      case "PREDICATE_STARTED": {
        const eid = event.eventId;
        const deps = event.dependencies;
        predicateStartEvents.set(eid, {
          predicateName: event.predicateName || "unknown",
          position: event.position,
          predicateType: event.predicateType,
          dependencies: deps ? Object.keys(deps) : [],
          queryCausingWork: event.queryCausingWork,
          nanoTime: event.nanoTime,
          pipelineCount: 0
        });
        break;
      }
      case "PIPELINE_COMPLETED": {
        const pipelineStartEid = event.startEvent;
        const pipelineStartEvt = events.find(
          (e) => e.type === "PIPELINE_STARTED" && e.eventId === pipelineStartEid
        );
        if (pipelineStartEvt) {
          const predEid = pipelineStartEvt.predicateStartEvent;
          const predStart = predicateStartEvents.get(predEid);
          if (predStart) {
            predStart.pipelineCount += 1;
          }
        }
        break;
      }
      case "PREDICATE_COMPLETED": {
        const startEid = event.startEvent;
        const predStart = predicateStartEvents.get(startEid);
        if (predStart) {
          const durationNs = event.nanoTime - predStart.nanoTime;
          const durationMs = durationNs / 1e6;
          const profile = {
            predicateName: predStart.predicateName,
            position: predStart.position,
            durationMs,
            resultSize: event.resultSize,
            pipelineCount: predStart.pipelineCount > 0 ? predStart.pipelineCount : void 0,
            evaluationStrategy: predStart.predicateType,
            dependencies: predStart.dependencies
          };
          const qEid = predStart.queryCausingWork ?? firstQueryEventId;
          if (qEid !== void 0) {
            let arr = queryPredicates.get(qEid);
            if (!arr) {
              arr = [];
              queryPredicates.set(qEid, arr);
            }
            arr.push(profile);
          }
        }
        break;
      }
      case "CACHE_LOOKUP": {
        const qEid = event.queryCausingWork ?? firstQueryEventId;
        if (qEid !== void 0) {
          queryCacheHits.set(qEid, (queryCacheHits.get(qEid) ?? 0) + 1);
        }
        break;
      }
    }
  }
  const queries = [];
  for (const [qEid, startInfo] of queryStartEvents) {
    const predicates = queryPredicates.get(qEid) ?? [];
    const endNano = queryEndNanoTimes.get(qEid);
    const totalDurationMs = endNano !== void 0 ? (endNano - startInfo.nanoTime) / 1e6 : predicates.reduce((sum, p) => sum + p.durationMs, 0);
    queries.push({
      queryName: startInfo.queryName,
      totalDurationMs,
      predicateCount: predicates.length,
      predicates,
      cacheHits: queryCacheHits.get(qEid) ?? 0
    });
  }
  return {
    codeqlVersion,
    logFormat: "raw",
    queries,
    totalEvents: events.length
  };
}
function parseSummaryLog(logPath) {
  const events = parseJsonObjects(logPath);
  let codeqlVersion;
  const queryPredicatesMap = /* @__PURE__ */ new Map();
  const queryTotalMs = /* @__PURE__ */ new Map();
  const queryCacheHits = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.summaryLogVersion !== void 0) {
      codeqlVersion = event.codeqlVersion;
      continue;
    }
    const strategy = event.evaluationStrategy;
    if (strategy === "SENTINEL_EMPTY") {
      continue;
    }
    if (event.millis === void 0) {
      continue;
    }
    const predicateName = event.predicateName || "unknown";
    const millis = event.millis;
    const queryName = event.queryCausingWork || "unknown";
    const deps = event.dependencies;
    const pipelineRuns = event.pipelineRuns;
    const profile = {
      predicateName,
      position: event.position,
      durationMs: millis,
      resultSize: event.resultSize,
      pipelineCount: pipelineRuns,
      evaluationStrategy: strategy,
      dependencies: deps ? Object.keys(deps) : []
    };
    if (event.isCached === true || strategy === "CACHEHIT") {
      queryCacheHits.set(
        queryName,
        (queryCacheHits.get(queryName) ?? 0) + 1
      );
    }
    let arr = queryPredicatesMap.get(queryName);
    if (!arr) {
      arr = [];
      queryPredicatesMap.set(queryName, arr);
    }
    arr.push(profile);
    queryTotalMs.set(
      queryName,
      (queryTotalMs.get(queryName) ?? 0) + millis
    );
  }
  const queries = [];
  for (const [queryName, predicates] of queryPredicatesMap) {
    queries.push({
      queryName,
      totalDurationMs: queryTotalMs.get(queryName) ?? 0,
      predicateCount: predicates.length,
      predicates,
      cacheHits: queryCacheHits.get(queryName) ?? 0
    });
  }
  return {
    codeqlVersion,
    logFormat: "summary",
    queries,
    totalEvents: events.length
  };
}
function parseEvaluatorLog(logPath) {
  const events = parseJsonObjects(logPath);
  if (events.length === 0) {
    return {
      logFormat: "raw",
      queries: [],
      totalEvents: 0
    };
  }
  const format = detectLogFormat(events[0]);
  if (format === "raw") {
    return parseRawEvaluatorLog(logPath);
  }
  return parseSummaryLog(logPath);
}

// src/tools/codeql/profile-codeql-query-from-logs.ts
init_logger();
function formatAsJson(profile) {
  return JSON.stringify(profile, null, 2);
}
function formatAsMermaid(profile, topN) {
  const lines = [];
  lines.push("```mermaid");
  lines.push("graph TD");
  lines.push("");
  if (profile.queries.length <= 1) {
    const query = profile.queries[0] ?? {
      queryName: "unknown",
      totalDurationMs: 0,
      predicates: [],
      predicateCount: 0,
      cacheHits: 0
    };
    const qLabel = sanitizeMermaid(basename4(query.queryName));
    lines.push(
      `  QUERY["${qLabel}<br/>Total: ${query.totalDurationMs.toFixed(2)}ms<br/>Predicates: ${query.predicateCount}"]`
    );
    lines.push("");
    const topPredicates = getTopPredicates(query.predicates, topN);
    topPredicates.forEach((pred, idx) => {
      const nodeId = `P${idx}`;
      const name = sanitizeMermaid(pred.predicateName).substring(0, 50);
      const dur = pred.durationMs.toFixed(2);
      const size = pred.resultSize !== void 0 ? String(pred.resultSize) : "?";
      lines.push(
        `  ${nodeId}["${name}<br/>${dur}ms | ${size} results"]`
      );
    });
    lines.push("");
    topPredicates.forEach((_pred, idx) => {
      lines.push(`  QUERY --> P${idx}`);
    });
  } else {
    lines.push(
      `  ROOT["Evaluation Log<br/>${profile.queries.length} queries"]`
    );
    lines.push("");
    profile.queries.forEach((query, qIdx) => {
      const qNodeId = `Q${qIdx}`;
      const qLabel = sanitizeMermaid(basename4(query.queryName));
      lines.push(
        `  ${qNodeId}["${qLabel}<br/>${query.totalDurationMs.toFixed(2)}ms<br/>Predicates: ${query.predicateCount}"]`
      );
      lines.push(`  ROOT --> ${qNodeId}`);
      const topPredicates = getTopPredicates(query.predicates, topN);
      topPredicates.forEach((pred, pIdx) => {
        const nodeId = `Q${qIdx}P${pIdx}`;
        const name = sanitizeMermaid(pred.predicateName).substring(0, 50);
        const dur = pred.durationMs.toFixed(2);
        const size = pred.resultSize !== void 0 ? String(pred.resultSize) : "?";
        lines.push(
          `  ${nodeId}["${name}<br/>${dur}ms | ${size} results"]`
        );
        lines.push(`  ${qNodeId} --> ${nodeId}`);
      });
      lines.push("");
    });
  }
  lines.push("");
  lines.push(
    "  classDef default fill:#e1f5ff,stroke:#333,stroke-width:2px"
  );
  lines.push(
    "  classDef query fill:#ffe1e1,stroke:#333,stroke-width:3px"
  );
  lines.push("  class QUERY query");
  lines.push("```");
  return lines.join("\n");
}
function sanitizeMermaid(text) {
  return text.replace(/[<>"]/g, "");
}
function getTopPredicates(predicates, topN) {
  return [...predicates].sort((a, b) => b.durationMs - a.durationMs).slice(0, topN);
}
function buildTextSummary(profile, topN, outputFiles) {
  const sections = [];
  sections.push("Query log profiling completed successfully!");
  sections.push("");
  sections.push("Output Files:");
  for (const f of outputFiles) {
    sections.push(`  - ${f}`);
  }
  sections.push("");
  sections.push(`Log Format: ${profile.logFormat}`);
  if (profile.codeqlVersion) {
    sections.push(`CodeQL Version: ${profile.codeqlVersion}`);
  }
  sections.push(`Total Events: ${profile.totalEvents}`);
  sections.push(`Queries: ${profile.queries.length}`);
  for (const query of profile.queries) {
    sections.push("");
    sections.push(`--- ${basename4(query.queryName)} ---`);
    sections.push(`  Total Duration: ${query.totalDurationMs.toFixed(2)} ms`);
    sections.push(`  Predicates Evaluated: ${query.predicateCount}`);
    sections.push(`  Cache Hits: ${query.cacheHits}`);
    const top = getTopPredicates(query.predicates, topN);
    if (top.length > 0) {
      sections.push(`  Top ${top.length} Most Expensive Predicates:`);
      top.forEach((pred, idx) => {
        const sizeStr = pred.resultSize !== void 0 ? `, ${pred.resultSize} results` : "";
        sections.push(
          `    ${idx + 1}. ${pred.predicateName} (${pred.durationMs.toFixed(2)} ms${sizeStr})`
        );
      });
    }
  }
  return sections.join("\n");
}
function registerProfileCodeQLQueryFromLogsTool(server) {
  server.tool(
    "profile_codeql_query_from_logs",
    "Parse CodeQL query evaluation logs into a performance profile without re-running the query. Works with logs from codeql query run, codeql database analyze, or vscode-codeql query history.",
    {
      evaluatorLog: z17.string().describe(
        "Path to evaluator-log.jsonl or evaluator-log.summary.jsonl"
      ),
      outputDir: z17.string().optional().describe(
        "Directory to write profile output files (defaults to same directory as log)"
      ),
      topN: z17.number().optional().describe(
        "Number of most expensive predicates to highlight (default: 20)"
      )
    },
    async (params) => {
      try {
        const { evaluatorLog, outputDir, topN } = params;
        const effectiveTopN = topN ?? 20;
        if (!existsSync9(evaluatorLog)) {
          return {
            content: [
              {
                type: "text",
                text: `Evaluator log not found at: ${evaluatorLog}`
              }
            ],
            isError: true
          };
        }
        logger.info(`Parsing evaluator log from: ${evaluatorLog}`);
        const profile = parseEvaluatorLog(evaluatorLog);
        const profileOutputDir = outputDir ?? dirname6(evaluatorLog);
        mkdirSync6(profileOutputDir, { recursive: true });
        const jsonPath = join10(
          profileOutputDir,
          "query-evaluation-profile.json"
        );
        writeFileSync3(jsonPath, formatAsJson(profile));
        logger.info(`Profile JSON written to: ${jsonPath}`);
        const mdPath = join10(
          profileOutputDir,
          "query-evaluation-profile.md"
        );
        writeFileSync3(mdPath, formatAsMermaid(profile, effectiveTopN));
        logger.info(`Profile Mermaid diagram written to: ${mdPath}`);
        const outputFilesList = [
          `Profile JSON: ${jsonPath}`,
          `Profile Mermaid: ${mdPath}`,
          `Evaluator Log: ${evaluatorLog}`
        ];
        const responseText = buildTextSummary(
          profile,
          effectiveTopN,
          outputFilesList
        );
        return {
          content: [{ type: "text", text: responseText }]
        };
      } catch (error) {
        logger.error(
          "Error profiling CodeQL query from logs:",
          error
        );
        return {
          content: [
            {
              type: "text",
              text: `Failed to profile query from logs: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/profile-codeql-query.ts
init_cli_executor();
init_logger();
import { z as z18 } from "zod";
import { writeFileSync as writeFileSync4, readFileSync as readFileSync8, existsSync as existsSync10 } from "fs";
import { join as join11, dirname as dirname7, basename as basename5 } from "path";
import { mkdirSync as mkdirSync7 } from "fs";
function parseEvaluatorLog2(logPath) {
  const logContent = readFileSync8(logPath, "utf-8");
  const jsonObjects = logContent.split("\n\n").filter((s) => s.trim());
  const events = jsonObjects.map((obj) => {
    try {
      return JSON.parse(obj);
    } catch (_error) {
      logger.warn(`Failed to parse evaluator log object: ${obj.substring(0, 100)}...`);
      return null;
    }
  }).filter((event) => event !== null);
  const pipelineMap = /* @__PURE__ */ new Map();
  const predicateNameToEventId = /* @__PURE__ */ new Map();
  let queryName = "";
  let queryStartTime = 0;
  let queryEndTime = 0;
  for (const event of events) {
    switch (event.type) {
      case "QUERY_STARTED":
        queryName = event.queryName || "";
        queryStartTime = event.nanoTime;
        break;
      case "QUERY_COMPLETED":
        queryEndTime = event.nanoTime;
        break;
      case "PREDICATE_STARTED": {
        const predicateName = event.predicateName;
        const position = event.position;
        const predicateType = event.predicateType;
        const dependencies = event.dependencies;
        predicateNameToEventId.set(predicateName, event.eventId);
        const dependencyEventIds = [];
        const dependencyNames = [];
        if (dependencies) {
          for (const depName of Object.keys(dependencies)) {
            dependencyNames.push(depName);
            const depEventId = predicateNameToEventId.get(depName);
            if (depEventId !== void 0) {
              dependencyEventIds.push(depEventId);
            }
          }
        }
        pipelineMap.set(event.eventId, {
          eventId: event.eventId,
          name: predicateName,
          position,
          type: predicateType,
          startTime: event.nanoTime,
          dependencies: dependencyNames,
          dependencyEventIds
        });
        break;
      }
      case "PREDICATE_COMPLETED": {
        const startEventId = event.startEvent;
        const pipelineInfo = pipelineMap.get(startEventId);
        if (pipelineInfo) {
          const startEvent = events.find((e) => e.eventId === startEventId);
          if (startEvent) {
            const duration = (event.nanoTime - startEvent.nanoTime) / 1e6;
            pipelineInfo.endTime = event.nanoTime;
            pipelineInfo.duration = duration;
            pipelineInfo.resultSize = event.resultSize;
            pipelineInfo.tupleCount = event.tupleCount;
          }
        }
        break;
      }
    }
  }
  const pipelines = Array.from(pipelineMap.values()).filter((p) => p.duration !== void 0).sort((a, b) => a.eventId - b.eventId);
  const totalDuration = queryEndTime > 0 ? (queryEndTime - queryStartTime) / 1e6 : 0;
  return {
    queryName,
    totalDuration,
    totalEvents: events.length,
    pipelines
  };
}
function formatAsJson2(profile) {
  return JSON.stringify(profile, null, 2);
}
function formatAsMermaid2(profile) {
  const lines = [];
  lines.push("```mermaid");
  lines.push("graph TD");
  lines.push("");
  lines.push(`  QUERY["${basename5(profile.queryName)}<br/>Total: ${profile.totalDuration.toFixed(2)}ms"]`);
  lines.push("");
  profile.pipelines.forEach((pipeline) => {
    const nodeId = `P${pipeline.eventId}`;
    const duration = pipeline.duration.toFixed(2);
    const resultSize = pipeline.resultSize !== void 0 ? pipeline.resultSize : "?";
    const name = pipeline.name.replace(/[<>]/g, "").substring(0, 40);
    lines.push(`  ${nodeId}["${name}<br/>${duration}ms | ${resultSize} results"]`);
  });
  lines.push("");
  const rootPipelines = profile.pipelines.filter((p) => p.dependencies.length === 0);
  rootPipelines.forEach((pipeline) => {
    lines.push(`  QUERY --> P${pipeline.eventId}`);
  });
  lines.push("");
  profile.pipelines.forEach((pipeline) => {
    pipeline.dependencyEventIds.forEach((depEventId) => {
      const duration = pipeline.duration.toFixed(2);
      lines.push(`  P${depEventId} -->|"${duration}ms"| P${pipeline.eventId}`);
    });
  });
  lines.push("");
  lines.push("  classDef default fill:#e1f5ff,stroke:#333,stroke-width:2px");
  lines.push("  classDef query fill:#ffe1e1,stroke:#333,stroke-width:3px");
  lines.push("  class QUERY query");
  lines.push("```");
  return lines.join("\n");
}
function registerProfileCodeQLQueryTool(server) {
  server.tool(
    "profile_codeql_query",
    "Profile the performance of a CodeQL query run against a specific database by analyzing the evaluator log JSON file",
    {
      query: z18.string().describe("Path to the .ql query file"),
      database: z18.string().describe("Path to the CodeQL database directory"),
      evaluatorLog: z18.string().optional().describe(
        "Path to an existing structured JSON log (e.g., evaluator-log.jsonl) file. If not provided, the tool will run the query to generate one."
      ),
      outputDir: z18.string().optional().describe("Directory to write profiling data files (defaults to same directory as evaluator log)")
    },
    async (params) => {
      try {
        const { query, database, evaluatorLog, outputDir } = params;
        let logPath = evaluatorLog;
        let bqrsPath;
        let sarifPath;
        if (!logPath) {
          logger.info("No evaluator log provided, running query to generate one");
          const defaultOutputDir = outputDir || join11(dirname7(query), "profile-output");
          mkdirSync7(defaultOutputDir, { recursive: true });
          logPath = join11(defaultOutputDir, "evaluator-log.jsonl");
          bqrsPath = join11(defaultOutputDir, "query-results.bqrs");
          sarifPath = join11(defaultOutputDir, "query-results.sarif");
          const queryResult = await executeCodeQLCommand(
            "query run",
            {
              database,
              output: bqrsPath,
              "evaluator-log": logPath,
              "tuple-counting": true,
              "evaluator-log-level": 5
            },
            [query]
          );
          if (!queryResult.success) {
            return {
              content: [
                {
                  type: "text",
                  text: `Failed to run query: ${queryResult.stderr || queryResult.error}`
                }
              ],
              isError: true
            };
          }
          if (existsSync10(bqrsPath)) {
            try {
              const sarifResult = await executeCodeQLCommand(
                "bqrs interpret",
                { format: "sarif-latest", output: sarifPath },
                [bqrsPath]
              );
              if (sarifResult.success) {
                logger.info(`Generated SARIF interpretation at ${sarifPath}`);
              }
            } catch (error) {
              logger.warn(`Failed to generate SARIF interpretation: ${error}`);
            }
          }
        }
        if (!existsSync10(logPath)) {
          return {
            content: [
              {
                type: "text",
                text: `Evaluator log not found at: ${logPath}`
              }
            ],
            isError: true
          };
        }
        logger.info(`Parsing evaluator log from: ${logPath}`);
        const profile = parseEvaluatorLog2(logPath);
        const profileOutputDir = outputDir || dirname7(logPath);
        mkdirSync7(profileOutputDir, { recursive: true });
        const jsonPath = join11(profileOutputDir, "query-evaluation-profile.json");
        const jsonContent = formatAsJson2(profile);
        writeFileSync4(jsonPath, jsonContent);
        logger.info(`Profile JSON written to: ${jsonPath}`);
        const mdPath = join11(profileOutputDir, "query-evaluation-profile.md");
        const mdContent = formatAsMermaid2(profile);
        writeFileSync4(mdPath, mdContent);
        logger.info(`Profile Mermaid diagram written to: ${mdPath}`);
        const outputFiles = [
          `Profile JSON: ${jsonPath}`,
          `Profile Mermaid: ${mdPath}`,
          `Evaluator Log: ${logPath}`
        ];
        if (bqrsPath) {
          outputFiles.push(`Query Results (BQRS): ${bqrsPath}`);
        }
        if (sarifPath && existsSync10(sarifPath)) {
          outputFiles.push(`Query Results (SARIF): ${sarifPath}`);
        }
        const responseText = [
          "Query profiling completed successfully!",
          "",
          "Output Files:",
          ...outputFiles.map((f) => `  - ${f}`),
          "",
          "Profile Summary:",
          `  - Query: ${basename5(profile.queryName)}`,
          `  - Total Duration: ${profile.totalDuration.toFixed(2)} ms`,
          `  - Total Pipelines: ${profile.pipelines.length}`,
          `  - Total Events: ${profile.totalEvents}`,
          "",
          "First 5 Pipeline Nodes (in evaluation order):",
          ...profile.pipelines.slice(0, 5).map((p, idx) => {
            return `  ${idx + 1}. ${p.name} (${p.duration.toFixed(2)} ms, ${p.resultSize || "?"} results)`;
          })
        ].join("\n");
        return {
          content: [
            {
              type: "text",
              text: responseText
            }
          ]
        };
      } catch (error) {
        logger.error("Error profiling CodeQL query:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to profile query: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/query-compile.ts
import { z as z19 } from "zod";
var codeqlQueryCompileTool = {
  name: "codeql_query_compile",
  description: "Compile and validate CodeQL queries",
  command: "codeql",
  subcommand: "query compile",
  inputSchema: {
    query: z19.string().describe("Path to the CodeQL query file (.ql)"),
    database: z19.string().optional().describe("Path to the CodeQL database"),
    library: z19.string().optional().describe("Path to query library"),
    output: z19.string().optional().describe("Output file path"),
    warnings: z19.enum(["hide", "show", "error"]).optional().describe("How to handle compilation warnings"),
    verbose: z19.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z19.array(z19.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql query compile --database=/path/to/db MyQuery.ql",
    "codeql query compile --library=/path/to/lib --output=compiled.qlo MyQuery.ql"
  ]
};

// src/tools/codeql/query-format.ts
import { z as z20 } from "zod";
function formatResultProcessor(result, params) {
  const isCheckOnly = params["check-only"];
  const hasFormatChanges = result.exitCode === 1;
  if (isCheckOnly && hasFormatChanges) {
    result.success = true;
    return result.stdout || result.stderr || "File would change by autoformatting.";
  }
  return defaultCLIResultProcessor(result, params);
}
var codeqlQueryFormatTool = {
  name: "codeql_query_format",
  description: "Automatically format CodeQL source code files",
  command: "codeql",
  subcommand: "query format",
  inputSchema: {
    files: z20.array(z20.string()).describe("One or more .ql or .qll source files to format"),
    output: z20.string().optional().describe("Write formatted code to this file instead of stdout"),
    "in-place": z20.boolean().optional().describe("Overwrite each input file with formatted version"),
    "check-only": z20.boolean().optional().describe("Check formatting without writing output"),
    backup: z20.string().optional().describe("Backup extension when overwriting existing files"),
    "no-syntax-errors": z20.boolean().optional().describe("Ignore syntax errors and pretend file is formatted"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql query format -i -- ExampleQuery.ql",
    "codeql query format --in-place -- queries/*.ql",
    "codeql query format --check-only -- queries/*.ql"
  ],
  resultProcessor: formatResultProcessor
};

// src/tools/codeql/query-run.ts
import { z as z21 } from "zod";
var codeqlQueryRunTool = {
  name: "codeql_query_run",
  description: 'Execute a CodeQL query against a database. Use either "query" parameter for direct file path OR "queryName" + "queryLanguage" for pre-defined tool queries. Produces evaluator logs and BQRS results in a log directory. Use list_codeql_databases to discover databases, list_query_run_results to find previous results, and codeql_bqrs_decode to inspect BQRS output.',
  command: "codeql",
  subcommand: "query run",
  inputSchema: {
    query: z21.string().optional().describe("Path to the CodeQL query file (.ql) - cannot be used with queryName"),
    queryName: z21.string().optional().describe('Name of pre-defined query to run (e.g., "PrintAST", "CallGraphFrom", "CallGraphTo") - requires queryLanguage'),
    queryLanguage: z21.string().optional().describe('Programming language for tools queries (e.g., "javascript", "java", "python") - required when using queryName'),
    queryPack: z21.string().optional().describe("Query pack path (defaults to server/ql/<language>/tools/src/ for tool queries)"),
    sourceFiles: z21.string().optional().describe('Comma-separated list of source file paths for PrintAST queries (e.g., "src/main.js,src/utils.js" or just "main.js")'),
    sourceFunction: z21.string().optional().describe('Comma-separated list of source function names for CallGraphFrom queries (e.g., "main,processData")'),
    targetFunction: z21.string().optional().describe('Comma-separated list of target function names for CallGraphTo queries (e.g., "helper,validateInput")'),
    database: createCodeQLSchemas.database(),
    output: createCodeQLSchemas.output(),
    external: z21.array(z21.string()).optional().describe("External predicate data: predicate=file.csv"),
    timeout: createCodeQLSchemas.timeout(),
    logDir: z21.string().optional().describe("Custom directory for query execution logs (overrides CODEQL_QUERY_LOG_DIR environment variable). If not provided, uses CODEQL_QUERY_LOG_DIR or defaults to .tmp/query-logs/<unique-id>"),
    "evaluator-log": z21.string().optional().describe("Path to save evaluator log (deprecated: use logDir instead)"),
    "evaluator-log-minify": z21.boolean().optional().describe("Minimize evaluator log for smaller size"),
    "evaluator-log-level": z21.number().min(1).max(5).optional().describe("Evaluator log verbosity level (1-5, default 5)"),
    "tuple-counting": z21.boolean().optional().describe("Display tuple counts for each evaluation step in evaluator logs"),
    format: z21.enum(["sarif-latest", "sarifv2.1.0", "csv", "graphtext", "dgml", "dot"]).optional().describe("Output format for query results via codeql bqrs interpret. Defaults to sarif-latest for @kind problem/path-problem queries, graphtext for @kind graph queries. Graph formats (graphtext, dgml, dot) only work with @kind graph queries."),
    interpretedOutput: z21.string().optional().describe("Output file for interpreted results (e.g., results.sarif, results.txt). If not provided, defaults based on format: .sarif for SARIF, .txt for graphtext/csv, .dgml for dgml, .dot for dot"),
    evaluationFunction: z21.string().optional().describe('[DEPRECATED - use format parameter instead] Built-in function for query results evaluation (e.g., "mermaid-graph", "json-decode", "csv-decode") or path to custom evaluation script'),
    evaluationOutput: z21.string().optional().describe("[DEPRECATED - use interpretedOutput parameter instead] Output file for evaluation results"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql query run --database=mydb --output=results.bqrs MyQuery.ql",
    "codeql query run --database=mydb --query-name=PrintAST --query-language=javascript --source-files=src/index.js --output=results.bqrs --format=graphtext --interpreted-output=results.txt",
    "codeql query run --database=mydb --external=data=input.csv --output=results.bqrs MyQuery.ql --format=sarif-latest --interpreted-output=results.sarif",
    "codeql query run --database=mydb --evaluator-log=eval.log --tuple-counting --evaluator-log-level=5 --output=results.bqrs MyQuery.ql",
    'codeql query run --database=mydb --query-name=PrintAST --query-language=javascript --source-files="main.js,utils.js" --format=graphtext',
    "codeql query run --database=mydb --log-dir=/custom/log/path --tuple-counting --output=results.bqrs MyQuery.ql"
  ]
};

// src/tools/codeql/quick-evaluate.ts
import { z as z22 } from "zod";
import { join as join12, resolve as resolve6 } from "path";
init_logger();
init_temp_dir();
async function quickEvaluate({
  file,
  db: _db,
  symbol,
  output_path
}) {
  try {
    try {
      await findClassPosition(file, symbol);
    } catch {
      try {
        await findPredicatePosition(file, symbol);
      } catch {
        throw new Error(`Symbol '${symbol}' not found as class or predicate in file: ${file}`);
      }
    }
    const resolvedOutput = resolve6(output_path || join12(getProjectTmpDir("quickeval"), "quickeval.bqrs"));
    return resolvedOutput;
  } catch (error) {
    throw new Error(`CodeQL evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`, { cause: error });
  }
}
function registerQuickEvaluateTool(server) {
  server.tool(
    "quick_evaluate",
    "Quick evaluate either a class or a predicate in a CodeQL query for debugging",
    {
      file: z22.string().describe("Path to the .ql file containing the symbol"),
      db: z22.string().describe("Path to the CodeQL database"),
      symbol: z22.string().describe("Name of the class or predicate to evaluate"),
      output_path: z22.string().optional().describe("Output path for results (defaults to project-local .tmp/quickeval/)")
    },
    async ({ file, db, symbol, output_path }) => {
      try {
        const result = await quickEvaluate({ file, db, symbol, output_path });
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        logger.error("Error in quick evaluate:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/read-database-source.ts
var import_adm_zip = __toESM(require_adm_zip(), 1);
init_logger();
import { existsSync as existsSync11, readdirSync as readdirSync5, readFileSync as readFileSync9, statSync as statSync5 } from "fs";
import { join as join13, resolve as resolve7 } from "path";
import { z as z23 } from "zod";
function stripFileScheme(uri) {
  if (uri.startsWith("file:///")) {
    return uri.slice("file://".length);
  }
  if (uri.startsWith("file://")) {
    return uri.slice("file://".length);
  }
  return uri;
}
function* walkDirectory(dir, base = dir) {
  for (const entry of readdirSync5(dir)) {
    const fullPath = join13(dir, entry);
    if (statSync5(fullPath).isDirectory()) {
      yield* walkDirectory(fullPath, base);
    } else {
      yield fullPath.slice(base.length).replace(/\\/g, "/").replace(/^\//, "");
    }
  }
}
function resolveEntryPath(requested, available) {
  const normalised = stripFileScheme(requested).replace(/\\/g, "/");
  const withoutLeading = normalised.replace(/^\//, "");
  for (const entry of available) {
    const entryNorm = entry.replace(/^\//, "");
    if (entryNorm === withoutLeading) {
      return entry;
    }
  }
  const lower = withoutLeading.toLowerCase();
  for (const entry of available) {
    if (entry.replace(/^\//, "").toLowerCase() === lower) {
      return entry;
    }
  }
  for (const entry of available) {
    const entryNorm = entry.replace(/^\//, "");
    if (entryNorm.endsWith(withoutLeading) || withoutLeading.endsWith(entryNorm)) {
      return entry;
    }
  }
  return void 0;
}
function applyLineRange(content, startLine, endLine) {
  const lines = content.split("\n");
  const totalLines = lines.length;
  const effectiveStart = Math.max(1, startLine ?? 1);
  const effectiveEnd = Math.min(totalLines, endLine ?? totalLines);
  const sliced = lines.slice(effectiveStart - 1, effectiveEnd).join("\n");
  return { content: sliced, effectiveEnd, effectiveStart, totalLines };
}
async function readDatabaseSource(params) {
  const { databasePath, endLine, filePath, startLine } = params;
  const resolvedDbPath = resolve7(databasePath);
  if (!existsSync11(resolvedDbPath)) {
    throw new Error(`Database path does not exist: ${databasePath}`);
  }
  const srcZipPath = join13(resolvedDbPath, "src.zip");
  const srcDirPath = join13(resolvedDbPath, "src");
  const hasSrcZip = existsSync11(srcZipPath);
  const hasSrcDir = existsSync11(srcDirPath);
  if (!hasSrcZip && !hasSrcDir) {
    throw new Error(
      `No source archive found in database: expected src.zip or src/ in ${databasePath}`
    );
  }
  const sourceType = hasSrcZip ? "src.zip" : "src/";
  if (!filePath) {
    if (hasSrcZip) {
      const zip = new import_adm_zip.default(srcZipPath);
      const entries = zip.getEntries().filter((e) => !e.isDirectory).map((e) => e.entryName).sort();
      return { entries, sourceType, totalEntries: entries.length };
    } else {
      const entries = [...walkDirectory(srcDirPath)].sort();
      return { entries, sourceType, totalEntries: entries.length };
    }
  }
  if (hasSrcZip) {
    const zip = new import_adm_zip.default(srcZipPath);
    const availableEntries = zip.getEntries().filter((e) => !e.isDirectory).map((e) => e.entryName);
    const matchedEntry = resolveEntryPath(filePath, availableEntries);
    if (!matchedEntry) {
      throw new Error(
        `File not found in src.zip: ${filePath}
Archive contains ${availableEntries.length} entries. Use read_database_source without filePath to list available entries.`
      );
    }
    const entry = zip.getEntry(matchedEntry);
    if (!entry) {
      throw new Error(`Failed to read entry from src.zip: ${matchedEntry}`);
    }
    const rawContent = entry.getData().toString("utf-8");
    const { content, effectiveEnd, effectiveStart, totalLines } = applyLineRange(
      rawContent,
      startLine,
      endLine
    );
    return {
      content,
      endLine: effectiveEnd,
      entryPath: matchedEntry,
      sourceType,
      startLine: effectiveStart,
      totalLines
    };
  } else {
    const availableEntries = [...walkDirectory(srcDirPath)];
    const matchedRelative = resolveEntryPath(filePath, availableEntries);
    if (!matchedRelative) {
      throw new Error(
        `File not found in src/: ${filePath}
Directory contains ${availableEntries.length} entries. Use read_database_source without filePath to list available entries.`
      );
    }
    const fullPath = join13(srcDirPath, matchedRelative);
    const rawContent = readFileSync9(fullPath, "utf-8");
    const { content, effectiveEnd, effectiveStart, totalLines } = applyLineRange(
      rawContent,
      startLine,
      endLine
    );
    return {
      content,
      endLine: effectiveEnd,
      entryPath: matchedRelative,
      sourceType,
      startLine: effectiveStart,
      totalLines
    };
  }
}
function registerReadDatabaseSourceTool(server) {
  server.tool(
    "read_database_source",
    "Read source file contents from a CodeQL database source archive (src.zip) or source directory (src/). Use this to explore code at alert locations discovered via codeql_bqrs_interpret SARIF output. Omit filePath to list all files in the archive. Accepts raw file paths, file:// URIs (as found in SARIF physicalLocation.artifactLocation.uri), or paths relative to the archive root. Use startLine/endLine to return only the relevant portion of large files.",
    {
      databasePath: z23.string().describe("Path to the CodeQL database directory"),
      endLine: z23.number().int().positive().optional().describe("Last line to return (1-based, inclusive). Defaults to end of file."),
      filePath: z23.string().optional().describe(
        "Path of the source file to read. Accepts a raw path, a file:// URI from SARIF, or a path relative to the archive root. Omit to list all files in the archive."
      ),
      startLine: z23.number().int().positive().optional().describe("First line to return (1-based, inclusive). Defaults to 1.")
    },
    async ({ databasePath, endLine, filePath, startLine }) => {
      try {
        const result = await readDatabaseSource({ databasePath, endLine, filePath, startLine });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error("Error reading database source:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/register-database.ts
init_logger();
import { z as z24 } from "zod";
import { access, constants } from "fs/promises";
import { resolve as resolve8 } from "path";
async function registerDatabase(dbPath) {
  try {
    const resolvedPath = resolve8(dbPath);
    await access(resolvedPath, constants.F_OK);
    const dbYmlPath = resolve8(resolvedPath, "codeql-database.yml");
    await access(dbYmlPath, constants.F_OK);
    const srcZipPath = resolve8(resolvedPath, "src.zip");
    const srcDirPath = resolve8(resolvedPath, "src");
    let hasSrcZip = false;
    let hasSrcDir = false;
    try {
      await access(srcZipPath, constants.F_OK);
      hasSrcZip = true;
    } catch {
    }
    if (!hasSrcZip) {
      try {
        await access(srcDirPath, constants.F_OK);
        hasSrcDir = true;
      } catch {
      }
    }
    if (!hasSrcZip && !hasSrcDir) {
      throw new Error(`Missing required source archive (src.zip) or source directory (src/) in: ${dbPath}`);
    }
    const sourceType = hasSrcZip ? "src.zip" : "src/";
    return `Database registered: ${dbPath} (source: ${sourceType})`;
  } catch (error) {
    if (error instanceof Error) {
      const errorCode = error.code;
      if (errorCode === "ENOENT") {
        if (error.message.includes("codeql-database.yml")) {
          throw new Error(`Missing required codeql-database.yml in: ${dbPath}`, { cause: error });
        }
        throw new Error(`Database path does not exist: ${dbPath}`, { cause: error });
      }
      if (errorCode === "EACCES") {
        throw new Error(`Database path does not exist: ${dbPath}`, { cause: error });
      }
    }
    throw new Error(`Failed to register database: ${error instanceof Error ? error.message : "Unknown error"}`, { cause: error });
  }
}
function registerRegisterDatabaseTool(server) {
  server.tool(
    "register_database",
    "Register a CodeQL database given a local path to the database directory",
    {
      db_path: z24.string().describe("Path to the CodeQL database directory")
    },
    async ({ db_path }) => {
      try {
        const result = await registerDatabase(db_path);
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        logger.error("Error registering database:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/codeql/resolve-database.ts
import { z as z25 } from "zod";
var codeqlResolveDatabaseTool = {
  name: "codeql_resolve_database",
  description: "Resolve database path and validate database structure",
  command: "codeql",
  subcommand: "resolve database",
  inputSchema: {
    database: z25.string().describe("Database path to resolve"),
    format: z25.enum(["text", "json", "betterjson"]).optional().describe("Output format for database information"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql resolve database -- /path/to/database",
    "codeql resolve database --format=json -- my-database",
    "codeql resolve database --format=betterjson -- database-dir"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/resolve-languages.ts
import { z as z26 } from "zod";
var codeqlResolveLanguagesTool = {
  name: "codeql_resolve_languages",
  description: "List installed CodeQL extractor packs",
  command: "codeql",
  subcommand: "resolve languages",
  inputSchema: {
    format: z26.enum(["text", "json", "betterjson"]).optional().describe("Output format for language information"),
    verbose: z26.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z26.array(z26.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql resolve languages --format=text",
    "codeql resolve languages --format=json",
    "codeql resolve languages --format=betterjson"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/resolve-library-path.ts
import { z as z27 } from "zod";
var codeqlResolveLibraryPathTool = {
  name: "codeql_resolve_library-path",
  description: "Resolve library path for CodeQL queries and libraries",
  command: "codeql",
  subcommand: "resolve library-path",
  inputSchema: {
    language: z27.string().optional().describe("Programming language to resolve library path for"),
    format: z27.enum(["text", "json", "betterjson"]).optional().describe("Output format for library path information"),
    verbose: z27.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z27.array(z27.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql resolve library-path --language=java",
    "codeql resolve library-path --format=json --language=python",
    "codeql resolve library-path --format=betterjson"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/resolve-metadata.ts
import { z as z28 } from "zod";
var codeqlResolveMetadataTool = {
  name: "codeql_resolve_metadata",
  description: "Resolve and return the key-value metadata pairs from a CodeQL query source file.",
  command: "codeql",
  subcommand: "resolve metadata",
  inputSchema: {
    query: z28.string().describe("Query file to resolve metadata for"),
    format: z28.enum(["json"]).optional().describe("Output format for metadata information (always JSON, optional for future compatibility)"),
    verbose: z28.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z28.array(z28.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql resolve metadata -- relative-path/2/MyQuery.ql",
    "codeql resolve metadata --format=json -- /absolute-plus/relative-path/2/MyQuery.ql"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/resolve-qlref.ts
import { z as z29 } from "zod";
var codeqlResolveQlrefTool = {
  name: "codeql_resolve_qlref",
  description: "Resolve qlref files to their corresponding query files",
  command: "codeql",
  subcommand: "resolve qlref",
  inputSchema: {
    qlref: z29.string().describe("Path to the .qlref file to resolve"),
    format: z29.enum(["text", "json", "betterjson"]).optional().describe("Output format for qlref resolution"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql resolve qlref -- test/MyQuery.qlref",
    "codeql resolve qlref --format=json -- test/MyQuery.qlref",
    "codeql resolve qlref --format=betterjson -- test/MyQuery.qlref"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/resolve-queries.ts
import { z as z30 } from "zod";
var jsonOnlyResultProcessor = (result, params) => {
  if (!result.success) {
    return `Command failed (exit code ${result.exitCode || "unknown"}):
${result.error || result.stderr}`;
  }
  if (params.format === "json" || params.format === "betterjson" || params.format === "bylanguage") {
    return result.stdout || "[]";
  }
  let output = "";
  if (result.stdout) {
    output += result.stdout;
  }
  if (result.stderr) {
    if (output) {
      output += "\n\nWarnings/Info:\n";
    }
    output += result.stderr;
  }
  if (!output) {
    output = "Command executed successfully (no output)";
  }
  return output;
};
var codeqlResolveQueriesTool = {
  name: "codeql_resolve_queries",
  description: "List available CodeQL queries found on the local filesystem",
  command: "codeql",
  subcommand: "resolve queries",
  inputSchema: {
    directory: z30.string().optional().describe("Directory to search for queries"),
    language: z30.string().optional().describe("Filter queries by programming language"),
    format: z30.enum(["text", "json", "betterjson", "bylanguage"]).optional().describe("Output format for query list"),
    "additional-packs": z30.union([z30.string(), z30.array(z30.string())]).optional().describe("Additional pack directories to search for CodeQL packs"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql resolve queries",
    "codeql resolve queries --language=java --format=json",
    "codeql resolve queries --format=betterjson -- /path/to/queries",
    "codeql resolve queries --additional-packs=/path/to/packs codeql/java-queries"
  ],
  resultProcessor: jsonOnlyResultProcessor
};

// src/tools/codeql/resolve-tests.ts
import { z as z31 } from "zod";
var codeqlResolveTestsTool = {
  name: "codeql_resolve_tests",
  description: "Resolve the local filesystem paths of unit tests and/or queries under some base directory",
  command: "codeql",
  subcommand: "resolve tests",
  inputSchema: {
    tests: z31.array(z31.string()).optional().describe("One or more tests (.ql, .qlref files, or test directories)"),
    format: z31.enum(["text", "json"]).optional().describe("Output format for test list"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql resolve tests",
    "codeql resolve tests --format=json -- test-directory",
    "codeql resolve tests --format=json -- test1.ql test2.ql"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/test-accept.ts
import { z as z32 } from "zod";
var codeqlTestAcceptTool = {
  name: "codeql_test_accept",
  description: "Accept new test results as the expected baseline",
  command: "codeql",
  subcommand: "test accept",
  inputSchema: {
    tests: z32.array(z32.string()).describe("One or more tests (.ql, .qlref files, or test directories)"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql test accept -- languages/java/test/MyQuery/MyQuery.qlref",
    "codeql test accept -- languages/java/test/MyQuery/",
    "codeql test accept -- languages/java/src/MyQuery/MyQuery.ql"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/test-extract.ts
import { z as z33 } from "zod";
var codeqlTestExtractTool = {
  name: "codeql_test_extract",
  description: "Extract test databases for CodeQL query tests",
  command: "codeql",
  subcommand: "test extract",
  inputSchema: {
    tests: z33.array(z33.string()).describe("One or more test directories or files"),
    language: z33.string().optional().describe("Programming language for extraction"),
    threads: createCodeQLSchemas.threads(),
    ram: createCodeQLSchemas.ram(),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql test extract -- languages/java/test/MyQuery/",
    "codeql test extract --language=java --threads=4 -- test-directory",
    "codeql test extract --threads=2 --ram=2048 -- multiple/test/directories"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/test-run.ts
import { z as z34 } from "zod";
var codeqlTestRunTool = {
  name: "codeql_test_run",
  description: "Run CodeQL query tests",
  command: "codeql",
  subcommand: "test run",
  inputSchema: {
    tests: z34.array(z34.string()).describe("One or more tests (.ql, .qlref files, or test directories)"),
    "show-extractor-output": z34.boolean().optional().describe("Show output from extractors during test execution"),
    "keep-databases": z34.boolean().optional().describe("Keep test databases after running tests"),
    "learn": z34.boolean().optional().describe("Accept current output as expected for failing tests"),
    logDir: z34.string().optional().describe("Custom directory for test execution logs (overrides CODEQL_QUERY_LOG_DIR environment variable). If not provided, uses CODEQL_QUERY_LOG_DIR or defaults to .tmp/query-logs/<unique-id>"),
    threads: createCodeQLSchemas.threads(),
    ram: createCodeQLSchemas.ram(),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql test run /path/to/tests",
    "codeql test run --learn /path/to/failing/tests",
    "codeql test run --threads=4 --keep-databases /path/to/tests",
    "codeql test run --log-dir=/custom/log/path /path/to/tests"
  ]
};

// src/tools/codeql-tools.ts
import { z as z35 } from "zod";

// src/lib/validation.ts
function validateCodeQLSyntax(query, _language) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };
  if (!query.trim()) {
    validation.isValid = false;
    validation.errors.push("Query cannot be empty");
    return validation;
  }
  if (!query.includes("from") && !query.includes("select")) {
    validation.warnings.push('Query should typically include "from" and "select" clauses');
  }
  if (!query.includes("@name") && !query.includes("@description")) {
    validation.suggestions.push("Consider adding @name and @description metadata");
  }
  return validation;
}

// src/lib/query-scaffolding.ts
import * as fs2 from "fs";
import * as path2 from "path";
function getLanguageExtension2(language) {
  const extensions = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    csharp: "cs",
    cpp: "cpp",
    go: "go",
    ruby: "rb",
    actions: "yml"
  };
  return extensions[language.toLowerCase()] || "txt";
}
function generateQueryTemplate(queryName, language, description, queryId) {
  const desc = description || `${queryName} query`;
  const id = queryId || `${language}/example/${queryName.toLowerCase()}`;
  return `/**
 * @id ${id}
 * @name ${queryName}
 * @description ${desc}
 * @kind problem
 * @precision medium
 * @problem.severity warning
 */

import ${language}

// TODO: Implement query logic
from File f
where f.getBaseName() = "${queryName}.${getLanguageExtension2(language)}"
select f, "TODO: Add query logic"
`;
}
function createCodeQLQuery(options) {
  const { basePath, queryName, language, description, queryId } = options;
  const absoluteBasePath = path2.resolve(basePath);
  const srcDir = path2.join(absoluteBasePath, "src", queryName);
  const testDir = path2.join(absoluteBasePath, "test", queryName);
  const queryPath = path2.join(srcDir, `${queryName}.ql`);
  const qlrefPath = path2.join(testDir, `${queryName}.qlref`);
  const testCodePath = path2.join(testDir, `${queryName}.${getLanguageExtension2(language)}`);
  const filesCreated = [];
  try {
    fs2.mkdirSync(srcDir, { recursive: true });
    fs2.mkdirSync(testDir, { recursive: true });
    try {
      const queryContent = generateQueryTemplate(queryName, language, description, queryId);
      fs2.writeFileSync(queryPath, queryContent, { encoding: "utf8", flag: "wx" });
      filesCreated.push(queryPath);
    } catch (e) {
      const err = e;
      if (err.code !== "EEXIST") throw e;
    }
    try {
      const qlrefContent = `${queryName}/${queryName}.ql
`;
      fs2.writeFileSync(qlrefPath, qlrefContent, { encoding: "utf8", flag: "wx" });
      filesCreated.push(qlrefPath);
    } catch (e) {
      const err = e;
      if (err.code !== "EEXIST") throw e;
    }
    try {
      const testCodeContent = `// Test code for ${queryName}
// TODO: Add test cases
`;
      fs2.writeFileSync(testCodePath, testCodeContent, { encoding: "utf8", flag: "wx" });
      filesCreated.push(testCodePath);
    } catch (e) {
      const err = e;
      if (err.code !== "EEXIST") throw e;
    }
    return {
      queryPath,
      testPath: testDir,
      qlrefPath,
      testCodePath,
      filesCreated
    };
  } catch (error) {
    throw new Error(`Failed to create query scaffolding: ${error instanceof Error ? error.message : "Unknown error"}`, { cause: error });
  }
}

// src/tools/codeql-tools.ts
init_logger();
function registerCodeQLTools(server) {
  server.tool(
    "validate_codeql_query",
    "Quick heuristic validation for CodeQL query structure - checks for common patterns like from/where/select clauses and metadata presence. Does NOT compile the query. For authoritative validation with actual compilation, use codeql_lsp_diagnostics instead.",
    {
      query: z35.string().describe("The CodeQL query to validate"),
      language: z35.string().optional().describe("Target programming language")
    },
    async ({ query, language }) => {
      try {
        const validation = validateCodeQLSyntax(query, language);
        return {
          content: [{ type: "text", text: JSON.stringify(validation, null, 2) }]
        };
      } catch (error) {
        logger.error("Error validating CodeQL query:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  server.tool(
    "create_codeql_query",
    "Create directory structure and files for a new CodeQL query with tests",
    {
      basePath: z35.string().describe("Base path where src/ and test/ directories will be created"),
      queryName: z35.string().describe("Name of the query (e.g., MySecurityQuery)"),
      language: z35.string().describe("Target programming language (e.g., javascript, python, java)"),
      description: z35.string().optional().describe("Description of what the query does"),
      queryId: z35.string().optional().describe("Custom query ID (defaults to language/example/queryname)")
    },
    async ({ basePath, queryName, language, description, queryId }) => {
      try {
        const result = createCodeQLQuery({
          basePath,
          queryName,
          language,
          description,
          queryId
        });
        const summary = {
          success: true,
          queryPath: result.queryPath,
          testPath: result.testPath,
          qlrefPath: result.qlrefPath,
          testCodePath: result.testCodePath,
          filesCreated: result.filesCreated,
          nextSteps: [
            "Review and customize the generated query in: " + result.queryPath,
            "Add test cases to: " + result.testCodePath,
            "Run codeql_pack_install to install dependencies",
            "Run codeql_test_extract to create test database",
            "Run codeql_test_run to execute tests"
          ]
        };
        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }]
        };
      } catch (error) {
        logger.error("Error creating CodeQL query:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  registerCLITool(server, codeqlBqrsDecodeTool);
  registerCLITool(server, codeqlBqrsInfoTool);
  registerCLITool(server, codeqlBqrsInterpretTool);
  registerCLITool(server, codeqlDatabaseAnalyzeTool);
  registerCLITool(server, codeqlDatabaseCreateTool);
  registerCLITool(server, codeqlGenerateLogSummaryTool);
  registerCLITool(server, codeqlGenerateQueryHelpTool);
  registerCLITool(server, codeqlPackInstallTool);
  registerCLITool(server, codeqlPackLsTool);
  registerCLITool(server, codeqlQueryCompileTool);
  registerCLITool(server, codeqlQueryFormatTool);
  registerCLITool(server, codeqlQueryRunTool);
  registerCLITool(server, codeqlResolveDatabaseTool);
  registerCLITool(server, codeqlResolveLanguagesTool);
  registerCLITool(server, codeqlResolveLibraryPathTool);
  registerCLITool(server, codeqlResolveMetadataTool);
  registerCLITool(server, codeqlResolveQlrefTool);
  registerCLITool(server, codeqlResolveQueriesTool);
  registerCLITool(server, codeqlResolveTestsTool);
  registerCLITool(server, codeqlTestAcceptTool);
  registerCLITool(server, codeqlTestExtractTool);
  registerCLITool(server, codeqlTestRunTool);
  registerFindClassPositionTool(server);
  registerFindCodeQLQueryFilesTool(server);
  registerFindPredicatePositionTool(server);
  registerListDatabasesTool(server);
  registerListMrvaRunResultsTool(server);
  registerListQueryRunResultsTool(server);
  registerProfileCodeQLQueryFromLogsTool(server);
  registerProfileCodeQLQueryTool(server);
  registerQuickEvaluateTool(server);
  registerReadDatabaseSourceTool(server);
  registerRegisterDatabaseTool(server);
}

// src/lib/resources.ts
import { readFileSync as readFileSync10 } from "fs";
import { join as join15, dirname as dirname8 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname8(__filename2);
function getGettingStartedGuide() {
  try {
    return readFileSync10(join15(__dirname2, "../resources/getting-started.md"), "utf-8");
  } catch {
    return "Getting started guide not available";
  }
}
function getQueryBasicsGuide() {
  try {
    return readFileSync10(join15(__dirname2, "../resources/query-basics.md"), "utf-8");
  } catch {
    return "Query basics guide not available";
  }
}
function getSecurityTemplates() {
  try {
    return readFileSync10(join15(__dirname2, "../resources/security-templates.md"), "utf-8");
  } catch {
    return "Security templates not available";
  }
}
function getPerformancePatterns() {
  try {
    return readFileSync10(join15(__dirname2, "../resources/performance-patterns.md"), "utf-8");
  } catch {
    return "Performance patterns not available";
  }
}

// src/tools/codeql-resources.ts
function registerCodeQLResources(server) {
  server.resource(
    "CodeQL Getting Started",
    "codeql://learning/getting-started",
    {
      description: "Comprehensive introduction to CodeQL for beginners",
      mimeType: "text/markdown"
    },
    async () => {
      return {
        contents: [
          {
            uri: "codeql://learning/getting-started",
            mimeType: "text/markdown",
            text: getGettingStartedGuide()
          }
        ]
      };
    }
  );
  server.resource(
    "CodeQL Query Basics",
    "codeql://learning/query-basics",
    {
      description: "Learn the fundamentals of writing CodeQL queries",
      mimeType: "text/markdown"
    },
    async () => {
      return {
        contents: [
          {
            uri: "codeql://learning/query-basics",
            mimeType: "text/markdown",
            text: getQueryBasicsGuide()
          }
        ]
      };
    }
  );
  server.resource(
    "CodeQL Security Templates",
    "codeql://templates/security",
    {
      description: "Ready-to-use security query templates",
      mimeType: "text/markdown"
    },
    async () => {
      return {
        contents: [
          {
            uri: "codeql://templates/security",
            mimeType: "text/markdown",
            text: getSecurityTemplates()
          }
        ]
      };
    }
  );
  server.resource(
    "CodeQL Performance Patterns",
    "codeql://patterns/performance",
    {
      description: "Best practices for writing efficient CodeQL queries",
      mimeType: "text/markdown"
    },
    async () => {
      return {
        contents: [
          {
            uri: "codeql://patterns/performance",
            mimeType: "text/markdown",
            text: getPerformancePatterns()
          }
        ]
      };
    }
  );
}

// src/tools/lsp/lsp-diagnostics.ts
init_logger();
init_temp_dir();
import { z as z36 } from "zod";
import { join as join16 } from "path";
import { pathToFileURL as pathToFileURL3 } from "url";

// src/tools/lsp/lsp-server-helper.ts
init_server_manager();
init_logger();
import { isAbsolute as isAbsolute5, resolve as resolve10 } from "path";
import { pathToFileURL as pathToFileURL2 } from "url";
async function getInitializedLanguageServer(opts = {}) {
  const { packageRootDir: pkgRoot, getUserWorkspaceDir: getUserWorkspaceDir2 } = await Promise.resolve().then(() => (init_package_paths(), package_paths_exports));
  const options = opts.serverOptions ?? {};
  const config = {
    checkErrors: "ON_CHANGE",
    loglevel: options.loglevel ?? "WARN",
    searchPath: options.searchPath ?? resolve10(pkgRoot, "ql"),
    synchronous: options.synchronous,
    verbosity: options.verbosity
  };
  const manager = getServerManager();
  const server = await manager.getLanguageServer(config);
  let effectiveUri = opts.workspaceUri;
  if (effectiveUri && !effectiveUri.startsWith("file://")) {
    const absWorkspace = isAbsolute5(effectiveUri) ? effectiveUri : resolve10(getUserWorkspaceDir2(), effectiveUri);
    effectiveUri = pathToFileURL2(absWorkspace).href;
  }
  effectiveUri = effectiveUri ?? pathToFileURL2(resolve10(pkgRoot, "ql")).href;
  await server.initialize(effectiveUri);
  logger.debug(`Language server initialized with workspace: ${effectiveUri}`);
  return server;
}

// src/tools/lsp/lsp-diagnostics.ts
function formatDiagnostics(diagnostics) {
  if (diagnostics.length === 0) {
    return "\u2705 No issues found in QL code";
  }
  const lines = [];
  lines.push(`Found ${diagnostics.length} issue(s):
`);
  diagnostics.forEach((diagnostic, index) => {
    const severityIcon = getSeverityIcon(diagnostic.severity);
    const severityName = getSeverityName(diagnostic.severity);
    const location = `Line ${diagnostic.range.start.line + 1}, Column ${diagnostic.range.start.character + 1}`;
    lines.push(`${index + 1}. ${severityIcon} ${severityName} at ${location}`);
    lines.push(`   ${diagnostic.message}`);
    if (diagnostic.source) {
      lines.push(`   Source: ${diagnostic.source}`);
    }
    if (diagnostic.code) {
      lines.push(`   Code: ${diagnostic.code}`);
    }
    lines.push("");
  });
  return lines.join("\n");
}
function getSeverityIcon(severity) {
  switch (severity) {
    case 1:
      return "\u274C";
    // Error
    case 2:
      return "\u26A0\uFE0F";
    // Warning
    case 3:
      return "\u2139\uFE0F";
    // Information
    case 4:
      return "\u{1F4A1}";
    // Hint
    default:
      return "\u2753";
  }
}
function getSeverityName(severity) {
  switch (severity) {
    case 1:
      return "Error";
    case 2:
      return "Warning";
    case 3:
      return "Information";
    case 4:
      return "Hint";
    default:
      return "Unknown";
  }
}
async function lspDiagnostics({
  qlCode,
  workspaceUri,
  serverOptions = {}
}) {
  try {
    logger.info("Evaluating QL code via Language Server...");
    const languageServer = await getInitializedLanguageServer({
      serverOptions,
      workspaceUri
    });
    const evalUri = pathToFileURL3(join16(getProjectTmpDir("lsp-eval"), `eval_${Date.now()}.ql`)).href;
    const diagnostics = await languageServer.evaluateQL(qlCode, evalUri);
    const summary = {
      errorCount: diagnostics.filter((d) => d.severity === 1).length,
      hintCount: diagnostics.filter((d) => d.severity === 4).length,
      infoCount: diagnostics.filter((d) => d.severity === 3).length,
      warningCount: diagnostics.filter((d) => d.severity === 2).length
    };
    const isValid = summary.errorCount === 0;
    const formattedOutput = formatDiagnostics(diagnostics);
    logger.info(`QL evaluation complete. Valid: ${isValid}, Issues: ${diagnostics.length}`);
    return {
      diagnostics,
      formattedOutput,
      isValid,
      summary
    };
  } catch (error) {
    logger.error("Error evaluating QL code:", error);
    throw new Error(`QL evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`, { cause: error });
  }
}
function registerLspDiagnosticsTool(server) {
  server.tool(
    "codeql_lsp_diagnostics",
    "Authoritative syntax and semantic validation of CodeQL (QL) code via the CodeQL Language Server. Compiles the query and provides real-time diagnostics with precise error locations. Use this for accurate validation; for quick heuristic checks without compilation, use validate_codeql_query instead. Note: inline ql_code is evaluated as a virtual document and cannot resolve pack imports (e.g. `import javascript`). For validating queries with imports, use codeql_query_compile on the actual file instead.",
    {
      log_level: z36.enum(["OFF", "ERROR", "WARN", "INFO", "DEBUG", "TRACE", "ALL"]).optional().describe("Language server log level"),
      ql_code: z36.string().describe("The CodeQL (QL) code to evaluate for syntax and semantic errors"),
      search_path: z36.string().optional().describe("Optional search path for CodeQL libraries"),
      workspace_uri: z36.string().optional().describe("Optional workspace URI for context (defaults to ./ql directory)")
    },
    async ({ ql_code, workspace_uri, search_path, log_level }) => {
      try {
        const serverOptions = {};
        if (search_path) {
          serverOptions.searchPath = search_path;
        }
        if (log_level) {
          serverOptions.loglevel = log_level;
        }
        const result = await lspDiagnostics({
          qlCode: ql_code,
          serverOptions,
          workspaceUri: workspace_uri
        });
        const responseContent = {
          diagnostics: result.diagnostics.map((d) => ({
            code: d.code,
            column: d.range.start.character + 1,
            // Convert to 1-based column numbers
            line: d.range.start.line + 1,
            // Convert to 1-based line numbers
            message: d.message,
            severity: getSeverityName(d.severity),
            source: d.source
          })),
          formattedOutput: result.formattedOutput,
          isValid: result.isValid,
          summary: result.summary
        };
        return {
          content: [
            {
              text: JSON.stringify(responseContent, null, 2),
              type: "text"
            }
          ]
        };
      } catch (error) {
        logger.error("Error in codeql_lsp_diagnostics tool:", error);
        return {
          content: [
            {
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              type: "text"
            }
          ],
          isError: true
        };
      }
    }
  );
}

// src/tools/lsp/lsp-handlers.ts
init_logger();
init_package_paths();
import { readFile as readFile3 } from "fs/promises";
import { isAbsolute as isAbsolute6, resolve as resolve11 } from "path";
import { pathToFileURL as pathToFileURL4 } from "url";
async function getInitializedServer(params) {
  return getInitializedLanguageServer({
    serverOptions: { searchPath: params.searchPath },
    workspaceUri: params.workspaceUri
  });
}
function prepareDocumentPosition(params) {
  const absPath = isAbsolute6(params.filePath) ? params.filePath : resolve11(getUserWorkspaceDir(), params.filePath);
  const docUri = pathToFileURL4(absPath).href;
  return { absPath, docUri };
}
async function openDocumentForPosition(server, params, absPath, docUri) {
  let text;
  if (params.fileContent) {
    text = params.fileContent;
  } else {
    try {
      text = await readFile3(absPath, "utf-8");
    } catch (error) {
      throw new Error(`Cannot read file: ${absPath}: ${error instanceof Error ? error.message : error}`, { cause: error });
    }
  }
  server.openDocument(docUri, text);
  return {
    position: { character: params.character, line: params.line },
    textDocument: { uri: docUri }
  };
}
async function lspCompletion(params) {
  logger.info(`LSP completion at ${params.filePath}:${params.line}:${params.character}`);
  const server = await getInitializedServer(params);
  const { absPath, docUri } = prepareDocumentPosition(params);
  const positionParams = await openDocumentForPosition(server, params, absPath, docUri);
  try {
    return await server.getCompletions(positionParams);
  } finally {
    server.closeDocument(docUri);
  }
}
async function lspDefinition(params) {
  logger.info(`LSP definition at ${params.filePath}:${params.line}:${params.character}`);
  const server = await getInitializedServer(params);
  const { absPath, docUri } = prepareDocumentPosition(params);
  const positionParams = await openDocumentForPosition(server, params, absPath, docUri);
  try {
    return await server.getDefinition(positionParams);
  } finally {
    server.closeDocument(docUri);
  }
}
async function lspReferences(params) {
  logger.info(`LSP references at ${params.filePath}:${params.line}:${params.character}`);
  const server = await getInitializedServer(params);
  const { absPath, docUri } = prepareDocumentPosition(params);
  const positionParams = await openDocumentForPosition(server, params, absPath, docUri);
  try {
    return await server.getReferences({
      ...positionParams,
      context: { includeDeclaration: true }
    });
  } finally {
    server.closeDocument(docUri);
  }
}

// src/tools/lsp/lsp-tools.ts
import { z as z37 } from "zod";
init_logger();
var lspParamsSchema = {
  character: z37.number().int().min(0).describe("0-based character offset within the line"),
  file_content: z37.string().optional().describe("Optional file content override (reads from disk if omitted)"),
  file_path: z37.string().describe("Path to the CodeQL (.ql/.qll) file. Relative paths are resolved against the user workspace directory (see CODEQL_MCP_WORKSPACE)."),
  line: z37.number().int().min(0).describe("0-based line number in the document"),
  search_path: z37.string().optional().describe("Optional search path for CodeQL libraries"),
  workspace_uri: z37.string().optional().describe("Optional workspace URI for context (defaults to ./ql directory)")
};
function toHandlerParams(input) {
  return {
    character: input.character,
    fileContent: input.file_content,
    filePath: input.file_path,
    line: input.line,
    searchPath: input.search_path,
    workspaceUri: input.workspace_uri
  };
}
function registerLSPTools(server) {
  registerLspDiagnosticsTool(server);
  server.tool(
    "codeql_lsp_completion",
    "Get code completions at a cursor position in a CodeQL file. Returns completion items with labels, documentation, and insert text. The file must be a .ql or .qll file. IMPORTANT: Set workspace_uri to the pack or workspace root directory for dependency resolution; without it, completions for imported libraries will be empty.",
    lspParamsSchema,
    async (input) => {
      try {
        const items = await lspCompletion(toHandlerParams(input));
        return {
          content: [{
            text: JSON.stringify({
              completionCount: items.length,
              items: items.map((item) => ({
                detail: item.detail,
                documentation: item.documentation,
                insertText: item.insertText,
                kind: item.kind,
                label: item.label
              }))
            }, null, 2),
            type: "text"
          }]
        };
      } catch (error) {
        logger.error("codeql_lsp_completion error:", error);
        return {
          content: [{ text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`, type: "text" }],
          isError: true
        };
      }
    }
  );
  server.tool(
    "codeql_lsp_definition",
    "Go to the definition of a CodeQL symbol at a given position. Returns one or more file locations where the symbol is defined. Set workspace_uri to the pack root for dependency resolution.",
    lspParamsSchema,
    async (input) => {
      try {
        const locations = await lspDefinition(toHandlerParams(input));
        return {
          content: [{
            text: JSON.stringify({
              definitionCount: locations.length,
              locations: locations.map((loc) => ({
                endCharacter: loc.range.end.character,
                endLine: loc.range.end.line + 1,
                startCharacter: loc.range.start.character,
                startLine: loc.range.start.line + 1,
                uri: loc.uri
              }))
            }, null, 2),
            type: "text"
          }]
        };
      } catch (error) {
        logger.error("codeql_lsp_definition error:", error);
        return {
          content: [{ text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`, type: "text" }],
          isError: true
        };
      }
    }
  );
  server.tool(
    "codeql_lsp_references",
    "Find all references to a CodeQL symbol at a given position. Returns file locations of all usages, including the declaration. Set workspace_uri to the pack root for dependency resolution.",
    lspParamsSchema,
    async (input) => {
      try {
        const locations = await lspReferences(toHandlerParams(input));
        return {
          content: [{
            text: JSON.stringify({
              locations: locations.map((loc) => ({
                endCharacter: loc.range.end.character,
                endLine: loc.range.end.line + 1,
                startCharacter: loc.range.start.character,
                startLine: loc.range.start.line + 1,
                uri: loc.uri
              })),
              referenceCount: locations.length
            }, null, 2),
            type: "text"
          }]
        };
      } catch (error) {
        logger.error("codeql_lsp_references error:", error);
        return {
          content: [{ text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`, type: "text" }],
          isError: true
        };
      }
    }
  );
}

// src/resources/language-resources.ts
import { readFileSync as readFileSync11, existsSync as existsSync12 } from "fs";
import { join as join17 } from "path";

// src/types/language-types.ts
var LANGUAGE_RESOURCES = [
  {
    language: "actions",
    astFile: "ql/languages/actions/tools/dev/actions_ast.prompt.md"
  },
  {
    language: "cpp",
    astFile: "ql/languages/cpp/tools/dev/cpp_ast.prompt.md",
    securityFile: "ql/languages/cpp/tools/dev/cpp_security_query_guide.prompt.md"
  },
  {
    language: "csharp",
    astFile: "ql/languages/csharp/tools/dev/csharp_ast.prompt.md",
    securityFile: "ql/languages/csharp/tools/dev/csharp_security_query_guide.prompt.md"
  },
  {
    language: "go",
    astFile: "ql/languages/go/tools/dev/go_ast.prompt.md",
    securityFile: "ql/languages/go/tools/dev/go_security_query_guide.prompt.md",
    additionalFiles: {
      "dataflow": "ql/languages/go/tools/dev/go_dataflow.prompt.md",
      "library-modeling": "ql/languages/go/tools/dev/go_library_modeling.prompt.md",
      "basic-queries": "ql/languages/go/tools/dev/go_basic_queries.prompt.md"
    }
  },
  {
    language: "java",
    astFile: "ql/languages/java/tools/dev/java_ast.prompt.md"
  },
  {
    language: "javascript",
    astFile: "ql/languages/javascript/tools/dev/javascript_ast.prompt.md",
    securityFile: "ql/languages/javascript/tools/dev/javascript_security_query_guide.prompt.md"
  },
  {
    language: "python",
    astFile: "ql/languages/python/tools/dev/python_ast.prompt.md",
    securityFile: "ql/languages/python/tools/dev/python_security_query_guide.prompt.md"
  },
  {
    language: "ql",
    astFile: "ql/languages/ql/tools/dev/ql_ast.prompt.md"
  },
  {
    language: "ruby",
    astFile: "ql/languages/ruby/tools/dev/ruby_ast.prompt.md"
  }
];

// src/resources/language-resources.ts
init_package_paths();
init_logger();
function getQLBasePath() {
  return workspaceRootDir;
}
function loadResourceContent(relativePath) {
  try {
    const fullPath = join17(getQLBasePath(), relativePath);
    if (!existsSync12(fullPath)) {
      logger.warn(`Resource file not found: ${fullPath}`);
      return null;
    }
    return readFileSync11(fullPath, "utf-8");
  } catch (error) {
    logger.error(`Error loading resource file ${relativePath}:`, error);
    return null;
  }
}
function registerLanguageASTResources(server) {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.astFile) continue;
    const resourceUri = `codeql://languages/${langResource.language}/ast`;
    server.resource(
      `${langResource.language.toUpperCase()} AST Reference`,
      resourceUri,
      {
        description: `CodeQL AST class reference for ${langResource.language} programs`,
        mimeType: "text/markdown"
      },
      async () => {
        const content = loadResourceContent(langResource.astFile);
        if (!content) {
          return {
            contents: [{
              uri: resourceUri,
              mimeType: "text/markdown",
              text: `# ${langResource.language.toUpperCase()} AST Reference

Resource file not found or could not be loaded.`
            }]
          };
        }
        return {
          contents: [{
            uri: resourceUri,
            mimeType: "text/markdown",
            text: content
          }]
        };
      }
    );
  }
}
function registerLanguageSecurityResources(server) {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.securityFile) continue;
    const resourceUri = `codeql://languages/${langResource.language}/security`;
    server.resource(
      `${langResource.language.toUpperCase()} Security Patterns`,
      resourceUri,
      {
        description: `CodeQL security query patterns and framework modeling for ${langResource.language}`,
        mimeType: "text/markdown"
      },
      async () => {
        const content = loadResourceContent(langResource.securityFile);
        if (!content) {
          return {
            contents: [{
              uri: resourceUri,
              mimeType: "text/markdown",
              text: `# ${langResource.language.toUpperCase()} Security Patterns

Resource file not found or could not be loaded.`
            }]
          };
        }
        return {
          contents: [{
            uri: resourceUri,
            mimeType: "text/markdown",
            text: content
          }]
        };
      }
    );
  }
}
function registerLanguageAdditionalResources(server) {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.additionalFiles) continue;
    for (const [resourceType, filePath] of Object.entries(langResource.additionalFiles)) {
      const resourceUri = `codeql://languages/${langResource.language}/${resourceType}`;
      server.resource(
        `${langResource.language.toUpperCase()} ${resourceType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
        resourceUri,
        {
          description: `CodeQL ${resourceType.replace("-", " ")} guide for ${langResource.language}`,
          mimeType: "text/markdown"
        },
        async () => {
          const content = loadResourceContent(filePath);
          if (!content) {
            return {
              contents: [{
                uri: resourceUri,
                mimeType: "text/markdown",
                text: `# ${langResource.language.toUpperCase()} ${resourceType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}

Resource file not found or could not be loaded.`
              }]
            };
          }
          return {
            contents: [{
              uri: resourceUri,
              mimeType: "text/markdown",
              text: content
            }]
          };
        }
      );
    }
  }
}
function registerLanguageResources(server) {
  logger.info("Registering language-specific resources...");
  registerLanguageASTResources(server);
  registerLanguageSecurityResources(server);
  registerLanguageAdditionalResources(server);
  logger.info(`Registered resources for ${LANGUAGE_RESOURCES.length} languages`);
}

// src/prompts/workflow-prompts.ts
import { z as z38 } from "zod";
import { basename as basename6 } from "path";

// src/prompts/prompt-loader.ts
import { readFileSync as readFileSync12 } from "fs";
import { join as join18, dirname as dirname9 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = dirname9(__filename3);
function loadPromptTemplate(promptFileName) {
  try {
    const promptPath = join18(__dirname3, promptFileName);
    return readFileSync12(promptPath, "utf-8");
  } catch (error) {
    return `Prompt template '${promptFileName}' not available: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
function processPromptTemplate(template, variables) {
  let processed = template;
  for (const [key, value] of Object.entries(variables)) {
    const patterns = [
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      new RegExp(`\\{${key}\\}`, "g")
    ];
    for (const pattern of patterns) {
      processed = processed.replace(pattern, value);
    }
  }
  return processed;
}

// src/prompts/workflow-prompts.ts
init_logger();
var SUPPORTED_LANGUAGES = [
  "actions",
  "cpp",
  "csharp",
  "go",
  "java",
  "javascript",
  "python",
  "ruby",
  "swift"
];
var testDrivenDevelopmentSchema = z38.object({
  language: z38.enum(SUPPORTED_LANGUAGES).describe("Programming language for the query"),
  queryName: z38.string().optional().describe("Name of the query to develop")
});
var toolsQueryWorkflowSchema = z38.object({
  database: z38.string().describe("Path to the CodeQL database"),
  language: z38.enum(SUPPORTED_LANGUAGES).describe("Programming language for the tools queries"),
  sourceFiles: z38.string().optional().describe('Comma-separated source file names for PrintAST (e.g., "main.js,utils.js")'),
  sourceFunction: z38.string().optional().describe('Function name for PrintCFG or CallGraphFrom (e.g., "processData")'),
  targetFunction: z38.string().optional().describe('Function name for CallGraphTo (e.g., "validate")')
});
var workshopCreationWorkflowSchema = z38.object({
  queryPath: z38.string().describe("Path to the production-grade CodeQL query (.ql or .qlref)"),
  language: z38.enum(SUPPORTED_LANGUAGES).describe("Programming language of the query"),
  workshopName: z38.string().optional().describe("Name for the workshop directory"),
  numStages: z38.coerce.number().optional().describe("Number of incremental stages (default: 4-8)")
});
var qlTddBasicSchema = z38.object({
  language: z38.enum(SUPPORTED_LANGUAGES).optional().describe("Programming language for the query (optional)"),
  queryName: z38.string().optional().describe("Name of the query to develop")
});
var qlTddAdvancedSchema = z38.object({
  database: z38.string().optional().describe("Path to the CodeQL database for analysis"),
  language: z38.enum(SUPPORTED_LANGUAGES).optional().describe("Programming language for the query (optional)"),
  queryName: z38.string().optional().describe("Name of the query to develop")
});
var sarifRankSchema = z38.object({
  queryId: z38.string().optional().describe("CodeQL query/rule identifier"),
  sarifPath: z38.string().optional().describe("Path to the SARIF file to analyze")
});
var describeFalsePositivesSchema = z38.object({
  queryPath: z38.string().optional().describe("Path to the CodeQL query file")
});
var explainCodeqlQuerySchema = z38.object({
  databasePath: z38.string().optional().describe("Optional path to a real CodeQL database for profiling"),
  language: z38.enum(SUPPORTED_LANGUAGES).describe("Programming language of the query"),
  queryPath: z38.string().describe("Path to the CodeQL query file (.ql or .qlref)")
});
var documentCodeqlQuerySchema = z38.object({
  language: z38.enum(SUPPORTED_LANGUAGES).describe("Programming language of the query"),
  queryPath: z38.string().describe("Path to the CodeQL query file (.ql or .qlref)")
});
var qlLspIterativeDevelopmentSchema = z38.object({
  language: z38.enum(SUPPORTED_LANGUAGES).optional().describe("Programming language for the query"),
  queryPath: z38.string().optional().describe("Path to the query file being developed"),
  workspaceUri: z38.string().optional().describe("Workspace URI for LSP dependency resolution")
});
var WORKFLOW_PROMPT_NAMES = [
  "document_codeql_query",
  "explain_codeql_query",
  "ql_lsp_iterative_development",
  "ql_tdd_advanced",
  "ql_tdd_basic",
  "run_query_and_summarize_false_positives",
  "sarif_rank_false_positives",
  "sarif_rank_true_positives",
  "test_driven_development",
  "tools_query_workflow",
  "workshop_creation_workflow"
];
function registerWorkflowPrompts(server) {
  server.prompt(
    "test_driven_development",
    "Test-driven development workflow for CodeQL queries using MCP tools",
    testDrivenDevelopmentSchema.shape,
    async ({ language, queryName }) => {
      const template = loadPromptTemplate("ql-tdd-basic.prompt.md");
      const content = processPromptTemplate(template, {
        language,
        queryName: queryName || "[QueryName]"
      });
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `## Context

- **Language**: ${language}
${queryName ? `- **Query Name**: ${queryName}
` : ""}
${content}`
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "tools_query_workflow",
    "Guide for using built-in tools queries (PrintAST, PrintCFG, CallGraphFrom, CallGraphTo) to understand code structure",
    toolsQueryWorkflowSchema.shape,
    async ({
      language,
      database,
      sourceFiles,
      sourceFunction,
      targetFunction
    }) => {
      const template = loadPromptTemplate("tools-query-workflow.prompt.md");
      const content = processPromptTemplate(template, {
        language,
        database
      });
      const contextSection = buildToolsQueryContext(
        language,
        database,
        sourceFiles,
        sourceFunction,
        targetFunction
      );
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + content
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "workshop_creation_workflow",
    "Guide for creating CodeQL query development workshops from production-grade queries",
    workshopCreationWorkflowSchema.shape,
    async ({ queryPath, language, workshopName, numStages }) => {
      const template = loadPromptTemplate("workshop-creation-workflow.prompt.md");
      const derivedName = workshopName || basename6(queryPath).replace(/\.(ql|qlref)$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "codeql-workshop";
      const contextSection = buildWorkshopContext(
        queryPath,
        language,
        derivedName,
        numStages
      );
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "ql_tdd_basic",
    "Test-driven CodeQL query development checklist - write tests first, implement query, iterate until tests pass",
    qlTddBasicSchema.shape,
    async ({ language, queryName }) => {
      const template = loadPromptTemplate("ql-tdd-basic.prompt.md");
      let contextSection = "## Your Development Context\n\n";
      if (language) {
        contextSection += `- **Language**: ${language}
`;
      }
      if (queryName) {
        contextSection += `- **Query Name**: ${queryName}
`;
      }
      if (language || queryName) {
        contextSection += "\n";
      }
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "ql_tdd_advanced",
    "Advanced test-driven CodeQL development with AST visualization, control flow, and call graph analysis",
    qlTddAdvancedSchema.shape,
    async ({ language, queryName, database }) => {
      const template = loadPromptTemplate("ql-tdd-advanced.prompt.md");
      let contextSection = "## Your Development Context\n\n";
      if (language) {
        contextSection += `- **Language**: ${language}
`;
      }
      if (queryName) {
        contextSection += `- **Query Name**: ${queryName}
`;
      }
      if (database) {
        contextSection += `- **Database**: ${database}
`;
      }
      if (language || queryName || database) {
        contextSection += "\n";
      }
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "sarif_rank_false_positives",
    "Analyze SARIF results to identify likely false positives in CodeQL query results",
    sarifRankSchema.shape,
    async ({ queryId, sarifPath }) => {
      const template = loadPromptTemplate("sarif-rank-false-positives.prompt.md");
      let contextSection = "## Analysis Context\n\n";
      if (queryId) {
        contextSection += `- **Query ID**: ${queryId}
`;
      }
      if (sarifPath) {
        contextSection += `- **SARIF File**: ${sarifPath}
`;
      }
      if (queryId || sarifPath) {
        contextSection += "\n";
      }
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "sarif_rank_true_positives",
    "Analyze SARIF results to identify likely true positives in CodeQL query results",
    sarifRankSchema.shape,
    async ({ queryId, sarifPath }) => {
      const template = loadPromptTemplate("sarif-rank-true-positives.prompt.md");
      let contextSection = "## Analysis Context\n\n";
      if (queryId) {
        contextSection += `- **Query ID**: ${queryId}
`;
      }
      if (sarifPath) {
        contextSection += `- **SARIF File**: ${sarifPath}
`;
      }
      if (queryId || sarifPath) {
        contextSection += "\n";
      }
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "run_query_and_summarize_false_positives",
    "Help a user figure out where their query may need improvement to have a lower false positive rate",
    describeFalsePositivesSchema.shape,
    async ({ queryPath }) => {
      const template = loadPromptTemplate("run-query-and-summarize-false-positives.prompt.md");
      let contextSection = "## Analysis Context\n\n";
      if (queryPath) {
        contextSection += `- **Query Path**: ${queryPath}
`;
      }
      contextSection += "\n";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "explain_codeql_query",
    "Generate detailed explanation of a CodeQL query for workshop learning content - uses MCP tools to gather context and produces both verbal explanations and mermaid evaluation diagrams",
    explainCodeqlQuerySchema.shape,
    async ({ queryPath, language, databasePath }) => {
      const template = loadPromptTemplate("explain-codeql-query.prompt.md");
      let contextSection = "## Query to Explain\n\n";
      contextSection += `- **Query Path**: ${queryPath}
`;
      contextSection += `- **Language**: ${language}
`;
      if (databasePath) {
        contextSection += `- **Database Path**: ${databasePath}
`;
      }
      contextSection += "\n";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "document_codeql_query",
    "Create or update documentation for a CodeQL query - generates standardized markdown documentation as a sibling file to the query",
    documentCodeqlQuerySchema.shape,
    async ({ queryPath, language }) => {
      const template = loadPromptTemplate("document-codeql-query.prompt.md");
      const contextSection = `## Query to Document

- **Query Path**: ${queryPath}
- **Language**: ${language}

`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "ql_lsp_iterative_development",
    "Iterative CodeQL query development using LSP tools for completion, navigation, and validation",
    qlLspIterativeDevelopmentSchema.shape,
    async ({ language, queryPath, workspaceUri }) => {
      const template = loadPromptTemplate("ql-lsp-iterative-development.prompt.md");
      let contextSection = "## Your Development Context\n\n";
      if (language) {
        contextSection += `- **Language**: ${language}
`;
      }
      if (queryPath) {
        contextSection += `- **Query Path**: ${queryPath}
`;
      }
      if (workspaceUri) {
        contextSection += `- **Workspace URI**: ${workspaceUri}
`;
      }
      if (language || queryPath || workspaceUri) {
        contextSection += "\n";
      }
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: contextSection + template
            }
          }
        ]
      };
    }
  );
  logger.info(`Registered ${WORKFLOW_PROMPT_NAMES.length} workflow prompts`);
}
function buildToolsQueryContext(language, database, sourceFiles, sourceFunction, targetFunction) {
  const lines = [
    "## Your Context",
    "",
    `- **Language**: ${language}`,
    `- **Database**: ${database}`
  ];
  if (sourceFiles) {
    lines.push(`- **Source Files**: ${sourceFiles}`);
  }
  if (sourceFunction) {
    lines.push(`- **Source Function**: ${sourceFunction}`);
  }
  if (targetFunction) {
    lines.push(`- **Target Function**: ${targetFunction}`);
  }
  lines.push("", "## Recommended Next Steps", "");
  if (sourceFiles) {
    lines.push(
      `1. Run \`codeql_query_run\` with queryName="PrintAST", sourceFiles="${sourceFiles}"`
    );
  } else {
    lines.push("1. Identify source files to analyze with PrintAST");
  }
  if (sourceFunction) {
    lines.push(
      `2. Run \`codeql_query_run\` with queryName="PrintCFG" or "CallGraphFrom", sourceFunction="${sourceFunction}"`
    );
  } else {
    lines.push(
      "2. Identify key functions for CFG or call graph analysis"
    );
  }
  if (targetFunction) {
    lines.push(
      `3. Run \`codeql_query_run\` with queryName="CallGraphTo", targetFunction="${targetFunction}"`
    );
  } else {
    lines.push("3. Identify target functions to find callers");
  }
  lines.push("", "");
  return lines.join("\n");
}
function buildWorkshopContext(queryPath, language, workshopName, numStages) {
  return `## Your Workshop Context

- **Target Query**: ${queryPath}
- **Language**: ${language}
- **Workshop Name**: ${workshopName}
- **Suggested Stages**: ${numStages || "4-8 (auto-detect based on query complexity)"}

## Immediate Actions

1. **Locate query files**: Use \`find_codeql_query_files\` with queryPath="${queryPath}"
2. **Understand query for learning content**: Use the \`explain_codeql_query\` prompt with queryPath="${queryPath}" and language="${language}"
3. **Document each workshop stage**: Use the \`document_codeql_query\` prompt to create/update documentation for each solution query
4. **Verify tests pass**: Use \`codeql_test_run\` on existing tests
5. **Run tools queries**: Generate AST/CFG understanding for workshop materials

`;
}

// src/tools/monitoring-tools.ts
import { z as z40 } from "zod";
import { randomUUID as randomUUID3 } from "crypto";

// ../node_modules/lowdb/lib/core/Low.js
function checkArgs(adapter, defaultData) {
  if (adapter === void 0)
    throw new Error("lowdb: missing adapter");
  if (defaultData === void 0)
    throw new Error("lowdb: missing default data");
}
var Low = class {
  adapter;
  data;
  constructor(adapter, defaultData) {
    checkArgs(adapter, defaultData);
    this.adapter = adapter;
    this.data = defaultData;
  }
  async read() {
    const data = await this.adapter.read();
    if (data)
      this.data = data;
  }
  async write() {
    if (this.data)
      await this.adapter.write(this.data);
  }
  async update(fn) {
    fn(this.data);
    await this.write();
  }
};

// ../node_modules/lowdb/lib/adapters/node/TextFile.js
import { readFileSync as readFileSync13, renameSync, writeFileSync as writeFileSync6 } from "node:fs";
import path3 from "node:path";
var TextFileSync = class {
  #tempFilename;
  #filename;
  constructor(filename) {
    this.#filename = filename;
    const f = filename.toString();
    this.#tempFilename = path3.join(path3.dirname(f), `.${path3.basename(f)}.tmp`);
  }
  read() {
    let data;
    try {
      data = readFileSync13(this.#filename, "utf-8");
    } catch (e) {
      if (e.code === "ENOENT") {
        return null;
      }
      throw e;
    }
    return data;
  }
  write(str2) {
    writeFileSync6(this.#tempFilename, str2);
    renameSync(this.#tempFilename, this.#filename);
  }
};

// ../node_modules/lowdb/lib/adapters/node/DataFile.js
var DataFileSync = class {
  #adapter;
  #parse;
  #stringify;
  constructor(filename, { parse: parse2, stringify }) {
    this.#adapter = new TextFileSync(filename);
    this.#parse = parse2;
    this.#stringify = stringify;
  }
  read() {
    const data = this.#adapter.read();
    if (data === null) {
      return null;
    } else {
      return this.#parse(data);
    }
  }
  write(obj) {
    this.#adapter.write(this.#stringify(obj));
  }
};

// ../node_modules/lowdb/lib/adapters/node/JSONFile.js
var JSONFileSync = class extends DataFileSync {
  constructor(filename) {
    super(filename, {
      parse: JSON.parse,
      stringify: (data) => JSON.stringify(data, null, 2)
    });
  }
};

// src/lib/session-data-manager.ts
init_temp_dir();
import { mkdirSync as mkdirSync9, writeFileSync as writeFileSync7 } from "fs";
import { join as join19 } from "path";
import { randomUUID as randomUUID2 } from "crypto";

// src/types/monitoring.ts
import { z as z39 } from "zod";
var MCPCallRecordSchema = z39.object({
  callId: z39.string(),
  timestamp: z39.string(),
  // ISO timestamp
  toolName: z39.string(),
  parameters: z39.record(z39.any()),
  result: z39.any(),
  success: z39.boolean(),
  duration: z39.number(),
  // milliseconds
  nextSuggestedTool: z39.string().optional()
});
var TestExecutionRecordSchema = z39.object({
  executionId: z39.string(),
  timestamp: z39.string(),
  type: z39.enum(["compilation", "test_run", "database_build"]),
  success: z39.boolean(),
  details: z39.record(z39.any()),
  metrics: z39.object({
    passRate: z39.number().optional(),
    coverage: z39.number().optional(),
    performance: z39.number().optional()
  }).optional()
});
var QualityScoreRecordSchema = z39.object({
  scoreId: z39.string(),
  timestamp: z39.string(),
  overallScore: z39.number().min(0).max(100),
  // 0-100
  dimensions: z39.object({
    syntacticCorrectness: z39.number().min(0).max(100),
    testCoverageResults: z39.number().min(0).max(100),
    documentationQuality: z39.number().min(0).max(100),
    functionalCorrectness: z39.number().min(0).max(100)
  }),
  grade: z39.enum(["A", "B", "C", "D", "F"]),
  recommendations: z39.array(z39.string())
});
var QueryStateSchema = z39.object({
  filesPresent: z39.array(z39.string()),
  compilationStatus: z39.enum(["unknown", "success", "failed"]),
  testStatus: z39.enum(["unknown", "passing", "failing", "no_tests"]),
  documentationStatus: z39.enum(["unknown", "present", "missing", "incomplete"]),
  lastActivity: z39.string()
  // ISO timestamp
});
var QueryDevelopmentSessionSchema = z39.object({
  // Session Metadata
  sessionId: z39.string(),
  queryPath: z39.string(),
  language: z39.string(),
  queryType: z39.string().optional(),
  description: z39.string().optional(),
  startTime: z39.string(),
  // ISO timestamp
  endTime: z39.string().optional(),
  // ISO timestamp
  status: z39.enum(["active", "completed", "failed", "abandoned"]),
  // MCP Call History
  mcpCalls: z39.array(MCPCallRecordSchema),
  // Test Execution Records
  testExecutions: z39.array(TestExecutionRecordSchema),
  // Quality Metrics
  qualityScores: z39.array(QualityScoreRecordSchema),
  // Development State
  currentState: QueryStateSchema,
  recommendations: z39.array(z39.string()),
  nextSuggestedTool: z39.string().optional()
});
var SessionFilterSchema = z39.object({
  queryPath: z39.string().optional(),
  status: z39.string().optional(),
  dateRange: z39.tuple([z39.string(), z39.string()]).optional(),
  language: z39.string().optional(),
  queryType: z39.string().optional()
});
var ComparisonReportSchema = z39.object({
  sessionIds: z39.array(z39.string()),
  dimensions: z39.array(z39.string()),
  timestamp: z39.string(),
  results: z39.record(z39.any())
});
var AggregateReportSchema = z39.object({
  filters: SessionFilterSchema,
  timestamp: z39.string(),
  totalSessions: z39.number(),
  successRate: z39.number(),
  averageQualityScore: z39.number(),
  commonPatterns: z39.array(z39.string()),
  recommendations: z39.array(z39.string())
});
var ExportResultSchema = z39.object({
  format: z39.enum(["json", "html", "markdown"]),
  filename: z39.string(),
  content: z39.string(),
  timestamp: z39.string()
});
var FunctionalTestResultSchema = z39.object({
  sessionId: z39.string(),
  queryPath: z39.string(),
  passed: z39.boolean(),
  criteria: z39.record(z39.any()),
  details: z39.record(z39.any()),
  timestamp: z39.string()
});
var TestReportSchema = z39.object({
  sessionIds: z39.array(z39.string()),
  criteria: z39.record(z39.any()),
  timestamp: z39.string(),
  overallPassRate: z39.number(),
  results: z39.array(FunctionalTestResultSchema),
  summary: z39.record(z39.any())
});
var MonitoringConfigSchema = z39.object({
  storageLocation: z39.string().default(".ql-mcp-tracking/"),
  autoTrackSessions: z39.boolean().default(true),
  retentionDays: z39.number().default(90),
  includeCallParameters: z39.boolean().default(true),
  includeCallResults: z39.boolean().default(true),
  maxActiveSessionsPerQuery: z39.number().default(3),
  scoringFrequency: z39.enum(["per_call", "periodic", "manual"]).default("per_call"),
  archiveCompletedSessions: z39.boolean().default(true),
  enableRecommendations: z39.boolean().default(true),
  enableMonitoringTools: z39.boolean().default(false)
  // Opt-in: session_* tools disabled by default for end-users
});

// src/lib/session-data-manager.ts
init_logger();
var SessionDataManager = class {
  db;
  config;
  storageDir;
  constructor(configOverrides = {}) {
    this.config = MonitoringConfigSchema.parse({
      ...MonitoringConfigSchema.parse({}),
      ...configOverrides
    });
    this.storageDir = this.config.storageLocation;
    this.ensureStorageDirectory();
    const adapter = new JSONFileSync(join19(this.storageDir, "sessions.json"));
    this.db = new Low(adapter, {
      sessions: []
    });
    this.initializeDatabase();
  }
  /**
   * Initialize the database and ensure it's properly set up
   */
  async initialize() {
    await this.initializeDatabase();
  }
  /**
   * Initialize the database and ensure it's properly set up
   */
  async initializeDatabase() {
    try {
      await this.db.read();
      logger.info(`Session data manager initialized with ${this.db.data.sessions.length} sessions`);
    } catch (error) {
      logger.error("Failed to initialize session database:", error);
      throw error;
    }
  }
  /**
   * Ensure storage directory structure exists
   */
  ensureStorageDirectory() {
    try {
      mkdirSync9(this.storageDir, { recursive: true });
      const subdirs = ["sessions-archive", "exports"];
      for (const subdir of subdirs) {
        mkdirSync9(join19(this.storageDir, subdir), { recursive: true });
      }
      const configPath = join19(this.storageDir, "config.json");
      try {
        writeFileSync7(configPath, JSON.stringify(this.config, null, 2), { flag: "wx" });
      } catch (e) {
        const err = e;
        if (err.code !== "EEXIST") throw e;
      }
      logger.debug(`Storage directory initialized: ${this.storageDir}`);
    } catch (error) {
      logger.error("Failed to create storage directory:", error);
      throw error;
    }
  }
  /**
   * Start a new query development session
   */
  async startSession(queryPath, language, queryType, description) {
    const sessionId = randomUUID2();
    const startTime = (/* @__PURE__ */ new Date()).toISOString();
    const session = {
      sessionId,
      queryPath,
      language: language || "unknown",
      queryType,
      description,
      startTime,
      status: "active",
      mcpCalls: [],
      testExecutions: [],
      qualityScores: [],
      currentState: {
        filesPresent: [],
        compilationStatus: "unknown",
        testStatus: "unknown",
        documentationStatus: "unknown",
        lastActivity: startTime
      },
      recommendations: []
    };
    await this.db.read();
    this.db.data.sessions.push(session);
    await this.db.write();
    logger.info(`Started new session: ${sessionId} for query: ${queryPath}`);
    return sessionId;
  }
  /**
   * End a session with final status
   */
  async endSession(sessionId, status) {
    await this.db.read();
    const session = this.db.data.sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return null;
    }
    session.status = status;
    session.endTime = (/* @__PURE__ */ new Date()).toISOString();
    session.currentState.lastActivity = session.endTime;
    await this.db.write();
    if (this.config.archiveCompletedSessions && status === "completed") {
      await this.archiveSession(sessionId);
    }
    logger.info(`Ended session: ${sessionId} with status: ${status}`);
    return session;
  }
  /**
   * Get a specific session by ID
   */
  async getSession(sessionId) {
    await this.db.read();
    const session = this.db.data.sessions.find((s) => s.sessionId === sessionId);
    return session || null;
  }
  /**
   * List sessions with optional filtering
   */
  async listSessions(filters) {
    await this.db.read();
    let sessions = [...this.db.data.sessions];
    if (filters) {
      if (filters.queryPath) {
        sessions = sessions.filter((s) => s.queryPath.includes(filters.queryPath));
      }
      if (filters.status) {
        sessions = sessions.filter((s) => s.status === filters.status);
      }
      if (filters.language) {
        sessions = sessions.filter((s) => s.language === filters.language);
      }
      if (filters.queryType) {
        sessions = sessions.filter((s) => s.queryType === filters.queryType);
      }
      if (filters.dateRange) {
        const [start, end] = filters.dateRange;
        sessions = sessions.filter(
          (s) => s.startTime >= start && s.startTime <= end
        );
      }
    }
    return sessions;
  }
  /**
   * Update session state
   */
  async updateSessionState(sessionId, stateUpdate) {
    await this.db.read();
    const session = this.db.data.sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return null;
    }
    session.currentState = {
      ...session.currentState,
      ...stateUpdate,
      lastActivity: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.db.write();
    return session;
  }
  /**
   * Add MCP call record to session
   */
  async addMCPCall(sessionId, callRecord) {
    await this.db.read();
    const session = this.db.data.sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      logger.warn(`Session not found for MCP call: ${sessionId}`);
      return;
    }
    session.mcpCalls.push(callRecord);
    session.currentState.lastActivity = callRecord.timestamp;
    if (callRecord.nextSuggestedTool) {
      session.nextSuggestedTool = callRecord.nextSuggestedTool;
    }
    await this.db.write();
  }
  /**
   * Add test execution record to session
   */
  async addTestExecution(sessionId, testRecord) {
    await this.db.read();
    const session = this.db.data.sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      logger.warn(`Session not found for test execution: ${sessionId}`);
      return;
    }
    session.testExecutions.push(testRecord);
    session.currentState.lastActivity = testRecord.timestamp;
    if (testRecord.type === "compilation") {
      session.currentState.compilationStatus = testRecord.success ? "success" : "failed";
    } else if (testRecord.type === "test_run") {
      session.currentState.testStatus = testRecord.success ? "passing" : "failing";
    }
    await this.db.write();
  }
  /**
   * Add quality score record to session
   */
  async addQualityScore(sessionId, scoreRecord) {
    await this.db.read();
    const session = this.db.data.sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      logger.warn(`Session not found for quality score: ${sessionId}`);
      return;
    }
    session.qualityScores.push(scoreRecord);
    session.currentState.lastActivity = scoreRecord.timestamp;
    session.recommendations = scoreRecord.recommendations;
    await this.db.write();
  }
  /**
   * Archive a completed session to monthly file
   */
  async archiveSession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return;
      const date = new Date(session.endTime || session.startTime);
      const monthDir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const archiveDir = join19(this.storageDir, "sessions-archive", monthDir);
      mkdirSync9(archiveDir, { recursive: true });
      const archiveFile = join19(archiveDir, `${sessionId}.json`);
      writeFileSync7(archiveFile, JSON.stringify(session, null, 2));
      await this.db.read();
      this.db.data.sessions = this.db.data.sessions.filter((s) => s.sessionId !== sessionId);
      await this.db.write();
      logger.info(`Archived session: ${sessionId} to ${archiveFile}`);
    } catch (error) {
      logger.error(`Failed to archive session ${sessionId}:`, error);
    }
  }
  /**
   * Get active sessions for a specific query path
   */
  async getActiveSessionsForQuery(queryPath) {
    await this.db.read();
    return this.db.data.sessions.filter(
      (s) => s.queryPath === queryPath && s.status === "active"
    );
  }
  /**
   * Clean up old sessions based on retention policy
   */
  async cleanupOldSessions() {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    const cutoffTimestamp = cutoffDate.toISOString();
    await this.db.read();
    const sessionsToRemove = this.db.data.sessions.filter(
      (s) => s.endTime && s.endTime < cutoffTimestamp
    );
    if (sessionsToRemove.length > 0) {
      this.db.data.sessions = this.db.data.sessions.filter(
        (s) => !s.endTime || s.endTime >= cutoffTimestamp
      );
      await this.db.write();
      logger.info(`Cleaned up ${sessionsToRemove.length} old sessions`);
    }
  }
  /**
   * Get configuration
   */
  getConfig() {
    return this.config;
  }
  /**
   * Update configuration
   */
  async updateConfig(configUpdate) {
    this.config = MonitoringConfigSchema.parse({
      ...this.config,
      ...configUpdate
    });
    const configPath = join19(this.storageDir, "config.json");
    writeFileSync7(configPath, JSON.stringify(this.config, null, 2));
    logger.info("Updated monitoring configuration");
  }
};
function parseBoolEnv(envVar, defaultValue) {
  if (envVar === void 0) return defaultValue;
  return envVar.toLowerCase() === "true" || envVar === "1";
}
var sessionDataManager = new SessionDataManager({
  storageLocation: process.env.MONITORING_STORAGE_LOCATION || join19(getProjectTmpBase(), ".ql-mcp-tracking"),
  enableMonitoringTools: parseBoolEnv(process.env.ENABLE_MONITORING_TOOLS, false)
});

// src/tools/monitoring-tools.ts
init_logger();
function registerMonitoringTools(server) {
  const config = sessionDataManager.getConfig();
  if (!config.enableMonitoringTools) {
    logger.info("Monitoring tools are disabled (opt-in). Set enableMonitoringTools: true to enable session_* tools.");
    return;
  }
  registerSessionEndTool(server);
  registerSessionGetTool(server);
  registerSessionListTool(server);
  registerSessionUpdateStateTool(server);
  registerSessionGetCallHistoryTool(server);
  registerSessionGetTestHistoryTool(server);
  registerSessionGetScoreHistoryTool(server);
  registerSessionCalculateCurrentScoreTool(server);
  registerSessionsCompareTool(server);
  registerSessionsAggregateTool(server);
  registerSessionsExportTool(server);
  logger.info("Registered monitoring and reporting tools");
}
function registerSessionEndTool(server) {
  server.tool(
    "session_end",
    "End a query development session with final status",
    {
      sessionId: z40.string().describe("ID of the session to end"),
      status: z40.enum(["completed", "failed", "abandoned"]).describe("Final status of the session")
    },
    async ({ sessionId, status }) => {
      try {
        const session = await sessionDataManager.endSession(sessionId, status);
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: `Session not found: ${sessionId}`
              }
            ],
            isError: true
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(session, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error ending session:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error ending session: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionGetTool(server) {
  server.tool(
    "session_get",
    "Get complete details of a specific query development session",
    {
      sessionId: z40.string().describe("ID of the session to retrieve")
    },
    async ({ sessionId }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: `Session not found: ${sessionId}`
              }
            ],
            isError: true
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(session, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error getting session:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting session: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionListTool(server) {
  server.tool(
    "session_list",
    "List query development sessions with optional filtering",
    {
      queryPath: z40.string().optional().describe("Filter by query path (partial match)"),
      status: z40.string().optional().describe("Filter by session status"),
      dateRange: z40.array(z40.string()).length(2).optional().describe("Filter by date range [start, end] (ISO timestamps)"),
      language: z40.string().optional().describe("Filter by programming language"),
      queryType: z40.string().optional().describe("Filter by query type")
    },
    async ({ queryPath, status, dateRange, language, queryType }) => {
      try {
        const filters = {};
        if (queryPath) filters.queryPath = queryPath;
        if (status) filters.status = status;
        if (dateRange) filters.dateRange = [dateRange[0], dateRange[1]];
        if (language) filters.language = language;
        if (queryType) filters.queryType = queryType;
        const sessions = await sessionDataManager.listSessions(
          Object.keys(filters).length > 0 ? filters : void 0
        );
        const sessionList = {
          totalSessions: sessions.length,
          sessions: sessions.map((s) => ({
            sessionId: s.sessionId,
            queryPath: s.queryPath,
            language: s.language,
            status: s.status,
            startTime: s.startTime,
            endTime: s.endTime,
            mcpCallsCount: s.mcpCalls.length,
            testExecutionsCount: s.testExecutions.length,
            currentScore: s.qualityScores.length > 0 ? s.qualityScores[s.qualityScores.length - 1].overallScore : null
          }))
        };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(sessionList, null, 2)
            }
          ],
          recommendations: generateListRecommendations(sessions)
        };
      } catch (error) {
        logger.error("Error listing sessions:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error listing sessions: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionUpdateStateTool(server) {
  server.tool(
    "session_update_state",
    "Update the current state of a query development session",
    {
      sessionId: z40.string().describe("ID of the session to update"),
      filesPresent: z40.array(z40.string()).optional().describe("List of files present in the query development"),
      compilationStatus: z40.enum(["unknown", "success", "failed"]).optional().describe("Current compilation status"),
      testStatus: z40.enum(["unknown", "passing", "failing", "no_tests"]).optional().describe("Current test status"),
      documentationStatus: z40.enum(["unknown", "present", "missing", "incomplete"]).optional().describe("Documentation status")
    },
    async ({ sessionId, filesPresent, compilationStatus, testStatus, documentationStatus }) => {
      try {
        const stateUpdate = {};
        if (filesPresent !== void 0) stateUpdate.filesPresent = filesPresent;
        if (compilationStatus !== void 0) stateUpdate.compilationStatus = compilationStatus;
        if (testStatus !== void 0) stateUpdate.testStatus = testStatus;
        if (documentationStatus !== void 0) stateUpdate.documentationStatus = documentationStatus;
        const session = await sessionDataManager.updateSessionState(sessionId, stateUpdate);
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: `Session not found: ${sessionId}`
              }
            ],
            isError: true
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(session, null, 2)
            }
          ],
          recommendations: generateRecommendations(session, "session_update_state")
        };
      } catch (error) {
        logger.error("Error updating session state:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error updating session state: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionGetCallHistoryTool(server) {
  server.tool(
    "session_get_call_history",
    "Get MCP call history for a specific session",
    {
      sessionId: z40.string().describe("ID of the session"),
      limit: z40.number().optional().describe("Maximum number of calls to return (most recent first)")
    },
    async ({ sessionId, limit }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: `Session not found: ${sessionId}`
              }
            ],
            isError: true
          };
        }
        let calls = [...session.mcpCalls].reverse();
        if (limit && limit > 0) {
          calls = calls.slice(0, limit);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                sessionId,
                totalCalls: session.mcpCalls.length,
                callHistory: calls
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error getting call history:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting call history: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionGetTestHistoryTool(server) {
  server.tool(
    "session_get_test_history",
    "Get test execution history for a specific session",
    {
      sessionId: z40.string().describe("ID of the session"),
      limit: z40.number().optional().describe("Maximum number of test executions to return (most recent first)")
    },
    async ({ sessionId, limit }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: `Session not found: ${sessionId}`
              }
            ],
            isError: true
          };
        }
        let tests = [...session.testExecutions].reverse();
        if (limit && limit > 0) {
          tests = tests.slice(0, limit);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                sessionId,
                totalTests: session.testExecutions.length,
                testHistory: tests
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error getting test history:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting test history: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionGetScoreHistoryTool(server) {
  server.tool(
    "session_get_score_history",
    "Get quality score history for a specific session",
    {
      sessionId: z40.string().describe("ID of the session"),
      limit: z40.number().optional().describe("Maximum number of scores to return (most recent first)")
    },
    async ({ sessionId, limit }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: `Session not found: ${sessionId}`
              }
            ],
            isError: true
          };
        }
        let scores = [...session.qualityScores].reverse();
        if (limit && limit > 0) {
          scores = scores.slice(0, limit);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                sessionId,
                totalScores: session.qualityScores.length,
                scoreHistory: scores
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error getting score history:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting score history: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionCalculateCurrentScoreTool(server) {
  server.tool(
    "session_calculate_current_score",
    "Calculate current quality score for a session based on its state",
    {
      sessionId: z40.string().describe("ID of the session")
    },
    async ({ sessionId }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: `Session not found: ${sessionId}`
              }
            ],
            isError: true
          };
        }
        const scoreRecord = calculateQualityScore(session);
        await sessionDataManager.addQualityScore(sessionId, scoreRecord);
        const updatedSession = await sessionDataManager.getSession(sessionId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(scoreRecord, null, 2)
            }
          ],
          recommendations: generateRecommendations(updatedSession, "session_calculate_current_score")
        };
      } catch (error) {
        logger.error("Error calculating current score:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error calculating current score: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionsCompareTool(server) {
  server.tool(
    "sessions_compare",
    "Compare multiple query development sessions across specified dimensions",
    {
      sessionIds: z40.array(z40.string()).describe("Array of session IDs to compare"),
      dimensions: z40.array(z40.string()).optional().describe("Specific dimensions to compare (default: all)")
    },
    async ({ sessionIds, dimensions }) => {
      try {
        const sessions = await Promise.all(
          sessionIds.map((id) => sessionDataManager.getSession(id))
        );
        const validSessions = sessions.filter((s) => s !== null);
        if (validSessions.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No valid sessions found for comparison"
              }
            ],
            isError: true
          };
        }
        const comparison = await compareSessions(validSessions, dimensions);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(comparison, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error comparing sessions:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error comparing sessions: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionsAggregateTool(server) {
  server.tool(
    "sessions_aggregate",
    "Generate aggregate insights from multiple sessions based on filters",
    {
      queryPath: z40.string().optional().describe("Filter by query path (partial match)"),
      status: z40.string().optional().describe("Filter by session status"),
      dateRange: z40.array(z40.string()).length(2).optional().describe("Filter by date range [start, end] (ISO timestamps)"),
      language: z40.string().optional().describe("Filter by programming language"),
      queryType: z40.string().optional().describe("Filter by query type")
    },
    async ({ queryPath, status, dateRange, language, queryType }) => {
      try {
        const filters = {};
        if (queryPath) filters.queryPath = queryPath;
        if (status) filters.status = status;
        if (dateRange) filters.dateRange = [dateRange[0], dateRange[1]];
        if (language) filters.language = language;
        if (queryType) filters.queryType = queryType;
        const sessions = await sessionDataManager.listSessions(
          Object.keys(filters).length > 0 ? filters : void 0
        );
        const aggregate = await aggregateSessions(sessions, filters);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(aggregate, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error aggregating sessions:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error aggregating sessions: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function registerSessionsExportTool(server) {
  server.tool(
    "sessions_export",
    "Export session data in specified format for external analysis",
    {
      sessionIds: z40.array(z40.string()).describe("Array of session IDs to export"),
      format: z40.enum(["json", "html", "markdown"]).optional().default("json").describe("Export format")
    },
    async ({ sessionIds, format = "json" }) => {
      try {
        const sessions = await Promise.all(
          sessionIds.map((id) => sessionDataManager.getSession(id))
        );
        const validSessions = sessions.filter((s) => s !== null);
        if (validSessions.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No valid sessions found for export"
              }
            ],
            isError: true
          };
        }
        const exportResult = await exportSessions(validSessions, format);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(exportResult, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error exporting sessions:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error exporting sessions: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
function calculateQualityScore(session) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  const syntacticCorrectness = session.currentState.compilationStatus === "success" ? 100 : session.currentState.compilationStatus === "failed" ? 0 : 50;
  const testCoverageResults = session.currentState.testStatus === "passing" ? 100 : session.currentState.testStatus === "failing" ? 25 : session.currentState.testStatus === "no_tests" ? 0 : 50;
  const documentationQuality = session.currentState.documentationStatus === "present" ? 100 : session.currentState.documentationStatus === "incomplete" ? 60 : session.currentState.documentationStatus === "missing" ? 0 : 50;
  const successfulTests = session.testExecutions.filter((t) => t.success && t.type === "test_run").length;
  const totalTests = session.testExecutions.filter((t) => t.type === "test_run").length;
  const functionalCorrectness = totalTests > 0 ? successfulTests / totalTests * 100 : 50;
  const overallScore = Math.round(
    syntacticCorrectness * 0.25 + testCoverageResults * 0.3 + documentationQuality * 0.2 + functionalCorrectness * 0.25
  );
  const grade = overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 60 ? "D" : "F";
  const recommendations = [];
  if (syntacticCorrectness < 100) {
    recommendations.push("Fix compilation errors to improve syntactic correctness");
  }
  if (testCoverageResults < 70) {
    recommendations.push("Add comprehensive tests and ensure they pass");
  }
  if (documentationQuality < 80) {
    recommendations.push("Add or improve query documentation with examples");
  }
  if (functionalCorrectness < 80) {
    recommendations.push("Improve test pass rate and verify query logic");
  }
  return {
    scoreId: randomUUID3(),
    timestamp: timestamp2,
    overallScore,
    dimensions: {
      syntacticCorrectness,
      testCoverageResults,
      documentationQuality,
      functionalCorrectness
    },
    grade,
    recommendations
  };
}
async function compareSessions(sessions, dimensions) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  const sessionIds = sessions.map((s) => s.sessionId);
  const results = {
    sessionCount: sessions.length,
    sessionOverview: sessions.map((s) => ({
      sessionId: s.sessionId,
      queryPath: s.queryPath,
      status: s.status,
      mcpCallsCount: s.mcpCalls.length,
      duration: s.endTime ? new Date(s.endTime).getTime() - new Date(s.startTime).getTime() : (/* @__PURE__ */ new Date()).getTime() - new Date(s.startTime).getTime(),
      currentScore: s.qualityScores.length > 0 ? s.qualityScores[s.qualityScores.length - 1].overallScore : null
    }))
  };
  if (!dimensions || dimensions.includes("quality")) {
    const qualityScores = sessions.map(
      (s) => s.qualityScores.length > 0 ? s.qualityScores[s.qualityScores.length - 1] : null
    );
    results.qualityComparison = {
      averageScore: qualityScores.filter((q) => q !== null).reduce((sum, q) => sum + q.overallScore, 0) / qualityScores.filter((q) => q !== null).length,
      scoreRange: {
        min: Math.min(...qualityScores.filter((q) => q !== null).map((q) => q.overallScore)),
        max: Math.max(...qualityScores.filter((q) => q !== null).map((q) => q.overallScore))
      }
    };
  }
  if (!dimensions || dimensions.includes("activity")) {
    results.activityComparison = {
      totalMCPCalls: sessions.reduce((sum, s) => sum + s.mcpCalls.length, 0),
      averageCallsPerSession: sessions.reduce((sum, s) => sum + s.mcpCalls.length, 0) / sessions.length,
      mostActiveTool: getMostUsedTool(sessions)
    };
  }
  return {
    sessionIds,
    dimensions: dimensions || ["all"],
    timestamp: timestamp2,
    results
  };
}
async function aggregateSessions(sessions, filters) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const successRate = sessions.length > 0 ? completedSessions.length / sessions.length : 0;
  const qualityScores = sessions.map((s) => s.qualityScores.length > 0 ? s.qualityScores[s.qualityScores.length - 1].overallScore : null).filter((score) => score !== null);
  const averageQualityScore = qualityScores.length > 0 ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;
  const commonPatterns = identifyCommonPatterns(sessions);
  const recommendations = generateAggregateRecommendations(sessions);
  return {
    filters,
    timestamp: timestamp2,
    totalSessions: sessions.length,
    successRate,
    averageQualityScore,
    commonPatterns,
    recommendations
  };
}
async function exportSessions(sessions, format) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  const filename = `session-export-${timestamp2.replace(/[:.]/g, "-")}.${format}`;
  let content;
  switch (format) {
    case "json":
      content = JSON.stringify(sessions, null, 2);
      break;
    case "html":
      content = generateHTMLReport(sessions);
      break;
    case "markdown":
      content = generateMarkdownReport(sessions);
      break;
  }
  return {
    format,
    filename,
    content,
    timestamp: timestamp2
  };
}
function getMostUsedTool(sessions) {
  const toolCounts = {};
  sessions.forEach((session) => {
    session.mcpCalls.forEach((call) => {
      toolCounts[call.toolName] = (toolCounts[call.toolName] || 0) + 1;
    });
  });
  return Object.entries(toolCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "none";
}
function identifyCommonPatterns(sessions) {
  const patterns = [];
  const commonTools = getMostUsedTool(sessions);
  if (commonTools && commonTools !== "none") {
    patterns.push(`Most commonly used tool: ${commonTools}`);
  }
  const completionRate = sessions.filter((s) => s.status === "completed").length / sessions.length;
  if (completionRate > 0.8) {
    patterns.push("High completion rate indicates effective workflow");
  } else if (completionRate < 0.5) {
    patterns.push("Low completion rate suggests workflow issues");
  }
  return patterns;
}
function generateAggregateRecommendations(sessions) {
  const recommendations = [];
  const failedSessions = sessions.filter((s) => s.status === "failed");
  if (failedSessions.length > sessions.length * 0.3) {
    recommendations.push("High failure rate - consider improving error handling and guidance");
  }
  const averageCallsPerSession = sessions.reduce((sum, s) => sum + s.mcpCalls.length, 0) / sessions.length;
  if (averageCallsPerSession > 20) {
    recommendations.push("High number of MCP calls per session - consider workflow optimization");
  }
  return recommendations;
}
function generateHTMLReport(sessions) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Session Export Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .session { margin-bottom: 20px; padding: 10px; border: 1px solid #eee; }
    </style>
</head>
<body>
    <h1>Query Development Sessions Report</h1>
    <p>Generated: ${(/* @__PURE__ */ new Date()).toISOString()}</p>
    <p>Total Sessions: ${sessions.length}</p>
    
    ${sessions.map((session) => `
    <div class="session">
        <h2>Session: ${session.sessionId}</h2>
        <p><strong>Query Path:</strong> ${session.queryPath}</p>
        <p><strong>Status:</strong> ${session.status}</p>
        <p><strong>Language:</strong> ${session.language}</p>
        <p><strong>Start Time:</strong> ${session.startTime}</p>
        <p><strong>MCP Calls:</strong> ${session.mcpCalls.length}</p>
        <p><strong>Test Executions:</strong> ${session.testExecutions.length}</p>
        <p><strong>Quality Scores:</strong> ${session.qualityScores.length}</p>
    </div>
    `).join("")}
</body>
</html>`;
  return html;
}
function generateMarkdownReport(sessions) {
  const md = `# Query Development Sessions Report

Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
Total Sessions: ${sessions.length}

## Session Summary

| Session ID | Query Path | Status | Language | MCP Calls | Test Executions |
|------------|-----------|--------|----------|-----------|-----------------|
${sessions.map(
    (session) => `| ${session.sessionId} | ${session.queryPath} | ${session.status} | ${session.language} | ${session.mcpCalls.length} | ${session.testExecutions.length} |`
  ).join("\n")}

## Detailed Sessions

${sessions.map((session) => `
### Session: ${session.sessionId}

- **Query Path:** ${session.queryPath}
- **Status:** ${session.status}
- **Language:** ${session.language}
- **Start Time:** ${session.startTime}
- **End Time:** ${session.endTime || "N/A"}
- **MCP Calls:** ${session.mcpCalls.length}
- **Test Executions:** ${session.testExecutions.length}
- **Quality Scores:** ${session.qualityScores.length}

${session.recommendations.length > 0 ? `
**Current Recommendations:**
${session.recommendations.map((rec) => `- ${rec}`).join("\n")}
` : ""}
`).join("\n")}`;
  return md;
}
function generateRecommendations(session, currentTool) {
  if (!session) {
    return {};
  }
  const recommendations = {};
  if (session.currentState.compilationStatus === "failed") {
    recommendations["codeql_query_format"] = "Format query to fix potential syntax issues";
    recommendations["codeql_query_compile"] = "Recompile after fixing syntax errors";
  } else if (session.currentState.compilationStatus === "success") {
    if (session.currentState.testStatus === "unknown" || session.currentState.testStatus === "no_tests") {
      recommendations["codeql_test_run"] = "Run tests to validate query functionality";
    } else if (session.currentState.testStatus === "failing") {
      recommendations["session_get_test_history"] = "Review test failures to identify issues";
      recommendations["codeql_query_compile"] = "Verify query logic matches test expectations";
    } else if (session.currentState.testStatus === "passing") {
      recommendations["session_calculate_current_score"] = "Calculate quality score for completed query";
    }
  }
  switch (currentTool) {
    case "session_get":
      if (session.mcpCalls.length === 0) {
        recommendations["codeql_query_compile"] = "Start development by compiling the query";
      }
      break;
    case "session_end":
      if (session.status === "completed") {
        recommendations["sessions_export"] = "Export session data for analysis";
      }
      break;
    case "session_calculate_current_score": {
      const latestScore = session.qualityScores[session.qualityScores.length - 1];
      if (latestScore && latestScore.overallScore < 80) {
        if (latestScore.dimensions.syntacticCorrectness < 100) {
          recommendations["codeql_query_format"] = "Improve syntax and formatting";
        }
        if (latestScore.dimensions.testCoverageResults < 70) {
          recommendations["codeql_test_run"] = "Improve test coverage and results";
        }
      }
      break;
    }
    case "session_update_state":
      if (session.currentState.compilationStatus === "success" && session.currentState.testStatus === "unknown") {
        recommendations["codeql_test_run"] = "Run tests now that compilation is successful";
      }
      break;
  }
  return recommendations;
}
function generateListRecommendations(sessions) {
  const recommendations = {};
  const activeSessions = sessions.filter((s) => s.status === "active");
  const completedSessions = sessions.filter((s) => s.status === "completed");
  if (activeSessions.length > 0) {
    recommendations["session_get"] = `Review details of ${activeSessions.length} active session(s)`;
  }
  if (completedSessions.length > 1) {
    recommendations["sessions_compare"] = "Compare completed sessions to identify patterns";
    recommendations["sessions_aggregate"] = "Generate aggregate insights from multiple sessions";
  }
  if (sessions.length > 5) {
    recommendations["sessions_export"] = "Export session data for comprehensive analysis";
  }
  return recommendations;
}

// src/codeql-development-mcp-server.ts
init_cli_executor();
init_server_manager();
init_package_paths();
init_logger();
dotenv.config({ path: resolve12(packageRootDir, ".env"), quiet: true });
var PACKAGE_NAME = "codeql-development-mcp-server";
var VERSION = "2.24.1";
async function startServer(mode = "stdio") {
  logger.info(`Starting CodeQL Development MCP McpServer v${VERSION} in ${mode} mode`);
  const codeqlBinary = resolveCodeQLBinary();
  logger.info(`CodeQL CLI binary: ${codeqlBinary}`);
  const codeqlVersion = await validateCodeQLBinaryReachable();
  logger.info(`CodeQL CLI version: ${codeqlVersion}`);
  const server = new McpServer({
    name: PACKAGE_NAME,
    version: VERSION
  });
  registerCodeQLTools(server);
  registerLSPTools(server);
  registerCodeQLResources(server);
  registerLanguageResources(server);
  registerWorkflowPrompts(server);
  registerMonitoringTools(server);
  await sessionDataManager.initialize();
  const manager = initServerManager();
  Promise.all([
    manager.warmUpLanguageServer(),
    manager.warmUpCLIServer()
  ]).catch(() => {
  });
  if (mode === "stdio") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("McpServer started successfully on STDIO transport");
  } else {
    const app = express();
    app.use(cors());
    app.use(express.json());
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => Math.random().toString(36).substring(7)
    });
    await server.connect(transport);
    app.all("/mcp", (req, res) => {
      transport.handleRequest(req, res, req.body).catch((err) => {
        logger.error("Error handling MCP request:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal McpServer Error" });
        }
      });
    });
    app.get("/", (_req, res) => {
      res.json({
        name: PACKAGE_NAME,
        version: VERSION,
        description: "CodeQL Development MCP McpServer",
        status: "running"
      });
    });
    const host = process.env.HTTP_HOST || "localhost";
    const port = Number(process.env.HTTP_PORT || process.env.PORT) || 3e3;
    return new Promise((resolve13, reject) => {
      const httpServer = app.listen(port, host, () => {
        logger.info(`HTTP server listening on http://${host}:${port}/mcp`);
        resolve13();
      });
      httpServer.on("error", (error) => {
        logger.error("HTTP server error:", error);
        reject(error);
      });
    });
  }
  setupGracefulShutdown(server);
  return server;
}
function setupGracefulShutdown(server) {
  const shutdown = async () => {
    logger.info("Shutting down server...");
    try {
      await shutdownServerManager();
      await server.close();
      logger.info("McpServer closed gracefully");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
async function main() {
  try {
    const transportMode = (process.env.TRANSPORT_MODE || "stdio").toLowerCase();
    const mode = transportMode === "http" ? "http" : "stdio";
    await startServer(mode);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}
var scriptPath = process.argv[1] ? realpathSync(resolve12(process.argv[1])) : void 0;
if (scriptPath && import.meta.url === pathToFileURL5(scriptPath).href) {
  main();
}
export {
  startServer
};
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
//# sourceMappingURL=codeql-development-mcp-server.js.map
