package testing

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// staticFilesPath returns the path to static test fixtures for a language.
func staticFilesPath(repoRoot, language string) string {
	return filepath.Join(repoRoot, "server", "ql", language, "examples")
}

// buildToolParams constructs tool parameters based on the tool name, test case,
// and fixture directory contents. This replicates the old JS runner's
// getToolSpecificParams() function.
func buildToolParams(repoRoot, toolName, testCase, testDir string) (map[string]any, error) {
	beforeDir := filepath.Join(testDir, "before")
	staticPath := staticFilesPath(repoRoot, "javascript")

	// First check test-config.json
	configPath := filepath.Join(testDir, "test-config.json")
	if configData, err := os.ReadFile(configPath); err == nil {
		var config TestConfig
		if err := json.Unmarshal(configData, &config); err != nil {
			return nil, fmt.Errorf("parse test-config.json: %w", err)
		}
		return config.Arguments, nil
	}

	// Check monitoring-state.json for embedded parameters
	monitoringPath := filepath.Join(beforeDir, "monitoring-state.json")
	if data, err := os.ReadFile(monitoringPath); err == nil {
		var state map[string]any
		if err := json.Unmarshal(data, &state); err == nil {
			if params, ok := state["parameters"].(map[string]any); ok && len(params) > 0 {
				return params, nil
			}
		}
	}

	// Tool-specific parameter generation
	params := make(map[string]any)

	switch toolName {
	case "codeql_lsp_diagnostics":
		params["ql_code"] = `from UndefinedType x where x = "test" select x, "semantic error"`

	case "codeql_bqrs_decode":
		bqrsFile := filepath.Join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.test.bqrs")
		if !fileExists(bqrsFile) {
			return nil, fmt.Errorf("static BQRS file not found: %s", bqrsFile)
		}
		params["files"] = []string{bqrsFile}
		params["format"] = "json"

	case "codeql_bqrs_info":
		bqrsFile := filepath.Join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.test.bqrs")
		if !fileExists(bqrsFile) {
			return nil, fmt.Errorf("static BQRS file not found: %s", bqrsFile)
		}
		params["file"] = bqrsFile

	case "codeql_bqrs_interpret":
		bqrsFiles := findFilesByExt(beforeDir, ".bqrs")
		if len(bqrsFiles) == 0 {
			return nil, fmt.Errorf("no .bqrs files in %s", beforeDir)
		}
		params["file"] = filepath.Join(beforeDir, bqrsFiles[0])
		afterDir := filepath.Join(testDir, "after")
		if strings.Contains(testCase, "graphtext") {
			params["format"] = "graphtext"
			params["output"] = filepath.Join(afterDir, "output.txt")
			params["t"] = []string{"kind=graph", "id=test/query"}
		} else if strings.Contains(testCase, "sarif") {
			params["format"] = "sarif-latest"
			params["output"] = filepath.Join(afterDir, "results.sarif")
			params["t"] = []string{"kind=problem", "id=test/query"}
		} else {
			params["format"] = "graphtext"
			params["output"] = filepath.Join(afterDir, "output.txt")
			params["t"] = []string{"kind=graph", "id=test/query"}
		}

	case "codeql_test_extract":
		testDirPath := filepath.Join(staticPath, "test", "ExampleQuery1")
		if !fileExists(testDirPath) {
			return nil, fmt.Errorf("static test directory not found: %s", testDirPath)
		}
		params["tests"] = []string{testDirPath}

	case "codeql_test_run":
		testDirPath := filepath.Join(staticPath, "test", "ExampleQuery1")
		if !fileExists(testDirPath) {
			return nil, fmt.Errorf("static test directory not found: %s", testDirPath)
		}
		params["tests"] = []string{testDirPath}

	case "codeql_query_run":
		queryFile := filepath.Join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.ql")
		databaseDir := filepath.Join(staticPath, "test", "ExampleQuery1", "ExampleQuery1.testproj")
		if !fileExists(queryFile) {
			return nil, fmt.Errorf("static query file not found: %s", queryFile)
		}
		params["query"] = queryFile
		if fileExists(databaseDir) {
			params["database"] = databaseDir
		}

	case "codeql_query_format":
		qlFiles := findFilesByExt(beforeDir, ".ql")
		if len(qlFiles) == 0 {
			return nil, fmt.Errorf("no .ql files in %s", beforeDir)
		}
		params["files"] = []string{filepath.Join(beforeDir, qlFiles[0])}
		params["check-only"] = true

	case "codeql_query_compile":
		queryFile := filepath.Join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.ql")
		if !fileExists(queryFile) {
			return nil, fmt.Errorf("static query file not found: %s", queryFile)
		}
		params["query"] = queryFile

	case "codeql_pack_ls":
		params["dir"] = filepath.Join(staticPath, "src")

	case "codeql_pack_install":
		params["packDir"] = filepath.Join(staticPath, "src")

	case "codeql_resolve_library-path", "codeql_resolve_library_path":
		queryFile := filepath.Join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.ql")
		if !fileExists(queryFile) {
			return nil, fmt.Errorf("static query file not found: %s", queryFile)
		}
		params["query"] = queryFile

	case "codeql_resolve_metadata":
		qlFiles := findFilesByExt(beforeDir, ".ql")
		if len(qlFiles) == 0 {
			return nil, fmt.Errorf("no .ql files in %s", beforeDir)
		}
		params["query"] = filepath.Join(beforeDir, qlFiles[0])

	case "codeql_resolve_queries":
		params["path"] = beforeDir

	case "codeql_resolve_tests":
		params["tests"] = []string{beforeDir}

	case "codeql_test_accept":
		params["tests"] = []string{beforeDir}

	case "codeql_resolve_files":
		params["path"] = filepath.Join(staticPath, "src")
		params["include-extension"] = ".ql"

	case "codeql_resolve_languages":
		// No params needed

	case "codeql_database_create":
		params["language"] = "javascript"
		params["source-root"] = filepath.Join(staticPath, "test", "ExampleQuery1")
		params["output"] = filepath.Join(repoRoot, ".tmp", "test-db-create")

	case "codeql_database_analyze":
		databaseDir := filepath.Join(staticPath, "test", "ExampleQuery1", "ExampleQuery1.testproj")
		params["database"] = databaseDir
		params["output"] = filepath.Join(repoRoot, ".tmp", "test-analyze-output.sarif")
		params["format"] = "sarif-latest"

	case "codeql_resolve_database":
		databaseDir := filepath.Join(staticPath, "test", "ExampleQuery1", "ExampleQuery1.testproj")
		params["database"] = databaseDir

	case "codeql_generate_query-help":
		queryFile := filepath.Join(staticPath, "src", "ExampleQuery1", "ExampleQuery1.ql")
		params["query"] = queryFile
		params["format"] = "markdown"

	case "validate_codeql_query":
		params["query"] = "from int i select i"
		params["language"] = "java"

	case "find_class_position":
		qlFiles := findFilesByExt(beforeDir, ".ql")
		if len(qlFiles) == 0 {
			return nil, fmt.Errorf("no .ql files in %s", beforeDir)
		}
		params["file"] = filepath.Join(beforeDir, qlFiles[0])
		params["name"] = "TestClass"

	case "find_predicate_position":
		qlFiles := findFilesByExt(beforeDir, ".ql")
		if len(qlFiles) == 0 {
			return nil, fmt.Errorf("no .ql files in %s", beforeDir)
		}
		params["file"] = filepath.Join(beforeDir, qlFiles[0])
		params["name"] = "testPredicate"

	case "find_codeql_query_files":
		qlFiles := findFilesByExt(beforeDir, ".ql")
		if len(qlFiles) > 0 {
			params["queryPath"] = filepath.Join(beforeDir, qlFiles[0])
		}

	case "create_codeql_query":
		params["language"] = "javascript"
		params["queryName"] = "TestQuery"
		params["outputDir"] = filepath.Join(repoRoot, ".tmp", "test-create-query")

	case "search_ql_code":
		params["pattern"] = "select"
		params["path"] = filepath.Join(staticPath, "src")

	case "quick_evaluate":
		qlFiles := findFilesByExt(beforeDir, ".ql")
		if len(qlFiles) > 0 {
			params["file"] = filepath.Join(beforeDir, qlFiles[0])
		}

	case "read_database_source":
		databaseDir := filepath.Join(staticPath, "test", "ExampleQuery1", "ExampleQuery1.testproj")
		params["database"] = databaseDir

	case "register_database":
		databaseDir := filepath.Join(staticPath, "test", "ExampleQuery1", "ExampleQuery1.testproj")
		params["databasePath"] = databaseDir

	case "list_codeql_databases":
		// No params needed (uses configured base dirs)

	case "list_query_run_results":
		// No params needed (uses configured dirs)

	case "session_calculate_current_score":
		params["sessionId"] = "test-session-score"

	case "session_end":
		params["sessionId"] = "test-session-end"
		params["status"] = "completed"

	case "sessions_compare":
		params["sessionIds"] = []string{"session-1", "session-2"}

	case "sarif_extract_rule", "sarif_list_rules", "sarif_rule_to_markdown":
		sarifFiles := findFilesByExt(beforeDir, ".sarif")
		if len(sarifFiles) > 0 {
			params["sarifPath"] = filepath.Join(beforeDir, sarifFiles[0])
		}
		// Merge ruleId from test-config.json if present
		if configData, err := os.ReadFile(configPath); err == nil {
			var cfg TestConfig
			if json.Unmarshal(configData, &cfg) == nil {
				if ruleID, ok := cfg.Arguments["ruleId"]; ok {
					params["ruleId"] = ruleID
				}
			}
		}

	case "sarif_compare_alerts":
		sarifFiles := findFilesByExt(beforeDir, ".sarif")
		if len(sarifFiles) > 0 {
			sarifPath := filepath.Join(beforeDir, sarifFiles[0])
			if configData, err := os.ReadFile(configPath); err == nil {
				var cfg TestConfig
				if json.Unmarshal(configData, &cfg) == nil {
					args := cfg.Arguments
					alertA, _ := args["alertA"].(map[string]any)
					alertB, _ := args["alertB"].(map[string]any)
					if alertA != nil {
						alertA["sarifPath"] = sarifPath
						params["alertA"] = alertA
					}
					if alertB != nil {
						alertB["sarifPath"] = sarifPath
						params["alertB"] = alertB
					}
					if mode, ok := args["overlapMode"]; ok {
						params["overlapMode"] = mode
					}
				}
			}
		}

	case "sarif_diff_runs":
		sarifFiles := findFilesByExt(beforeDir, ".sarif")
		sort.Strings(sarifFiles)
		if len(sarifFiles) >= 2 {
			params["sarifPathA"] = filepath.Join(beforeDir, sarifFiles[0])
			params["sarifPathB"] = filepath.Join(beforeDir, sarifFiles[1])
		} else if len(sarifFiles) == 1 {
			params["sarifPathA"] = filepath.Join(beforeDir, sarifFiles[0])
			params["sarifPathB"] = filepath.Join(beforeDir, sarifFiles[0])
		}
		if configData, err := os.ReadFile(configPath); err == nil {
			var cfg TestConfig
			if json.Unmarshal(configData, &cfg) == nil {
				if labelA, ok := cfg.Arguments["labelA"]; ok {
					params["labelA"] = labelA
				}
				if labelB, ok := cfg.Arguments["labelB"]; ok {
					params["labelB"] = labelB
				}
			}
		}

	default:
		// For annotation_*, audit_*, query_results_cache_*, profile_* tools:
		// try test-config.json only (already handled above)
		return nil, fmt.Errorf("no parameter logic for tool %q test %q", toolName, testCase)
	}

	return params, nil
}

// findFilesByExt returns filenames in dir matching the given extension.
func findFilesByExt(dir, ext string) []string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var matches []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ext) {
			matches = append(matches, e.Name())
		}
	}
	sort.Strings(matches)
	return matches
}
