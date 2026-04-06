package testing

import (
	"os"
	"path/filepath"
	"testing"
)

func TestBuildToolParams_TestConfig(t *testing.T) {
	// Create a temp test fixture with test-config.json
	dir := t.TempDir()
	testDir := filepath.Join(dir, "tools", "my_tool", "my_test")
	os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	os.WriteFile(filepath.Join(testDir, "test-config.json"),
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
	dir := t.TempDir()
	testDir := filepath.Join(dir, "tools", "codeql_lsp_completion", "basic")
	os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	os.WriteFile(filepath.Join(testDir, "before", "monitoring-state.json"),
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
	dir := t.TempDir()
	testDir := filepath.Join(dir, "tools", "validate_codeql_query", "syntax_validation")
	os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	os.WriteFile(filepath.Join(testDir, "before", "monitoring-state.json"),
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

func TestBuildToolParams_ResolveLanguages(t *testing.T) {
	dir := t.TempDir()
	testDir := filepath.Join(dir, "tools", "codeql_resolve_languages", "list_languages")
	os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	os.WriteFile(filepath.Join(testDir, "before", "monitoring-state.json"),
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
	dir := t.TempDir()
	testDir := filepath.Join(dir, "tools", "unknown_tool_xyz", "test1")
	os.MkdirAll(filepath.Join(testDir, "before"), 0o755)
	os.MkdirAll(filepath.Join(testDir, "after"), 0o755)
	os.WriteFile(filepath.Join(testDir, "before", "monitoring-state.json"),
		[]byte(`{"sessions":[]}`), 0o600)

	_, err := buildToolParams(dir, "unknown_tool_xyz", "test1", testDir)
	if err == nil {
		t.Fatal("expected error for unknown tool, got nil")
	}
}

func TestFindFilesByExt(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "a.ql"), []byte(""), 0o600)
	os.WriteFile(filepath.Join(dir, "b.ql"), []byte(""), 0o600)
	os.WriteFile(filepath.Join(dir, "c.txt"), []byte(""), 0o600)

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
	dir := t.TempDir()
	testDir := filepath.Join(dir, "tools", "sarif_extract_rule", "extract_sql_injection")
	beforeDir := filepath.Join(testDir, "before")
	os.MkdirAll(beforeDir, 0o755)
	os.MkdirAll(filepath.Join(testDir, "after"), 0o755)

	// Write test-config.json with ruleId but no sarifPath
	os.WriteFile(filepath.Join(testDir, "test-config.json"),
		[]byte(`{"toolName":"sarif_extract_rule","arguments":{"ruleId":"js/sql-injection"}}`), 0o600)

	// Write a SARIF file in before/
	os.WriteFile(filepath.Join(beforeDir, "test-input.sarif"),
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
	dir := t.TempDir()
	testDir := filepath.Join(dir, "tools", "sarif_compare_alerts", "sink_overlap")
	beforeDir := filepath.Join(testDir, "before")
	os.MkdirAll(beforeDir, 0o755)
	os.MkdirAll(filepath.Join(testDir, "after"), 0o755)

	// Write test-config.json with alertA/alertB but no sarifPath
	os.WriteFile(filepath.Join(testDir, "test-config.json"),
		[]byte(`{"toolName":"sarif_compare_alerts","arguments":{"alertA":{"ruleId":"r1","resultIndex":0},"alertB":{"ruleId":"r2","resultIndex":0},"overlapMode":"sink"}}`), 0o600)

	// Write a SARIF file in before/
	os.WriteFile(filepath.Join(beforeDir, "test-input.sarif"),
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
