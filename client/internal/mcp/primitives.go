// Package mcp provides a client for connecting to the CodeQL Development MCP Server.
package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
)

// ToolResult holds the structured result of calling an MCP tool.
type ToolResult struct {
	Content []ContentBlock `json:"content"`
	IsError bool           `json:"isError"`
}

// ContentBlock represents a single content block in an MCP tool response.
type ContentBlock struct {
	Text string `json:"text"`
	Type string `json:"type"`
}

// ResourceContent holds the structured result of reading an MCP resource.
type ResourceContent struct {
	Contents []ResourceContentItem `json:"contents"`
}

// ResourceContentItem represents a single content item in an MCP resource response.
type ResourceContentItem struct {
	MIMEType string `json:"mimeType,omitempty"`
	Text     string `json:"text"`
	URI      string `json:"uri"`
}

// PromptMessages holds the structured result of getting an MCP prompt.
type PromptMessages struct {
	Description string          `json:"description,omitempty"`
	Messages    []PromptMessage `json:"messages"`
}

// PromptMessage represents a single message in an MCP prompt response.
type PromptMessage struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

// ToolInfo holds metadata about an MCP tool.
type ToolInfo struct {
	Description string `json:"description,omitempty"`
	Name        string `json:"name"`
}

// ResourceInfo holds metadata about an MCP resource.
type ResourceInfo struct {
	Description string `json:"description,omitempty"`
	Name        string `json:"name"`
	URI         string `json:"uri"`
}

// PromptInfo holds metadata about an MCP prompt.
type PromptInfo struct {
	Description string `json:"description,omitempty"`
	Name        string `json:"name"`
}

// CallTool invokes an MCP tool by name with the given arguments and returns
// a structured result.
func CallTool(ctx context.Context, c *Client, name string, args map[string]any) (*ToolResult, error) {
	result, err := c.CallTool(ctx, name, args)
	if err != nil {
		return nil, fmt.Errorf("call tool %q: %w", name, err)
	}

	tr := &ToolResult{IsError: result.IsError}
	for _, item := range result.Content {
		if textContent, ok := item.(mcp.TextContent); ok {
			tr.Content = append(tr.Content, ContentBlock{
				Type: "text",
				Text: textContent.Text,
			})
		}
	}
	return tr, nil
}

// ReadResource reads an MCP resource by URI and returns its content.
func ReadResource(ctx context.Context, c *Client, uri string) (*ResourceContent, error) {
	result, err := c.ReadResource(ctx, uri)
	if err != nil {
		return nil, fmt.Errorf("read resource %q: %w", uri, err)
	}

	rc := &ResourceContent{}
	for _, item := range result.Contents {
		if textRC, ok := item.(mcp.TextResourceContents); ok {
			rc.Contents = append(rc.Contents, ResourceContentItem{
				URI:      textRC.URI,
				MIMEType: textRC.MIMEType,
				Text:     textRC.Text,
			})
		}
	}
	return rc, nil
}

// GetPrompt retrieves an MCP prompt by name with the given arguments.
func GetPrompt(ctx context.Context, c *Client, name string, args map[string]string) (*PromptMessages, error) {
	result, err := c.GetPrompt(ctx, name, args)
	if err != nil {
		return nil, fmt.Errorf("get prompt %q: %w", name, err)
	}

	pm := &PromptMessages{Description: result.Description}
	for _, msg := range result.Messages {
		text := extractContentText(msg.Content)
		pm.Messages = append(pm.Messages, PromptMessage{
			Role:    string(msg.Role),
			Content: text,
		})
	}
	return pm, nil
}

// ListTools returns metadata for all tools registered on the MCP server.
func ListTools(ctx context.Context, c *Client) ([]ToolInfo, error) {
	tools, err := c.ListTools(ctx)
	if err != nil {
		return nil, fmt.Errorf("list tools: %w", err)
	}

	infos := make([]ToolInfo, len(tools))
	for i, t := range tools {
		infos[i] = ToolInfo{Name: t.Name, Description: t.Description}
	}
	return infos, nil
}

// ListResources returns metadata for all resources registered on the MCP server.
func ListResources(ctx context.Context, c *Client) ([]ResourceInfo, error) {
	resources, err := c.ListResources(ctx)
	if err != nil {
		return nil, fmt.Errorf("list resources: %w", err)
	}

	infos := make([]ResourceInfo, len(resources))
	for i, r := range resources {
		infos[i] = ResourceInfo{Name: r.Name, URI: r.URI, Description: r.Description}
	}
	return infos, nil
}

