package cmd

import (
	"bytes"
	"testing"
)

func TestUseCommand_InHelp(t *testing.T) {
	output, _ := executeRootCmd([]string{"--help"})

	if !bytes.Contains([]byte(output), []byte("use")) {
		t.Error("root help should list 'use' subcommand")
	}
}

func TestUseCommand_Help(t *testing.T) {
	output, err := executeRootCmd([]string{"use", "--help"})
	if err != nil {
		t.Fatalf("use --help failed: %v", err)
	}

	wantSubstrings := []string{
		"tool",
		"resource",
		"prompt",
	}
	for _, want := range wantSubstrings {
		if !bytes.Contains([]byte(output), []byte(want)) {
			t.Errorf("use help output missing %q", want)
		}
	}
}

func TestUseToolCommand_InUseHelp(t *testing.T) {
	output, err := executeRootCmd([]string{"use", "--help"})
	if err != nil {
		t.Fatalf("use --help failed: %v", err)
	}

	if !bytes.Contains([]byte(output), []byte("tool")) {
		t.Error("use help should list 'tool' subcommand")
	}
}

func TestUseResourceCommand_InUseHelp(t *testing.T) {
	output, err := executeRootCmd([]string{"use", "--help"})
	if err != nil {
		t.Fatalf("use --help failed: %v", err)
	}

	if !bytes.Contains([]byte(output), []byte("resource")) {
		t.Error("use help should list 'resource' subcommand")
	}
}

func TestUsePromptCommand_InUseHelp(t *testing.T) {
	output, err := executeRootCmd([]string{"use", "--help"})
	if err != nil {
		t.Fatalf("use --help failed: %v", err)
	}

	if !bytes.Contains([]byte(output), []byte("prompt")) {
		t.Error("use help should list 'prompt' subcommand")
	}
}

func TestUseToolCommand_RequiresName(t *testing.T) {
	_, err := executeRootCmd([]string{"use", "tool"})
	if err == nil {
		t.Error("use tool without name should fail")
	}
}

func TestUseResourceCommand_RequiresURI(t *testing.T) {
	_, err := executeRootCmd([]string{"use", "resource"})
	if err == nil {
		t.Error("use resource without URI should fail")
	}
}

func TestUsePromptCommand_RequiresName(t *testing.T) {
	_, err := executeRootCmd([]string{"use", "prompt"})
	if err == nil {
		t.Error("use prompt without name should fail")
	}
}

func TestParseArgs_Valid(t *testing.T) {
	args := []string{"key1=value1", "key2=value2"}
	result, err := parseArgs(args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result["key1"] != "value1" {
		t.Errorf("expected key1=value1, got %q", result["key1"])
	}
	if result["key2"] != "value2" {
		t.Errorf("expected key2=value2, got %q", result["key2"])
	}
}

func TestParseArgs_Empty(t *testing.T) {
	result, err := parseArgs(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty map, got %v", result)
	}
}

func TestParseArgs_Invalid(t *testing.T) {
	args := []string{"noequals"}
	_, err := parseArgs(args)
	if err == nil {
		t.Error("expected error for invalid argument")
	}
}

func TestParseArgs_EmptyKey(t *testing.T) {
	args := []string{"=value"}
	_, err := parseArgs(args)
	if err == nil {
		t.Error("expected error for empty key")
	}
}

func TestParseArgs_EmptyValue(t *testing.T) {
	args := []string{"key="}
	result, err := parseArgs(args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result["key"] != "" {
		t.Errorf("expected empty value, got %q", result["key"])
	}
}

func TestParseArgs_ValueWithEquals(t *testing.T) {
	args := []string{"key=value=with=equals"}
	result, err := parseArgs(args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result["key"] != "value=with=equals" {
		t.Errorf("expected value=with=equals, got %q", result["key"])
	}
}

func TestParseArgsAny_Valid(t *testing.T) {
	args := []string{"key1=value1", "key2=value2"}
	result, err := parseArgsAny(args)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result["key1"] != "value1" {
		t.Errorf("expected key1=value1, got %v", result["key1"])
	}
}

func TestParseArgsAny_Invalid(t *testing.T) {
	args := []string{"noequals"}
	_, err := parseArgsAny(args)
	if err == nil {
		t.Error("expected error for invalid argument")
	}
}
