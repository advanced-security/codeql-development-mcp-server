/**
 * Metadata Commands
 * Commands for processing query metadata
 */

import { dirname } from "path";
import { writeFile, mkdir } from "fs/promises";
import {
  aggregateQueryMetadata,
  consoleProgressCallback as aggregateProgressCallback
} from "../aggregate-query-metadata.js";
import { ensureServerRunning } from "../server-manager.js";
import {
  filterQueryMetadata,
  consoleProgressCallback as filterProgressCallback
} from "../queries-filter-metadata.js";
import {
  processQueryMetadata,
  consoleProgressCallback as processProgressCallback
} from "../process-query-metadata.js";
import {
  resolveAllQueries,
  consoleProgressCallback as resolveProgressCallback
} from "../resolve-all-queries.js";
import { connectWithRetry } from "../mcp-client-utils.js";

/**
 * Execute the queries-metadata-collect command
 * @param {Object} client - CodeQLMCPClient instance
 * @param {Object} options - Command options
 */
export async function executeQueriesMetadataCollectCommand(client, _options = {}) {
  const inputFile = process.env.OUTPUT_DIR + "/codeql-resolve-queries.json";
  const outputFile = process.env.OUTPUT_DIR + "/ql_queries_metadata.json";
  const maxQueries = process.env.MAX_QUERIES ? parseInt(process.env.MAX_QUERIES) : undefined;
  const timeout = parseInt(process.env.MCP_TIMEOUT || "120000");

  if (!process.env.OUTPUT_DIR) {
    throw new Error("OUTPUT_DIR environment variable is required");
  }

  // Suppress client logging to avoid polluting JSON output
  const originalLog = client.logger.log.bind(client.logger);
  client.logger.log = () => {}; // Disable logging

  // Ensure server is running before connecting
  await ensureServerRunning();

  // Connect to server (with automatic retry on session conflict)
  await connectWithRetry(client);

  try {
    const result = await aggregateQueryMetadata(client, {
      inputFile,
      maxQueries,
      timeout,
      progressCallback: aggregateProgressCallback
    });

    // Serialize JSON once
    const output = JSON.stringify(result, null, 2);

    // Write directly to file (reliable for large JSON datasets)
    try {
      // Ensure output directory exists
      await mkdir(dirname(outputFile), { recursive: true });
      // Write file with UTF-8 encoding
      await writeFile(outputFile, output, "utf-8");
    } catch (error) {
      throw new Error(`Failed to write output file ${outputFile}: ${error.message}`);
    }

    // Log summary to stderr
    console.error("\n");
    if (maxQueries) {
      console.error(
        `Successfully processed ${maxQueries} queries (out of ${result.totalAvailable} total)`
      );
    } else {
      console.error(`Successfully processed ${result.count} queries`);
    }
    console.error(`Output file: ${outputFile}`);
  } finally {
    // Disconnect before restoring logger to avoid disconnect log message
    await client.disconnect();
    // Restore logger
    client.logger.log = originalLog;
  }
}

/**
 * Execute the queries-metadata-process command
 * @param {Object} _client - CodeQLMCPClient instance (not used for this command)
 * @param {Object} _options - Command options
 */
export async function executeQueriesMetadataProcessCommand(_client, _options = {}) {
  const inputFile =
    process.env.QL_QUERIES_METADATA_INPUT_FILE ||
    process.env.OUTPUT_DIR + "/ql_queries_metadata.json";
  const outputFile = process.env.OUTPUT_DIR
    ? process.env.OUTPUT_DIR + "/ql_queries_processed.json"
    : null;

  if (!inputFile) {
    throw new Error(
      "QL_QUERIES_METADATA_INPUT_FILE or OUTPUT_DIR environment variable is required"
    );
  }

  const result = processQueryMetadata({
    inputFile,
    progressCallback: processProgressCallback
  });

  // Serialize JSON once
  const output = JSON.stringify(result, null, 2);

  // Write directly to file (reliable for large JSON datasets)
  if (outputFile) {
    try {
      // Ensure output directory exists
      await mkdir(dirname(outputFile), { recursive: true });
      // Write file with UTF-8 encoding
      await writeFile(outputFile, output, "utf-8");
    } catch (error) {
      throw new Error(`Failed to write output file ${outputFile}: ${error.message}`);
    }
  } else {
    throw new Error(
      "OUTPUT_DIR environment variable is required for queries-metadata-process command"
    );
  }

  // Log summary to stderr
  console.error("\n");
  console.error(`Successfully processed metadata for ${result.summary.totalQueries} queries`);
  console.error(
    `Found ${result.summary.languages.length} languages: ${result.summary.languages.join(", ")}`
  );
  console.error(`Identified ${result.summary.totalTags} unique tags`);
  console.error(`Output file: ${outputFile}`);
}

