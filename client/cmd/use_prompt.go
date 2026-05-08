package cmd

import (
	"context"
	"fmt"
	"os"

	mcpclient "github.com/advanced-security/codeql-development-mcp-server/client/internal/mcp"
	"github.com/spf13/cobra"
)

var usePromptArgs []string

var usePromptCmd = &cobra.Command{
	Use:   "prompt <name>",
	Short: "Get an MCP server prompt by name",
	Long: `Get a specific MCP server prompt with key-value arguments and print the resulting messages.

Example:
  gh-ql-mcp-client use prompt explain_codeql_query --arg queryPath=/path/to/query.ql --arg language=javascript
  gh-ql-mcp-client use prompt explain_codeql_query --arg queryPath=/path/to/query.ql --format json`,
	Args: cobra.ExactArgs(1),
	RunE: runUsePrompt,
}

func init() {
	useCmd.AddCommand(usePromptCmd)
	usePromptCmd.Flags().StringArrayVar(&usePromptArgs, "arg", nil, "Prompt argument in key=value format (repeatable)")
}

func runUsePrompt(_ *cobra.Command, args []string) error {
	promptName := args[0]

	params, err := parseArgs(usePromptArgs)
	if err != nil {
		return fmt.Errorf("parse prompt arguments: %w", err)
	}

	ctx := context.Background()
	client, err := connectMCPClient(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = client.Close() }()

	result, err := mcpclient.GetPrompt(ctx, client, promptName, params)
	if err != nil {
		return err
	}

	return outputPromptMessages(result)
}

func outputPromptMessages(result *mcpclient.PromptMessages) error {
	switch OutputFormat() {
	case "json":
		s, err := mcpclient.FormatJSON(result)
		if err != nil {
			return err
		}
		_, _ = fmt.Fprintln(os.Stdout, s)
	case "markdown":
		_, _ = fmt.Fprint(os.Stdout, mcpclient.FormatPromptMessagesMarkdown(result))
	default:
		_, _ = fmt.Fprint(os.Stdout, mcpclient.FormatPromptMessagesText(result))
	}
	return nil
}
