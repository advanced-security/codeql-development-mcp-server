/**
 * Command handler for CLI commands
 * Orchestrates CLI execution and routes commands to appropriate handlers
 */

import { parseCliArgs, validateCliArgs, getHelpText } from "./cli-parser.js";
import {
  executeHelpCommand,
  executeIntegrationTestsCommand,
  executeListCommand,
  executeServerCommand,
  executeSourceRootValidateCommand
} from "./commands/basic-commands.js";
import {
  executeQueriesMetadataCollectCommand,
  executeQueriesMetadataProcessCommand,
  executeQueriesMetadataFilterCommand,
  executeResolveAllQueriesCommand
} from "./commands/metadata-commands.js";
import { executeQueryFilesCopyCommand } from "./commands/query-commands.js";

/**
 * Prepare client options from parsed CLI options
 * @param {Object} options - Parsed CLI options
 * @returns {Object} Client options
 */
export function prepareClientOptions(options) {
  return {
    timeout: options.timeout,
    iterations: options.iterations,
    successRate: options["success-rate"],
    tools: Array.isArray(options.tools) ? options.tools : options.tools ? [options.tools] : null,
    tests: Array.isArray(options.tests) ? options.tests : options.tests ? [options.tests] : null,
    // Default to true if not explicitly set to false
    installPacks: options["install-packs"] !== false
  };
}

/**
 * Main command handler - orchestrates CLI execution
 * @param {string[]} args - Command line arguments
 * @param {Function} clientFactory - Function to create CodeQLMCPClient instance
 */
export async function handleCommand(args, clientFactory) {
  // Parse CLI arguments
  const parsed = parseCliArgs(args);

  // Check for help command
  if (parsed.command === "help" || parsed.options.help) {
    executeHelpCommand();
    return; // Never reached due to process.exit, but explicit for clarity
  }

  // Validate arguments
  const validation = validateCliArgs(parsed);
  if (!validation.isValid) {
    console.error(`Error: ${validation.error}\n`);
    console.log(getHelpText());
    process.exit(1);
  }

  // Extract command and options
  const { command, subcommand, options } = parsed;

  // Prepare client options
  const clientOptions = prepareClientOptions(options);

  // Create client with options
  const client = clientFactory(clientOptions);

  // Execute the command
  switch (command) {
    case "integration-tests":
      await executeIntegrationTestsCommand(client);
      break;
    case "list":
      await executeListCommand(client, subcommand, options.format || "text");
      break;
    case "server":
      await executeServerCommand(subcommand, options);
      break;
    case "queries-metadata-collect":
      await executeQueriesMetadataCollectCommand(client, options);
      break;
    case "queries-metadata-filter":
      await executeQueriesMetadataFilterCommand(client, options);
      break;
    case "queries-metadata-process":
      await executeQueriesMetadataProcessCommand(client, options);
      break;
    case "query-files-copy":
      await executeQueryFilesCopyCommand(client, options);
      break;
    case "resolve-all-queries":
      await executeResolveAllQueriesCommand(client, options);
      break;
    case "source-root-validate":
      await executeSourceRootValidateCommand(client, options);
      break;
    case "help":
      // This case is already handled above, but included for completeness
      executeHelpCommand();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(getHelpText());
      process.exit(1);
  }
}
