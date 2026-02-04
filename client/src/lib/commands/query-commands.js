/**
 * Query Commands
 * Commands for working with CodeQL query files
 */

import fs from "fs";
import path from "path";
import { ensureServerRunning } from "../server-manager.js";
import { connectWithRetry } from "../mcp-client-utils.js";

/**
 * Copy query-related files to a scratch directory
 * Preserves directory structure and excludes .ql files so LLM can generate them
 *
 * Required environment variables:
 * - QUERY_FILE: Path to the .ql query file (absolute or relative to current directory)
 * - OUTPUT_DIR: Output/scratch directory to copy files to
 *
 * Optional environment variables (auto-derived from find_codeql_query_files if not provided):
 * - SOURCE_ROOT: Root directory of the source repository (defaults to REPO_ROOT or cwd)
 * - QUERY_ID: Unique identifier for the query (defaults to query filename without extension)
 *
 * @param {Object} client - CodeQLMCPClient instance
 * @param {Object} _options - Command options
 */
export async function executeQueryFilesCopyCommand(client, _options = {}) {
  // Configuration from environment
  const queryFile = process.env.QUERY_FILE;
  const outputDir = path.resolve(process.env.OUTPUT_DIR || "client/scratch");

  if (!queryFile) {
    console.error("Error: QUERY_FILE environment variable is required");
    process.exit(1);
  }

  // Resolve the query file path
  const absoluteQueryPath = path.resolve(queryFile);

  if (!fs.existsSync(absoluteQueryPath)) {
    console.error(`Error: Query file not found: ${absoluteQueryPath}`);
    process.exit(1);
  }

  // Determine source root - try to find it from the query path
  let sourceRoot = process.env.SOURCE_ROOT || process.env.REPO_ROOT;
  if (!sourceRoot) {
    // Try to infer source root by walking up to find a common structure
    sourceRoot = path.dirname(absoluteQueryPath);
    // Walk up until we find a directory that looks like a root (has .git or qlpack.yml at top level)
    let current = sourceRoot;
    while (current !== path.dirname(current)) {
      if (
        fs.existsSync(path.join(current, ".git")) ||
        fs.existsSync(path.join(current, "qlpack.yml"))
      ) {
        sourceRoot = current;
        break;
      }
      current = path.dirname(current);
    }
  }
  sourceRoot = path.resolve(sourceRoot);

  // Get query ID from environment or derive from filename
  const queryName = path.basename(absoluteQueryPath, ".ql");
  const queryId = process.env.QUERY_ID || queryName;

  console.error(`Query file: ${absoluteQueryPath}`);
  console.error(`Source root: ${sourceRoot}`);
  console.error(`Output directory: ${outputDir}`);
  console.error(`Query ID: ${queryId}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Call find_codeql_query_files MCP tool to get all related files
  console.error("\nCalling find_codeql_query_files MCP tool...");

  // Suppress client logging
  const originalLog = client.logger?.log?.bind(client.logger);
  if (client.logger && originalLog) {
    client.logger.log = () => {};
  }

  // Ensure server is running and connect
  await ensureServerRunning();
  await connectWithRetry(client);

  let queryFilesResult;
  try {
    const timeoutValue = parseInt(process.env.MCP_TIMEOUT || "120000", 10);
    const timeout = Number.isNaN(timeoutValue) ? 120000 : timeoutValue;
    const result = await client.callTool(
      "find_codeql_query_files",
      { queryPath: absoluteQueryPath, resolveMetadata: true },
      { timeout }
    );

    // Parse the result
    if (result.content && result.content[0] && result.content[0].text) {
      queryFilesResult = JSON.parse(result.content[0].text);
    } else {
      throw new Error("Invalid response from find_codeql_query_files");
    }
  } catch (error) {
    console.error(`Error calling find_codeql_query_files: ${error.message}`);
    process.exit(1);
  } finally {
    await client.disconnect();
    if (client.logger && originalLog) {
      client.logger.log = originalLog;
    }
  }

  console.error(`Language detected: ${queryFilesResult.language}`);
  console.error(`Query name: ${queryFilesResult.queryName}`);

  const result = {
    queryId,
    queryName: queryFilesResult.queryName,
    language: queryFilesResult.language,
    sourceRoot,
    outputDir,
    copiedFiles: [],
    skippedFiles: [],
    errors: [],
    paths: {}
  };

  /**
   * Copy a file to the output directory, preserving relative structure
   * @param {string} filePath - Full path to source file
   * @param {string} sourceBase - Base source directory
   * @param {string} outputBase - Base output directory
   * @returns {string|null} Destination path or null if failed
   */
  function copyFile(filePath, sourceBase, outputBase) {
    if (!filePath) return null;

    try {
      const sourcePath = path.resolve(filePath);

      if (!fs.existsSync(sourcePath)) {
        result.skippedFiles.push({ path: filePath, reason: "File not found" });
        return null;
      }

      // Determine relative path from source root
      let relPath;
      if (sourcePath.startsWith(sourceBase)) {
        relPath = path.relative(sourceBase, sourcePath);
      } else {
        // Use just the filename if outside source root
        relPath = path.basename(filePath);
      }

      // Create destination path
      const destPath = path.join(outputBase, relPath);
      const destDir = path.dirname(destPath);

      // Create destination directory
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy the file
      fs.copyFileSync(sourcePath, destPath);
      result.copiedFiles.push({ source: sourcePath, dest: destPath });

      return destPath;
    } catch (error) {
      result.errors.push({ path: filePath, error: error.message });
      return null;
    }
  }

  /**
   * Copy a directory recursively to the output directory
   * @param {string} dirPath - Full path to source directory
   * @param {string} sourceBase - Base source directory
   * @param {string} outputBase - Base output directory
   * @param {boolean} excludeQlFiles - Whether to exclude .ql files
   * @returns {string|null} Destination path or null if failed
   */
  function copyDirectory(dirPath, sourceBase, outputBase, excludeQlFiles = false) {
    if (!dirPath) return null;

    try {
      const sourcePath = path.resolve(dirPath);

      if (!fs.existsSync(sourcePath)) {
        result.skippedFiles.push({ path: dirPath, reason: "Directory not found" });
        return null;
      }

      // Determine relative path from source root
      let relPath;
      if (sourcePath.startsWith(sourceBase)) {
        relPath = path.relative(sourceBase, sourcePath);
      } else {
        relPath = path.basename(dirPath);
      }

      // Create destination path
      const destPath = path.join(outputBase, relPath);

      // Recursive copy function
      function copyDirRecursive(src, dest) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPathEntry = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPathEntry);
          } else if (excludeQlFiles && entry.name.toLowerCase().endsWith(".ql")) {
            // Skip .ql files - they will be generated by Copilot
            result.skippedFiles.push({
              path: srcPath,
              reason: "Query file excluded for regeneration"
            });
          } else {
            fs.copyFileSync(srcPath, destPathEntry);
            result.copiedFiles.push({ source: srcPath, dest: destPathEntry });
          }
        }
      }

      copyDirRecursive(sourcePath, destPath);
      return destPath;
    } catch (error) {
      result.errors.push({ path: dirPath, error: error.message });
      return null;
    }
  }

  /**
   * Find and copy qlpack.yml files from a directory and its parents
   * @param {string} targetDir - Directory to start from
   * @param {string} sourceBase - Base source directory
   * @param {string} outputBase - Base output directory
   * @returns {string[]} Array of copied qlpack file paths
   */
  function copyQlpackFiles(targetDir, sourceBase, outputBase) {
    if (!targetDir) return [];

    const copiedPacks = [];
    let currentDir = path.resolve(targetDir);

    // Walk up the directory tree looking for qlpack files
    while (currentDir.startsWith(sourceBase) && currentDir !== sourceBase) {
      for (const qlpackName of ["qlpack.yml", "codeql-pack.yml", "codeql-pack.lock.yml"]) {
        const qlpackPath = path.join(currentDir, qlpackName);
        if (fs.existsSync(qlpackPath)) {
          const relPath = path.relative(sourceBase, qlpackPath);
          const destPath = path.join(outputBase, relPath);
          const destDir = path.dirname(destPath);

          if (!fs.existsSync(destPath)) {
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(qlpackPath, destPath);
            result.copiedFiles.push({ source: qlpackPath, dest: destPath });
            copiedPacks.push(destPath);
          }
        }
      }
      currentDir = path.dirname(currentDir);
    }

    return copiedPacks;
  }

  // Extract paths from the find_codeql_query_files result
  const queryDir = queryFilesResult.files.query.dir;
  const testDir = queryFilesResult.files.test.dir;
  const testCodeFiles = queryFilesResult.files.test.testCode || [];

  // Copy test directory (contains test code and expected results)
  console.error("\nCopying test directory...");
  if (queryFilesResult.status.testDirectoryExists) {
    const copiedTestDir = copyDirectory(testDir, sourceRoot, outputDir);
    if (copiedTestDir) {
      result.paths.testDirectory = copiedTestDir;
    }
  }

  // Copy query directory (but exclude the .ql file itself)
  console.error("Copying query directory (excluding .ql files)...");
  const copiedQueryDir = copyDirectory(queryDir, sourceRoot, outputDir, true);
  if (copiedQueryDir) {
    result.paths.queryDirectory = copiedQueryDir;
  }

  // Store path where query file should be generated
  const relativeQueryPath = path.relative(sourceRoot, absoluteQueryPath);
  result.paths.queryFile = path.join(outputDir, relativeQueryPath);

  // Copy documentation file if it exists separately
  console.error("Copying documentation file...");
  if (queryFilesResult.status.documentationExists) {
    const docFile = path.join(queryDir, queryFilesResult.files.query.doc);
    const copiedDocFile = copyFile(docFile, sourceRoot, outputDir);
    if (copiedDocFile) {
      result.paths.documentationFile = copiedDocFile;
    }
  }

  // Copy qlpack files from query directory hierarchy
  console.error("Copying qlpack files for query...");
  copyQlpackFiles(queryDir, sourceRoot, outputDir);

  // Copy qlpack files from test directory hierarchy
  console.error("Copying qlpack files for tests...");
  if (queryFilesResult.status.testDirectoryExists) {
    copyQlpackFiles(testDir, sourceRoot, outputDir);
  }

  // Store paths derived from find_codeql_query_files result
  result.paths.expectedFile = queryFilesResult.status.expectedResultsExist
    ? path.join(
        outputDir,
        path.relative(sourceRoot, path.join(testDir, queryFilesResult.files.test.expected))
      )
    : null;
  result.paths.qlrefFile = queryFilesResult.status.qlrefExists
    ? path.join(
        outputDir,
        path.relative(sourceRoot, path.join(testDir, queryFilesResult.files.test.qlref))
      )
    : null;
  result.paths.testCodeFiles = testCodeFiles.map((f) => {
    const relPath = path.relative(sourceRoot, f);
    return path.join(outputDir, relPath);
  });

  // Include find_codeql_query_files result for reference
  result.queryFilesInfo = {
    language: queryFilesResult.language,
    queryName: queryFilesResult.queryName,
    allFilesExist: queryFilesResult.allFilesExist,
    status: queryFilesResult.status,
    metadata: queryFilesResult.metadata,
    packMetadata: queryFilesResult.packMetadata
  };

  // Include pack directory paths in result.paths
  result.paths.queryPackDir = queryFilesResult.files.query.packDir;
  result.paths.testPackDir = queryFilesResult.files.test.packDir;

  // Summary
  console.error("\n=== Copy Summary ===");
  console.error(`Query ID: ${queryId}`);
  console.error(`Source root: ${sourceRoot}`);
  console.error(`Output directory: ${outputDir}`);
  console.error(`Files copied: ${result.copiedFiles.length}`);
  console.error(`Files skipped: ${result.skippedFiles.length}`);
  console.error(`Errors: ${result.errors.length}`);

  // Write result JSON to file
  const resultFile = path.join(outputDir, `query-files-copy-${queryId}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  console.error(`\nResult written to: ${resultFile}`);

  // Output result to stdout for capture
  console.log(JSON.stringify(result, null, 2));

  // Exit with error if there were issues
  if (result.errors.length > 0) {
    console.error("\nErrors occurred during copy:");
    for (const err of result.errors) {
      console.error(`  - ${err.path}: ${err.error}`);
    }
    process.exit(1);
  }
}

/**
 * Console progress callback for query operations
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
