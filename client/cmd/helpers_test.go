package cmd

import "testing"

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

// strPtr returns a pointer to s.
func strPtr(s string) *string {
	return &s
}
