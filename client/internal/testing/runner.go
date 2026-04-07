package testing

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ToolCaller is the interface for making MCP tool calls.
type ToolCaller interface {
	CallToolRaw(name string, params map[string]any) ([]ContentBlock, bool, error)
	ListToolNames() ([]string, error)
}

// ContentBlock represents a single content block in an MCP tool response.
type ContentBlock struct {
	Text string `json:"text"`
	Type string `json:"type"`
}

// TestConfig represents a test-config.json fixture file.
type TestConfig struct {
	Arguments  map[string]any  `json:"arguments"`
	Assertions *TestAssertions `json:"assertions,omitempty"`
	ToolName   string          `json:"toolName"`
}

// TestAssertions defines expected properties of a tool's response.
type TestAssertions struct {
	// ResponseContains lists substrings that must appear in the concatenated
	// response text. All must match for the test to pass.
	ResponseContains []string `json:"responseContains,omitempty"`
	// ResponseNotContains lists substrings that must NOT appear.
	ResponseNotContains []string `json:"responseNotContains,omitempty"`
	// MinContentBlocks is the minimum number of content blocks expected
	// (0 means use the default check of at least 1).
	MinContentBlocks int `json:"minContentBlocks,omitempty"`
}

// TestResult holds the outcome of a single integration test.
type TestResult struct {
	Duration time.Duration
	Error    string
	Passed   bool
	TestName string
	ToolName string
}

// RunnerOptions configures the integration test runner.
type RunnerOptions struct {
	FilterTests    []string
	FilterTools    []string
	NoInstallPacks bool
	RepoRoot       string
}

// Runner discovers and executes integration tests.
type Runner struct {
	availableTools map[string]bool
	caller         ToolCaller
	options        RunnerOptions
	results        []TestResult
	tmpBase        string
}

// NewRunner creates a new integration test runner.
func NewRunner(caller ToolCaller, opts RunnerOptions) *Runner {
	tmpBase := filepath.Join(opts.RepoRoot, ".tmp")
	return &Runner{
		caller:  caller,
		options: opts,
		tmpBase: tmpBase,
	}
}

// Run discovers and executes all integration tests.
func (r *Runner) Run() (bool, []TestResult) {
	// Query available tools from the server
	toolNames, err := r.caller.ListToolNames()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: could not list server tools: %v\n", err)
		return false, nil
	}
	r.availableTools = make(map[string]bool, len(toolNames))
	for _, name := range toolNames {
		r.availableTools[name] = true
	}
	fmt.Printf("Server has %d tools registered\n", len(r.availableTools))

	testsDir := filepath.Join(r.options.RepoRoot, "client", "integration-tests", "primitives", "tools")

	entries, err := os.ReadDir(testsDir)
	if err != nil {
		errMsg := fmt.Sprintf("integration tests directory not found: %v", err)
		fmt.Fprintf(os.Stderr, "Error: %s\n", errMsg)
		r.recordResult("(fixtures)", "", false, errMsg, 0)
		return r.printSummary(), r.results
	}

	var toolDirs []string
	for _, e := range entries {
		if e.IsDir() {
			toolDirs = append(toolDirs, e.Name())
		}
	}

	sort.Slice(toolDirs, func(i, j int) bool {
		pi := toolPriority(toolDirs[i])
		pj := toolPriority(toolDirs[j])
		if pi != pj {
			return pi < pj
		}
		return toolDirs[i] < toolDirs[j]
	})

	if len(r.options.FilterTools) > 0 {
		filterSet := make(map[string]bool)
		for _, t := range r.options.FilterTools {
			filterSet[t] = true
		}
		var filtered []string
		for _, t := range toolDirs {
			if filterSet[t] {
				filtered = append(filtered, t)
			}
		}
		toolDirs = filtered
	}

	fmt.Printf("Found %d tool test directories\n", len(toolDirs))

	for _, toolName := range toolDirs {
		r.runToolTests(toolName, testsDir)
	}

	return r.printSummary(), r.results
}