// ListPrompts returns metadata for all prompts registered on the MCP server.
func ListPrompts(ctx context.Context, c *Client) ([]PromptInfo, error) {
	prompts, err := c.ListPrompts(ctx)
	if err != nil {
		return nil, fmt.Errorf("list prompts: %w", err)
	}

	infos := make([]PromptInfo, len(prompts))
	for i, p := range prompts {
		infos[i] = PromptInfo{Name: p.Name, Description: p.Description}
	}
	return infos, nil
}

// FormatJSON encodes a value as indented JSON.
func FormatJSON(v any) (string, error) {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return "", fmt.Errorf("format JSON: %w", err)
	}
	return string(data), nil
}

// FormatToolResultText renders a ToolResult as human-readable text.
func FormatToolResultText(tr *ToolResult) string {
	var sb strings.Builder
	if tr.IsError {
		sb.WriteString("[ERROR]\n")
	}
	for _, block := range tr.Content {
		sb.WriteString(block.Text)
		sb.WriteString("\n")
	}
	return sb.String()
}

// FormatResourceContentText renders a ResourceContent as human-readable text.
func FormatResourceContentText(rc *ResourceContent) string {
	var sb strings.Builder
	for i, item := range rc.Contents {
		if i > 0 {
			sb.WriteString("\n---\n")
		}
		if item.URI != "" {
			sb.WriteString(fmt.Sprintf("URI: %s\n", item.URI))
		}
		if item.MIMEType != "" {
			sb.WriteString(fmt.Sprintf("Type: %s\n", item.MIMEType))
		}
		sb.WriteString("\n")
		sb.WriteString(item.Text)
		sb.WriteString("\n")
	}
	return sb.String()
}

// FormatPromptMessagesText renders PromptMessages as human-readable text.
func FormatPromptMessagesText(pm *PromptMessages) string {
	var sb strings.Builder
	if pm.Description != "" {
		sb.WriteString(fmt.Sprintf("Description: %s\n\n", pm.Description))
	}
	for i, msg := range pm.Messages {
		if i > 0 {
			sb.WriteString("\n---\n")
		}
		sb.WriteString(fmt.Sprintf("[%s]\n", msg.Role))
		sb.WriteString(msg.Content)
		sb.WriteString("\n")
	}
	return sb.String()
}

// FormatToolResultMarkdown renders a ToolResult as markdown.
func FormatToolResultMarkdown(tr *ToolResult) string {
	var sb strings.Builder
	if tr.IsError {
		sb.WriteString("**Error:**\n\n")
	}
	for _, block := range tr.Content {
		sb.WriteString(block.Text)
		sb.WriteString("\n")
	}
	return sb.String()
}

// FormatResourceContentMarkdown renders a ResourceContent as markdown.
func FormatResourceContentMarkdown(rc *ResourceContent) string {
	var sb strings.Builder
	for i, item := range rc.Contents {
		if i > 0 {
			sb.WriteString("\n---\n\n")
		}
		sb.WriteString(item.Text)
		sb.WriteString("\n")
	}
	return sb.String()
}

// FormatPromptMessagesMarkdown renders PromptMessages as markdown.
func FormatPromptMessagesMarkdown(pm *PromptMessages) string {
	var sb strings.Builder
	if pm.Description != "" {
		sb.WriteString(fmt.Sprintf("*%s*\n\n", pm.Description))
	}
	for i, msg := range pm.Messages {
		if i > 0 {
			sb.WriteString("\n---\n\n")
		}
		sb.WriteString(fmt.Sprintf("### %s\n\n", msg.Role))
		sb.WriteString(msg.Content)
		sb.WriteString("\n")
	}
	return sb.String()
}

// extractContentText extracts the text from an MCP Content interface value.
// MCP prompt messages use the Content interface which can be TextContent,
// ImageContent, AudioContent, or EmbeddedResource. This function handles
// TextContent directly and falls back to JSON serialization for other types
// (e.g., image or audio content), preserving the data for the caller.
func extractContentText(content mcp.Content) string {
	if tc, ok := content.(mcp.TextContent); ok {
		return tc.Text
	}
	// Fallback: try JSON representation
	data, err := json.Marshal(content)
	if err != nil {
		return fmt.Sprintf("%v", content)
	}
	return string(data)
}
