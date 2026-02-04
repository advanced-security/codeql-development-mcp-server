/**
 * Filter Query Metadata
 * Filters query metadata to find queries suitable for regeneration
 */

import { readFileSync } from "fs";

/**
 * Filter query metadata to identify queries suitable for regeneration
 * @param {Object} options - Filtering options
 * @param {string} options.inputFile - Path to JSON file containing query metadata
 * @param {string} [options.language] - Optional language filter (default: 'all')
 * @param {Function} [options.progressCallback] - Optional callback for progress updates
 * @returns {Object} Filtered results with regenerable queries
 */
export function filterQueryMetadata(options = {}) {
  const { inputFile, language = "all", progressCallback } = options;

  // Read the input file containing query metadata
  const metadata = JSON.parse(readFileSync(inputFile, "utf-8"));

  if (!metadata.queries || !Array.isArray(metadata.queries)) {
    throw new Error("Invalid input file format: missing or invalid 'queries' array");
  }

  const total = metadata.queries.length;

  if (progressCallback) {
    progressCallback({
      type: "start",
      message: `Filtering ${total} queries for regeneration...`,
      total
    });
  }

  // Define filter criteria
  const filterCriteria = {
    documentationExists: true,
    expectedResultsExist: true,
    hasTestCode: true,
    qlrefExists: true,
    queryExists: true
  };

  // Filter queries based on criteria
  const regenerableQueries = [];
  let processed = 0;

  for (const query of metadata.queries) {
    processed++;

    if (progressCallback && processed % 100 === 0) {
      const percentage = Math.round((processed / total) * 100);
      progressCallback({
        type: "progress",
        message: `Filtered ${processed}/${total} queries`,
        processed,
        total,
        percentage
      });
    }

    const status = query.status || {};

    // Check if query meets all regeneration criteria
    const isRegenerable =
      status.documentationExists === true &&
      status.expectedResultsExist === true &&
      status.hasTestCode === true &&
      status.qlrefExists === true &&
      status.queryExists === true;

    // If language filter is specified, also check language match
    const languageMatch = language === "all" || !language || query.language === language;

    if (isRegenerable && languageMatch) {
      regenerableQueries.push(query);
    }
  }

  if (progressCallback) {
    progressCallback({
      type: "complete",
      message: `Filtered ${regenerableQueries.length} regenerable queries from ${total} total queries`
    });
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      inputFile,
      language,
      totalQueries: total,
      regenerableCount: regenerableQueries.length,
      filterCriteria
    },
    queries: regenerableQueries
  };
}

/**
 * Console progress callback for filtering
 * @param {Object} event - Progress event
 */
export function consoleProgressCallback(event) {
  switch (event.type) {
    case "start":
      console.error(event.message);
      break;
    case "progress":
      console.error(`${event.message} (${event.percentage}%)`);
      break;
    case "complete":
      console.error(event.message);
      break;
    default:
      break;
  }
}
