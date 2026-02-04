#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/utils/logger.ts
var logger;
var init_logger = __esm({
  "src/utils/logger.ts"() {
    "use strict";
    logger = {
      info: (message, ...args) => {
        console.log(`[INFO] ${(/* @__PURE__ */ new Date()).toISOString()} ${message}`, ...args);
      },
      error: (message, ...args) => {
        console.error(`[ERROR] ${(/* @__PURE__ */ new Date()).toISOString()} ${message}`, ...args);
      },
      warn: (message, ...args) => {
        console.warn(`[WARN] ${(/* @__PURE__ */ new Date()).toISOString()} ${message}`, ...args);
      },
      debug: (message, ...args) => {
        if (process.env.DEBUG) {
          console.debug(`[DEBUG] ${(/* @__PURE__ */ new Date()).toISOString()} ${message}`, ...args);
        }
      }
    };
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
  sanitizeCLIArgument: () => sanitizeCLIArgument,
  sanitizeCLIArguments: () => sanitizeCLIArguments,
  validateCommandExists: () => validateCommandExists
});
import { execFile } from "child_process";
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
  return executeCLICommand({
    command: "codeql",
    args,
    cwd
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
var execFileAsync, ALLOWED_COMMANDS, testCommands, SAFE_ENV_VARS, SAFE_ENV_PREFIXES, DANGEROUS_CONTROL_CHARS;
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
  }
});

// src/ql-mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// src/tools/codeql/bqrs-decode.ts
import { z as z2 } from "zod";

// src/lib/cli-tool-registry.ts
init_cli_executor();
init_logger();
import { z } from "zod";

