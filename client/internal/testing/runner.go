package testing

import (
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
	Arguments map[string]any `json:"arguments"`
	ToolName  string         `json:"toolName"`
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
	FilterTests []string
	FilterTools []string
	RepoRoot    string
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
		fmt.Fprintf(os.Stderr, "No integration tests directory found: %v\n", err)
		return true, nil
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
	// Deprecated monitoring/session tools — skip entirely
	if isDeprecatedTool(toolName) {
		fmt.Printf("\n  %s (skipped: deprecated)\n", toolName)
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
		r.recordResult(toolName, testCase, false, fmt.Sprintf("skipped: %v", err), 0)
		fmt.Printf("    skip %s (%v)\n", testCase, err)
		return
	}

	// Resolve {{tmpdir}} placeholders in all params
	params = resolvePathPlaceholders(params, r.tmpBase)

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

// ResolvePathPlaceholders replaces {{tmpdir}} in parameter values.
func resolvePathPlaceholders(params map[string]any, tmpBase string) map[string]any {
	if err := os.MkdirAll(tmpBase, 0o750); err != nil {
		fmt.Fprintf(os.Stderr, "warning: cannot create tmp dir %s: %v\n", tmpBase, err)
	}
	result := make(map[string]any, len(params))
	for k, v := range params {
		if s, ok := v.(string); ok && strings.Contains(s, "{{tmpdir}}") {
			result[k] = strings.ReplaceAll(s, "{{tmpdir}}", tmpBase)
		} else {
			result[k] = v
		}
	}
	return result
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

func truncate(s string, max int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) > max {
		return s[:max] + "..."
	}
	return s
}
