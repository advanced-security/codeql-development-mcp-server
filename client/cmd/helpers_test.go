package cmd

import (
	"fmt"
	"testing"
)

func TestParseRepo_Valid(t *testing.T) {
	owner, repo, err := parseRepo("example-owner/example-repo")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if owner != "example-owner" {
		t.Errorf("owner = %q, want %q", owner, "example-owner")
	}
	if repo != "example-repo" {
		t.Errorf("repo = %q, want %q", repo, "example-repo")
	}
}

func TestParseRepo_Invalid(t *testing.T) {
	tests := []string{
		"",
		"noslash",
		"/norepo",
		"noowner/",
	}
	for _, input := range tests {
		_, _, err := parseRepo(input)
		if err == nil {
			t.Errorf("parseRepo(%q) should return error", input)
		}
	}
}

func TestParseRepo_RejectsPathTraversal(t *testing.T) {
	tests := []struct {
		input string
		desc  string
	}{
		{"owner/../../etc", "dot-dot in repo"},
		{"../owner/repo", "dot-dot in owner"},
		{"owner/../repo", "dot-dot in owner with slash"},
		{"owner/repo/../../path", "dot-dot beyond repo"},
		{"owner/repo/../secret", "dot-dot in repo component"},
	}
	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			_, _, err := parseRepo(tt.input)
			if err == nil {
				t.Errorf("parseRepo(%q) should reject path traversal", tt.input)
			}
		})
	}
}

func TestParseRepo_RejectsPathSeparators(t *testing.T) {
	tests := []struct {
		input string
		desc  string
	}{
		{"owner/sub/repo", "extra slash in repo"},
	}
	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			_, _, err := parseRepo(tt.input)
			if err == nil {
				t.Errorf("parseRepo(%q) should reject extra path separators", tt.input)
			}
		})
	}
}

func TestValidatePerPage(t *testing.T) {
	tests := []struct {
		value   int
		wantErr bool
	}{
		{1, false},
		{50, false},
		{100, false},
		{0, true},
		{-1, true},
		{101, true},
		{200, true},
	}
	for _, tt := range tests {
		t.Run(fmt.Sprintf("perPage=%d", tt.value), func(t *testing.T) {
			err := validatePerPage(tt.value)
			if (err != nil) != tt.wantErr {
				t.Errorf("validatePerPage(%d) error = %v, wantErr %v", tt.value, err, tt.wantErr)
			}
		})
	}
}

// strPtr returns a pointer to s.
func strPtr(s string) *string {
	return &s
}
