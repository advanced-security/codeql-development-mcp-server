package mcp

import (
	"context"
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
	if CloseTimeoutErr != "MCP client close timed out after 3s; server subprocess may still be running" {
		t.Errorf("CloseTimeoutErr = %q, want specific timeout message", CloseTimeoutErr)
	}
}

func TestClose_KillsSubprocessOnTimeout(t *testing.T) {
	t.Parallel()

	// Start a long-running subprocess to simulate a stuck server.
	proc := exec.Command("sleep", "60")
	if err := proc.Start(); err != nil {
		t.Skipf("cannot start subprocess for test: %v", err)
	}

	hang := &hangCloser{released: make(chan struct{})}

	c := &Client{
		inner:     hang,
		serverCmd: proc,
	}

	start := time.Now()
	err := c.Close()
	elapsed := time.Since(start)

	// Release the hanging closer goroutine (cleanup).
	close(hang.released)

	if err == nil {
		t.Fatal("Close() should return a timeout error, got nil")
	}
	if !strings.Contains(err.Error(), "timed out") {
		t.Errorf("Close() error = %q; want a message containing 'timed out'", err.Error())
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
		// Process exited (possibly as a zombie until Wait() is called).
		// A killed process returns an error from Wait().
		if waitErr == nil {
			t.Error("subprocess exited with success; expected it to be killed (non-zero exit)")
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