/**
 * Execute the queries-metadata-filter command
 * @param {Object} _client - CodeQLMCPClient instance (not used for this command)
 * @param {Object} _options - Command options
 */
export async function executeQueriesMetadataFilterCommand(_client, _options = {}) {
  const inputFile =
    process.env.QL_QUERIES_METADATA_INPUT_FILE ||
    process.env.OUTPUT_DIR + "/ql_queries_metadata.json";
  const outputFile = process.env.OUTPUT_DIR + "/ql_queries_regenerable.json";
  const language = process.env.QL_CODE_LANGUAGE || "all";

  if (!inputFile) {
    throw new Error(
      "QL_QUERIES_METADATA_INPUT_FILE or OUTPUT_DIR environment variable is required"
    );
  }

  if (!process.env.OUTPUT_DIR) {
    throw new Error("OUTPUT_DIR environment variable is required");
  }

  const result = filterQueryMetadata({
    inputFile,
    language,
    progressCallback: filterProgressCallback
  });

  // Serialize JSON once
  const output = JSON.stringify(result, null, 2);

  // Write directly to file (reliable for large JSON datasets)
  try {
    // Ensure output directory exists
    await mkdir(dirname(outputFile), { recursive: true });
    // Write file with UTF-8 encoding
    await writeFile(outputFile, output, "utf-8");
  } catch (error) {
    throw new Error(`Failed to write output file ${outputFile}: ${error.message}`);
  }

  // Log summary to stderr
  console.error("\n");
  console.error(
    `Filtered ${result.metadata.regenerableCount} regenerable queries from ${result.metadata.totalQueries} total queries`
  );
  console.error(`Language filter: ${language}`);
  console.error(`Output file: ${outputFile}`);
}

/**
 * Execute the resolve-all-queries command
 * @param {Object} client - CodeQLMCPClient instance
 * @param {Object} _options - Command options
 */
export async function executeResolveAllQueriesCommand(client, _options = {}) {
  const packsFile = process.env.OUTPUT_DIR + "/codeql-pack-ls.json";
  const outputFile = process.env.OUTPUT_DIR + "/codeql-resolve-queries.json";
  const timeout = parseInt(process.env.MCP_TIMEOUT || "120000");

  if (!process.env.OUTPUT_DIR) {
    throw new Error("OUTPUT_DIR environment variable is required");
  }

  // Suppress client logging to avoid polluting output
  const originalLog = client.logger.log.bind(client.logger);
  client.logger.log = () => {}; // Disable logging

  // Ensure server is running before connecting
  await ensureServerRunning();

  // Connect to server (with automatic retry on session conflict)
  await connectWithRetry(client);

  try {
    const queries = await resolveAllQueries(client, {
      packsFile,
      timeout,
      progressCallback: resolveProgressCallback
    });

    // Serialize JSON once
    const output = JSON.stringify(queries, null, 2);

    // Write directly to file (reliable for large datasets)
    try {
      // Ensure output directory exists
      await mkdir(dirname(outputFile), { recursive: true });
      // Write file with UTF-8 encoding
      await writeFile(outputFile, output, "utf-8");
    } catch (error) {
      throw new Error(`Failed to write output file ${outputFile}: ${error.message}`);
    }

    // Log summary to stderr
    console.error(`Output file: ${outputFile}`);
  } finally {
    // Disconnect before restoring logger to avoid disconnect log message
    await client.disconnect();
    // Restore logger
    client.logger.log = originalLog;
  }
}