func (r *Runner) runToolTests(toolName, testsDir string) {
	// Skip codeql_pack_install when --no-install-packs is set
	if r.options.NoInstallPacks && toolName == "codeql_pack_install" {
		fmt.Printf("\n  %s (skipped: --no-install-packs)\n", toolName)
		r.recordResult(toolName, "", false, "skipped: --no-install-packs", 0)
		return
	}

	// Deprecated monitoring/session tools — skip entirely
	if isDeprecatedTool(toolName) {
		fmt.Printf("\n  %s (skipped: deprecated)\n", toolName)
		r.recordResult(toolName, "", false, "skipped: deprecated", 0)
		return
	}

	// Normalize tool name: fixture dirs use underscores but some tools use hyphens
	serverToolName := normalizeToolName(toolName)

	// All other tools MUST be registered on the server — fail hard if missing
	if !r.availableTools[serverToolName] {
		fmt.Printf("\n  %s (FAIL: not registered on server)\n", toolName)
		r.recordResult(toolName, "", false,
			fmt.Sprintf("tool %q not registered on server — expected to be available", serverToolName), 0)
		return
	}

	toolDir := filepath.Join(testsDir, toolName)
	entries, err := os.ReadDir(toolDir)
	if err != nil {
		r.recordResult(toolName, "", false, fmt.Sprintf("read tool dir: %v", err), 0)
		return
	}

	var testCases []string
	for _, e := range entries {
		if e.IsDir() {
			testCases = append(testCases, e.Name())
		}
	}

	if len(r.options.FilterTests) > 0 {
		filterSet := make(map[string]bool)
		for _, t := range r.options.FilterTests {
			filterSet[t] = true
		}
		var filtered []string
		for _, t := range testCases {
			if filterSet[t] {
				filtered = append(filtered, t)
			}
		}
		testCases = filtered
	}

	if len(testCases) == 0 {
		return
	}

	fmt.Printf("\n  %s (%d tests)\n", toolName, len(testCases))

	for _, testCase := range testCases {
		r.runSingleTest(toolName, testCase, toolDir)
	}
}

func (r *Runner) runSingleTest(toolName, testCase, toolDir string) {
	testDir := filepath.Join(toolDir, testCase)
	start := time.Now()

	// Use the server's tool name (may differ from fixture dir name)
	serverToolName := normalizeToolName(toolName)

	// Unified parameter resolution: buildToolParams checks test-config.json,
	// monitoring-state.json parameters, and tool-specific defaults — in that order.
	params, err := buildToolParams(r.options.RepoRoot, toolName, testCase, testDir)
	if err != nil {
		elapsed := time.Since(start)
		r.recordResult(toolName, testCase, false, fmt.Sprintf("parameter resolution error: %v", err), elapsed)
		fmt.Printf("    FAIL %s (parameter resolution error: %v) [%.1fs]\n", testCase, err, elapsed.Seconds())
		return
	}

	// Resolve {{tmpdir}} placeholders in all params
	params = resolvePathPlaceholders(params, r.tmpBase)

	// Redirect bare relative output paths (output, interpretedOutput, outputDir)
	// to a per-test directory under tmpBase so that tool invocations do not
	// create artifacts in the process working directory (repo root).
	params = rewriteRelativeOutputPaths(params, r.tmpBase, toolName, testCase)

	// Clean up stale output files from prior runs of THIS test so that
	// comparisons only see output produced by this invocation.
	cleanStaleOutput(toolName, params, r.tmpBase)

	// Call the tool (using server tool name which may differ from fixture dir name)
	content, isError, callErr := r.caller.CallToolRaw(serverToolName, params)
	elapsed := time.Since(start)

	if callErr != nil {
		r.recordResult(toolName, testCase, false, fmt.Sprintf("tool call error: %v", callErr), elapsed)
		fmt.Printf("    FAIL %s (%v) [%.1fs]\n", testCase, callErr, elapsed.Seconds())
		return
	}

	if isError {
		errText := ""
		if len(content) > 0 {
			errText = content[0].Text
		}
		// Session/sessions tools expect "Session not found" or "No valid sessions found" errors
		isSessionTool := strings.HasPrefix(toolName, "session_") || strings.HasPrefix(toolName, "sessions_")
		if isSessionTool && (strings.Contains(errText, "Session not found") || strings.Contains(errText, "No valid sessions found")) {
			r.recordResult(toolName, testCase, true, "", elapsed)
			fmt.Printf("    PASS %s (expected session error) [%.1fs]\n", testCase, elapsed.Seconds())
			return
		}

		r.recordResult(toolName, testCase, false, fmt.Sprintf("tool returned error: %s", errText), elapsed)
		fmt.Printf("    FAIL %s (tool error: %s) [%.1fs]\n", testCase, truncate(errText, 100), elapsed.Seconds())
		return
	}

	// Validate non-empty response content — catches broken tools that
	// return success with empty results.
	if len(content) == 0 {
		r.recordResult(toolName, testCase, false, "tool returned no content blocks", elapsed)
		fmt.Printf("    FAIL %s (no content) [%.1fs]\n", testCase, elapsed.Seconds())
		return
	}

	// Validate assertions from test-config.json if present.
	if assertErr := validateAssertions(testDir, content); assertErr != "" {
		r.recordResult(toolName, testCase, false, assertErr, elapsed)
		fmt.Printf("    FAIL %s (%s) [%.1fs]\n", testCase, truncate(assertErr, 100), elapsed.Seconds())
		return
	}

	r.recordResult(toolName, testCase, true, "", elapsed)
	fmt.Printf("    PASS %s [%.1fs]\n", testCase, elapsed.Seconds())
}

