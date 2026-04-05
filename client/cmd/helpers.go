package cmd

import (
	"fmt"
	"strings"
)

// parseRepo splits an "owner/repo" string into owner and repo components.
func parseRepo(nwo string) (string, string, error) {
	parts := strings.SplitN(nwo, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("invalid repo format %q: expected owner/repo", nwo)
	}
	return parts[0], parts[1], nil
}
