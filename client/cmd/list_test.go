package cmd

import (
	"bytes"
	"testing"
)

func TestListCommand_InHelp(t *testing.T) {
	output, _ := executeRootCmd([]string{"--help"})

	if !bytes.Contains([]byte(output), []byte("list")) {
		t.Error("root help should list 'list' subcommand")
	}
}

func TestListCommand_Help(t *testing.T) {
	output, err := executeRootCmd([]string{"list", "--help"})
	if err != nil {
		t.Fatalf("list --help failed: %v", err)
	}

	wantSubstrings := []string{
		"tools",
		"prompts",
		"resources",
	}
	for _, want := range wantSubstrings {
		if !bytes.Contains([]byte(output), []byte(want)) {
			t.Errorf("list help output missing %q", want)
		}
	}
}

func TestListToolsCommand_InListHelp(t *testing.T) {
	output, err := executeRootCmd([]string{"list", "--help"})
	if err != nil {
		t.Fatalf("list --help failed: %v", err)
	}

	if !bytes.Contains([]byte(output), []byte("tools")) {
		t.Error("list help should list 'tools' subcommand")
	}
}

func TestListPromptsCommand_InListHelp(t *testing.T) {
	output, err := executeRootCmd([]string{"list", "--help"})
	if err != nil {
		t.Fatalf("list --help failed: %v", err)
	}

	if !bytes.Contains([]byte(output), []byte("prompts")) {
		t.Error("list help should list 'prompts' subcommand")
	}
}

func TestListResourcesCommand_InListHelp(t *testing.T) {
	output, err := executeRootCmd([]string{"list", "--help"})
	if err != nil {
		t.Fatalf("list --help failed: %v", err)
	}

	if !bytes.Contains([]byte(output), []byte("resources")) {
		t.Error("list help should list 'resources' subcommand")
	}
}
