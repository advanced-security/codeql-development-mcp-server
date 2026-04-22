package testing

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	mcpprim "github.com/advanced-security/codeql-development-mcp-server/client/internal/mcp"
)

// mockCaller implements ToolCaller for tests.
type mockCaller struct {
	calls   []mockCall
	results map[string]mockResult
}

type mockCall struct {
	name   string
	params map[string]any
}

type mockResult struct {
	content []mcpprim.ContentBlock
	err     error
	isError bool
}

func newMockCaller() *mockCaller {
	return &mockCaller{
		results: make(map[string]mockResult),
	}
}

func (m *mockCaller) CallToolRaw(name string, params map[string]any) ([]mcpprim.ContentBlock, bool, error) {
	m.calls = append(m.calls, mockCall{name: name, params: params})
	if r, ok := m.results[name]; ok {
		return r.content, r.isError, r.err
	}
	return []mcpprim.ContentBlock{{Type: "text", Text: "ok"}}, false, nil
}

func (m *mockCaller) ListToolNames() ([]string, error) {
	return []string{"mock_tool"}, nil
}

func TestResolvePathPlaceholders(t *testing.T) {
	tmpBase := "/test/tmp"
	params := map[string]any{
		"path":   "{{tmpdir}}/output",
		"name":   "no-change",
		"nested": "prefix/{{tmpdir}}/suffix",
		"number": 42,
	}

	result := resolvePathPlaceholders(params, tmpBase)

	if result["path"] != "/test/tmp/output" {
		t.Errorf("path = %q, want %q", result["path"], "/test/tmp/output")
	}
	if result["name"] != "no-change" {
		t.Errorf("name = %q, want %q", result["name"], "no-change")
	}
	if result["nested"] != "prefix//test/tmp/suffix" {
		t.Errorf("nested = %q, want %q", result["nested"], "prefix//test/tmp/suffix")
	}
	if result["number"] != 42 {
		t.Errorf("number = %v, want %v", result["number"], 42)
	}
}

func TestRewriteRelativeOutputPaths(t *testing.T) {
	dir := t.TempDir()

	tests := []struct {
		name       string
		params     map[string]any
		wantAbsKey string
		wantBase   string
	}{
		{
			name:       "relative output redirected to tmpBase",
			params:     map[string]any{"output": "query-results.bqrs"},
			wantAbsKey: "output",
			wantBase:   filepath.Join(dir, "test-output", "codeql_query_run", "my_test"),
		},
		{
			name:       "relative interpretedOutput redirected to tmpBase",
			params:     map[string]any{"interpretedOutput": "query-results.sarif"},
			wantAbsKey: "interpretedOutput",
			wantBase:   filepath.Join(dir, "test-output", "codeql_query_run", "my_test"),
		},
		{
			name:       "absolute output left unchanged",
			params:     map[string]any{"output": filepath.Join(dir, "after", "output.txt")},
			wantAbsKey: "",
		},
		{
			name: "non-output keys left unchanged",
			params: map[string]any{
				"query":    "relative/query.ql",
				"database": "relative/db",
			},
			wantAbsKey: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := rewriteRelativeOutputPaths(tt.params, dir, "codeql_query_run", "my_test")

			if tt.wantAbsKey == "" {
				// Verify output-related keys are unchanged (or non-existent)
				for k, orig := range tt.params {
					if got, ok := result[k]; !ok || got != orig {
						t.Errorf("key %q: got %v, want %v (should be unchanged)", k, got, orig)
					}
				}
				return
			}

			// Verify the key was rewritten to an absolute path under the expected base
			got, ok := result[tt.wantAbsKey]
			if !ok {
				t.Fatalf("key %q missing from result", tt.wantAbsKey)
			}
			gotStr, ok := got.(string)
			if !ok {
				t.Fatalf("key %q is not a string: %T", tt.wantAbsKey, got)
			}
			if !filepath.IsAbs(gotStr) {
				t.Errorf("rewritten path %q is not absolute", gotStr)
			}
			if !strings.HasPrefix(gotStr, tt.wantBase) {
				t.Errorf("rewritten path %q does not start with expected base %q", gotStr, tt.wantBase)
			}
		})
	}
}

