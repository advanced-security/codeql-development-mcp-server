package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var useCmd = &cobra.Command{
	Use:   "use",
	Short: "Call an individual MCP server primitive (tool, resource, or prompt)",
	Long: `Connect to the MCP server and call a single primitive.

Subcommands:
  tool      Call a tool by name with key-value arguments
  resource  Read a resource by URI
  prompt    Get a prompt by name with key-value arguments`,
}

// parseArgs converts a list of "key=value" strings into a map.
func parseArgs(args []string) (map[string]string, error) {
	result := make(map[string]string, len(args))
	for _, a := range args {
		key, value, found := cutString(a, "=")
		if !found || key == "" {
			return nil, fmt.Errorf("invalid argument %q: expected key=value format", a)
		}
		result[key] = value
	}
	return result, nil
}

// parseArgsAny converts a list of "key=value" strings into a map[string]any.
func parseArgsAny(args []string) (map[string]any, error) {
	result := make(map[string]any, len(args))
	for _, a := range args {
		key, value, found := cutString(a, "=")
		if !found || key == "" {
			return nil, fmt.Errorf("invalid argument %q: expected key=value format", a)
		}
		result[key] = value
	}
	return result, nil
}

// cutString splits s around the first instance of sep.
func cutString(s, sep string) (before, after string, found bool) {
	for i := 0; i+len(sep) <= len(s); i++ {
		if s[i:i+len(sep)] == sep {
			return s[:i], s[i+len(sep):], true
		}
	}
	return s, "", false
}

func init() {
	rootCmd.AddCommand(useCmd)
}
