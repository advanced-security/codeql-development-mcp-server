/**
 * Resolve All Queries
 * Resolves CodeQL queries from all query packs in a repository
 */

import { readFileSync } from "fs";
import { dirname } from "path";

/**
 * Resolve queries from all query packs
 * @param {Object} client - Connected MCP client instance
 * @param {Object} options - Resolution options
 * @param {string} options.packsFile - Path to JSON file containing pack list from codeql_pack_ls
 * @param {number} [options.timeout] - Timeout per pack in milliseconds
 * @param {Function} [options.progressCallback] - Optional callback for progress updates
 * @returns {Promise<Array<string>>} Array of query file paths
 */
export async function resolveAllQueries(client, options = {}) {
  const { packsFile, timeout = 120000, progressCallback } = options;

  // Read the pack list from codeql_pack_ls (MCP response format)
  const packsData = JSON.parse(readFileSync(packsFile, "utf-8"));
  const packsText = packsData.content?.[0]?.text || "{}";

  // Parse just the JSON object part (before any warnings/info)
  const lines = packsText.split("\n");
  let jsonText = "";
  let braceCount = 0;
  let inJson = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{")) {
      inJson = true;
      braceCount = 1;
      jsonText = line + "\n";
      continue;
    }
    if (inJson) {
      jsonText += line + "\n";
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      if (braceCount === 0) {
        break;
      }
    }
  }

  const packsJson = JSON.parse(jsonText);
  const packs = packsJson.packs || {};

  // Filter for query packs (those ending in -queries)
  const queryPacks = Object.entries(packs)
    .filter(([_path, info]) => info.name.endsWith("-queries"))
    .map(([path, _info]) => dirname(path)); // Get directory containing qlpack.yml

  if (queryPacks.length === 0) {
    throw new Error("No query packs found in pack list");
  }

  const total = queryPacks.length;

  if (progressCallback) {
    progressCallback({
      type: "start",
      message: `Found ${total} query packs to process`,
      total
    });
  }

  const allQueries = [];
  let processedPacks = 0;

  for (const packDir of queryPacks) {
    processedPacks++;

    if (progressCallback) {
      progressCallback({
        type: "progress",
        message: `Processing pack ${processedPacks}/${total}: ${packDir}`,
        processed: processedPacks,
        total,
        packDir
      });
    }

    try {
      const result = await client.callTool(
        "codeql_resolve_queries",
        {
          directory: packDir,
          format: "bylanguage"
        },
        { timeout }
      );

      const resultText = result.content[0]?.text || "{}";

      // Parse the bylanguage format response
      const data = JSON.parse(resultText);

      // Extract query paths from byLanguage object structure
      // Format: { "byLanguage": { "language": { "/path/to/query.ql": {} } } }
      const queries = [];
      if (data.byLanguage && typeof data.byLanguage === "object") {
        for (const language of Object.values(data.byLanguage)) {
          if (language && typeof language === "object") {
            queries.push(...Object.keys(language));
          }
        }
      }

      if (queries.length > 0) {
        allQueries.push(...queries);
        if (progressCallback) {
          progressCallback({
            type: "pack-complete",
            message: `Found ${queries.length} queries in this pack`,
            count: queries.length
          });
        }
      } else if (progressCallback) {
        progressCallback({
          type: "pack-complete",
          message: "No queries found in this pack",
          count: 0
        });
      }
    } catch (error) {
      if (progressCallback) {
        progressCallback({
          type: "error",
          message: error.message,
          packDir
        });
      }
      // Continue processing other packs even if one fails
    }
  }

  if (progressCallback) {
    progressCallback({
      type: "complete",
      message: `Total queries found: ${allQueries.length}`,
      total: allQueries.length
    });
  }

  return allQueries;
}

/**
 * Default progress callback that logs to stderr
 * @param {Object} event - Progress event
 */
export function consoleProgressCallback(event) {
  switch (event.type) {
    case "start":
      console.error(event.message);
      break;
    case "progress":
      console.error(event.message);
      break;
    case "pack-complete":
      console.error(`  ${event.message}`);
      break;
    case "error":
      console.error(`  Error processing ${event.packDir}: ${event.message}`);
      break;
    case "complete":
      console.error(event.message);
      break;
  }
}
