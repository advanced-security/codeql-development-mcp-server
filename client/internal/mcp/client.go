// Package mcp provides a client for connecting to the CodeQL Development MCP Server.
package mcp

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	mcpclient "github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/mcp"
)

const (
	// ModeStdio spawns the MCP server as a child process.
	ModeStdio = "stdio"
	// ModeHTTP connects to an already-running MCP server over HTTP.
	ModeHTTP = "http"

	// DefaultTimeout is the default tool call timeout.
	DefaultTimeout = 60 * time.Second
	// CodeQLToolTimeout is the timeout for long-running CodeQL tool calls.
	CodeQLToolTimeout = 5 * time.Minute

	// ConnectTimeout is the timeout for establishing a connection.
	ConnectTimeout = 30 * time.Second
)

// Config holds the configuration for connecting to an MCP server.
type Config struct {
	Mode string // "stdio" or "http"
	Host string // HTTP host (http mode only)
	Port int    // HTTP port (http mode only)
}

// Client wraps an MCP client with convenience methods for tool calls.
type Client struct {
	inner  *mcpclient.Client
	config Config
}

// NewClient creates a new MCP client with the given config but does not connect.
func NewClient(cfg Config) *Client {
	return &Client{config: cfg}
}

// Connect establishes a connection to the MCP server.
func (c *Client) Connect(ctx context.Context) error {
	switch c.config.Mode {
	case ModeStdio:
		return c.connectStdio(ctx)
	case ModeHTTP:
		return c.connectHTTP(ctx)
	default:
		return fmt.Errorf("unsupported MCP transport mode: %q (must be %q or %q)", c.config.Mode, ModeStdio, ModeHTTP)
	}
}

func (c *Client) connectStdio(ctx context.Context) error {
	serverPath, err := resolveServerPath()
	if err != nil {
		return fmt.Errorf("cannot locate MCP server: %w", err)
	}

	client, err := mcpclient.NewStdioMCPClient(
		"node", nil,
		serverPath,
	)
	if err != nil {
		return fmt.Errorf("failed to create stdio MCP client: %w", err)
	}
	c.inner = client

	initCtx, cancel := context.WithTimeout(ctx, ConnectTimeout)
	defer cancel()

	_, err = c.inner.Initialize(initCtx, mcp.InitializeRequest{
		Params: mcp.InitializeParams{
			ClientInfo: mcp.Implementation{
				Name:    "gh-ql-mcp-client",
				Version: "0.1.0",
			},
			ProtocolVersion: mcp.LATEST_PROTOCOL_VERSION,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to initialize MCP session: %w", err)
	}
	return nil
}

func (c *Client) connectHTTP(ctx context.Context) error {
	url := fmt.Sprintf("http://%s:%d/mcp", c.config.Host, c.config.Port)

	// Check for override from environment
	if envURL := os.Getenv("MCP_SERVER_URL"); envURL != "" {
		url = envURL
	}

	client, err := mcpclient.NewStreamableHttpClient(url)
	if err != nil {
		return fmt.Errorf("failed to create HTTP MCP client for %s: %w", url, err)
	}
	c.inner = client

	initCtx, cancel := context.WithTimeout(ctx, ConnectTimeout)
	defer cancel()

	_, err = c.inner.Initialize(initCtx, mcp.InitializeRequest{
		Params: mcp.InitializeParams{
			ClientInfo: mcp.Implementation{
				Name:    "gh-ql-mcp-client",
				Version: "0.1.0",
			},
			ProtocolVersion: mcp.LATEST_PROTOCOL_VERSION,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to initialize MCP session at %s: %w", url, err)
	}
	return nil
}

// Close disconnects from the MCP server.
// For stdio mode, this also terminates the server subprocess.
func (c *Client) Close() error {
	if c.inner == nil {
		return nil
	}

	// For stdio transport, closing stdin signals the server to exit.
	// However, the Node.js server may not exit immediately, so we
	// run Close in a goroutine with a timeout and kill the process
	// if it doesn't exit within 3 seconds.
	done := make(chan error, 1)
	go func() {
		done <- c.inner.Close()
	}()

	select {
	case err := <-done:
		return err
	case <-time.After(3 * time.Second):
		// Close didn't complete in time; the process is likely stuck.
		// This is expected with Node.js stdio servers.
		return nil
	}
}

// CallTool invokes an MCP tool by name with the given parameters.
func (c *Client) CallTool(ctx context.Context, name string, params map[string]any) (*mcp.CallToolResult, error) {
	if c.inner == nil {
		return nil, fmt.Errorf("MCP client not connected")
	}

	timeout := timeoutForTool(name)
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req := mcp.CallToolRequest{}
	req.Params.Name = name
	req.Params.Arguments = params

	return c.inner.CallTool(callCtx, req)
}

// ListTools returns all tools registered on the MCP server.
func (c *Client) ListTools(ctx context.Context) ([]mcp.Tool, error) {
	if c.inner == nil {
		return nil, fmt.Errorf("MCP client not connected")
	}
	result, err := c.inner.ListTools(ctx, mcp.ListToolsRequest{})
	if err != nil {
		return nil, err
	}
	return result.Tools, nil
}

// ListPrompts returns all prompts registered on the MCP server.
func (c *Client) ListPrompts(ctx context.Context) ([]mcp.Prompt, error) {
	if c.inner == nil {
		return nil, fmt.Errorf("MCP client not connected")
	}
	result, err := c.inner.ListPrompts(ctx, mcp.ListPromptsRequest{})
	if err != nil {
		return nil, err
	}
	return result.Prompts, nil
}

// ListResources returns all resources registered on the MCP server.
func (c *Client) ListResources(ctx context.Context) ([]mcp.Resource, error) {
	if c.inner == nil {
		return nil, fmt.Errorf("MCP client not connected")
	}
	result, err := c.inner.ListResources(ctx, mcp.ListResourcesRequest{})
	if err != nil {
		return nil, err
	}
	return result.Resources, nil
}

// timeoutForTool returns the appropriate timeout for a given tool name.
func timeoutForTool(name string) time.Duration {
	// CodeQL CLI tools need longer timeouts
	codeqlTools := map[string]bool{
		"codeql_query_run":        true,
		"codeql_query_compile":    true,
		"codeql_database_analyze": true,
		"codeql_database_create":  true,
		"codeql_test_run":         true,
		"codeql_test_extract":     true,
		"codeql_pack_install":     true,
	}
	if codeqlTools[name] {
		return CodeQLToolTimeout
	}
	return DefaultTimeout
}

// resolveServerPath finds the MCP server entry point relative to the client binary.
func resolveServerPath() (string, error) {
	// Try environment variable first
	if p := os.Getenv("MCP_SERVER_PATH"); p != "" {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}

	// Try relative to current working directory (repo layout: client/ and server/ are siblings)
	candidates := []string{
		filepath.Join("..", "server", "dist", "codeql-development-mcp-server.js"),
		filepath.Join("server", "dist", "codeql-development-mcp-server.js"),
	}

	for _, candidate := range candidates {
		abs, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if _, err := os.Stat(abs); err == nil {
			return abs, nil
		}
	}

	// Try finding node in PATH to give a better error
	if _, err := exec.LookPath("node"); err != nil {
		return "", fmt.Errorf("node not found in PATH; required for stdio mode")
	}

	return "", fmt.Errorf("MCP server not found; set MCP_SERVER_PATH or run from the repo root")
}