func TestToolPriority(t *testing.T) {
	tests := []struct {
		name     string
		expected int
	}{
		{"codeql_pack_install", 1},
		{"codeql_test_extract", 2},
		{"codeql_database_create", 2},
		{"codeql_query_run", 3},
		{"codeql_lsp_diagnostics", 35},
		{"sarif_list_rules", 4},
		{"unknown_tool", 4},
	}
	for _, tt := range tests {
		if got := toolPriority(tt.name); got != tt.expected {
			t.Errorf("toolPriority(%q) = %d, want %d", tt.name, got, tt.expected)
		}
	}
}

func TestTruncate(t *testing.T) {
	if truncate("short", 10) != "short" {
		t.Error("short string should not be truncated")
	}
	if truncate("this is a long string", 10) != "this is a ..." {
		t.Errorf("got %q", truncate("this is a long string", 10))
	}
	if truncate("line1\nline2", 20) != "line1 line2" {
		t.Errorf("got %q", truncate("line1\nline2", 20))
	}
}

func TestRunnerWithMockCaller(t *testing.T) {
	caller := newMockCaller()

	// Create a valid repo root with an empty fixtures directory
	dir := t.TempDir()
	testsDir := filepath.Join(dir, "client", "integration-tests", "primitives", "tools")
	os.MkdirAll(testsDir, 0o755)

	opts := RunnerOptions{
		RepoRoot:    dir,
		FilterTools: []string{"nonexistent_tool"},
	}

	runner := NewRunner(caller, opts)
	if runner == nil {
		t.Fatal("NewRunner returned nil")
	}

	// Running with no matching tool dirs = all passed (vacuously true)
	allPassed, results := runner.Run()
	if !allPassed {
		t.Error("expected allPassed=true when no tests found")
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results, got %d", len(results))
	}
}

func TestRunnerNoInstallPacks(t *testing.T) {
	caller := newMockCaller()

	// Create a repo root with a codeql_pack_install fixture directory
	dir := t.TempDir()
	testsDir := filepath.Join(dir, "client", "integration-tests", "primitives", "tools")
	// Create the fixture dir so the runner encounters it and records a skip
	os.MkdirAll(filepath.Join(testsDir, "codeql_pack_install"), 0o755)

	opts := RunnerOptions{
		RepoRoot:       dir,
		NoInstallPacks: true,
	}

	runner := NewRunner(caller, opts)
	if runner == nil {
		t.Fatal("NewRunner returned nil")
	}

	// codeql_pack_install should be skipped — one skipped result recorded
	allPassed, results := runner.Run()
	if !allPassed {
		t.Error("expected allPassed=true when only skipped results")
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 skipped result, got %d", len(results))
	}
	if results[0].ToolName != "codeql_pack_install" {
		t.Errorf("expected skipped result for codeql_pack_install, got %q", results[0].ToolName)
	}
	if results[0].Error != "skipped: --no-install-packs" {
		t.Errorf("unexpected skip reason: %q", results[0].Error)
	}
	if results[0].Passed {
		t.Error("skipped result should have Passed=false")
	}
}

func TestRunnerEmptyContentFails(t *testing.T) {
	caller := newMockCaller()
	// Return empty content blocks for mock_tool
	caller.results["mock_tool"] = mockResult{
		content: []mcpprim.ContentBlock{},
		isError: false,
		err:     nil,
	}

	// Create a minimal test fixture directory
	dir := t.TempDir()
	testsDir := filepath.Join(dir, "client", "integration-tests", "primitives", "tools")
	toolDir := filepath.Join(testsDir, "mock_tool", "basic")
	os.MkdirAll(filepath.Join(toolDir, "before"), 0o755)
	os.MkdirAll(filepath.Join(toolDir, "after"), 0o755)
	os.WriteFile(filepath.Join(toolDir, "test-config.json"),
		[]byte(`{"toolName":"mock_tool","arguments":{"key":"value"}}`), 0o600)

	opts := RunnerOptions{
		RepoRoot: dir,
	}

	runner := NewRunner(caller, opts)
	allPassed, results := runner.Run()

	if allPassed {
		t.Error("expected allPassed=false when tool returns empty content")
	}
	if len(results) == 0 {
		t.Fatal("expected at least one result")
	}
	for _, r := range results {
		if r.ToolName == "mock_tool" && r.TestName == "basic" {
			if r.Passed {
				t.Error("expected mock_tool/basic to fail with empty content")
			}
			if r.Error != "tool returned no content blocks" {
				t.Errorf("unexpected error: %q", r.Error)
			}
			return
		}
	}
	t.Error("mock_tool/basic result not found")
}

