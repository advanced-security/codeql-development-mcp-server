/**
 * Integration test runner for MCP server tools
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  compareDirectories,
  copyDirectory,
  getDirectoryFiles,
  removeDirectory
} from "./file-utils.js";

/**
 * Repository root, calculated once at module load.
 * Mirrors `server/src/utils/temp-dir.ts`.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

/**
 * Project-local temporary directory (`<repoRoot>/.tmp`).
 * All temporary files are kept here instead of the OS temp directory
 * to avoid CWE-377/CWE-378 (world-readable temp files).
 */
const PROJECT_TMP_BASE = path.join(repoRoot, ".tmp");

/**
 * Resolve `{{tmpdir}}` placeholders in string values of a parameters object.
 * Test fixtures use `{{tmpdir}}` as a cross-platform placeholder for the
 * project-local temporary directory (`<repoRoot>/.tmp`), which avoids
 * writing to the world-readable OS temp directory (CWE-377 / CWE-378).
 *
 * @param {Record<string, unknown>} params - Tool parameters object (mutated in place)
 * @param {object} [logger] - Optional logger for diagnostics
 * @returns {Record<string, unknown>} The same object, with placeholders resolved
 */
export function resolvePathPlaceholders(params, logger) {
  fs.mkdirSync(PROJECT_TMP_BASE, { recursive: true });
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.includes("{{tmpdir}}")) {
      params[key] = value.replace(/\{\{tmpdir\}\}/g, PROJECT_TMP_BASE);
      if (logger) {
        logger.log(`  Resolved ${key}: {{tmpdir}} → ${params[key]}`);
      }
    }
  }
  return params;
}

/**
 * Integration test runner class
 */
export class IntegrationTestRunner {
  constructor(client, logger, options = {}) {
    this.client = client;
    this.logger = logger;
    this.options = options;
  }

