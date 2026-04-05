// Package main is the entry point for the gh-ql-mcp-client CLI.
package main

import (
	"os"

	"github.com/advanced-security/codeql-development-mcp-server/client/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