func TestValidateAssertions_NoConfig(t *testing.T) {
	dir := t.TempDir()
	// No test-config.json — should pass
	result := validateAssertions(dir, []mcpprim.ContentBlock{{Text: "hello"}})
	if result != "" {
		t.Errorf("expected no error, got %q", result)
	}
}

func TestValidateAssertions_NoAssertions(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{}}`), 0o600)

	result := validateAssertions(dir, []mcpprim.ContentBlock{{Text: "hello"}})
	if result != "" {
		t.Errorf("expected no error when no assertions defined, got %q", result)
	}
}

func TestValidateAssertions_ResponseContains_Pass(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{},"assertions":{"responseContains":["hello","world"]}}`), 0o600)

	content := []mcpprim.ContentBlock{{Text: "hello world"}}
	result := validateAssertions(dir, content)
	if result != "" {
		t.Errorf("expected pass, got %q", result)
	}
}

func TestValidateAssertions_ResponseContains_Fail(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{},"assertions":{"responseContains":["missing"]}}`), 0o600)

	content := []mcpprim.ContentBlock{{Text: "hello world"}}
	result := validateAssertions(dir, content)
	if result == "" {
		t.Error("expected assertion failure for missing content")
	}
}

func TestValidateAssertions_ResponseNotContains_Pass(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{},"assertions":{"responseNotContains":["error","fail"]}}`), 0o600)

	content := []mcpprim.ContentBlock{{Text: "all good"}}
	result := validateAssertions(dir, content)
	if result != "" {
		t.Errorf("expected pass, got %q", result)
	}
}

func TestValidateAssertions_ResponseNotContains_Fail(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{},"assertions":{"responseNotContains":["error"]}}`), 0o600)

	content := []mcpprim.ContentBlock{{Text: "some error happened"}}
	result := validateAssertions(dir, content)
	if result == "" {
		t.Error("expected assertion failure for forbidden content")
	}
}

func TestValidateAssertions_MinContentBlocks_Pass(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{},"assertions":{"minContentBlocks":2}}`), 0o600)

	content := []mcpprim.ContentBlock{{Text: "block1"}, {Text: "block2"}}
	result := validateAssertions(dir, content)
	if result != "" {
		t.Errorf("expected pass, got %q", result)
	}
}