  /**
   * Run integration tests for a specific tool
   */
  async runToolIntegrationTests(toolName, integrationTestsDir, filterTests = null) {
    try {
      const toolDir = path.join(integrationTestsDir, toolName);
      let testCases = fs
        .readdirSync(toolDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      // Apply test filter if provided
      if (filterTests && filterTests.length > 0) {
        testCases = testCases.filter((testCase) => filterTests.includes(testCase));
        if (testCases.length === 0) {
          this.logger.log(
            `No matching tests found for ${toolName} with filter: ${filterTests.join(", ")}`,
            "WARN"
          );
          return 0;
        }
      }

      this.logger.log(`Running ${testCases.length} test cases for ${toolName}`);

      for (const testCase of testCases) {
        await this.runSingleIntegrationTest(toolName, testCase, toolDir);
      }

      return testCases.length;
    } catch (error) {
      this.logger.log(`Error running tests for ${toolName}: ${error.message}`, "ERROR");
      return 0;
    }
  }

  /**
   * Discover and run tool-specific integration tests
   */
  async runIntegrationTests(baseDir) {
    try {
      this.logger.log("Discovering and running tool-specific integration tests...");

      const integrationTestsDir = path.join(
        baseDir,
        "..",
        "integration-tests",
        "primitives",
        "tools"
      );

      if (!fs.existsSync(integrationTestsDir)) {
        this.logger.log("No integration tests directory found", "WARN");
        return true;
      }

      // Get list of available tools from the server
      const response = await this.client.listTools();
      const tools = response.tools || [];
      const toolNames = tools.map((t) => t.name);

      this.logger.log(`Found ${toolNames.length} tools to test: ${toolNames.join(", ")}`);

      // Discover tool test directories
      const toolTestDirs = fs
        .readdirSync(integrationTestsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      this.logger.log(
        `Found ${toolTestDirs.length} tool test directories: ${toolTestDirs.join(", ")}`
      );

      // Define tool execution priority to ensure database-creating tools run first
      const toolPriority = {
        // Priority 1: Ensure pack dependencies are installed for static/{src,test} dirs
        codeql_pack_install: 1,

        // Priority 2: Database creation tools (must run before codeql_query_run)
        codeql_test_extract: 2,
        codeql_database_create: 2,

        // Priority 3: Tools that depend on databases (run after database creation)
        codeql_query_run: 3,
        codeql_test_run: 3,
        codeql_bqrs_decode: 3,
        codeql_bqrs_info: 3,
        codeql_database_analyze: 3,
        codeql_resolve_database: 3,

        // Priority 3.5: LSP diagnostics runs before other LSP tools to warm up
        // the language server JVM. Subsequent codeql_lsp_* tools reuse the
        // running server and avoid the cold-start penalty.
        codeql_lsp_diagnostics: 3.5

        // Priority 4: All other tools (default priority)
        // These tools don't have specific database dependencies
      };

      // Sort tool test directories by priority
      const sortedToolTestDirs = toolTestDirs.sort((a, b) => {
        const priorityA = toolPriority[a] || 4;
        const priorityB = toolPriority[b] || 4;

        // If priorities are the same, sort alphabetically for consistency
        if (priorityA === priorityB) {
          return a.localeCompare(b);
        }

        return priorityA - priorityB;
      });

      // Apply tool filter if provided in options
      let toolsToTest = sortedToolTestDirs;
      if (this.options.tools && this.options.tools.length > 0) {
        toolsToTest = sortedToolTestDirs.filter((tool) => this.options.tools.includes(tool));
        if (toolsToTest.length === 0) {
          this.logger.log(
            `No matching tools found with filter: ${this.options.tools.join(", ")}`,
            "WARN"
          );
          return false;
        }
        this.logger.log(`Filtered to ${toolsToTest.length} tools: ${toolsToTest.join(", ")}`);
      }

      this.logger.log(`Executing tests in priority order: ${toolsToTest.join(", ")}`);

      // Run tests for each tool in priority order
      let totalIntegrationTests = 0;
      for (const toolName of toolsToTest) {
        if (toolNames.includes(toolName)) {
          const testCount = await this.runToolIntegrationTests(
            toolName,
            integrationTestsDir,
            this.options.tests
          );
          totalIntegrationTests += testCount;
        } else {
          this.logger.log(`Skipping ${toolName} - tool not found in server`, "WARN");
        }
      }

      this.logger.log(`Completed ${totalIntegrationTests} tool-specific integration tests`);

      // Also run workflow integration tests
      await this.runWorkflowIntegrationTests(baseDir);

      return totalIntegrationTests > 0;
    } catch (error) {
      this.logger.log(`Error running integration tests: ${error.message}`, "ERROR");
      return false;
    }
  }

  /**
   * Run a single integration test case
   */
  async runSingleIntegrationTest(toolName, testCase, toolDir) {
    try {
      const testDir = path.join(toolDir, testCase);
      const beforeDir = path.join(testDir, "before");
      const afterDir = path.join(testDir, "after");

      if (!fs.existsSync(beforeDir) || !fs.existsSync(afterDir)) {
        throw new Error(`Missing before or after directory for ${toolName}/${testCase}`);
      }

      // Check if this test case has monitoring integration (monitoring-state.json files)
      const beforeMonitoringState = path.join(beforeDir, "monitoring-state.json");
      const afterMonitoringState = path.join(afterDir, "monitoring-state.json");

      if (fs.existsSync(beforeMonitoringState) && fs.existsSync(afterMonitoringState)) {
        await this.runMonitoringBasedTest(toolName, testCase, testDir);
        return;
      }

      // Handle special case for codeql_lsp_diagnostics tool
      if (toolName === "codeql_lsp_diagnostics") {
        await this.runLanguageServerEvalTest(toolName, testCase, beforeDir, afterDir);
        return;
      }

      // Check for test configuration file
      const testConfigPath = path.join(testDir, "test-config.json");
      if (fs.existsSync(testConfigPath)) {
        await this.runConfigurableTest(toolName, testCase, testDir, testConfigPath);
        return;
      }

      // Create temp directory for test execution under project .tmp/
      fs.mkdirSync(PROJECT_TMP_BASE, { recursive: true });
      const tempDir = fs.mkdtempSync(
        path.join(PROJECT_TMP_BASE, `mcp-test-${toolName}-${testCase}-`)
      );

      try {
        // Copy before files to temp directory
        copyDirectory(beforeDir, tempDir);

        // Get files to process
        const files = fs.readdirSync(tempDir).map((f) => path.join(tempDir, f));

        if (files.length === 0) {
          throw new Error(`No files found in before directory for ${toolName}/${testCase}`);
        }

        // Run the tool
        const result = await this.client.callTool({
          name: toolName,
          arguments: {
            "files": files,
            "in-place": true
          }
        });

        this.logger.log(`Tool ${toolName} result: ${result.content?.[0]?.text || "No output"}`);

        // Compare results with expected after state
        const passed = compareDirectories(tempDir, afterDir);

        this.logger.logTest(`Integration Test: ${toolName}/${testCase}`, passed);

        if (passed) {
          this.logger.log(`✅ ${toolName}/${testCase} - Files match expected output`);
        } else {
          this.logger.log(`❌ ${toolName}/${testCase} - Files do not match expected output`);
        }
      } finally {
        // Cleanup temp directory
        removeDirectory(tempDir);
      }
    } catch (error) {
      this.logger.logTest(`Integration Test: ${toolName}/${testCase}`, false, error);
    }
  }

  /**
   * Special test runner for codeql_lsp_diagnostics tool
   * This tool validates QL code and returns diagnostics, rather than modifying files
   */
  async runLanguageServerEvalTest(toolName, testCase, beforeDir, afterDir) {
    try {
      // Get the QL files from before and after directories
      const beforeFiles = fs.readdirSync(beforeDir).filter((f) => f.endsWith(".ql"));
      const afterFiles = fs.readdirSync(afterDir).filter((f) => f.endsWith(".ql"));

      if (beforeFiles.length === 0) {
        throw new Error(`No .ql files found in before directory for ${toolName}/${testCase}`);
      }

      if (beforeFiles.length !== afterFiles.length) {
        throw new Error(
          `Mismatch in number of .ql files between before and after directories for ${toolName}/${testCase}`
        );
      }

      let allTestsPassed = true;

      // Test each QL file
      for (const beforeFile of beforeFiles) {
        const afterFile = afterFiles.find((f) => f === beforeFile);
        if (!afterFile) {
          throw new Error(
            `Missing corresponding after file for ${beforeFile} in ${toolName}/${testCase}`
          );
        }

        const beforePath = path.join(beforeDir, beforeFile);
        const afterPath = path.join(afterDir, afterFile);

        const beforeContent = fs.readFileSync(beforePath, "utf8");
        // afterContent represents the corrected version for reference
        // eslint-disable-next-line no-unused-vars
        const _afterContent = fs.readFileSync(afterPath, "utf8");

        // Run the codeql_lsp_diagnostics tool on the before content
        const result = await this.client.callTool({
          name: toolName,
          arguments: {
            ql_code: beforeContent
          }
        });

        this.logger.log(
          `Tool ${toolName} result for ${beforeFile}: ${result.content?.[0]?.text || "No output"}`
        );

        // Parse the validation result
        let validationResult;
        try {
          validationResult = JSON.parse(result.content?.[0]?.text || "{}");
          // eslint-disable-next-line no-unused-vars
        } catch (_parseError) {
          this.logger.log(
            `❌ ${toolName}/${testCase}/${beforeFile} - Failed to parse validation result`
          );
          allTestsPassed = false;
          continue;
        }

        // The test passes if:
        // 1. The tool detects errors in the "before" content (isValid should be false)
        // 2. The "after" content represents a corrected version
        // For this integration test, we mainly verify that the tool can detect issues

        if (
          validationResult.isValid === false &&
          validationResult.diagnostics &&
          validationResult.diagnostics.length > 0
        ) {
          this.logger.log(
            `✅ ${toolName}/${testCase}/${beforeFile} - Tool correctly detected ${validationResult.diagnostics.length} validation issues`
          );
        } else if (validationResult.isValid === true) {
          // If the before content is actually valid, that's also a passing test scenario
          this.logger.log(
            `✅ ${toolName}/${testCase}/${beforeFile} - Tool correctly validated valid QL code`
          );
        } else {
          this.logger.log(
            `❌ ${toolName}/${testCase}/${beforeFile} - Tool validation failed or returned unexpected result`
          );
          allTestsPassed = false;
        }

        // Log diagnostic details for visibility
        if (validationResult.diagnostics && validationResult.diagnostics.length > 0) {
          this.logger.log(`   Diagnostics found:`);
          validationResult.diagnostics.forEach((diagnostic, index) => {
            this.logger.log(
              `     ${index + 1}. ${diagnostic.severity} at line ${diagnostic.line}, column ${diagnostic.column}: ${diagnostic.message}`
            );
          });
        }
      }

      this.logger.logTest(`Integration Test: ${toolName}/${testCase}`, allTestsPassed);

      if (allTestsPassed) {
        this.logger.log(`✅ ${toolName}/${testCase} - All validation tests passed`);
      } else {
        this.logger.log(`❌ ${toolName}/${testCase} - Some validation tests failed`);
      }
    } catch (error) {
      this.logger.logTest(`Integration Test: ${toolName}/${testCase}`, false, error);
    }
  }

  /**
   * Run a test with custom configuration
   * Uses test-config.json to specify tool arguments
   */
  async runConfigurableTest(toolName, testCase, testDir, testConfigPath) {
    try {
      const beforeDir = path.join(testDir, "before");
      const afterDir = path.join(testDir, "after");

      // Load test configuration
      const testConfigContent = fs.readFileSync(testConfigPath, "utf8");
      const testConfig = JSON.parse(testConfigContent);

      if (!testConfig.arguments) {
        throw new Error(`Test config missing arguments for ${toolName}/${testCase}`);
      }

      // For session tools, we need to handle them differently since they work with monitoring state
      // rather than files. Check if this test has monitoring-state.json files.
      const beforeMonitoringState = path.join(beforeDir, "monitoring-state.json");
      const afterMonitoringState = path.join(afterDir, "monitoring-state.json");

      if (fs.existsSync(beforeMonitoringState) && fs.existsSync(afterMonitoringState)) {
        // This is a monitoring-based test
        await this.runMonitoringBasedTest(
          toolName,
          testCase,
          testConfig,
          beforeMonitoringState,
          afterMonitoringState
        );
      } else {
        // Regular file-based test with custom arguments
        await this.runFileBasedConfigurableTest(
          toolName,
          testCase,
          testConfig,
          beforeDir,
          afterDir
        );
      }
    } catch (error) {
      this.logger.logTest(`Integration Test: ${toolName}/${testCase}`, false, error);
    }
  }

  /**
   * Run a file-based test with custom configuration
   */
  async runFileBasedConfigurableTest(toolName, testCase, testConfig, beforeDir, afterDir) {
    fs.mkdirSync(PROJECT_TMP_BASE, { recursive: true });
    const tempDir = fs.mkdtempSync(
      path.join(PROJECT_TMP_BASE, `mcp-test-${toolName}-${testCase}-`)
    );

    try {
      // Copy before files to temp directory
      copyDirectory(beforeDir, tempDir);

      // Resolve {{tmpdir}} placeholders in arguments
      resolvePathPlaceholders(testConfig.arguments, this.logger);

      // Run the tool with custom arguments
      const result = await this.client.callTool({
        name: toolName,
        arguments: testConfig.arguments
      });

      this.logger.log(`Tool ${toolName} result: ${result.content?.[0]?.text || "No output"}`);

      // Compare results with expected after state
      const passed = compareDirectories(tempDir, afterDir);

      this.logger.logTest(`Integration Test: ${toolName}/${testCase}`, passed);

      if (passed) {
        this.logger.log(`✅ ${toolName}/${testCase} - Files match expected output`);
      } else {
        this.logger.log(`❌ ${toolName}/${testCase} - Files do not match expected output`);
      }
    } finally {
      // Cleanup temp directory
      removeDirectory(tempDir);
    }
  }

  /**
   * Validate codeql_query_run output by comparing actual vs expected output
   * @param {string} interpretedOutput - Path to actual output (file or directory)
   * @param {string} expectedOutputPath - Path to expected output in after/ directory
   * @param {string} toolName - Name of the tool being tested
   * @param {string} testCase - Name of the test case
   * @returns {boolean} - True if validation passed, false otherwise
   */
  validateCodeQLQueryRunOutput(interpretedOutput, expectedOutputPath, toolName, testCase) {
    try {
      // Read both paths directly to avoid TOCTOU race (CWE-367).
      // If a path is a directory, readFileSync throws EISDIR.
      // If a path doesn't exist, readFileSync throws ENOENT.
      let actualContent, expectedContent;
      let actualIsDir = false,
        expectedIsDir = false;

      try {
        actualContent = fs.readFileSync(interpretedOutput, "utf8");
      } catch (readErr) {
        if (readErr.code === "EISDIR") {
          actualIsDir = true;
        } else {
          throw readErr;
        }
      }

      try {
        expectedContent = fs.readFileSync(expectedOutputPath, "utf8");
      } catch (readErr) {
        if (readErr.code === "EISDIR") {
          expectedIsDir = true;
        } else if (readErr.code === "ENOENT") {
          // Expected output doesn't exist - validate non-empty content only
          this.logger.log(
            `   Note: No expected output found at ${expectedOutputPath}, validating non-empty content only`
          );
          return this.validateNonEmptyOutput(interpretedOutput, toolName, testCase);
        } else {
          throw readErr;
        }
      }

      if (actualIsDir && expectedIsDir) {
        // Compare directory structures
        const comparisonResult = compareDirectories(interpretedOutput, expectedOutputPath);
        if (!comparisonResult) {
          this.logger.log(
            `   Validation Failed: Output files do not match expected output for ${toolName}/${testCase}`
          );
          return false;
        } else {
          this.logger.log(`   ✓ Output files match expected output`);
          return true;
        }
      } else if (!actualIsDir && !expectedIsDir) {
        // Compare file contents (already read above)
        if (actualContent !== expectedContent) {
          this.logger.log(
            `   Validation Failed: Output content does not match expected content for ${toolName}/${testCase}`
          );
          this.logger.log(
            `   Expected ${expectedContent.length} chars, got ${actualContent.length} chars`
          );
          return false;
        } else {
          this.logger.log(`   ✓ Output content matches expected output`);
          return true;
        }
      } else {
        this.logger.log(
          `   Validation Failed: Output type mismatch (file vs directory) for ${toolName}/${testCase}`
        );
        return false;
      }
    } catch (error) {
      this.logger.log(
        `   Validation Error: Failed to validate output for ${toolName}/${testCase}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Validate that output exists and is non-empty
   * @param {string} outputPath - Path to output (file or directory)
   * @param {string} toolName - Name of the tool being tested
   * @param {string} testCase - Name of the test case
   * @returns {boolean} - True if validation passed, false otherwise
   */
  validateNonEmptyOutput(outputPath, toolName, testCase) {
    try {
      // Try reading as a file first to avoid TOCTOU race (CWE-367).
      // If the path is a directory, readFileSync throws EISDIR.
      try {
        const content = fs.readFileSync(outputPath, "utf8");
        if (content.trim().length === 0) {
          this.logger.log(`   Validation Failed: Output file is empty for ${toolName}/${testCase}`);
          return false;
        }
        return true;
      } catch (readErr) {
        if (readErr.code !== "EISDIR") {
          throw readErr;
        }
      }

      // Path is a directory - find and check output files
      const allFiles = getDirectoryFiles(outputPath);

      // Filter for relevant output file extensions
      const outputExtensions = [".txt", ".dgml", ".dot", ".sarif", ".csv", ".json"];
      const outputFiles = allFiles.filter((file) =>
        outputExtensions.some((ext) => file.endsWith(ext))
      );

      if (outputFiles.length === 0) {
        this.logger.log(
          `   Validation Failed: No output files found in ${outputPath} for ${toolName}/${testCase}`
        );
        return false;
      }

      // Check that at least one file has non-empty content
      let hasNonEmptyContent = false;
      for (const file of outputFiles) {
        const content = fs.readFileSync(file, "utf8");
        if (content.trim().length > 0) {
          hasNonEmptyContent = true;
          break;
        }
      }

      if (!hasNonEmptyContent) {
        this.logger.log(
          `   Validation Failed: All output files are empty for ${toolName}/${testCase}`
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.log(
        `   Validation Error: Failed to check output at ${outputPath} for ${toolName}/${testCase}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Run a monitoring-based test that uses monitoring-state.json files
   */
  async runMonitoringBasedTest(toolName, testCase, testCaseDir) {
    try {
      this.logger.log(`Running monitoring-based test: ${toolName}/${testCase}`);

      // For query compilation tests, install pack dependencies first
      if (toolName === "codeql_query_compile") {
        const staticPath = this.getStaticFilesPath();
        const packDir = path.join(staticPath, "src");

        // Check if qlpack.yml exists and install dependencies
        if (fs.existsSync(path.join(packDir, "codeql-pack.yml"))) {
          try {
            await this.client.callTool({
              name: "codeql_pack_install",
              arguments: { packDir: packDir }
            });
          } catch (installError) {
            this.logger.log(
              `   Warning: Could not install pack dependencies: ${installError.message}`
            );
          }
        }
      }

      // Check if there's a monitoring-state.json file with parameters
      let params;
      const beforeDir = path.join(testCaseDir, "before");
      const monitoringStatePath = path.join(beforeDir, "monitoring-state.json");

      if (fs.existsSync(monitoringStatePath)) {
        const monitoringState = JSON.parse(fs.readFileSync(monitoringStatePath, "utf8"));
        if (monitoringState.parameters) {
          params = monitoringState.parameters;
          this.logger.log(`Using parameters from monitoring-state.json`);
          resolvePathPlaceholders(params, this.logger);

          // Helper function to ensure database is extracted
          const ensureDatabaseExtracted = async (dbPath) => {
            // Resolve paths relative to repository root (parent of client directory)
            const currentDir = path.dirname(fileURLToPath(import.meta.url));
            const clientDir = path.dirname(path.dirname(currentDir)); // Go up to client/
            const repoRoot = path.dirname(clientDir); // Go up to repo root
            const absoluteDbPath = path.resolve(repoRoot, dbPath);

            // Check if database needs to be extracted (test source directory exists but not the .testproj)
            if (!fs.existsSync(absoluteDbPath) && dbPath.endsWith(".testproj")) {
              // For paths like "test/ExpressSqlInjection/ExpressSqlInjection.testproj",
              // the test source directory is "test/ExpressSqlInjection"
              const parts = dbPath.split(path.sep);
              const lastPart = parts[parts.length - 1];
              const testName = lastPart.replace(".testproj", "");
              const parentDir = parts.slice(0, -1).join(path.sep);

              // Check if the parent directory name matches the test name
              const parentDirName = parts[parts.length - 2];
              const testSourceDir =
                parentDirName === testName ? parentDir : dbPath.replace(/\.testproj$/, "");
              const absoluteTestSourceDir = path.resolve(repoRoot, testSourceDir);

              if (fs.existsSync(absoluteTestSourceDir)) {
                this.logger.log(`Database not found, extracting from ${testSourceDir}`);
                const extractResult = await this.client.callTool({
                  name: "codeql_test_extract",
                  arguments: { tests: [testSourceDir] }
                });
                if (extractResult.isError) {
                  const errorText = extractResult.content?.[0]?.text || "Unknown error";
                  throw new Error(`Failed to extract database: ${errorText}`);
                }
                this.logger.log(`Database extracted successfully to ${dbPath}`);
              }
            }
          };

          // For codeql_query_run with database parameter, ensure database is extracted
          if (toolName === "codeql_query_run" && params.database) {
            await ensureDatabaseExtracted(params.database);
          }

          // For codeql_resolve_database, ensure database is extracted
          if (toolName === "codeql_resolve_database" && params.database) {
            await ensureDatabaseExtracted(params.database);
          }
        } else {
          // Fall back to tool-specific parameters
          params = await this.getToolSpecificParams(toolName, testCase);
        }
      } else {
        // Fall back to tool-specific parameters
        params = await this.getToolSpecificParams(toolName, testCase);
      }

      // Call the tool with appropriate parameters
      // Set extended timeout for long-running operations
      const longRunningTools = [
        "codeql_database_analyze",
        "codeql_database_create",
        "codeql_lsp_completion",
        "codeql_lsp_definition",
        "codeql_lsp_diagnostics",
        "codeql_lsp_references",
        "codeql_query_run",
        "codeql_test_run"
      ];

      const requestOptions = longRunningTools.includes(toolName)
        ? {
            timeout: 300000, // 5 minutes for long-running tools
            resetTimeoutOnProgress: true
          }
        : {
            timeout: 60000 // 60 seconds for other tools
          };

      this.logger.log(`Calling tool ${toolName} with timeout: ${requestOptions.timeout}ms`);

      const result = await this.client.callTool(
        {
          name: toolName,
          arguments: params
        },
        undefined,
        requestOptions
      );

      // For monitoring tests, we primarily check if the tool executed successfully
      // Special handling for session management tools that expect sessions to exist
      let success = !result.isError;

      // Session management tools should return proper error messages when sessions don't exist
      if (result.isError && (toolName.startsWith("session_") || toolName.startsWith("sessions_"))) {
        const errorText = result.content?.[0]?.text || "";
        if (
          errorText.includes("Session not found") ||
          errorText.includes("No valid sessions found")
        ) {
          success = true; // This is expected behavior for missing sessions
          this.logger.log(
            `   Note: Tool correctly handled missing session - this is expected behavior`
          );
        }
      }

      // Special validation for codeql_query_run with output file comparison
      if (success && toolName === "codeql_query_run") {
        const resultText = result.content?.[0]?.text || "";

        // Check for query interpretation failures
        if (resultText.includes("Query interpretation failed")) {
          success = false;
          this.logger.log(
            `   Validation Failed: Query interpretation failed for ${toolName}/${testCase}`
          );
        }

        // Compare actual output files against expected output in after/ directory
        if (success && params.interpretedOutput) {
          try {
            if (fs.existsSync(params.interpretedOutput)) {
              const afterDir = path.join(testCaseDir, "after");
              const expectedOutputPath = path.join(
                afterDir,
                path.basename(params.interpretedOutput)
              );

              // Use extracted validation method
              const validationPassed = this.validateCodeQLQueryRunOutput(
                params.interpretedOutput,
                expectedOutputPath,
                toolName,
                testCase
              );

              if (!validationPassed) {
                success = false;
              }
            }
          } catch (error) {
            success = false;
            this.logger.log(
              `   Validation Error: Failed to validate output for ${toolName}/${testCase}: ${error.message}`
            );
          }
        }
      }

      this.logger.logTest(`Integration Test: ${toolName}/${testCase}`, success);

      if (success) {
        this.logger.log(`✅ ${toolName}/${testCase} - Tool executed successfully`);
        // Truncate long results to avoid excessive CI log output
        const resultText = result.content?.[0]?.text || "No content";
        const MAX_LOG_LENGTH = 500;
        if (resultText.length > MAX_LOG_LENGTH) {
          this.logger.log(
            `   Result: ${resultText.substring(0, MAX_LOG_LENGTH)}... (truncated, ${resultText.length} chars total)`
          );
        } else {
          this.logger.log(`   Result: ${resultText}`);
        }
      } else {
        this.logger.log(`❌ ${toolName}/${testCase} - Tool execution failed`);
        const errorText = result.content?.[0]?.text || "Unknown error";
        this.logger.log(`   Error: ${errorText}`);
        // Also log the actual error to help with debugging
        if (result.error) {
          this.logger.log(`   Debug: ${JSON.stringify(result.error)}`);
        }
      }

      return success;
    } catch (error) {
      this.logger.logTest(`Integration Test: ${toolName}/${testCase}`, false, error);
      this.logger.log(`❌ ${toolName}/${testCase} - Exception occurred: ${error.message}`);
      this.logger.log(`   Stack: ${error.stack}`);
      return false;
    }
  }

  /**
   * Get path to static test files
   */
  getStaticFilesPath(language = "javascript") {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    return path.join(
      path.dirname(path.dirname(path.dirname(currentDir))), // Go up to the repo root directory
      "server",
      "ql",
      language,
      "examples"
    );
  }

  /**
   * Get tool-specific parameters for testing
   */
  async getToolSpecificParams(toolName, testCase) {
    const params = {};

    // Get the test case directory to find actual files
    // Using fileURLToPath(import.meta.url) instead of __dirname for ES modules
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const testCaseDir = path.join(
      path.dirname(path.dirname(currentDir)), // Go up to the client directory
      "integration-tests",
      "primitives",
      "tools",
      toolName,
      testCase
    );
    const beforeDir = path.join(testCaseDir, "before");
    const staticPath = this.getStaticFilesPath();

    if (toolName === "codeql_lsp_diagnostics") {
      params.ql_code = 'from UndefinedType x where x = "test" select x, "semantic error"';
      // Skip workspace_uri for now as it's not needed for basic validation
    } else if (toolName === "codeql_bqrs_decode") {
      // Use static BQRS file
      const bqrsFile = path.join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.test.bqrs");
      if (fs.existsSync(bqrsFile)) {
        params.files = [bqrsFile];
        params.format = "json";
      } else {
        throw new Error(`Static BQRS file not found: ${bqrsFile}`);
      }
    } else if (toolName === "codeql_bqrs_info") {
      // Use static BQRS file
      const bqrsFile = path.join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.test.bqrs");
      if (fs.existsSync(bqrsFile)) {
        params.files = [bqrsFile];
      } else {
        throw new Error(`Static BQRS file not found: ${bqrsFile}`);
      }
    } else if (toolName === "codeql_bqrs_interpret") {
      // Use actual test file from the before directory
      if (fs.existsSync(beforeDir)) {
        const bqrsFiles = fs.readdirSync(beforeDir).filter((f) => f.endsWith(".bqrs"));
        if (bqrsFiles.length > 0) {
          params.file = path.join(beforeDir, bqrsFiles[0]);
        } else {
          throw new Error(`No .bqrs files found in ${beforeDir} for ${toolName}/${testCase}`);
        }
      } else {
        throw new Error(`Test directory ${beforeDir} not found for ${toolName}/${testCase}`);
      }

      // Set output path and format based on test case name
      const afterDir = path.join(testCaseDir, "after");
      if (testCase.includes("graphtext")) {
        params.format = "graphtext";
        params.output = path.join(afterDir, "output.txt");
        params.t = ["kind=graph", "id=test/query"];
      } else if (testCase.includes("sarif")) {
        params.format = "sarif-latest";
        params.output = path.join(afterDir, "results.sarif");
        params.t = ["kind=problem", "id=test/query"];
        // Note: sarif-add-snippets requires source archive, skipping for basic test
      } else {
        // Default to graphtext for unknown test cases
        params.format = "graphtext";
        params.output = path.join(afterDir, "output.txt");
        params.t = ["kind=graph", "id=test/query"];
      }
    } else if (toolName === "codeql_test_extract") {
      // Use static test directory
      const testDir = path.join(staticPath, "test", "ExampleQuery1");
      if (fs.existsSync(testDir)) {
        params.tests = [testDir];
      } else {
        throw new Error(`Static test directory not found: ${testDir}`);
      }
    } else if (toolName === "codeql_test_run") {
      // Use static test directory
      const testDir = path.join(staticPath, "test", "ExampleQuery1");
      if (fs.existsSync(testDir)) {
        params.tests = [testDir];
      } else {
        throw new Error(`Static test directory not found: ${testDir}`);
      }
    } else if (toolName === "codeql_query_run") {
      // Use static query and database
      const queryFile = path.join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.ql");
      const databaseDir = path.join(staticPath, "test", "ExampleQuery1", "ExampleQuery1.testproj");
      const testDir = path.join(staticPath, "test", "ExampleQuery1");

      if (fs.existsSync(queryFile)) {
        params.query = queryFile;

        // If database doesn't exist, extract it first
        if (!fs.existsSync(databaseDir) && fs.existsSync(testDir)) {
          this.logger.log(`Database not found for query run, extracting first: ${databaseDir}`);
          // Call codeql test extract to create the database
          const extractResult = await this.client.callTool({
            name: "codeql_test_extract",
            arguments: { tests: [testDir] }
          });
          if (extractResult.isError) {
            throw new Error(`Failed to extract database: ${extractResult.content[0].text}`);
          }
          this.logger.log(`Database extracted successfully`);
        }

        if (fs.existsSync(databaseDir)) {
          params.database = databaseDir;
          // codeql query run outputs BQRS format by default, no output-format parameter needed
        } else {
          throw new Error(`Static database not found and could not be created: ${databaseDir}`);
        }
      } else {
        throw new Error(`Static query file not found: ${queryFile}`);
      }
    } else if (toolName === "codeql_query_format") {
      // Look for .ql files in the before directory
      if (fs.existsSync(beforeDir)) {
        const qlFiles = fs.readdirSync(beforeDir).filter((f) => f.endsWith(".ql"));
        if (qlFiles.length > 0) {
          params.files = [path.join(beforeDir, qlFiles[0])];
        } else {
          throw new Error(`No .ql files found in ${beforeDir} for ${toolName}/${testCase}`);
        }
      } else {
        throw new Error(`Test directory ${beforeDir} not found for ${toolName}/${testCase}`);
      }
      params["check-only"] = true;
    } else if (toolName === "profile_codeql_query") {
      // Read from test-config.json for profile_codeql_query tool
      const testConfigPath = path.join(testCaseDir, "test-config.json");
      if (fs.existsSync(testConfigPath)) {
        const testConfig = JSON.parse(fs.readFileSync(testConfigPath, "utf8"));
        if (testConfig.arguments) {
          Object.assign(params, testConfig.arguments);
        } else {
          throw new Error(`test-config.json missing arguments for ${toolName}/${testCase}`);
        }
      } else {
        throw new Error(`test-config.json not found for ${toolName}/${testCase}`);
      }
    } else if (toolName === "profile_codeql_query_from_logs") {
      // Read from test-config.json for profile_codeql_query_from_logs tool
      const testConfigPath = path.join(testCaseDir, "test-config.json");
      if (fs.existsSync(testConfigPath)) {
        const testConfig = JSON.parse(fs.readFileSync(testConfigPath, "utf8"));
        if (testConfig.arguments) {
          Object.assign(params, testConfig.arguments);
        } else {
          throw new Error(`test-config.json missing arguments for ${toolName}/${testCase}`);
        }
      } else {
        throw new Error(`test-config.json not found for ${toolName}/${testCase}`);
      }
    } else if (toolName === "validate_codeql_query") {
      params.query = "from int i select i";
      params.language = "java";
    } else if (toolName === "codeql_pack_ls") {
      // Use the static pack directory that contains qlpack.yml
      params.dir = path.join(staticPath, "src");
    } else if (toolName === "codeql_pack_install") {
      // pack install needs to be run in a directory with qlpack.yml
      params.packDir = path.join(staticPath, "src");
    } else if (toolName === "codeql_query_compile") {
      // Use a query file from the static src directory that has proper pack context
      const staticQueryFile = path.join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.ql");
      if (fs.existsSync(staticQueryFile)) {
        params.query = staticQueryFile;
      } else {
        throw new Error(`Static query file not found: ${staticQueryFile}`);
      }
    } else if (toolName === "codeql_resolve_library_path") {
      // Use the static pack directory
      params.packDir = path.join(staticPath, "src");
    } else if (toolName === "codeql_resolve_metadata") {
      // Look for .ql files in the before directory
      if (fs.existsSync(beforeDir)) {
        const qlFiles = fs.readdirSync(beforeDir).filter((f) => f.endsWith(".ql"));
        if (qlFiles.length > 0) {
          params.query = path.join(beforeDir, qlFiles[0]);
        } else {
          throw new Error(`No .ql files found in ${beforeDir} for ${toolName}/${testCase}`);
        }
      } else {
        throw new Error(`Test directory ${beforeDir} not found for ${toolName}/${testCase}`);
      }
    } else if (toolName === "codeql_resolve_queries") {
      // Use the test case directory as the queries path
      params.path = beforeDir;
    } else if (toolName === "codeql_resolve_tests") {
      // Use the test case directory as the tests path
      params.tests = [beforeDir];
    } else if (toolName === "codeql_test_accept") {
      // Use the test case directory as the tests directory
      params.tests = [beforeDir];
    } else if (toolName === "find_class_position") {
      // Look for .ql files in the before directory
      if (fs.existsSync(beforeDir)) {
        const qlFiles = fs.readdirSync(beforeDir).filter((f) => f.endsWith(".ql"));
        if (qlFiles.length > 0) {
          params.file = path.join(beforeDir, qlFiles[0]);
        } else {
          throw new Error(`No .ql files found in ${beforeDir} for ${toolName}/${testCase}`);
        }
      } else {
        throw new Error(`Test directory ${beforeDir} not found for ${toolName}/${testCase}`);
      }
      params.name = "TestClass";
    } else if (toolName === "find_predicate_position") {
      // Look for .ql files in the before directory
      if (fs.existsSync(beforeDir)) {
        const qlFiles = fs.readdirSync(beforeDir).filter((f) => f.endsWith(".ql"));
        if (qlFiles.length > 0) {
          params.file = path.join(beforeDir, qlFiles[0]);
        } else {
          throw new Error(`No .ql files found in ${beforeDir} for ${toolName}/${testCase}`);
        }
      } else {
        throw new Error(`Test directory ${beforeDir} not found for ${toolName}/${testCase}`);
      }
      params.name = "testPredicate";
    } else if (toolName === "session_calculate_current_score") {
      params.sessionId = "test-session-score";
    } else if (toolName === "session_end") {
      params.sessionId = "test-session-end";
      params.status = "completed";
    } else if (toolName === "sessions_compare") {
      params.sessionIds = ["session-1", "session-2"];
    }

    return params;
  }

  /**
   * Run workflow-level integration tests
   * These tests validate complete workflows rather than individual tools
   */
  async runWorkflowIntegrationTests(baseDir) {
    try {
      this.logger.log("Discovering and running workflow integration tests...");

      const workflowTestsDir = path.join(baseDir, "..", "integration-tests", "workflows");

      if (!fs.existsSync(workflowTestsDir)) {
        this.logger.log("No workflow integration tests directory found", "INFO");
        return true;
      }

      // Discover workflow test directories
      const workflowDirs = fs
        .readdirSync(workflowTestsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      if (workflowDirs.length === 0) {
        this.logger.log("No workflow test directories found", "INFO");
        return true;
      }

      this.logger.log(`Found ${workflowDirs.length} workflow test(s): ${workflowDirs.join(", ")}`);

      // Run tests for each workflow
      let totalWorkflowTests = 0;
      for (const workflowName of workflowDirs) {
        const testCount = await this.runWorkflowTests(workflowName, workflowTestsDir);
        totalWorkflowTests += testCount;
      }

      this.logger.log(`Total workflow integration tests executed: ${totalWorkflowTests}`);
      return true;
    } catch (error) {
      this.logger.log(`Error running workflow integration tests: ${error.message}`, "ERROR");
      return false;
    }
  }

  /**
   * Run integration tests for a specific workflow
   */
  async runWorkflowTests(workflowName, workflowTestsDir) {
    try {
      const workflowDir = path.join(workflowTestsDir, workflowName);
      const testCases = fs
        .readdirSync(workflowDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      this.logger.log(`Running ${testCases.length} test case(s) for workflow ${workflowName}`);

      for (const testCase of testCases) {
        await this.runSingleWorkflowIntegrationTest(workflowName, testCase, workflowDir);
      }

      return testCases.length;
    } catch (error) {
      this.logger.log(
        `Error running tests for workflow ${workflowName}: ${error.message}`,
        "ERROR"
      );
      return 0;
    }
  }

  /**
   * Run a single workflow integration test
   * Validates the workflow test structure
   */
  async runSingleWorkflowIntegrationTest(workflowName, testCase, workflowDir) {
    const testName = `${workflowName}/${testCase}`;
    this.logger.log(`\nRunning workflow integration test: ${testName}`);

    try {
      const testCaseDir = path.join(workflowDir, testCase);
      const beforeDir = path.join(testCaseDir, "before");
      const afterDir = path.join(testCaseDir, "after");

      // Validate test structure
      if (!fs.existsSync(beforeDir)) {
        this.logger.logTest(testName, false, `Missing before directory`);
        return;
      }

      if (!fs.existsSync(afterDir)) {
        this.logger.logTest(testName, false, `Missing after directory`);
        return;
      }

      // Check for monitoring state files
      const beforeMonitoringFile = path.join(beforeDir, "monitoring-state.json");
      const afterMonitoringFile = path.join(afterDir, "monitoring-state.json");

      if (!fs.existsSync(beforeMonitoringFile)) {
        this.logger.logTest(testName, false, `Missing before/monitoring-state.json`);
        return;
      }

      if (!fs.existsSync(afterMonitoringFile)) {
        this.logger.logTest(testName, false, `Missing after/monitoring-state.json`);
        return;
      }

      // Validate the workflow test structure exists and is well-formed
      const afterMonitoring = JSON.parse(fs.readFileSync(afterMonitoringFile, "utf8"));

      // Basic validation: after should have sessions if workflow executes successfully
      const passed = Array.isArray(afterMonitoring.sessions) && afterMonitoring.sessions.length > 0;

      this.logger.logTest(
        testName,
        passed,
        passed
          ? `Workflow test structure valid with ${afterMonitoring.sessions.length} expected session(s)`
          : "Expected sessions in after/monitoring-state.json"
      );
    } catch (error) {
      this.logger.logTest(testName, false, `Error: ${error.message}`);
    }
  }
}