// src/lib/query-results-evaluator.ts
init_cli_executor();
init_logger();
import { writeFileSync, readFileSync } from "fs";
import { dirname, isAbsolute } from "path";
import { mkdirSync } from "fs";
var BUILT_IN_EVALUATORS = {
  "json-decode": "JSON format decoder for query results",
  "csv-decode": "CSV format decoder for query results",
  "mermaid-graph": "Mermaid diagram generator for @kind graph queries (like PrintAST)"
};
async function extractQueryMetadata(queryPath) {
  try {
    const queryContent = readFileSync(queryPath, "utf-8");
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
    mkdirSync(dirname(defaultOutputPath), { recursive: true });
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
    mkdirSync(dirname(defaultOutputPath), { recursive: true });
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
    mkdirSync(dirname(defaultOutputPath), { recursive: true });
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
        if (isAbsolute(evalFunc)) {
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
import { mkdirSync as mkdirSync2, existsSync } from "fs";
import { join, resolve } from "path";
import { randomBytes } from "crypto";
function ensurePathWithinBase(baseDir, targetPath) {
  const absBase = resolve(baseDir);
  const absTarget = resolve(targetPath);
  if (!absTarget.startsWith(absBase + "/") && absTarget !== absBase) {
    throw new Error(`Provided log directory is outside the allowed base directory: ${absBase}`);
  }
  return absTarget;
}
function getOrCreateLogDirectory(logDir) {
  const baseLogDir = process.env.CODEQL_QUERY_LOG_DIR || "/tmp/codeql-development-mcp-server/query-logs";
  if (logDir) {
    const absLogDir = ensurePathWithinBase(baseLogDir, logDir);
    if (!existsSync(absLogDir)) {
      mkdirSync2(absLogDir, { recursive: true });
    }
    return absLogDir;
  }
  if (!existsSync(baseLogDir)) {
    mkdirSync2(baseLogDir, { recursive: true });
  }
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const uniqueId = randomBytes(4).toString("hex");
  const uniqueLogDir = join(baseLogDir, `query-run-${timestamp2}-${uniqueId}`);
  mkdirSync2(uniqueLogDir, { recursive: true });
  return uniqueLogDir;
}

// src/lib/cli-tool-registry.ts
import { writeFileSync as writeFileSync2, mkdtempSync, rmSync, existsSync as existsSync2, mkdirSync as mkdirSync3 } from "fs";
import { join as join2, dirname as dirname2, resolve as resolve2 } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname2(__filename);
var repoRootDir = __dirname.includes("src/lib") ? resolve2(__dirname, "..", "..", "..") : resolve2(__dirname, "..", "..");
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
        const formatShouldBePassedToCLI = name === "codeql_bqrs_interpret" || name === "codeql_bqrs_decode";
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
          logDir: params.logDir
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
          logDir: params.logDir
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
          logDir: customLogDir
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
        if (dir && name === "codeql_pack_ls") {
          positionalArgs = [...positionalArgs, dir];
        }
        switch (name) {
          case "codeql_test_accept":
          case "codeql_test_extract":
          case "codeql_test_run":
          case "codeql_resolve_tests":
            if (tests && Array.isArray(tests)) {
              positionalArgs = [...positionalArgs, ...tests];
            }
            break;
          case "codeql_query_run": {
            if (options.database && typeof options.database === "string" && !options.database.startsWith("/")) {
              options.database = resolve2(repoRootDir, options.database);
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
                tempDir = mkdtempSync(join2(tmpdir(), "codeql-external-"));
                tempDirsToCleanup.push(tempDir);
                csvPath = join2(tempDir, "selectedSourceFiles.csv");
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
                tempDir = mkdtempSync(join2(tmpdir(), "codeql-external-"));
                tempDirsToCleanup.push(tempDir);
                csvPath = join2(tempDir, "sourceFunction.csv");
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
                tempDir = mkdtempSync(join2(tmpdir(), "codeql-external-"));
                tempDirsToCleanup.push(tempDir);
                csvPath = join2(tempDir, "targetFunction.csv");
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
        if (name === "codeql_query_run" || name === "codeql_test_run") {
          queryLogDir = getOrCreateLogDirectory(customLogDir);
          logger.info(`Using log directory for ${name}: ${queryLogDir}`);
          const timestampPath = join2(queryLogDir, "timestamp");
          writeFileSync2(timestampPath, Date.now().toString(), "utf8");
          options.logdir = queryLogDir;
          if (!options.verbosity) {
            options.verbosity = "progress+";
          }
          if (name === "codeql_query_run") {
            if (!options["evaluator-log"]) {
              options["evaluator-log"] = join2(queryLogDir, "evaluator-log.jsonl");
            }
            if (!options.output) {
              options.output = join2(queryLogDir, "results.bqrs");
            }
          }
        }
        let result;
        if (command === "codeql") {
          let cwd;
          if ((name === "codeql_pack_install" || name === "codeql_pack_ls") && (dir || packDir)) {
            cwd = dir || packDir;
          }
          const additionalPacksPath = process.env.CODEQL_ADDITIONAL_PACKS || "server/ql/javascript/examples/";
          if (name === "codeql_test_run" || name === "codeql_query_run" || name === "codeql_query_compile") {
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
          const sarifPath = join2(queryLogDir, "results.sarif");
          if (existsSync2(bqrsPath)) {
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
          result = await processQueryRunResults(result, params, logger);
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
    const defaultPackPath = resolve2(repoRootDir, "server", "ql", queryLanguage, "tools", "src");
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
      throw new Error("Failed to parse resolve queries output");
    }
    const matchingQuery = resolvedQueries.find((queryPath) => {
      const fileName = queryPath.split("/").pop();
      return fileName === `${queryName}.ql`;
    });
    if (!matchingQuery) {
      logger2.error(`Query "${queryName}.ql" not found in pack "${packPath}". Available queries:`, resolvedQueries.map((q) => q.split("/").pop()));
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
    mkdirSync3(dirname2(outputPath), { recursive: true });
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
  description: "Decode BQRS result files to human-readable formats",
  command: "codeql",
  subcommand: "bqrs decode",
  inputSchema: {
    files: z2.array(z2.string()).describe("BQRS file(s) to decode"),
    output: createCodeQLSchemas.output(),
    format: z2.enum(["csv", "json"]).optional().describe("Output format"),
    "max-paths": z2.number().optional().describe("Maximum number of paths to output"),
    "start-at": z2.number().optional().describe("Start output at result number"),
    "max-results": z2.number().optional().describe("Maximum number of results"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql bqrs decode --format=csv --output=results.csv results.bqrs",
    "codeql bqrs decode --format=json --max-results=100 results.bqrs"
  ],
  resultProcessor: createBQRSResultProcessor()
};

// src/tools/codeql/bqrs-info.ts
import { z as z3 } from "zod";
var codeqlBqrsInfoTool = {
  name: "codeql_bqrs_info",
  description: "Get metadata and information about BQRS result files",
  command: "codeql",
  subcommand: "bqrs info",
  inputSchema: {
    files: z3.array(z3.string()).describe("BQRS file(s) to examine"),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    "codeql bqrs info results.bqrs",
    "codeql bqrs info --verbose results.bqrs"
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
  description: "Run queries or query suites against CodeQL databases",
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
    verbose: z5.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z5.array(z5.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql database analyze mydb queries.qls --format=sarif-latest --output=results.sarif",
    "codeql database analyze mydb codeql/java-queries --format=csv"
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
    throw new Error(`Failed to read or parse file ${filepath}: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const predicateNameRegex = new RegExp(`\\bpredicate\\s+(${predicateName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s*\\(`);
      const match = predicateNameRegex.exec(line);
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
    throw new Error(`Failed to read or parse file ${filepath}: ${error instanceof Error ? error.message : "Unknown error"}`);
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

// src/tools/codeql/language-server-eval.ts
import { z as z12 } from "zod";

// src/lib/language-server.ts
init_logger();
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { setTimeout as setTimeout2, clearTimeout } from "timers";
var CodeQLLanguageServer = class extends EventEmitter {
  constructor(_options = {}) {
    super();
    this._options = _options;
  }
  server = null;
  messageId = 1;
  pendingResponses = /* @__PURE__ */ new Map();
  isInitialized = false;
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
    this.server = spawn("codeql", args, {
      stdio: ["pipe", "pipe", "pipe"]
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
    await new Promise((resolve8) => setTimeout2(resolve8, 2e3));
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
    return new Promise((resolve8, reject) => {
      this.pendingResponses.set(id, { resolve: resolve8, reject });
      this.sendMessage(message);
      setTimeout2(() => {
        if (this.pendingResponses.has(id)) {
          this.pendingResponses.delete(id);
          reject(new Error(`LSP request timeout for method: ${method}`));
        }
      }, 1e4);
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
  async initialize(workspaceUri) {
    if (this.isInitialized) {
      return;
    }
    logger.info("Initializing CodeQL Language Server...");
    const initParams = {
      processId: process.pid,
      clientInfo: {
        name: "codeql-mcp-server",
        version: "1.0.0"
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
      initParams.workspaceFolders = [{
        uri: workspaceUri,
        name: "codeql-workspace"
      }];
    }
    await this.sendRequest("initialize", initParams);
    this.sendNotification("initialized", {});
    this.isInitialized = true;
    logger.info("CodeQL Language Server initialized successfully");
  }
  async evaluateQL(qlCode, uri = "file:///tmp/eval.ql") {
    if (!this.isInitialized) {
      throw new Error("Language server is not initialized");
    }
    return new Promise((resolve8, reject) => {
      let diagnosticsReceived = false;
      const timeout = setTimeout2(() => {
        if (!diagnosticsReceived) {
          this.removeAllListeners("diagnostics");
          reject(new Error("Timeout waiting for diagnostics"));
        }
      }, 5e3);
      const diagnosticsHandler = (params) => {
        if (params.uri === uri) {
          diagnosticsReceived = true;
          clearTimeout(timeout);
          this.removeListener("diagnostics", diagnosticsHandler);
          this.sendNotification("textDocument/didClose", {
            textDocument: { uri }
          });
          resolve8(params.diagnostics);
        }
      };
      this.on("diagnostics", diagnosticsHandler);
      this.sendNotification("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId: "ql",
          version: 1,
          text: qlCode
        }
      });
    });
  }
  async shutdown() {
    if (!this.server) {
      return;
    }
    logger.info("Shutting down CodeQL Language Server...");
    try {
      await this.sendRequest("shutdown", {});
      this.sendNotification("exit", {});
    } catch (error) {
      logger.warn("Error during graceful shutdown:", error);
    }
    setTimeout2(() => {
      if (this.server) {
        this.server.kill("SIGTERM");
      }
    }, 1e3);
    this.isInitialized = false;
  }
  isRunning() {
    return this.server !== null && !this.server.killed;
  }
};

// src/tools/codeql/language-server-eval.ts
init_logger();
import { resolve as resolve4 } from "path";
var globalLanguageServer = null;
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
async function getLanguageServer(options = {}) {
  if (globalLanguageServer && globalLanguageServer.isRunning()) {
    return globalLanguageServer;
  }
  const defaultOptions = {
    searchPath: resolve4(process.cwd(), "ql"),
    loglevel: "WARN",
    ...options
  };
  globalLanguageServer = new CodeQLLanguageServer(defaultOptions);
  try {
    await globalLanguageServer.start();
    const workspaceUri = `file://${resolve4(process.cwd(), "ql")}`;
    await globalLanguageServer.initialize(workspaceUri);
    logger.info("CodeQL Language Server started and initialized successfully");
    return globalLanguageServer;
  } catch (error) {
    logger.error("Failed to start language server:", error);
    globalLanguageServer = null;
    throw error;
  }
}
async function evaluateQLCode({
  qlCode,
  workspaceUri: _workspaceUri,
  serverOptions = {}
}) {
  try {
    logger.info("Evaluating QL code via Language Server...");
    const languageServer = await getLanguageServer(serverOptions);
    const evalUri = `file:///tmp/eval_${Date.now()}.ql`;
    const diagnostics = await languageServer.evaluateQL(qlCode, evalUri);
    const summary = {
      errorCount: diagnostics.filter((d) => d.severity === 1).length,
      warningCount: diagnostics.filter((d) => d.severity === 2).length,
      infoCount: diagnostics.filter((d) => d.severity === 3).length,
      hintCount: diagnostics.filter((d) => d.severity === 4).length
    };
    const isValid = summary.errorCount === 0;
    const formattedOutput = formatDiagnostics(diagnostics);
    logger.info(`QL evaluation complete. Valid: ${isValid}, Issues: ${diagnostics.length}`);
    return {
      isValid,
      diagnostics,
      summary,
      formattedOutput
    };
  } catch (error) {
    logger.error("Error evaluating QL code:", error);
    throw new Error(`QL evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function shutdownLanguageServer() {
  if (globalLanguageServer) {
    logger.info("Shutting down CodeQL Language Server...");
    await globalLanguageServer.shutdown();
    globalLanguageServer = null;
  }
}
function registerLanguageServerEvalTool(server) {
  server.tool(
    "codeql_language_server_eval",
    "Authoritative syntax and semantic validation of CodeQL (QL) code via the CodeQL Language Server. Compiles the query and provides real-time diagnostics with precise error locations. Use this for accurate validation; for quick heuristic checks without compilation, use validate_codeql_query instead.",
    {
      ql_code: z12.string().describe("The CodeQL (QL) code to evaluate for syntax and semantic errors"),
      workspace_uri: z12.string().optional().describe("Optional workspace URI for context (defaults to ./ql directory)"),
      search_path: z12.string().optional().describe("Optional search path for CodeQL libraries"),
      log_level: z12.enum(["OFF", "ERROR", "WARN", "INFO", "DEBUG", "TRACE", "ALL"]).optional().describe("Language server log level")
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
        const result = await evaluateQLCode({
          qlCode: ql_code,
          workspaceUri: workspace_uri,
          serverOptions
        });
        const responseContent = {
          isValid: result.isValid,
          summary: result.summary,
          formattedOutput: result.formattedOutput,
          diagnostics: result.diagnostics.map((d) => ({
            line: d.range.start.line + 1,
            // Convert to 1-based line numbers
            column: d.range.start.character + 1,
            // Convert to 1-based column numbers
            severity: getSeverityName(d.severity),
            message: d.message,
            code: d.code,
            source: d.source
          }))
        };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(responseContent, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error("Error in language server eval tool:", error);
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
  process.on("SIGINT", async () => {
    await shutdownLanguageServer();
  });
  process.on("SIGTERM", async () => {
    await shutdownLanguageServer();
  });
}

// src/tools/codeql/pack-install.ts
import { z as z13 } from "zod";
var codeqlPackInstallTool = {
  name: "codeql_pack_install",
  description: "Install CodeQL pack dependencies",
  command: "codeql",
  subcommand: "pack install",
  inputSchema: {
    packDir: z13.string().optional().describe("Directory containing qlpack.yml (default: current)"),
    force: z13.boolean().optional().describe("Force reinstall of dependencies"),
    "no-strict-mode": z13.boolean().optional().describe("Allow non-strict dependency resolution"),
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
import { z as z14 } from "zod";
var codeqlPackLsTool = {
  name: "codeql_pack_ls",
  description: "List CodeQL packs under some local directory path",
  command: "codeql",
  subcommand: "pack ls",
  inputSchema: {
    dir: z14.string().optional().describe("The root directory of the package or workspace, defaults to the current working directory"),
    format: z14.enum(["text", "json"]).optional().describe("Output format: text (default) or json"),
    groups: z14.string().optional().describe("List of CodeQL pack groups to include or exclude"),
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

// src/tools/codeql/profile-codeql-query.ts
init_cli_executor();
init_logger();
import { z as z15 } from "zod";
import { writeFileSync as writeFileSync3, readFileSync as readFileSync3, existsSync as existsSync4 } from "fs";
import { join as join4, dirname as dirname4, basename as basename2 } from "path";
import { mkdirSync as mkdirSync4 } from "fs";
function parseEvaluatorLog(logPath) {
  const logContent = readFileSync3(logPath, "utf-8");
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
function formatAsJson(profile) {
  return JSON.stringify(profile, null, 2);
}
function formatAsMermaid(profile) {
  const lines = [];
  lines.push("```mermaid");
  lines.push("graph TD");
  lines.push("");
  lines.push(`  QUERY["${basename2(profile.queryName)}<br/>Total: ${profile.totalDuration.toFixed(2)}ms"]`);
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
      query: z15.string().describe("Path to the .ql query file"),
      database: z15.string().describe("Path to the CodeQL database directory"),
      evaluatorLog: z15.string().optional().describe(
        "Path to an existing structured JSON log (e.g., evaluator-log.jsonl) file. If not provided, the tool will run the query to generate one."
      ),
      outputDir: z15.string().optional().describe("Directory to write profiling data files (defaults to same directory as evaluator log)")
    },
    async (params) => {
      try {
        const { query, database, evaluatorLog, outputDir } = params;
        let logPath = evaluatorLog;
        let bqrsPath;
        let sarifPath;
        if (!logPath) {
          logger.info("No evaluator log provided, running query to generate one");
          const defaultOutputDir = outputDir || join4(dirname4(query), "profile-output");
          mkdirSync4(defaultOutputDir, { recursive: true });
          logPath = join4(defaultOutputDir, "evaluator-log.jsonl");
          bqrsPath = join4(defaultOutputDir, "query-results.bqrs");
          sarifPath = join4(defaultOutputDir, "query-results.sarif");
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
          if (existsSync4(bqrsPath)) {
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
        if (!existsSync4(logPath)) {
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
        const profile = parseEvaluatorLog(logPath);
        const profileOutputDir = outputDir || dirname4(logPath);
        mkdirSync4(profileOutputDir, { recursive: true });
        const jsonPath = join4(profileOutputDir, "query-evaluation-profile.json");
        const jsonContent = formatAsJson(profile);
        writeFileSync3(jsonPath, jsonContent);
        logger.info(`Profile JSON written to: ${jsonPath}`);
        const mdPath = join4(profileOutputDir, "query-evaluation-profile.md");
        const mdContent = formatAsMermaid(profile);
        writeFileSync3(mdPath, mdContent);
        logger.info(`Profile Mermaid diagram written to: ${mdPath}`);
        const outputFiles = [
          `Profile JSON: ${jsonPath}`,
          `Profile Mermaid: ${mdPath}`,
          `Evaluator Log: ${logPath}`
        ];
        if (bqrsPath) {
          outputFiles.push(`Query Results (BQRS): ${bqrsPath}`);
        }
        if (sarifPath && existsSync4(sarifPath)) {
          outputFiles.push(`Query Results (SARIF): ${sarifPath}`);
        }
        const responseText = [
          "Query profiling completed successfully!",
          "",
          "Output Files:",
          ...outputFiles.map((f) => `  - ${f}`),
          "",
          "Profile Summary:",
          `  - Query: ${basename2(profile.queryName)}`,
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
import { z as z16 } from "zod";
var codeqlQueryCompileTool = {
  name: "codeql_query_compile",
  description: "Compile and validate CodeQL queries",
  command: "codeql",
  subcommand: "query compile",
  inputSchema: {
    query: z16.string().describe("Path to the CodeQL query file (.ql)"),
    database: z16.string().optional().describe("Path to the CodeQL database"),
    library: z16.string().optional().describe("Path to query library"),
    output: z16.string().optional().describe("Output file path"),
    warnings: z16.enum(["hide", "show", "error"]).optional().describe("How to handle compilation warnings"),
    verbose: z16.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z16.array(z16.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql query compile --database=/path/to/db MyQuery.ql",
    "codeql query compile --library=/path/to/lib --output=compiled.qlo MyQuery.ql"
  ]
};

// src/tools/codeql/query-format.ts
import { z as z17 } from "zod";
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
    files: z17.array(z17.string()).describe("One or more .ql or .qll source files to format"),
    output: z17.string().optional().describe("Write formatted code to this file instead of stdout"),
    "in-place": z17.boolean().optional().describe("Overwrite each input file with formatted version"),
    "check-only": z17.boolean().optional().describe("Check formatting without writing output"),
    backup: z17.string().optional().describe("Backup extension when overwriting existing files"),
    "no-syntax-errors": z17.boolean().optional().describe("Ignore syntax errors and pretend file is formatted"),
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
import { z as z18 } from "zod";
var codeqlQueryRunTool = {
  name: "codeql_query_run",
  description: 'Execute a CodeQL query against a database. Use either "query" parameter for direct file path OR "queryName" + "queryLanguage" for pre-defined tool queries.',
  command: "codeql",
  subcommand: "query run",
  inputSchema: {
    query: z18.string().optional().describe("Path to the CodeQL query file (.ql) - cannot be used with queryName"),
    queryName: z18.string().optional().describe('Name of pre-defined query to run (e.g., "PrintAST", "CallGraphFrom", "CallGraphTo") - requires queryLanguage'),
    queryLanguage: z18.string().optional().describe('Programming language for tools queries (e.g., "javascript", "java", "python") - required when using queryName'),
    queryPack: z18.string().optional().describe("Query pack path (defaults to server/ql/<language>/tools/src/ for tool queries)"),
    sourceFiles: z18.string().optional().describe('Comma-separated list of source file paths for PrintAST queries (e.g., "src/main.js,src/utils.js" or just "main.js")'),
    sourceFunction: z18.string().optional().describe('Comma-separated list of source function names for CallGraphFrom queries (e.g., "main,processData")'),
    targetFunction: z18.string().optional().describe('Comma-separated list of target function names for CallGraphTo queries (e.g., "helper,validateInput")'),
    database: createCodeQLSchemas.database(),
    output: createCodeQLSchemas.output(),
    external: z18.array(z18.string()).optional().describe("External predicate data: predicate=file.csv"),
    timeout: createCodeQLSchemas.timeout(),
    logDir: z18.string().optional().describe("Custom directory for query execution logs (overrides CODEQL_QUERY_LOG_DIR environment variable). If not provided, uses CODEQL_QUERY_LOG_DIR or defaults to /tmp/codeql-development-mcp-server/query-logs/<unique-id>"),
    "evaluator-log": z18.string().optional().describe("Path to save evaluator log (deprecated: use logDir instead)"),
    "evaluator-log-minify": z18.boolean().optional().describe("Minimize evaluator log for smaller size"),
    "evaluator-log-level": z18.number().min(1).max(5).optional().describe("Evaluator log verbosity level (1-5, default 5)"),
    "tuple-counting": z18.boolean().optional().describe("Display tuple counts for each evaluation step in evaluator logs"),
    format: z18.enum(["sarif-latest", "sarifv2.1.0", "csv", "graphtext", "dgml", "dot"]).optional().describe("Output format for query results via codeql bqrs interpret. Defaults to sarif-latest for @kind problem/path-problem queries, graphtext for @kind graph queries. Graph formats (graphtext, dgml, dot) only work with @kind graph queries."),
    interpretedOutput: z18.string().optional().describe("Output file for interpreted results (e.g., results.sarif, results.txt). If not provided, defaults based on format: .sarif for SARIF, .txt for graphtext/csv, .dgml for dgml, .dot for dot"),
    evaluationFunction: z18.string().optional().describe('[DEPRECATED - use format parameter instead] Built-in function for query results evaluation (e.g., "mermaid-graph", "json-decode", "csv-decode") or path to custom evaluation script'),
    evaluationOutput: z18.string().optional().describe("[DEPRECATED - use interpretedOutput parameter instead] Output file for evaluation results"),
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
import { z as z19 } from "zod";
import { resolve as resolve5 } from "path";
init_logger();
async function quickEvaluate({
  file,
  db: _db,
  symbol,
  output_path = "/tmp/quickeval.bqrs"
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
    const resolvedOutput = resolve5(output_path);
    return resolvedOutput;
  } catch (error) {
    throw new Error(`CodeQL evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
function registerQuickEvaluateTool(server) {
  server.tool(
    "quick_evaluate",
    "Quick evaluate either a class or a predicate in a CodeQL query for debugging",
    {
      file: z19.string().describe("Path to the .ql file containing the symbol"),
      db: z19.string().describe("Path to the CodeQL database"),
      symbol: z19.string().describe("Name of the class or predicate to evaluate"),
      output_path: z19.string().optional().default("/tmp/quickeval.bqrs").describe("Output path for results")
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

// src/tools/codeql/register-database.ts
init_logger();
import { z as z20 } from "zod";
import { access, constants } from "fs/promises";
import { resolve as resolve6 } from "path";
async function registerDatabase(dbPath) {
  try {
    const resolvedPath = resolve6(dbPath);
    await access(resolvedPath, constants.F_OK);
    const srcZipPath = resolve6(resolvedPath, "src.zip");
    await access(srcZipPath, constants.F_OK);
    return `Database registered: ${dbPath}`;
  } catch (error) {
    if (error instanceof Error) {
      const errorCode = error.code;
      if (errorCode === "ENOENT") {
        if (error.message.includes("src.zip")) {
          throw new Error(`Missing required src.zip in: ${dbPath}`);
        }
        throw new Error(`Database path does not exist: ${dbPath}`);
      }
      if (errorCode === "EACCES") {
        throw new Error(`Database path does not exist: ${dbPath}`);
      }
    }
    throw new Error(`Failed to register database: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
function registerRegisterDatabaseTool(server) {
  server.tool(
    "register_database",
    "Register a CodeQL database given a local path to the database directory",
    {
      db_path: z20.string().describe("Path to the CodeQL database directory")
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
import { z as z21 } from "zod";
var codeqlResolveDatabaseTool = {
  name: "codeql_resolve_database",
  description: "Resolve database path and validate database structure",
  command: "codeql",
  subcommand: "resolve database",
  inputSchema: {
    database: z21.string().describe("Database path to resolve"),
    format: z21.enum(["text", "json", "betterjson"]).optional().describe("Output format for database information"),
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
import { z as z22 } from "zod";
var codeqlResolveLanguagesTool = {
  name: "codeql_resolve_languages",
  description: "List installed CodeQL extractor packs",
  command: "codeql",
  subcommand: "resolve languages",
  inputSchema: {
    format: z22.enum(["text", "json", "betterjson"]).optional().describe("Output format for language information"),
    verbose: z22.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z22.array(z22.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql resolve languages --format=text",
    "codeql resolve languages --format=json",
    "codeql resolve languages --format=betterjson"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/resolve-library-path.ts
import { z as z23 } from "zod";
var codeqlResolveLibraryPathTool = {
  name: "codeql_resolve_library-path",
  description: "Resolve library path for CodeQL queries and libraries",
  command: "codeql",
  subcommand: "resolve library-path",
  inputSchema: {
    language: z23.string().optional().describe("Programming language to resolve library path for"),
    format: z23.enum(["text", "json", "betterjson"]).optional().describe("Output format for library path information"),
    verbose: z23.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z23.array(z23.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql resolve library-path --language=java",
    "codeql resolve library-path --format=json --language=python",
    "codeql resolve library-path --format=betterjson"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/resolve-metadata.ts
import { z as z24 } from "zod";
var codeqlResolveMetadataTool = {
  name: "codeql_resolve_metadata",
  description: "Resolve and return the key-value metadata pairs from a CodeQL query source file.",
  command: "codeql",
  subcommand: "resolve metadata",
  inputSchema: {
    query: z24.string().describe("Query file to resolve metadata for"),
    format: z24.enum(["json"]).optional().describe("Output format for metadata information (always JSON, optional for future compatibility)"),
    verbose: z24.boolean().optional().describe("Enable verbose output"),
    additionalArgs: z24.array(z24.string()).optional().describe("Additional command-line arguments")
  },
  examples: [
    "codeql resolve metadata -- relative-path/2/MyQuery.ql",
    "codeql resolve metadata --format=json -- /absolute-plus/relative-path/2/MyQuery.ql"
  ],
  resultProcessor: defaultCLIResultProcessor
};

// src/tools/codeql/resolve-qlref.ts
import { z as z25 } from "zod";
var codeqlResolveQlrefTool = {
  name: "codeql_resolve_qlref",
  description: "Resolve qlref files to their corresponding query files",
  command: "codeql",
  subcommand: "resolve qlref",
  inputSchema: {
    qlref: z25.string().describe("Path to the .qlref file to resolve"),
    format: z25.enum(["text", "json", "betterjson"]).optional().describe("Output format for qlref resolution"),
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
import { z as z26 } from "zod";
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
    directory: z26.string().optional().describe("Directory to search for queries"),
    language: z26.string().optional().describe("Filter queries by programming language"),
    format: z26.enum(["text", "json", "betterjson", "bylanguage"]).optional().describe("Output format for query list"),
    "additional-packs": z26.union([z26.string(), z26.array(z26.string())]).optional().describe("Additional pack directories to search for CodeQL packs"),
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
import { z as z27 } from "zod";
var codeqlResolveTestsTool = {
  name: "codeql_resolve_tests",
  description: "Resolve the local filesystem paths of unit tests and/or queries under some base directory",
  command: "codeql",
  subcommand: "resolve tests",
  inputSchema: {
    tests: z27.array(z27.string()).optional().describe("One or more tests (.ql, .qlref files, or test directories)"),
    format: z27.enum(["text", "json"]).optional().describe("Output format for test list"),
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
import { z as z28 } from "zod";
var codeqlTestAcceptTool = {
  name: "codeql_test_accept",
  description: "Accept new test results as the expected baseline",
  command: "codeql",
  subcommand: "test accept",
  inputSchema: {
    tests: z28.array(z28.string()).describe("One or more tests (.ql, .qlref files, or test directories)"),
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
import { z as z29 } from "zod";
var codeqlTestExtractTool = {
  name: "codeql_test_extract",
  description: "Extract test databases for CodeQL query tests",
  command: "codeql",
  subcommand: "test extract",
  inputSchema: {
    tests: z29.array(z29.string()).describe("One or more test directories or files"),
    language: z29.string().optional().describe("Programming language for extraction"),
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
import { z as z30 } from "zod";
var codeqlTestRunTool = {
  name: "codeql_test_run",
  description: "Run CodeQL query tests",
  command: "codeql",
  subcommand: "test run",
  inputSchema: {
    tests: z30.array(z30.string()).describe("One or more tests (.ql, .qlref files, or test directories)"),
    "show-extractor-output": z30.boolean().optional().describe("Show output from extractors during test execution"),
    "keep-databases": z30.boolean().optional().describe("Keep test databases after running tests"),
    "learn": z30.boolean().optional().describe("Accept current output as expected for failing tests"),
    logDir: z30.string().optional().describe("Custom directory for test execution logs (overrides CODEQL_QUERY_LOG_DIR environment variable). If not provided, uses CODEQL_QUERY_LOG_DIR or defaults to /tmp/codeql-development-mcp-server/query-logs/<unique-id>"),
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
import { z as z31 } from "zod";

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
    if (!fs2.existsSync(srcDir)) {
      fs2.mkdirSync(srcDir, { recursive: true });
    }
    if (!fs2.existsSync(testDir)) {
      fs2.mkdirSync(testDir, { recursive: true });
    }
    if (!fs2.existsSync(queryPath)) {
      const queryContent = generateQueryTemplate(queryName, language, description, queryId);
      fs2.writeFileSync(queryPath, queryContent, "utf8");
      filesCreated.push(queryPath);
    }
    if (!fs2.existsSync(qlrefPath)) {
      const qlrefContent = `${queryName}/${queryName}.ql
`;
      fs2.writeFileSync(qlrefPath, qlrefContent, "utf8");
      filesCreated.push(qlrefPath);
    }
    if (!fs2.existsSync(testCodePath)) {
      const testCodeContent = `// Test code for ${queryName}
// TODO: Add test cases
`;
      fs2.writeFileSync(testCodePath, testCodeContent, "utf8");
      filesCreated.push(testCodePath);
    }
    return {
      queryPath,
      testPath: testDir,
      qlrefPath,
      testCodePath,
      filesCreated
    };
  } catch (error) {
    throw new Error(`Failed to create query scaffolding: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// src/tools/codeql-tools.ts
init_logger();
function registerCodeQLTools(server) {
  server.tool(
    "validate_codeql_query",
    "Quick heuristic validation for CodeQL query structure - checks for common patterns like from/where/select clauses and metadata presence. Does NOT compile the query. For authoritative validation with actual compilation, use codeql_language_server_eval instead.",
    {
      query: z31.string().describe("The CodeQL query to validate"),
      language: z31.string().optional().describe("Target programming language")
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
      basePath: z31.string().describe("Base path where src/ and test/ directories will be created"),
      queryName: z31.string().describe("Name of the query (e.g., MySecurityQuery)"),
      language: z31.string().describe("Target programming language (e.g., javascript, python, java)"),
      description: z31.string().optional().describe("Description of what the query does"),
      queryId: z31.string().optional().describe("Custom query ID (defaults to language/example/queryname)")
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
  registerLanguageServerEvalTool(server);
  registerProfileCodeQLQueryTool(server);
  registerQuickEvaluateTool(server);
  registerRegisterDatabaseTool(server);
}

// src/lib/resources.ts
import { readFileSync as readFileSync4 } from "fs";
import { join as join6, dirname as dirname5 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname5(__filename2);
function getGettingStartedGuide() {
  try {
    return readFileSync4(join6(__dirname2, "../resources/getting-started.md"), "utf-8");
  } catch {
    return "Getting started guide not available";
  }
}
function getQueryBasicsGuide() {
  try {
    return readFileSync4(join6(__dirname2, "../resources/query-basics.md"), "utf-8");
  } catch {
    return "Query basics guide not available";
  }
}
function getSecurityTemplates() {
  try {
    return readFileSync4(join6(__dirname2, "../resources/security-templates.md"), "utf-8");
  } catch {
    return "Security templates not available";
  }
}
function getPerformancePatterns() {
  try {
    return readFileSync4(join6(__dirname2, "../resources/performance-patterns.md"), "utf-8");
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

// src/resources/language-resources.ts
import { readFileSync as readFileSync5, existsSync as existsSync6 } from "fs";
import { join as join7 } from "path";

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
init_logger();
function getQLBasePath() {
  return join7(process.cwd(), "..");
}
function loadResourceContent(relativePath) {
  try {
    const fullPath = join7(getQLBasePath(), relativePath);
    if (!existsSync6(fullPath)) {
      logger.warn(`Resource file not found: ${fullPath}`);
      return null;
    }
    return readFileSync5(fullPath, "utf-8");
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
import { z as z32 } from "zod";

// src/prompts/prompt-loader.ts
import { readFileSync as readFileSync6 } from "fs";
import { join as join8, dirname as dirname6 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = dirname6(__filename3);
function loadPromptTemplate(promptFileName) {
  try {
    const promptPath = join8(__dirname3, promptFileName);
    return readFileSync6(promptPath, "utf-8");
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
var workshopCreationWorkflowSchema = z32.object({
  queryPath: z32.string().describe("Path to the production-grade CodeQL query (.ql or .qlref)"),
  language: z32.enum(SUPPORTED_LANGUAGES).describe("Programming language of the query"),
  workshopName: z32.string().optional().describe("Name for the workshop directory"),
  numStages: z32.coerce.number().optional().describe("Number of incremental stages (default: 4-8)")
});
function registerWorkflowPrompts(server) {
  server.prompt(
    "test_driven_development",
    "Test-driven development workflow for CodeQL queries using MCP tools",
    {
      language: z32.enum(SUPPORTED_LANGUAGES).describe("Programming language for the query"),
      queryName: z32.string().optional().describe("Name of the query to develop")
    },
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
    {
      language: z32.enum(SUPPORTED_LANGUAGES).describe("Programming language for the tools queries"),
      database: z32.string().describe("Path to the CodeQL database"),
      sourceFiles: z32.string().optional().describe(
        'Comma-separated source file names for PrintAST (e.g., "main.js,utils.js")'
      ),
      sourceFunction: z32.string().optional().describe(
        'Function name for PrintCFG or CallGraphFrom (e.g., "processData")'
      ),
      targetFunction: z32.string().optional().describe('Function name for CallGraphTo (e.g., "validate")')
    },
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
      const derivedName = workshopName || queryPath.split("/").pop()?.replace(/\.(ql|qlref)$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "codeql-workshop";
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
    {
      language: z32.enum(SUPPORTED_LANGUAGES).optional().describe("Programming language for the query (optional)"),
      queryName: z32.string().optional().describe("Name of the query to develop")
    },
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
    {
      language: z32.enum(SUPPORTED_LANGUAGES).optional().describe("Programming language for the query (optional)"),
      queryName: z32.string().optional().describe("Name of the query to develop"),
      database: z32.string().optional().describe("Path to the CodeQL database for analysis")
    },
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
    {
      queryId: z32.string().optional().describe("CodeQL query/rule identifier"),
      sarifPath: z32.string().optional().describe("Path to the SARIF file to analyze")
    },
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
    {
      queryId: z32.string().optional().describe("CodeQL query/rule identifier"),
      sarifPath: z32.string().optional().describe("Path to the SARIF file to analyze")
    },
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
    "explain_codeql_query",
    "Generate detailed explanation of a CodeQL query for workshop learning content - uses MCP tools to gather context and produces both verbal explanations and mermaid evaluation diagrams",
    {
      queryPath: z32.string().describe("Path to the CodeQL query file (.ql or .qlref)"),
      language: z32.enum(SUPPORTED_LANGUAGES).describe("Programming language of the query"),
      databasePath: z32.string().optional().describe("Optional path to a real CodeQL database for profiling")
    },
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
    {
      queryPath: z32.string().describe("Path to the CodeQL query file (.ql or .qlref)"),
      language: z32.enum(SUPPORTED_LANGUAGES).describe("Programming language of the query")
    },
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
  logger.info("Registered 9 workflow prompts");
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
import { z as z34 } from "zod";
import { randomUUID as randomUUID2 } from "crypto";

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
import { readFileSync as readFileSync7, renameSync, writeFileSync as writeFileSync5 } from "node:fs";
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
      data = readFileSync7(this.#filename, "utf-8");
    } catch (e) {
      if (e.code === "ENOENT") {
        return null;
      }
      throw e;
    }
    return data;
  }
  write(str2) {
    writeFileSync5(this.#tempFilename, str2);
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
import { existsSync as existsSync7, mkdirSync as mkdirSync6, writeFileSync as writeFileSync6 } from "fs";
import { join as join9 } from "path";
import { randomUUID } from "crypto";

// src/types/monitoring.ts
import { z as z33 } from "zod";
var MCPCallRecordSchema = z33.object({
  callId: z33.string(),
  timestamp: z33.string(),
  // ISO timestamp
  toolName: z33.string(),
  parameters: z33.record(z33.any()),
  result: z33.any(),
  success: z33.boolean(),
  duration: z33.number(),
  // milliseconds
  nextSuggestedTool: z33.string().optional()
});
var TestExecutionRecordSchema = z33.object({
  executionId: z33.string(),
  timestamp: z33.string(),
  type: z33.enum(["compilation", "test_run", "database_build"]),
  success: z33.boolean(),
  details: z33.record(z33.any()),
  metrics: z33.object({
    passRate: z33.number().optional(),
    coverage: z33.number().optional(),
    performance: z33.number().optional()
  }).optional()
});
var QualityScoreRecordSchema = z33.object({
  scoreId: z33.string(),
  timestamp: z33.string(),
  overallScore: z33.number().min(0).max(100),
  // 0-100
  dimensions: z33.object({
    syntacticCorrectness: z33.number().min(0).max(100),
    testCoverageResults: z33.number().min(0).max(100),
    documentationQuality: z33.number().min(0).max(100),
    functionalCorrectness: z33.number().min(0).max(100)
  }),
  grade: z33.enum(["A", "B", "C", "D", "F"]),
  recommendations: z33.array(z33.string())
});
var QueryStateSchema = z33.object({
  filesPresent: z33.array(z33.string()),
  compilationStatus: z33.enum(["unknown", "success", "failed"]),
  testStatus: z33.enum(["unknown", "passing", "failing", "no_tests"]),
  documentationStatus: z33.enum(["unknown", "present", "missing", "incomplete"]),
  lastActivity: z33.string()
  // ISO timestamp
});
var QueryDevelopmentSessionSchema = z33.object({
  // Session Metadata
  sessionId: z33.string(),
  queryPath: z33.string(),
  language: z33.string(),
  queryType: z33.string().optional(),
  description: z33.string().optional(),
  startTime: z33.string(),
  // ISO timestamp
  endTime: z33.string().optional(),
  // ISO timestamp
  status: z33.enum(["active", "completed", "failed", "abandoned"]),
  // MCP Call History
  mcpCalls: z33.array(MCPCallRecordSchema),
  // Test Execution Records
  testExecutions: z33.array(TestExecutionRecordSchema),
  // Quality Metrics
  qualityScores: z33.array(QualityScoreRecordSchema),
  // Development State
  currentState: QueryStateSchema,
  recommendations: z33.array(z33.string()),
  nextSuggestedTool: z33.string().optional()
});
var SessionFilterSchema = z33.object({
  queryPath: z33.string().optional(),
  status: z33.string().optional(),
  dateRange: z33.tuple([z33.string(), z33.string()]).optional(),
  language: z33.string().optional(),
  queryType: z33.string().optional()
});
var ComparisonReportSchema = z33.object({
  sessionIds: z33.array(z33.string()),
  dimensions: z33.array(z33.string()),
  timestamp: z33.string(),
  results: z33.record(z33.any())
});
var AggregateReportSchema = z33.object({
  filters: SessionFilterSchema,
  timestamp: z33.string(),
  totalSessions: z33.number(),
  successRate: z33.number(),
  averageQualityScore: z33.number(),
  commonPatterns: z33.array(z33.string()),
  recommendations: z33.array(z33.string())
});
var ExportResultSchema = z33.object({
  format: z33.enum(["json", "html", "markdown"]),
  filename: z33.string(),
  content: z33.string(),
  timestamp: z33.string()
});
var FunctionalTestResultSchema = z33.object({
  sessionId: z33.string(),
  queryPath: z33.string(),
  passed: z33.boolean(),
  criteria: z33.record(z33.any()),
  details: z33.record(z33.any()),
  timestamp: z33.string()
});
var TestReportSchema = z33.object({
  sessionIds: z33.array(z33.string()),
  criteria: z33.record(z33.any()),
  timestamp: z33.string(),
  overallPassRate: z33.number(),
  results: z33.array(FunctionalTestResultSchema),
  summary: z33.record(z33.any())
});
var MonitoringConfigSchema = z33.object({
  storageLocation: z33.string().default(".ql-mcp-tracking/"),
  autoTrackSessions: z33.boolean().default(true),
  retentionDays: z33.number().default(90),
  includeCallParameters: z33.boolean().default(true),
  includeCallResults: z33.boolean().default(true),
  maxActiveSessionsPerQuery: z33.number().default(3),
  scoringFrequency: z33.enum(["per_call", "periodic", "manual"]).default("per_call"),
  archiveCompletedSessions: z33.boolean().default(true),
  enableRecommendations: z33.boolean().default(true),
  enableMonitoringTools: z33.boolean().default(false)
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
    const adapter = new JSONFileSync(join9(this.storageDir, "sessions.json"));
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
      if (!existsSync7(this.storageDir)) {
        mkdirSync6(this.storageDir, { recursive: true });
      }
      const subdirs = ["sessions-archive", "exports"];
      for (const subdir of subdirs) {
        const subdirPath = join9(this.storageDir, subdir);
        if (!existsSync7(subdirPath)) {
          mkdirSync6(subdirPath, { recursive: true });
        }
      }
      const configPath = join9(this.storageDir, "config.json");
      if (!existsSync7(configPath)) {
        writeFileSync6(configPath, JSON.stringify(this.config, null, 2));
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
    const sessionId = randomUUID();
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
      const archiveDir = join9(this.storageDir, "sessions-archive", monthDir);
      if (!existsSync7(archiveDir)) {
        mkdirSync6(archiveDir, { recursive: true });
      }
      const archiveFile = join9(archiveDir, `${sessionId}.json`);
      writeFileSync6(archiveFile, JSON.stringify(session, null, 2));
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
    const configPath = join9(this.storageDir, "config.json");
    writeFileSync6(configPath, JSON.stringify(this.config, null, 2));
    logger.info("Updated monitoring configuration");
  }
};
function parseBoolEnv(envVar, defaultValue) {
  if (envVar === void 0) return defaultValue;
  return envVar.toLowerCase() === "true" || envVar === "1";
}
var sessionDataManager = new SessionDataManager({
  storageLocation: process.env.MONITORING_STORAGE_LOCATION || ".ql-mcp-tracking/",
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
      sessionId: z34.string().describe("ID of the session to end"),
      status: z34.enum(["completed", "failed", "abandoned"]).describe("Final status of the session")
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
      sessionId: z34.string().describe("ID of the session to retrieve")
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
      queryPath: z34.string().optional().describe("Filter by query path (partial match)"),
      status: z34.string().optional().describe("Filter by session status"),
      dateRange: z34.array(z34.string()).length(2).optional().describe("Filter by date range [start, end] (ISO timestamps)"),
      language: z34.string().optional().describe("Filter by programming language"),
      queryType: z34.string().optional().describe("Filter by query type")
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
      sessionId: z34.string().describe("ID of the session to update"),
      filesPresent: z34.array(z34.string()).optional().describe("List of files present in the query development"),
      compilationStatus: z34.enum(["unknown", "success", "failed"]).optional().describe("Current compilation status"),
      testStatus: z34.enum(["unknown", "passing", "failing", "no_tests"]).optional().describe("Current test status"),
      documentationStatus: z34.enum(["unknown", "present", "missing", "incomplete"]).optional().describe("Documentation status")
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
      sessionId: z34.string().describe("ID of the session"),
      limit: z34.number().optional().describe("Maximum number of calls to return (most recent first)")
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
      sessionId: z34.string().describe("ID of the session"),
      limit: z34.number().optional().describe("Maximum number of test executions to return (most recent first)")
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
      sessionId: z34.string().describe("ID of the session"),
      limit: z34.number().optional().describe("Maximum number of scores to return (most recent first)")
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
      sessionId: z34.string().describe("ID of the session")
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
      sessionIds: z34.array(z34.string()).describe("Array of session IDs to compare"),
      dimensions: z34.array(z34.string()).optional().describe("Specific dimensions to compare (default: all)")
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
      queryPath: z34.string().optional().describe("Filter by query path (partial match)"),
      status: z34.string().optional().describe("Filter by session status"),
      dateRange: z34.array(z34.string()).length(2).optional().describe("Filter by date range [start, end] (ISO timestamps)"),
      language: z34.string().optional().describe("Filter by programming language"),
      queryType: z34.string().optional().describe("Filter by query type")
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
      sessionIds: z34.array(z34.string()).describe("Array of session IDs to export"),
      format: z34.enum(["json", "html", "markdown"]).optional().default("json").describe("Export format")
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
    scoreId: randomUUID2(),
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

// src/ql-mcp-server.ts
init_logger();
dotenv.config();
var PACKAGE_NAME = "codeql-development-mcp-server";
var VERSION = "1.0.0";
async function startServer(mode = "stdio") {
  logger.info(`Starting CodeQL Development MCP McpServer v${VERSION} in ${mode} mode`);
  const server = new McpServer({
    name: PACKAGE_NAME,
    version: VERSION
  });
  registerCodeQLTools(server);
  registerCodeQLResources(server);
  registerLanguageResources(server);
  registerWorkflowPrompts(server);
  registerMonitoringTools(server);
  await sessionDataManager.initialize();
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
    return new Promise((resolve8, reject) => {
      const httpServer = app.listen(port, host, () => {
        logger.info(`HTTP server listening on http://${host}:${port}/mcp`);
        resolve8();
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
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export {
  startServer
};
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
//# sourceMappingURL=ql-mcp-server.js.map
