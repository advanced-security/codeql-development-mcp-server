package cmd

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	mcpclient "github.com/advanced-security/codeql-development-mcp-server/client/internal/mcp"
	itesting "github.com/advanced-security/codeql-development-mcp-server/client/internal/testing"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/spf13/cobra"
)

var integrationTestsCmd = &cobra.Command{
	Use:   "integration-tests",
	Short: "Run MCP server integration tests from client/integration-tests/",
	Long: `Discovers and runs integration test fixtures against a connected MCP server.

Test fixtures live in client/integration-tests/primitives/tools/<tool>/<test>/
and use test-config.json or monitoring-state.json to define tool parameters.`,
	RunE: runIntegrationTests,
}

var integrationTestsFlags struct {
	tools     string
	tests     string
	noInstall bool
	timeout   int
}

func init() {
	rootCmd.AddCommand(integrationTestsCmd)

	f := integrationTestsCmd.Flags()
	f.StringVar(&integrationTestsFlags.tools, "tools", "", "Comma-separated list of tool names to test")
	f.StringVar(&integrationTestsFlags.tests, "tests", "", "Comma-separated list of test case names to run")
	f.BoolVar(&integrationTestsFlags.noInstall, "no-install-packs", false, "Skip CodeQL pack installation")
	f.IntVar(&integrationTestsFlags.timeout, "timeout", 30, "Per-tool-call timeout in seconds")
}

// mcpToolCaller adapts the MCP client to the ToolCaller interface.
type mcpToolCaller struct {
	client *mcpclient.Client
}

func (c *mcpToolCaller) CallToolRaw(name string, params map[string]any) ([]itesting.ContentBlock, bool, error) {
	result, err := c.client.CallTool(context.Background(), name, params)
	if err != nil {
		return nil, false, err
	}

	var blocks []itesting.ContentBlock
	for _, item := range result.Content {
		if textContent, ok := item.(mcp.TextContent); ok {
			blocks = append(blocks, itesting.ContentBlock{
				Type: "text",
				Text: textContent.Text,
			})
		}
	}

	return blocks, result.IsError, nil
}

func (c *mcpToolCaller) ListToolNames() ([]string, error) {
	tools, err := c.client.ListTools(context.Background())
	if err != nil {
		return nil, err
	}
	names := make([]string, len(tools))
	for i, t := range tools {
		names[i] = t.Name
	}
	return names, nil
}

func runIntegrationTests(cmd *cobra.Command, _ []string) error {
	// Determine repo root
	repoRoot, err := findRepoRoot()
	if err != nil {
		return fmt.Errorf("cannot determine repo root: %w", err)
	}

	// Change CWD to repo root so the MCP server subprocess resolves
	// relative paths (from test-config.json, monitoring-state.json)
	// correctly. The codeql CLI also resolves paths from CWD.
	if err := os.Chdir(repoRoot); err != nil {
		return fmt.Errorf("chdir to repo root: %w", err)
	}
	fmt.Printf("Working directory: %s\n", repoRoot)

	// Connect to MCP server
	client := mcpclient.NewClient(mcpclient.Config{
		Mode: MCPMode(),
		Host: MCPHost(),
		Port: MCPPort(),
	})

	fmt.Println("🔌 Connecting to MCP server...")
	ctx := context.Background()
	if err := client.Connect(ctx); err != nil {
		return fmt.Errorf("connect to MCP server: %w", err)
	}
	fmt.Println("✅ Connected to MCP server")

	// Parse filters
	var filterTools, filterTests []string
	if integrationTestsFlags.tools != "" {
		filterTools = strings.Split(integrationTestsFlags.tools, ",")
	}
	if integrationTestsFlags.tests != "" {
		filterTests = strings.Split(integrationTestsFlags.tests, ",")
	}

	// Create and run the test runner
	runner := itesting.NewRunner(&mcpToolCaller{client: client}, itesting.RunnerOptions{
		RepoRoot:    repoRoot,
		FilterTools: filterTools,
		FilterTests: filterTests,
	})

	allPassed, _ := runner.Run()

	// Close the MCP client (and its stdio subprocess) before returning.
	client.Close()

	if !allPassed {
		return fmt.Errorf("some integration tests failed")
	}
	return nil
}

// findRepoRoot walks up from the current directory to find the repo root
// (identified by the presence of codeql-workspace.yml).
func findRepoRoot() (string, error) {
	// Try from current working directory
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, "codeql-workspace.yml")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	// Fallback: try relative to the binary
	exe, err := os.Executable()
	if err == nil {
		dir = filepath.Dir(exe)
		for i := 0; i < 5; i++ {
			if _, err := os.Stat(filepath.Join(dir, "codeql-workspace.yml")); err == nil {
				return dir, nil
			}
			dir = filepath.Dir(dir)
		}
	}

	return "", fmt.Errorf("could not find repo root (codeql-workspace.yml)")
}
