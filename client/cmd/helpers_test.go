package cmd

import "testing"

func TestParseRepo_Valid(t *testing.T) {
	owner, repo, err := parseRepo("has-ghas/dubbo")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if owner != "has-ghas" {
		t.Errorf("owner = %q, want %q", owner, "has-ghas")
	}
	if repo != "dubbo" {
		t.Errorf("repo = %q, want %q", repo, "dubbo")
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
