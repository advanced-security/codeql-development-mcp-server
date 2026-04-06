package cmd

import (
	"bytes"
	"testing"
)

// executeRootCmd executes rootCmd with the given args and returns stdout.
// It resets the command's output and args before and after each call
// to avoid leaking state between tests.
func executeRootCmd(args []string) (string, error) {
	buf := new(bytes.Buffer)
	rootCmd.SetOut(buf)
	rootCmd.SetErr(buf)
	rootCmd.SetArgs(args)

	err := rootCmd.Execute()

	// Reset to default so subsequent tests are not affected
	rootCmd.SetOut(nil)
	rootCmd.SetErr(nil)
	rootCmd.SetArgs(nil)

	return buf.String(), err
}

func TestRootCommand_Help(t *testing.T) {
	output, err := executeRootCmd([]string{"--help"})
	if err != nil {
		t.Fatalf("root --help failed: %v", err)
	}

	if output == "" {
		t.Fatal("expected help output, got empty string")
	}

	// Check key elements are present
	wantSubstrings := []string{
		"gh-ql-mcp-client",
		"integration-tests",
		"--mode",
		"--host",
		"--port",
		"--format",
	}
	for _, want := range wantSubstrings {
		if !bytes.Contains([]byte(output), []byte(want)) {
			t.Errorf("help output missing %q", want)
		}
	}
}

func TestRootCommand_Version(t *testing.T) {
	// Verify the version constant is set correctly
	if Version == "" {
		t.Fatal("Version constant should not be empty")
	}
	if Version != "0.1.0" {
		t.Errorf("Version = %q, want %q", Version, "0.1.0")
	}

	// Verify the root command has version set
	if rootCmd.Version != Version {
		t.Errorf("rootCmd.Version = %q, want %q", rootCmd.Version, Version)
	}
}

func TestRootCommand_DefaultFlags(t *testing.T) {
	// Reset flags to defaults by executing with no args
	_, _ = executeRootCmd([]string{})

	if MCPMode() != "stdio" {
		t.Errorf("expected default mode %q, got %q", "stdio", MCPMode())
	}
	if MCPHost() != "localhost" {
		t.Errorf("expected default host %q, got %q", "localhost", MCPHost())
	}
	if MCPPort() != 3000 {
		t.Errorf("expected default port %d, got %d", 3000, MCPPort())
	}
	if OutputFormat() != "text" {
		t.Errorf("expected default format %q, got %q", "text", OutputFormat())
	}
}

func TestIntegrationTestsCommand_InHelp(t *testing.T) {
	output, _ := executeRootCmd([]string{"--help"})

	if !bytes.Contains([]byte(output), []byte("integration-tests")) {
		t.Error("root help should list integration-tests subcommand")
	}
}
