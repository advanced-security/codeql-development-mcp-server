package cmd

import (
	"bytes"
	"testing"
)

func TestRootCommand_Help(t *testing.T) {
	cmd := rootCmd
	buf := new(bytes.Buffer)
	cmd.SetOut(buf)
	cmd.SetArgs([]string{"--help"})

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("root --help failed: %v", err)
	}

	output := buf.String()
	if output == "" {
		t.Fatal("expected help output, got empty string")
	}

	// Check key elements are present
	wantSubstrings := []string{
		"gh-ql-mcp-client",
		"Code Scanning",
		"code-scanning",
		"sarif",
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
	// Reset flags to defaults
	rootCmd.SetArgs([]string{})
	_ = rootCmd.Execute()

	if MCPMode() != "http" {
		t.Errorf("expected default mode %q, got %q", "http", MCPMode())
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

func TestCodeScanningCommand_InHelp(t *testing.T) {
	cmd := rootCmd
	buf := new(bytes.Buffer)
	cmd.SetOut(buf)
	cmd.SetArgs([]string{"--help"})

	_ = cmd.Execute()
	output := buf.String()

	if !bytes.Contains([]byte(output), []byte("code-scanning")) {
		t.Error("root help should list code-scanning subcommand")
	}
}

func TestSarifCommand_InHelp(t *testing.T) {
	cmd := rootCmd
	buf := new(bytes.Buffer)
	cmd.SetOut(buf)
	cmd.SetArgs([]string{"--help"})

	_ = cmd.Execute()
	output := buf.String()

	if !bytes.Contains([]byte(output), []byte("sarif")) {
		t.Error("root help should list sarif subcommand")
	}
}
