package mcp

import (
	"context"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
)

// hangCloser is a stub innerClient whose Close() blocks until released.
// It satisfies the innerClient interface to allow timeout-path testing.
type hangCloser struct {
	released chan struct{}
}

func (h *hangCloser) Close() error {
	<-h.released
	return nil
}

func (h *hangCloser) Initialize(_ context.Context, _ mcp.InitializeRequest) (*mcp.InitializeResult, error) {
	return nil, nil
}

func (h *hangCloser) CallTool(_ context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return nil, nil
}

func (h *hangCloser) ListTools(_ context.Context, _ mcp.ListToolsRequest) (*mcp.ListToolsResult, error) {
	return nil, nil
}

func (h *hangCloser) ListPrompts(_ context.Context, _ mcp.ListPromptsRequest) (*mcp.ListPromptsResult, error) {
	return nil, nil
}

func (h *hangCloser) ListResources(_ context.Context, _ mcp.ListResourcesRequest) (*mcp.ListResourcesResult, error) {
	return nil, nil
}

func (h *hangCloser) GetPrompt(_ context.Context, _ mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
	return nil, nil
}

func (h *hangCloser) ReadResource(_ context.Context, _ mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
	return nil, nil
}

// TestMain handles the subprocess helper mode used by
// TestClose_KillsSubprocessOnTimeout. When GO_TEST_HANG_SUBPROCESS is set,
// the process simply blocks forever, simulating a stuck MCP server on all
// platforms (no dependency on an external `sleep` binary).
func TestMain(m *testing.M) {
	if os.Getenv("GO_TEST_HANG_SUBPROCESS") == "1" {
		// Block forever so the parent test can verify force-kill behaviour.
		select {}
	}
	os.Exit(m.Run())
}

func TestTimeoutForTool_CodeQLTools(t *testing.T) {
	codeqlTools := []string{
		"codeql_query_run",
		"codeql_query_compile",
		"codeql_database_analyze",
		"codeql_database_create",
		"codeql_test_run",
		"codeql_test_extract",
		"codeql_pack_install",
	}

	for _, tool := range codeqlTools {
		timeout := timeoutForTool(tool)
		if timeout != CodeQLToolTimeout {
			t.Errorf("timeoutForTool(%q) = %v, want %v", tool, timeout, CodeQLToolTimeout)
		}
	}
}

func TestTimeoutForTool_DefaultTools(t *testing.T) {
	defaultTools := []string{
		"sarif_list_rules",
		"sarif_compare_alerts",
		"sarif_extract_rule",
		"create_codeql_query",
		"search_ql_code",
	}

	for _, tool := range defaultTools {
		timeout := timeoutForTool(tool)
		if timeout != DefaultTimeout {
			t.Errorf("timeoutForTool(%q) = %v, want %v", tool, timeout, DefaultTimeout)
		}
	}
}

func TestConfig_Defaults(t *testing.T) {
	cfg := Config{
		Mode: ModeHTTP,
		Host: "localhost",
		Port: 3000,
	}

	if cfg.Mode != "http" {
		t.Errorf("expected mode %q, got %q", "http", cfg.Mode)
	}
	if cfg.Host != "localhost" {
		t.Errorf("expected host %q, got %q", "localhost", cfg.Host)
	}
	if cfg.Port != 3000 {
		t.Errorf("expected port %d, got %d", 3000, cfg.Port)
	}
}

func TestNewClient_NotConnected(t *testing.T) {
	client := NewClient(Config{Mode: ModeHTTP, Host: "localhost", Port: 3000})
	if client == nil {
		t.Fatal("NewClient returned nil")
	}

	// Calling Close on unconnected client should not error
	err := client.Close()
	if err != nil {
		t.Errorf("Close on unconnected client should not error, got: %v", err)
	}
}

func TestClose_TimeoutReturnsError(t *testing.T) {
	// Verify the timeout error message constant is correct
	if CloseTimeoutErr == "" {
		t.Fatal("CloseTimeoutErr should not be empty")
	}
	if CloseTimeoutErr != "MCP client close timed out after 3s; attempted to kill server subprocess" {
		t.Errorf("CloseTimeoutErr = %q, want specific timeout message", CloseTimeoutErr)
	}
}

func TestClose_KillsSubprocessOnTimeout(t *testing.T) {
	t.Parallel()

	// Re-exec the current test binary as a subprocess that blocks forever.
	// This avoids a dependency on an external `sleep` binary (not available
	// on Windows) while still exercising the real process-kill path.
	exe, err := os.Executable()
	if err != nil {
		t.Fatalf("cannot determine test executable: %v", err)
	}
	proc := exec.Command(exe, "-test.run=^$") // run no tests; just reach TestMain
	proc.Env = append(os.Environ(), "GO_TEST_HANG_SUBPROCESS=1")
	if err := proc.Start(); err != nil {
		t.Fatalf("cannot start subprocess for test: %v", err)
	}

	hang := &hangCloser{released: make(chan struct{})}

	c := &Client{
		inner:     hang,
		serverCmd: proc,
	}

	start := time.Now()
	closeErr := c.Close()
	elapsed := time.Since(start)

	// Release the hanging closer goroutine (cleanup).
	close(hang.released)

	if closeErr == nil {
		t.Fatal("Close() should return a timeout error, got nil")
	}
	if !strings.Contains(closeErr.Error(), "timed out") {
		t.Errorf("Close() error = %q; want a message containing 'timed out'", closeErr.Error())
	}

	// Elapsed time should be roughly the 3-second timeout window.
	if elapsed > 5*time.Second {
		t.Errorf("Close() took %v, expected ~3s", elapsed)
	}

	// proc.Wait() should return quickly if the process was killed.
	// Use a channel with timeout to avoid hanging the test if Kill() failed.
	waitCh := make(chan error, 1)
	go func() {
		waitCh <- proc.Wait()
	}()

	select {
	case waitErr := <-waitCh:
		// A killed process returns an error from Wait().
		if waitErr == nil {
			t.Error("subprocess exited cleanly; expected it to be killed (non-zero exit)")
		}
	case <-time.After(2 * time.Second):
		_ = proc.Process.Kill()
		t.Error("subprocess did not exit after Close() timeout; expected force-kill")
	}
}

func TestConstants(t *testing.T) {
	if DefaultTimeout != 60*time.Second {
		t.Errorf("DefaultTimeout = %v, want 60s", DefaultTimeout)
	}
	if CodeQLToolTimeout != 5*time.Minute {
		t.Errorf("CodeQLToolTimeout = %v, want 5m", CodeQLToolTimeout)
	}
	if ConnectTimeout != 30*time.Second {
		t.Errorf("ConnectTimeout = %v, want 30s", ConnectTimeout)
	}
}