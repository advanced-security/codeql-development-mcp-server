package cmd

import (
	"context"
	"fmt"
	"os"

	mcpclient "github.com/advanced-security/codeql-development-mcp-server/client/internal/mcp"
	"github.com/spf13/cobra"
)

var useResourceCmd = &cobra.Command{
	Use:   "resource <uri>",
	Short: "Read an MCP server resource by URI",
	Long: `Read a specific MCP server resource and print its content.

Example:
  gh-ql-mcp-client use resource codeql://server/tools
  gh-ql-mcp-client use resource codeql://server/overview --format markdown`,
	Args: cobra.ExactArgs(1),
	RunE: runUseResource,
}

func init() {
	useCmd.AddCommand(useResourceCmd)
}

func runUseResource(_ *cobra.Command, args []string) error {
	uri := args[0]

	ctx := context.Background()
	client, err := connectMCPClient(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = client.Close() }()

	result, err := mcpclient.ReadResource(ctx, client, uri)
	if err != nil {
		return err
	}

	return outputResourceContent(result)
}

func outputResourceContent(result *mcpclient.ResourceContent) error {
	switch OutputFormat() {
	case "json":
		s, err := mcpclient.FormatJSON(result)
		if err != nil {
			return err
		}
		_, _ = fmt.Fprintln(os.Stdout, s)
	case "markdown":
		_, _ = fmt.Fprint(os.Stdout, mcpclient.FormatResourceContentMarkdown(result))
	default:
		_, _ = fmt.Fprint(os.Stdout, mcpclient.FormatResourceContentText(result))
	}
	return nil
}