func TestValidateAssertions_MinContentBlocks_Fail(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{},"assertions":{"minContentBlocks":3}}`), 0o600)

	content := []mcpprim.ContentBlock{{Text: "only one"}}
	result := validateAssertions(dir, content)
	if result == "" {
		t.Error("expected assertion failure for insufficient content blocks")
	}
}

func TestValidateAssertions_MultipleBlocks(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "test-config.json"),
		[]byte(`{"toolName":"my_tool","arguments":{},"assertions":{"responseContains":["from block2"]}}`), 0o600)

	content := []mcpprim.ContentBlock{{Text: "block1 text"}, {Text: "from block2"}}
	result := validateAssertions(dir, content)
	if result != "" {
		t.Errorf("expected pass across multiple blocks, got %q", result)
	}
}

func TestRunnerMissingFixturesDirFails(t *testing.T) {
	caller := newMockCaller()

	// Point to a repo root that exists but has no client/integration-tests/primitives/tools
	dir := t.TempDir()

	opts := RunnerOptions{
		RepoRoot: dir,
	}

	runner := NewRunner(caller, opts)
	allPassed, results := runner.Run()

	// A missing fixtures directory must be treated as a hard failure
	if allPassed {
		t.Error("expected allPassed=false when fixtures directory is missing")
	}
	if len(results) == 0 {
		t.Error("expected at least one failure result for missing fixtures directory")
	}
}

func TestRunnerAssertionFailure(t *testing.T) {
	caller := newMockCaller()
	caller.results["mock_tool"] = mockResult{
		content: []mcpprim.ContentBlock{{Type: "text", Text: "unexpected output"}},
		isError: false,
		err:     nil,
	}

	dir := t.TempDir()
	testsDir := filepath.Join(dir, "client", "integration-tests", "primitives", "tools")
	toolDir := filepath.Join(testsDir, "mock_tool", "assertion_test")
	os.MkdirAll(filepath.Join(toolDir, "before"), 0o755)
	os.MkdirAll(filepath.Join(toolDir, "after"), 0o755)
	os.WriteFile(filepath.Join(toolDir, "test-config.json"),
		[]byte(`{"toolName":"mock_tool","arguments":{"key":"value"},"assertions":{"responseContains":["expected text"]}}`), 0o600)

	runner := NewRunner(caller, RunnerOptions{RepoRoot: dir})
	allPassed, results := runner.Run()

	if allPassed {
		t.Error("expected allPassed=false when assertion fails")
	}

	found := false
	for _, r := range results {
		if r.ToolName == "mock_tool" && r.TestName == "assertion_test" {
			found = true
			if r.Passed {
				t.Error("expected test to fail")
			}
			if r.Error == "" {
				t.Error("expected error message")
			}
		}
	}
	if !found {
		t.Error("mock_tool/assertion_test result not found")
	}
}

func TestCleanStaleOutputRelativeFile(t *testing.T) {
	dir := t.TempDir()
	staleFile := filepath.Join(dir, "query-results.sarif")
	os.WriteFile(staleFile, []byte("stale"), 0o600)

	params := map[string]any{
		"interpretedOutput": "query-results.sarif",
	}

	cleanStaleOutput("codeql_query_run", params, dir)

	if fileExists(staleFile) {
		t.Error("expected stale file to be removed")
	}
}

func TestCleanStaleOutputRelativeDir(t *testing.T) {
	dir := t.TempDir()
	staleDir := filepath.Join(dir, "query-results")
	os.MkdirAll(filepath.Join(staleDir, "subdir"), 0o755)
	os.WriteFile(filepath.Join(staleDir, "subdir", "file.txt"), []byte("stale"), 0o600)

	params := map[string]any{
		"interpretedOutput": "query-results",
	}

	cleanStaleOutput("codeql_query_run", params, dir)

	if fileExists(staleDir) {
		t.Error("expected stale directory to be removed")
	}
}

func TestCleanStaleOutputAbsolutePathWithinBase(t *testing.T) {
	// After rewriteRelativeOutputPaths, interpretedOutput is an absolute path
	// within tmpBase. cleanStaleOutput should clean those paths.
	dir := t.TempDir()
	staleFile := filepath.Join(dir, "test-output", "query-results.sarif")
	os.MkdirAll(filepath.Dir(staleFile), 0o755)
	os.WriteFile(staleFile, []byte("stale"), 0o600)

	params := map[string]any{
		"interpretedOutput": staleFile, // absolute path inside dir
	}

	cleanStaleOutput("codeql_query_run", params, dir)

	if fileExists(staleFile) {
		t.Error("absolute path within base dir should be removed")
	}
}

func TestCleanStaleOutputRejectsAbsolutePathOutsideBase(t *testing.T) {
	// Absolute paths that are OUTSIDE baseDir must not be removed.
	dir := t.TempDir()
	outsideFile := filepath.Join(dir, "outside-file")
	os.WriteFile(outsideFile, []byte("keep"), 0o600)

	innerBase := filepath.Join(dir, "inner")
	os.MkdirAll(innerBase, 0o755)

	params := map[string]any{
		"interpretedOutput": outsideFile, // absolute path OUTSIDE innerBase
	}

	cleanStaleOutput("codeql_query_run", params, innerBase)

	if !fileExists(outsideFile) {
		t.Error("absolute path outside base dir should NOT be removed")
	}
}

func TestCleanStaleOutputRejectsTraversal(t *testing.T) {
	dir := t.TempDir()
	parentFile := filepath.Join(dir, "parent-file")
	os.WriteFile(parentFile, []byte("keep"), 0o600)

	childDir := filepath.Join(dir, "child")
	os.MkdirAll(childDir, 0o755)

	params := map[string]any{
		"interpretedOutput": "../parent-file",
	}

	cleanStaleOutput("codeql_query_run", params, childDir)

	if !fileExists(parentFile) {
		t.Error("traversal path should NOT be removed")
	}
}

func TestCleanStaleOutputSkipsNonQueryRun(t *testing.T) {
	dir := t.TempDir()
	staleFile := filepath.Join(dir, "output.txt")
	os.WriteFile(staleFile, []byte("keep"), 0o600)

	params := map[string]any{
		"interpretedOutput": "output.txt",
	}

	cleanStaleOutput("codeql_test_run", params, dir)

	if !fileExists(staleFile) {
		t.Error("non-codeql_query_run tool should not trigger cleanup")
	}
}

func TestCleanStaleOutputSkipsWhenNoParam(t *testing.T) {
	dir := t.TempDir()
	params := map[string]any{
		"query":    "example.ql",
		"database": "/some/db",
	}

	// Should not panic or error — just no-op
	cleanStaleOutput("codeql_query_run", params, dir)
}
