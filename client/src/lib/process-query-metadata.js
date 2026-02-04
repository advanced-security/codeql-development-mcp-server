/**
 * Process Query Metadata
 * Processes aggregated query metadata to generate coverage analysis
 */

import { readFileSync } from "fs";

/**
 * Process query metadata to analyze coverage by language
 * @param {Object} options - Processing options
 * @param {string} options.inputFile - Path to JSON file containing aggregated query metadata
 * @param {Function} [options.progressCallback] - Optional callback for progress updates
 * @returns {Object} Processed results with coverage analysis
 */
export function processQueryMetadata(options = {}) {
  const { inputFile, progressCallback } = options;

  // Read the input file containing query metadata
  const data = JSON.parse(readFileSync(inputFile, "utf-8"));

  if (!data.results || !Array.isArray(data.results)) {
    throw new Error("Invalid input file format: missing or invalid 'results' array");
  }

  const results = data.results;
  const total = results.length;

  if (progressCallback) {
    progressCallback({
      type: "start",
      message: `Processing metadata for ${total} queries...`,
      total
    });
  }

  // Initialize aggregation structures
  const byLanguage = {};
  const tagCoverage = {};
  const languages = new Set();
  const allTags = new Set();

  // Process each query result
  let processed = 0;
  for (const queryResult of results) {
    processed++;

    if (progressCallback && processed % 100 === 0) {
      const percentage = Math.round((processed / total) * 100);
      progressCallback({
        type: "progress",
        message: `Processed ${processed}/${total} queries`,
        processed,
        total,
        percentage
      });
    }

    const { queryPath, metadata } = queryResult;

    // Skip if there's an error in the metadata
    if (queryResult.error || !metadata) {
      continue;
    }

    // Extract language from metadata
    const language = metadata.language;
    if (!language || language === "unknown") {
      continue;
    }

    languages.add(language);

    // Initialize language entry if not exists
    if (!byLanguage[language]) {
      byLanguage[language] = {
        queryCount: 0,
        tags: new Set(),
        queries: []
      };
    }

    // Increment query count
    byLanguage[language].queryCount++;

    // Add query path to queries list
    byLanguage[language].queries.push(queryPath);

    // Extract tags from metadata
    const queryMetadata = metadata.metadata;
    if (queryMetadata && queryMetadata.tags) {
      // Tags can be a string or an array
      const tags = Array.isArray(queryMetadata.tags)
        ? queryMetadata.tags
        : queryMetadata.tags.split(/\s+/);

      for (const tag of tags) {
        const trimmedTag = tag.trim();
        if (trimmedTag) {
          // Add to language-specific tags
          byLanguage[language].tags.add(trimmedTag);

          // Add to global tags
          allTags.add(trimmedTag);

          // Track which languages use this tag
          if (!tagCoverage[trimmedTag]) {
            tagCoverage[trimmedTag] = new Set();
          }
          tagCoverage[trimmedTag].add(language);
        }
      }
    }
  }

  if (progressCallback) {
    progressCallback({
      type: "complete",
      message: `Processed all ${total} queries`
    });
  }

  // Convert Sets to sorted arrays for output
  const sortedLanguages = Array.from(languages).sort();
  const sortedTags = Array.from(allTags).sort();

  const processedByLanguage = {};
  for (const [lang, data] of Object.entries(byLanguage)) {
    processedByLanguage[lang] = {
      queryCount: data.queryCount,
      tags: Array.from(data.tags).sort(),
      tagCount: data.tags.size
      // Optionally include queries list (can be large)
      // queries: data.queries
    };
  }

  const processedTagCoverage = {};
  for (const [tag, langs] of Object.entries(tagCoverage)) {
    processedTagCoverage[tag] = Array.from(langs).sort();
  }

  return {
    summary: {
      totalQueries: total,
      processedQueries: processed,
      languages: sortedLanguages,
      totalTags: sortedTags.length
    },
    byLanguage: processedByLanguage,
    tagCoverage: processedTagCoverage
  };
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
      console.error(`[${event.percentage}%] ${event.message}`);
      break;
    case "complete":
      console.error(`✓ ${event.message}`);
      break;
  }
}
