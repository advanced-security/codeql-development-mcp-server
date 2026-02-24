/**
 * CLI argument parser for the CodeQL MCP Client
 * Provides structured command parsing with subcommands and options
 */

/**
 * Parse CLI arguments into a structured command object
 * @param {string[]} args - Process arguments (from process.argv.slice(2))
 * @returns {Object} Parsed command with subcommand and options
 */
export function parseCliArgs(args) {
  // Default command if no args provided - show help
  if (args.length === 0) {
    return {
      command: "help",
      options: {}
    };
  }

  // First argument is the subcommand (if it doesn't start with --)
  const firstArg = args[0];
  let command = "help";
  let startIdx = 0;
  let subcommand = null;

  if (!firstArg.startsWith("--")) {
    command = firstArg;
    startIdx = 1;

    // Check if there's a subcommand (for 'list' and 'server' commands)
    if (
      (command === "list" || command === "server") &&
      args.length > 1 &&
      !args[1].startsWith("--")
    ) {
      subcommand = args[1];
      startIdx = 2;
    }
  }

  // Parse options
  const options = {};
  for (let i = startIdx; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.substring(2);

      // Handle negated boolean flags (--no-<flag>)
      if (key.startsWith("no-")) {
        const positiveKey = key.substring(3);
        options[positiveKey] = false;
      } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        // Check if next arg is a value or another flag
        const value = args[i + 1];
        // Handle comma-separated values
        if (value.includes(",")) {
          options[key] = value.split(",").map((v) => v.trim());
        } else {
          options[key] = value;
        }
        i++; // Skip the value
      } else {
        // Boolean flag
        options[key] = true;
      }
    }
  }

  return {
    command,
    subcommand,
    options
  };
}

/**
 * Display help information for the CLI
 * @returns {string} Help text
 */
export function getHelpText() {
  return `
CodeQL MCP Client - Integration testing CLI for the CodeQL Development MCP Server

USAGE:
  node src/ql-mcp-client.js [COMMAND] [OPTIONS]
  ---- OR ----
  node client/src/ql-mcp-client.js [COMMAND] [OPTIONS]

COMMANDS:
  help                       Display this help message (default)
  integration-tests          Run integration tests
  list primitives            List all currently registered MCP server primitives (prompts, resources, and tools)
  list prompts               List all currently registered MCP server prompts
  list resources             List all currently registered MCP server resources
  list tools                 List all currently registered MCP server tools
  queries-metadata-collect   Collect metadata for CodeQL queries using find_codeql_query_files
  queries-metadata-process   Process collected query metadata to generate coverage analysis
  query-files-copy           Copy query-related files to scratch directory (excludes .ql files)
  resolve-all-queries        Resolve all CodeQL queries from query packs in a repository
  server start               Start the MCP server
  server stop                Stop the MCP server
  source-root-validate       Validate SOURCE_ROOT environment variable and directory structure

OPTIONS:
  --format <format>    Output format for list commands: text (default) or json
                       Example: --format json

  --mode <mode>        Server transport mode: stdio or http (default: http)
                       Example: --mode http

  --host <host>        Server host for HTTP mode (default: localhost)
                       Example: --host localhost

  --port <port>        Server port for HTTP mode (default: 3000)
                       Example: --port 3000

  --scheme <scheme>    Server scheme for HTTP mode (default: http)
                       Example: --scheme http

  --tools <tools>      Comma-separated list of tool names to test (integration-tests only)
                       Example: --tools codeql_query_run,codeql_query_format

  --tests <tests>      Comma-separated list of test names to run (integration-tests only)
                       Only applicable when a single tool is specified
                       Example: --tests basic_query_run,javascript_tools_print_ast

  --install-packs      Install CodeQL pack dependencies before running tests (default: true)
                       Set to --no-install-packs to skip pack installation for faster test runs
                       Example: --no-install-packs

  --timeout <seconds>  Timeout in seconds for each tool call (integration-tests only, default: 30)
                       Example: --timeout 600

  --help               Display help information

ENVIRONMENT VARIABLES:
  MCP_MODE             MCP transport mode: stdio (default) or http
  MCP_SERVER_PATH      Path to the MCP server JS entry point (stdio mode only)
  MCP_SERVER_URL       MCP server URL (http mode only, default: http://localhost:3000/mcp)
  ENABLE_MONITORING_TOOLS  Enable session_* monitoring tools (default: false)
`;
}

