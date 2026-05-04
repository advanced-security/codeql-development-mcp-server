package cmd

import (
	"context"
	"fmt"
	"os"

	mcpclient "github.com/advanced-security/codeql-development-mcp-server/client/internal/mcp"
	"github.com/spf13/cobra"
)

var useToolArgs []string

var useToolCmd = &cobra.Command{
	Use:   "tool <name>",
	Short: "Call an MCP server tool by name",
	Long: `Call a specific MCP server tool with key-value arguments.

Example:
  gh-ql-mcp-client use tool codeql_resolve_languages
  gh-ql-mcp-client use tool sarif_list_rules --arg sarifPath=/path/to/results.sarif
  gh-ql-mcp-client use tool codeql_resolve_languages --format json`,
	Args: cobra.ExactArgs(1),
	RunE: runUseTool,
}

func init() {
	useCmd.AddCommand(useToolCmd)
	useToolCmd.Flags().StringArrayVar(&useToolArgs, "arg", nil, "Tool argument in key=value format (repeatable)")
}

func runUseTool(_ *cobra.Command, args []string) error {
	toolName := args[0]

	params, err := parseArgsAny(useToolArgs)
	if err != nil {
		return fmt.Errorf("parse tool arguments: %w", err)
	}

	ctx := context.Background()
	client, err := connectMCPClient(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = client.Close() }()

	result, err := mcpclient.CallTool(ctx, client, toolName, params)
	if err != nil {
		return err
	}

	return outputToolResult(result)
}

func outputToolResult(result *mcpclient.ToolResult) error {
	switch OutputFormat() {
	case "json":
		s, err := mcpclient.FormatJSON(result)
		if err != nil {
			return err
		}
		_, _ = fmt.Fprintln(os.Stdout, s)
	case "markdown":
		_, _ = fmt.Fprint(os.Stdout, mcpclient.FormatToolResultMarkdown(result))
	default:
		_, _ = fmt.Fprint(os.Stdout, mcpclient.FormatToolResultText(result))
	}
	if result.IsError {
		return fmt.Errorf("tool returned error")
	}
	return nil
}