func (r *Runner) recordResult(toolName, testCase string, passed bool, errMsg string, elapsed time.Duration) {
	r.results = append(r.results, TestResult{
		Duration: elapsed,
		Error:    errMsg,
		Passed:   passed,
		TestName: testCase,
		ToolName: toolName,
	})
}

func (r *Runner) printSummary() bool {
	fmt.Println("\n===============================================================")

	passed := 0
	failed := 0
	skipped := 0
	for _, res := range r.results {
		if res.Passed {
			passed++
		} else if strings.HasPrefix(res.Error, "skipped:") {
			skipped++
		} else {
			failed++
		}
	}

	fmt.Printf("Results: %d passed, %d failed, %d skipped (of %d total)\n",
		passed, failed, skipped, len(r.results))

	if failed > 0 {
		fmt.Println("\nFailed tests:")
		for _, res := range r.results {
			if !res.Passed && !strings.HasPrefix(res.Error, "skipped:") {
				fmt.Printf("  FAIL %s/%s: %s\n", res.ToolName, res.TestName, res.Error)
			}
		}
	}

	fmt.Println("===============================================================")
	return failed == 0
}

// validateAssertions checks test-config.json assertions against the tool
// response content. Returns an empty string on success, or a description
// of the first assertion failure.
func validateAssertions(testDir string, content []ContentBlock) string {
	configPath := filepath.Join(testDir, "test-config.json")
	data, err := os.ReadFile(configPath)
	if err != nil {
		// No test-config.json — skip assertion validation
		return ""
	}

	var config TestConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Sprintf("invalid test-config.json: %v", err)
	}
	if config.Assertions == nil {
		return ""
	}

	// Concatenate all text content blocks
	var combined strings.Builder
	for _, block := range content {
		combined.WriteString(block.Text)
		combined.WriteString("\n")
	}
	responseText := combined.String()

	// Check MinContentBlocks
	if config.Assertions.MinContentBlocks > 0 && len(content) < config.Assertions.MinContentBlocks {
		return fmt.Sprintf("assertion failed: expected at least %d content blocks, got %d",
			config.Assertions.MinContentBlocks, len(content))
	}

	// Check ResponseContains
	for _, want := range config.Assertions.ResponseContains {
		if !strings.Contains(responseText, want) {
			return fmt.Sprintf("assertion failed: response does not contain %q", want)
		}
	}

	// Check ResponseNotContains
	for _, reject := range config.Assertions.ResponseNotContains {
		if strings.Contains(responseText, reject) {
			return fmt.Sprintf("assertion failed: response must not contain %q", reject)
		}
	}

	return ""
}

// resolvePathPlaceholders replaces {{tmpdir}} in parameter values.
func resolvePathPlaceholders(params map[string]any, tmpBase string) map[string]any {
	if err := os.MkdirAll(tmpBase, 0o750); err != nil {
		fmt.Fprintf(os.Stderr, "warning: cannot create tmp dir %s: %v\n", tmpBase, err)
	}
	result := make(map[string]any, len(params))
	for k, v := range params {
		result[k] = resolvePathPlaceholderValue(v, tmpBase)
	}
	return result
}

