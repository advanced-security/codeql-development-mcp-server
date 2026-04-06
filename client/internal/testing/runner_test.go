package testing

import (
	"testing"
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
	content []ContentBlock
	err     error
	isError bool
}

func newMockCaller() *mockCaller {
	return &mockCaller{
		results: make(map[string]mockResult),
	}
}

func (m *mockCaller) CallToolRaw(name string, params map[string]any) ([]ContentBlock, bool, error) {
	m.calls = append(m.calls, mockCall{name: name, params: params})
	if r, ok := m.results[name]; ok {
		return r.content, r.isError, r.err
	}
	return []ContentBlock{{Type: "text", Text: "ok"}}, false, nil
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

	opts := RunnerOptions{
		RepoRoot:    "/nonexistent",
		FilterTools: []string{"nonexistent_tool"},
	}

	runner := NewRunner(caller, opts)
	if runner == nil {
		t.Fatal("NewRunner returned nil")
	}

	// Running with nonexistent directory should not panic
	allPassed, results := runner.Run()
	// No tests found = all passed (vacuously true)
	if !allPassed {
		t.Error("expected allPassed=true when no tests found")
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results, got %d", len(results))
	}
}
