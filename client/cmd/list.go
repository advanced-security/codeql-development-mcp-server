package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"text/tabwriter"

	mcpclient "github.com/advanced-security/codeql-development-mcp-server/client/internal/mcp"
	"github.com/spf13/cobra"
)

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List MCP server primitives (tools, prompts, resources)",
	Long:  `Connect to the MCP server and list registered primitives.`,
}

var listToolsCmd = &cobra.Command{
	Use:   "tools",
	Short: "List all tools registered on the MCP server",
	RunE:  runListTools,
}

var listPromptsCmd = &cobra.Command{
	Use:   "prompts",
	Short: "List all prompts registered on the MCP server",
	RunE:  runListPrompts,
}

var listResourcesCmd = &cobra.Command{
	Use:   "resources",
	Short: "List all resources registered on the MCP server",
	RunE:  runListResources,
}

func init() {
	rootCmd.AddCommand(listCmd)
	listCmd.AddCommand(listToolsCmd)
	listCmd.AddCommand(listPromptsCmd)
	listCmd.AddCommand(listResourcesCmd)
}

func connectMCPClient(ctx context.Context) (*mcpclient.Client, error) {
	client := mcpclient.NewClient(mcpclient.Config{
		Mode: MCPMode(),
		Host: MCPHost(),
		Port: MCPPort(),
	})
	if err := client.Connect(ctx); err != nil {
		return nil, fmt.Errorf("connect to MCP server: %w", err)
	}
	return client, nil
}

func runListTools(_ *cobra.Command, _ []string) error {
	ctx := context.Background()
	client, err := connectMCPClient(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = client.Close() }()

	tools, err := client.ListTools(ctx)
	if err != nil {
		return fmt.Errorf("list tools: %w", err)
	}

	sort.Slice(tools, func(i, j int) bool {
		return tools[i].Name < tools[j].Name
	})

	if OutputFormat() == "json" {
		type toolEntry struct {
			Name        string `json:"name"`
			Description string `json:"description,omitempty"`
		}
		entries := make([]toolEntry, len(tools))
		for i, t := range tools {
			entries[i] = toolEntry{Name: t.Name, Description: t.Description}
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(entries)
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	_, _ = fmt.Fprintf(w, "NAME\tDESCRIPTION\n")
	for _, t := range tools {
		desc := t.Description
		if len(desc) > 80 {
			desc = desc[:77] + "..."
		}
		_, _ = fmt.Fprintf(w, "%s\t%s\n", t.Name, desc)
	}
	_ = w.Flush()
	fmt.Printf("\n%d tools registered\n", len(tools))
	return nil
}

func runListPrompts(_ *cobra.Command, _ []string) error {
	ctx := context.Background()
	client, err := connectMCPClient(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = client.Close() }()

	prompts, err := client.ListPrompts(ctx)
	if err != nil {
		return fmt.Errorf("list prompts: %w", err)
	}

	sort.Slice(prompts, func(i, j int) bool {
		return prompts[i].Name < prompts[j].Name
	})

	if OutputFormat() == "json" {
		type promptEntry struct {
			Name        string `json:"name"`
			Description string `json:"description,omitempty"`
		}
		entries := make([]promptEntry, len(prompts))
		for i, p := range prompts {
			entries[i] = promptEntry{Name: p.Name, Description: p.Description}
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(entries)
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	_, _ = fmt.Fprintf(w, "NAME\tDESCRIPTION\n")
	for _, p := range prompts {
		desc := p.Description
		if len(desc) > 80 {
			desc = desc[:77] + "..."
		}
		_, _ = fmt.Fprintf(w, "%s\t%s\n", p.Name, desc)
	}
	_ = w.Flush()
	fmt.Printf("\n%d prompts registered\n", len(prompts))
	return nil
}

func runListResources(_ *cobra.Command, _ []string) error {
	ctx := context.Background()
	client, err := connectMCPClient(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = client.Close() }()

	resources, err := client.ListResources(ctx)
	if err != nil {
		return fmt.Errorf("list resources: %w", err)
	}

	sort.Slice(resources, func(i, j int) bool {
		return resources[i].Name < resources[j].Name
	})

	if OutputFormat() == "json" {
		type resourceEntry struct {
			Name        string `json:"name"`
			URI         string `json:"uri"`
			Description string `json:"description,omitempty"`
		}
		entries := make([]resourceEntry, len(resources))
		for i, r := range resources {
			entries[i] = resourceEntry{Name: r.Name, URI: r.URI, Description: r.Description}
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(entries)
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	_, _ = fmt.Fprintf(w, "NAME\tURI\tDESCRIPTION\n")
	for _, r := range resources {
		desc := r.Description
		if len(desc) > 60 {
			desc = desc[:57] + "..."
		}
		_, _ = fmt.Fprintf(w, "%s\t%s\t%s\n", r.Name, r.URI, desc)
	}
	_ = w.Flush()
	fmt.Printf("\n%d resources registered\n", len(resources))
	return nil
}