func resolvePathPlaceholderValue(value any, tmpBase string) any {
	switch v := value.(type) {
	case string:
		if strings.Contains(v, "{{tmpdir}}") {
			return strings.ReplaceAll(v, "{{tmpdir}}", tmpBase)
		}
		return v
	case map[string]any:
		result := make(map[string]any, len(v))
		for key, nestedValue := range v {
			result[key] = resolvePathPlaceholderValue(nestedValue, tmpBase)
		}
		return result
	case []any:
		result := make([]any, len(v))
		for i, nestedValue := range v {
			result[i] = resolvePathPlaceholderValue(nestedValue, tmpBase)
		}
		return result
	default:
		return value
	}
}
func toolPriority(name string) int {
	switch name {
	case "codeql_pack_install":
		return 1
	case "codeql_test_extract", "codeql_database_create":
		return 2
	case "codeql_query_run", "codeql_test_run", "codeql_bqrs_decode",
		"codeql_bqrs_info", "codeql_database_analyze", "codeql_resolve_database":
		return 3
	case "codeql_lsp_diagnostics":
		return 35
	default:
		return 4
	}
}

// isDeprecatedTool returns true for monitoring/session tools that are
// deprecated and should be skipped in integration tests.
func isDeprecatedTool(name string) bool {
	return strings.HasPrefix(name, "session_") ||
		strings.HasPrefix(name, "sessions_")
}

// normalizeToolName maps fixture directory names to actual MCP tool names.
// Some tools use hyphens in their names (matching the codeql CLI subcommand)
// but fixture directories use underscores (filesystem-safe).
func normalizeToolName(dirName string) string {
	aliases := map[string]string{
		"codeql_resolve_library_path": "codeql_resolve_library-path",
	}
	if mapped, ok := aliases[dirName]; ok {
		return mapped
	}
	return dirName
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// rewriteRelativeOutputPaths rewrites bare relative file paths for the
// "output", "interpretedOutput", and "outputDir" parameters to point inside a
// per-test subdirectory of tmpBase. This prevents tool invocations from
// creating artifacts in the process working directory (the repo root).
//
// Paths that are already absolute — whether constructed by buildToolParams or
// resolved from a {{tmpdir}} placeholder — are left unchanged.
func rewriteRelativeOutputPaths(params map[string]any, tmpBase, toolName, testCase string) map[string]any {
	outDir := filepath.Join(tmpBase, "test-output", toolName, testCase)
	result := make(map[string]any, len(params))
	for k, v := range params {
		switch k {
		case "output", "interpretedOutput", "outputDir":
			if s, ok := v.(string); ok && s != "" && !filepath.IsAbs(s) {
				if err := os.MkdirAll(outDir, 0o750); err != nil {
					fmt.Fprintf(os.Stderr, "  warning: cannot create output dir %s: %v\n", outDir, err)
				}
				result[k] = filepath.Join(outDir, filepath.Base(s))
				continue
			}
		}
		result[k] = v
	}
	return result
}

// cleanStaleOutput removes stale interpretedOutput files or directories from
// prior codeql_query_run test invocations. This prevents stale results from
// affecting directory comparisons.
//
// baseDir is used as the root for resolving relative paths. The function only
// removes paths that resolve to within baseDir (CWE-22 prevention). Absolute
// paths that are already within baseDir are cleaned directly.
func cleanStaleOutput(toolName string, params map[string]any, baseDir string) {
	if toolName != "codeql_query_run" {
		return
	}
	outputVal, ok := params["interpretedOutput"]
	if !ok {
		return
	}
	outputPath, ok := outputVal.(string)
	if !ok || outputPath == "" {
		return
	}

	// Resolve to an absolute path.
	var fullPath string
	if filepath.IsAbs(outputPath) {
		fullPath = outputPath
	} else {
		normalized := filepath.Clean(outputPath)
		// Reject bare directory traversals in relative paths.
		if normalized == ".." || strings.HasPrefix(normalized, ".."+string(filepath.Separator)) {
			fmt.Fprintf(os.Stderr, "  Skipping interpretedOutput cleanup: unsafe path %q\n", outputPath)
			return
		}
		fullPath = filepath.Join(baseDir, normalized)
	}

	// Only remove paths within baseDir (CWE-22 prevention).
	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return
	}
	rel, err := filepath.Rel(absBase, fullPath)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		fmt.Fprintf(os.Stderr, "  Skipping interpretedOutput cleanup: path %q is outside base dir\n", outputPath)
		return
	}

	os.RemoveAll(fullPath)
}

func truncate(s string, max int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) > max {
		return s[:max] + "..."
	}
	return s
}
