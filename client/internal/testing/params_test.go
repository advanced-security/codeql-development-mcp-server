package testing

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// projectTmpDir creates a temporary directory under the project-local .tmp/
// directory instead of the OS temp directory (avoids CWE-377/CWE-378).
// Registers t.Cleanup to remove the directory after the test.
func projectTmpDir(t *testing.T, name string) string {
	t.Helper()
	// Walk up from this test file to find the repo root (contains codeql-workspace.yml)
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	dir := filepath.Dir(thisFile)
	for {
		if _, err := os.Stat(filepath.Join(dir, "codeql-workspace.yml")); err == nil {
			break
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("could not find repo root (codeql-workspace.yml)")
		}
		dir = parent
	}
	tmpBase := filepath.Join(dir, ".tmp", fmt.Sprintf("test-params-%s-%d", name, os.Getpid()))
	if err := os.MkdirAll(tmpBase, 0o755); err != nil {
		t.Fatalf("create project tmp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(tmpBase) })
	return tmpBase
}

func TestBuildToolParams_TestConfig(t *testing.T) {
	// Create a temp test fixture with test-config.json
	dir := projectTmpDir(t, "test-config")
	testDir := filepath.Join(dir, "tools", "my_tool", "my_test")
	_ = os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	_ = os.WriteFile(filepath.Join(testDir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{"key":"value"}}`), 0o600)

	params, err := buildToolParams(dir, "my_tool", "my_test", testDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if params["key"] != "value" {
		t.Errorf("params[key] = %v, want value", params["key"])
	}
}

func TestBuildToolParams_MonitoringStateParams(t *testing.T) {
	dir := projectTmpDir(t, "monitoring-state")
	testDir := filepath.Join(dir, "tools", "codeql_lsp_completion", "basic")
	_ = os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	_ = os.WriteFile(filepath.Join(testDir, "before", "monitoring-state.json"),
		[]byte(`{"sessions":[],"parameters":{"file_path":"test.ql","line":3}}`), 0o600)

	params, err := buildToolParams(dir, "codeql_lsp_completion", "basic", testDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if params["file_path"] != "test.ql" {
		t.Errorf("params[file_path] = %v, want test.ql", params["file_path"])
	}
	// line comes as float64 from JSON
	if params["line"] != float64(3) {
		t.Errorf("params[line] = %v, want 3", params["line"])
	}
}

func TestBuildToolParams_ValidateCodeqlQuery(t *testing.T) {
	dir := projectTmpDir(t, "validate-query")
	testDir := filepath.Join(dir, "tools", "validate_codeql_query", "syntax_validation")
	_ = os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	_ = os.WriteFile(filepath.Join(testDir, "before", "monitoring-state.json"),
		[]byte(`{"sessions":[]}`), 0o600)

	params, err := buildToolParams(dir, "validate_codeql_query", "syntax_validation", testDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if params["query"] != "from int i select i" {
		t.Errorf("params[query] = %v, want 'from int i select i'", params["query"])
	}
	if params["language"] != "java" {
		t.Errorf("params[language] = %v, want java", params["language"])
	}
}

func TestBuildToolParams_ResolveQueries_UsesDirectoryKey(t *testing.T) {
	dir := projectTmpDir(t, "resolve-queries")
	testDir := filepath.Join(dir, "tools", "codeql_resolve_queries", "resolve_queries")
	_ = os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)

	params, err := buildToolParams(dir, "codeql_resolve_queries", "resolve_queries", testDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// The server schema expects "directory", not "path"
	if _, ok := params["directory"]; !ok {
		t.Errorf("expected params to contain 'directory' key, got keys: %v", params)
	}
	if _, ok := params["path"]; ok {
		t.Errorf("params should NOT contain 'path' key for codeql_resolve_queries; use 'directory' instead")
	}
}

func TestBuildToolParams_ResolveLanguages(t *testing.T) {
	dir := projectTmpDir(t, "resolve-languages")
	testDir := filepath.Join(dir, "tools", "codeql_resolve_languages", "list_languages")
	_ = os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	_ = os.WriteFile(filepath.Join(testDir, "before", "monitoring-state.json"),
		[]byte(`{"sessions":[]}`), 0o600)

	params, err := buildToolParams(dir, "codeql_resolve_languages", "list_languages", testDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// codeql_resolve_languages takes no params
	if len(params) != 0 {
		t.Errorf("expected empty params for codeql_resolve_languages, got %v", params)
	}
}

func TestBuildToolParams_UnknownTool(t *testing.T) {
	dir := projectTmpDir(t, "unknown-tool")
	testDir := filepath.Join(dir, "tools", "unknown_tool_xyz", "test1")
	_ = os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	_ = os.WriteFile(filepath.Join(testDir, "before", "monitoring-state.json"),
		[]byte(`{"sessions":[]}`), 0o600)

	_, err := buildToolParams(dir, "unknown_tool_xyz", "test1", testDir)
	if err == nil {
		t.Fatal("expected error for unknown tool, got nil")
	}
}

func TestFindFilesByExt(t *testing.T) {
	dir := projectTmpDir(t, "find-files")
	_ = os.WriteFile(filepath.Join(dir, "a.ql"), []byte(""), 0o600)
	_ = os.WriteFile(filepath.Join(dir, "b.ql"), []byte(""), 0o600)
	_ = os.WriteFile(filepath.Join(dir, "c.txt"), []byte(""), 0o600)

	qlFiles := findFilesByExt(dir, ".ql")
	if len(qlFiles) != 2 {
		t.Errorf("found %d .ql files, want 2", len(qlFiles))
	}
	if qlFiles[0] != "a.ql" || qlFiles[1] != "b.ql" {
		t.Errorf("files = %v, want [a.ql b.ql]", qlFiles)
	}

	txtFiles := findFilesByExt(dir, ".txt")
	if len(txtFiles) != 1 {
		t.Errorf("found %d .txt files, want 1", len(txtFiles))
	}
}

func TestIsSARIFTool(t *testing.T) {
	tests := []struct {
		name string
		want bool
	}{
		{"sarif_extract_rule", true},
		{"sarif_list_rules", true},
		{"sarif_compare_alerts", true},
		{"sarif_diff_runs", true},
		{"sarif_rule_to_markdown", true},
		{"codeql_query_run", false},
		{"validate_codeql_query", false},
		{"codeql_pack_install", false},
	}
	for _, tt := range tests {
		if got := isSARIFTool(tt.name); got != tt.want {
			t.Errorf("isSARIFTool(%q) = %v, want %v", tt.name, got, tt.want)
		}
	}
}

func TestBuildToolParams_SARIFToolWithConfig(t *testing.T) {
	dir := projectTmpDir(t, "sarif-tool-config")
	testDir := filepath.Join(dir, "tools", "sarif_extract_rule", "extract_sql_injection")
	beforeDir := filepath.Join(testDir, "before")
	_ = os.MkdirAll(beforeDir, 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)

	// Write test-config.json with ruleId but no sarifPath
	_ = os.WriteFile(filepath.Join(testDir, "test-config.json"),
		[]byte(`{"toolName":"sarif_extract_rule","arguments":{"ruleId":"js/sql-injection"}}`), 0o600)

	// Write a SARIF file in before/
	_ = os.WriteFile(filepath.Join(beforeDir, "test-input.sarif"),
		[]byte(`{"version":"2.1.0"}`), 0o600)

	params, err := buildToolParams(dir, "sarif_extract_rule", "extract_sql_injection", testDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have sarifPath injected from before/
	sarifPath, ok := params["sarifPath"].(string)
	if !ok || sarifPath == "" {
		t.Error("expected sarifPath to be injected from before/ directory")
	}

	// Should still have ruleId from config
	if params["ruleId"] != "js/sql-injection" {
		t.Errorf("params[ruleId] = %v, want js/sql-injection", params["ruleId"])
	}
}

func TestBuildToolParams_SARIFCompareAlertsWithConfig(t *testing.T) {
	dir := projectTmpDir(t, "sarif-compare-alerts")
	testDir := filepath.Join(dir, "tools", "sarif_compare_alerts", "sink_overlap")
	beforeDir := filepath.Join(testDir, "before")
	_ = os.MkdirAll(beforeDir, 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)

	// Write test-config.json with alertA/alertB but no sarifPath
	_ = os.WriteFile(filepath.Join(testDir, "test-config.json"),
		[]byte(`{"toolName":"sarif_compare_alerts","arguments":{"alertA":{"ruleId":"r1","resultIndex":0},"alertB":{"ruleId":"r2","resultIndex":0},"overlapMode":"sink"}}`), 0o600)

	// Write a SARIF file in before/
	_ = os.WriteFile(filepath.Join(beforeDir, "test-input.sarif"),
		[]byte(`{"version":"2.1.0"}`), 0o600)

	params, err := buildToolParams(dir, "sarif_compare_alerts", "sink_overlap", testDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// alertA should have sarifPath injected
	alertA, ok := params["alertA"].(map[string]any)
	if !ok {
		t.Fatal("expected alertA in params")
	}
	if alertA["sarifPath"] == nil || alertA["sarifPath"] == "" {
		t.Error("expected sarifPath injected into alertA")
	}

	// alertB should have sarifPath injected
	alertB, ok := params["alertB"].(map[string]any)
	if !ok {
		t.Fatal("expected alertB in params")
	}
	if alertB["sarifPath"] == nil || alertB["sarifPath"] == "" {
		t.Error("expected sarifPath injected into alertB")
	}
}

func TestBuildToolParams_SARIFDiffByCommitsWithConfig(t *testing.T) {
	dir := projectTmpDir(t, "sarif-diff-by-commits")
	testDir := filepath.Join(dir, "tools", "sarif_diff_by_commits", "file_level_classification")
	beforeDir := filepath.Join(testDir, "before")
	_ = os.MkdirAll(beforeDir, 0o755)
	_ = os.MkdirAll(filepath.Join(testDir, "after"), 0o755)

	// Write test-config.json with refRange and granularity but no sarifPath
	_ = os.WriteFile(filepath.Join(testDir, "test-config.json"),
		[]byte(`{"toolName":"sarif_diff_by_commits","arguments":{"refRange":"HEAD..HEAD","granularity":"file"}}`), 0o600)

	// Write a SARIF file in before/
	_ = os.WriteFile(filepath.Join(beforeDir, "results.sarif"),
		[]byte(`{"version":"2.1.0","runs":[{"tool":{"driver":{"name":"CodeQL","rules":[]}},"results":[]}]}`), 0o600)

	params, err := buildToolParams(dir, "sarif_diff_by_commits", "file_level_classification", testDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have sarifPath injected from before/
	sarifPath, ok := params["sarifPath"].(string)
	if !ok || sarifPath == "" {
		t.Error("expected sarifPath to be injected from before/ directory")
	}

	// Should have refRange from config
	if params["refRange"] != "HEAD..HEAD" {
		t.Errorf("params[refRange] = %v, want HEAD..HEAD", params["refRange"])
	}

	// Should have granularity from config
	if params["granularity"] != "file" {
		t.Errorf("params[granularity] = %v, want file", params["granularity"])
	}
}
