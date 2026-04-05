// Package cmd defines the CLI commands for gh-ql-mcp-client.
package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

const (
	// Version is the current CLI version.
	Version = "0.1.0"
)

// Global persistent flags
var (
	mcpMode   string
	mcpHost   string
	mcpPort   int
	outputFmt string
)

// rootCmd is the top-level command for the CLI.
var rootCmd = &cobra.Command{
	Use:   "gh-ql-mcp-client",
	Short: "CodeQL Development MCP Client — Code Scanning alert lifecycle management",
	Long: `gh-ql-mcp-client is a CLI for managing Code Scanning alert lifecycles.

It connects to a CodeQL Development MCP Server to leverage SARIF analysis tools
and uses GitHub's Code Scanning REST API (via gh auth) for alert operations.

Use as a gh extension:  gh ql-mcp-client <command> [flags]
Use standalone:         gh-ql-mcp-client <command> [flags]`,
	SilenceUsage:  true,
	SilenceErrors: true,
	Version:       Version,
}

// Execute runs the root command.
func Execute() error {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		return err
	}
	return nil
}

func init() {
	rootCmd.PersistentFlags().StringVar(&mcpMode, "mode", "http", "MCP server transport mode (stdio or http)")
	rootCmd.PersistentFlags().StringVar(&mcpHost, "host", "localhost", "MCP server host (http mode)")
	rootCmd.PersistentFlags().IntVar(&mcpPort, "port", 3000, "MCP server port (http mode)")
	rootCmd.PersistentFlags().StringVar(&outputFmt, "format", "text", "Output format (text or json)")
}

// MCPMode returns the configured MCP transport mode.
func MCPMode() string { return mcpMode }

// MCPHost returns the configured MCP server host.
func MCPHost() string { return mcpHost }

// MCPPort returns the configured MCP server port.
func MCPPort() int { return mcpPort }

// OutputFormat returns the configured output format.
func OutputFormat() string { return outputFmt }