/**
 * Validate parsed CLI arguments
 * @param {Object} parsed - Parsed command object
 * @returns {Object} Validation result with isValid and error
 */
export function validateCliArgs(parsed) {
  const { command, subcommand, options } = parsed;

  // Validate command
  const validCommands = [
    "help",
    "integration-tests",
    "list",
    "queries-metadata-collect",
    "queries-metadata-process",
    "query-files-copy",
    "resolve-all-queries",
    "server",
    "source-root-validate"
  ];
  if (!validCommands.includes(command)) {
    return {
      isValid: false,
      error: `Invalid command: ${command}. Valid commands: ${validCommands.join(", ")}`
    };
  }

  // Validate list subcommands
  if (command === "list") {
    const validSubcommands = ["primitives", "prompts", "resources", "tools"];
    if (!subcommand) {
      return {
        isValid: false,
        error: `Missing subcommand for 'list'. Valid subcommands: ${validSubcommands.join(", ")}`
      };
    }
    if (!validSubcommands.includes(subcommand)) {
      return {
        isValid: false,
        error: `Invalid list subcommand: ${subcommand}. Valid subcommands: ${validSubcommands.join(", ")}`
      };
    }

    // Validate format option for list commands
    if (options.format && !["text", "json"].includes(options.format)) {
      return {
        isValid: false,
        error: `Invalid format: ${options.format}. Valid formats: text, json`
      };
    }
  }

  // Validate server subcommands
  if (command === "server") {
    const validSubcommands = ["start", "stop"];
    if (!subcommand) {
      return {
        isValid: false,
        error: `Missing subcommand for 'server'. Valid subcommands: ${validSubcommands.join(", ")}`
      };
    }
    if (!validSubcommands.includes(subcommand)) {
      return {
        isValid: false,
        error: `Invalid server subcommand: ${subcommand}. Valid subcommands: ${validSubcommands.join(", ")}`
      };
    }

    // Validate mode option
    if (options.mode && !["stdio", "http"].includes(options.mode)) {
      return {
        isValid: false,
        error: `Invalid mode: ${options.mode}. Valid modes: stdio, http`
      };
    }

    // Validate port option
    if (options.port) {
      const port = parseInt(options.port);
      if (isNaN(port) || port <= 0 || port > 65535) {
        return {
          isValid: false,
          error: `Invalid port: ${options.port}. Must be a number between 1 and 65535.`
        };
      }
    }
  }

  // Validate timeout if provided
  if (options.timeout !== undefined) {
    const timeout = parseInt(options.timeout);
    if (isNaN(timeout) || timeout <= 0) {
      return {
        isValid: false,
        error: `Invalid timeout value: ${options.timeout}. Must be a positive number.`
      };
    }
  }

  // Validate iterations if provided
  if (options.iterations !== undefined) {
    const iterations = parseInt(options.iterations);
    if (isNaN(iterations) || iterations <= 0) {
      return {
        isValid: false,
        error: `Invalid iterations value: ${options.iterations}. Must be a positive number.`
      };
    }
  }

  // Validate success-rate if provided
  if (options["success-rate"] !== undefined) {
    const successRate = parseFloat(options["success-rate"]);
    if (isNaN(successRate) || successRate < 0 || successRate > 1) {
      return {
        isValid: false,
        error: `Invalid success-rate value: ${options["success-rate"]}. Must be a number between 0.0 and 1.0.`
      };
    }
  }

  // Validate that --tests is only used with a single --tools value
  if (options.tests && options.tools) {
    const tools = Array.isArray(options.tools) ? options.tools : [options.tools];
    if (tools.length > 1) {
      return {
        isValid: false,
        error: "The --tests option can only be used when specifying a single tool with --tools"
      };
    }
  }

  return { isValid: true };
}
