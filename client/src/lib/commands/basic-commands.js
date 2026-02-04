/**
 * Basic Commands
 * Help, integration tests, list commands
 */

import { dirname, join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { getHelpText } from "../cli-parser.js";
import { ensureServerRunning, startServer, stopServer } from "../server-manager.js";
import { validateSourceRoot } from "../validate-source-root.js";
import { connectWithRetry } from "../mcp-client-utils.js";

// Get the directory of this module for resolving relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Repository root is 4 levels up from client/src/lib/commands/
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

/**
 * Execute the help command
 */
export function executeHelpCommand() {
  console.log(getHelpText());
  process.exit(0);
}

/**
 * Install CodeQL pack dependencies using the install-packs.sh script
 * @returns {boolean} Whether the installation was successful
 */
function installCodeQLPacks() {
  const scriptPath = join(REPO_ROOT, "server", "scripts", "install-packs.sh");

  try {
    console.log("📦 Installing CodeQL pack dependencies...");
    execFileSync(scriptPath, [], {
      encoding: "utf8",
      stdio: "inherit",
      cwd: REPO_ROOT,
      timeout: 300000 // 5 minute timeout
    });
    console.log("✅ CodeQL pack dependencies installed successfully");
    return true;
  } catch (error) {
    console.error(`❌ Failed to install CodeQL packs: ${error.message}`);
    return false;
  }
}

/**
 * Execute the integration-tests command
 * @param {Object} client - CodeQLMCPClient instance
 */
export async function executeIntegrationTestsCommand(client) {
  // Install packs if not explicitly disabled
  if (client.options.installPacks !== false) {
    if (!installCodeQLPacks()) {
      console.error("Aborting tests due to pack installation failure");
      process.exit(1);
    }
  } else {
    console.log("⏭️  Skipping CodeQL pack installation (--no-install-packs)");
  }

  await client.runTests();
}

/**
 * Execute the list command
 * @param {Object} client - CodeQLMCPClient instance
 * @param {string} subcommand - List subcommand (primitives, prompts, resources, tools)
 * @param {string} format - Output format (text or json)
 */
export async function executeListCommand(client, subcommand, format = "text") {
  // Ensure server is running before connecting
  await ensureServerRunning();

  // Connect to server (with automatic retry on session conflict)
  await connectWithRetry(client);

  try {
    switch (subcommand) {
      case "primitives":
        await client.listPrimitives(format);
        break;
      case "prompts":
        await client.listPromptsCommand(format);
        break;
      case "resources":
        await client.listResourcesCommand(format);
        break;
      case "tools":
        await client.listToolsCommand(format);
        break;
      default:
        throw new Error(`Unknown list subcommand: ${subcommand}`);
    }
  } finally {
    await client.disconnect();
  }
}

/**
 * Execute the server command
 * @param {string} subcommand - Server subcommand (start or stop)
 * @param {Object} options - Server options
 */
export async function executeServerCommand(subcommand, options = {}) {
  switch (subcommand) {
    case "start": {
      const serverOptions = {
        mode: options.mode || "http",
        host: options.host || "localhost",
        port: options.port ? parseInt(options.port) : 3000,
        scheme: options.scheme || "http"
      };
      await startServer(serverOptions);
      break;
    }
    case "stop":
      await stopServer();
      break;
    default:
      throw new Error(`Unknown server subcommand: ${subcommand}`);
  }
}

/**
 * Execute the source-root-validate command
 * @param {Object} _client - CodeQLMCPClient instance (not used for this command)
 * @param {Object} _options - Command options
 */
export async function executeSourceRootValidateCommand(_client, _options = {}) {
  const sourceRoot = process.env.SOURCE_ROOT;
  const outputFile = process.env.OUTPUT_DIR
    ? process.env.OUTPUT_DIR + "/validate-source-root.json"
    : null;

  const result = validateSourceRoot({ sourceRoot });

  // Serialize JSON once
  const output = JSON.stringify(result, null, 2);

  // Write directly to file if OUTPUT_DIR is set
  if (outputFile) {
    try {
      // Ensure output directory exists
      await mkdir(dirname(outputFile), { recursive: true });
      // Write file with UTF-8 encoding
      await writeFile(outputFile, output, "utf-8");
    } catch (error) {
      throw new Error(`Failed to write output file ${outputFile}: ${error.message}`);
    }
  }

  // Also write to stdout for display
  console.log(output);

  // Exit with error if validation failed
  if (!result.valid) {
    process.exit(1);
  }

  // Log summary to stderr if output file was written
  if (outputFile) {
    console.error(`Output file: ${outputFile}`);
  }
}
