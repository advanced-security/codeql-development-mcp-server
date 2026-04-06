package mcp

import (
	"testing"
	"time"
)

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
