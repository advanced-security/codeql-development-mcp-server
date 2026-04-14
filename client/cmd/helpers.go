package cmd

import (
	"fmt"
	"strings"
)

// parseRepo splits an "owner/repo" string into owner and repo components.
// It rejects path traversal sequences and extra path separators.
func parseRepo(nwo string) (string, string, error) {
	parts := strings.SplitN(nwo, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("invalid repo format %q: expected owner/repo", nwo)
	}
	owner, repo := parts[0], parts[1]
	if strings.Contains(owner, "..") || strings.Contains(repo, "..") {
		return "", "", fmt.Errorf("invalid repo format %q: path traversal not allowed", nwo)
	}
	if strings.Contains(repo, "/") {
		return "", "", fmt.Errorf("invalid repo format %q: expected owner/repo", nwo)
	}
	return owner, repo, nil
}

// validatePerPage checks that a per-page value is within the GitHub API limit.
func validatePerPage(perPage int) error {
	if perPage < 1 || perPage > 100 {
		return fmt.Errorf("invalid per-page value %d: must be between 1 and 100", perPage)
	}
	return nil
}
