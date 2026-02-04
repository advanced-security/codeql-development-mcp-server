/**
 * Aggregate Query Metadata
 * Gathers metadata for CodeQL queries using the find_codeql_query_files MCP tool
 */

import { readFileSync } from "fs";

/**
 * Aggregate metadata for multiple CodeQL queries
 * @param {Object} client - Connected MCP client instance
 * @param {Object} options - Aggregation options
 * @param {string} options.inputFile - Path to JSON file containing query paths
 * @param {number} [options.maxQueries] - Optional limit on number of queries to process
 * @param {number} [options.timeout] - Timeout per query in milliseconds
 * @param {Function} [options.progressCallback] - Optional callback for progress updates
 * @returns {Promise<Object>} Aggregated results with count and query metadata
 */
export async function aggregateQueryMetadata(client, options = {}) {
  const { inputFile, maxQueries, timeout = 120000, progressCallback } = options;

  // Read the input file containing query paths
  const queries = JSON.parse(readFileSync(inputFile, "utf-8"));

  // Apply limit if specified
  let processQueries = queries;
  if (maxQueries && maxQueries > 0) {
    processQueries = queries.slice(0, maxQueries);
    if (progressCallback) {
      progressCallback({
        type: "limit",
        message: `Limiting to first ${maxQueries} queries (out of ${queries.length} total)`
      });
    }
  }

  const total = processQueries.length;

  if (total === 0) {
    throw new Error("No queries found in input file");
  }

  if (progressCallback) {
    progressCallback({
      type: "start",
      message: `Processing ${total} queries...`,
      total
    });
  }

  const results = [];
  let processed = 0;

  for (const queryPath of processQueries) {
    processed++;

    const percentage = Math.round((processed / total) * 100);
    if (progressCallback) {
      progressCallback({
        type: "progress",
        message: `Processing ${processed}/${total}: ${queryPath}`,
        processed,
        total,
        percentage,
        queryPath
      });
    }

    try {
      const startTime = Date.now();
      const result = await client.callTool("find_codeql_query_files", { queryPath }, { timeout });

      const duration = Date.now() - startTime;

      if (progressCallback) {
        progressCallback({
          type: "complete",
          message: `Completed in ${duration}ms`,
          duration
        });
      }

      // Extract metadata from MCP response
      let metadata;
      try {
        metadata = result.content[0]?.text ? JSON.parse(result.content[0].text) : result;
      } catch (parseError) {
        // If JSON parsing fails, store the raw response with an error indicator
        metadata = {
          error: "Failed to parse response",
          parseError: parseError.message,
          rawResponse: result.content[0]?.text || result
        };
      }

      results.push({
        queryPath,
        metadata
      });
    } catch (error) {
      if (progressCallback) {
        progressCallback({
          type: "error",
          message: error.message,
          queryPath
        });
      }

      results.push({
        queryPath,
        error: error.message
      });
    }

    // Progress separator every 10 queries
    if (processed % 10 === 0 && processed < total && progressCallback) {
      progressCallback({
        type: "separator",
        message: `--- Processed ${processed} of ${total} queries ---`
      });
    }
  }

  return {
    count: total,
    totalAvailable: queries.length,
    results
  };
}

/**
 * Default progress callback that logs to stderr
 * @param {Object} event - Progress event
 */
export function consoleProgressCallback(event) {
  switch (event.type) {
    case "limit":
    case "start":
      console.error(event.message);
      break;
    case "progress":
      console.error(`[${event.percentage}%] ${event.message}`);
      break;
    case "complete":
      console.error(`  ✓ ${event.message}`);
      break;
    case "error":
      console.error(`  ✗ Error: ${event.message}`);
      break;
    case "separator":
      console.error(event.message);
      break;
  }
}
