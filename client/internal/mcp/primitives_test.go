package mcp

import (
	"context"
	"fmt"
	"testing"

	"github.com/mark3labs/mcp-go/mcp"
)

// fakeInner implements innerClient for unit tests.
type fakeInner struct {
	callToolResult    *mcp.CallToolResult
	callToolErr       error
	getPromptResult   *mcp.GetPromptResult
	getPromptErr      error
	listToolsResult   *mcp.ListToolsResult
	listToolsErr      error
	listPromptsResult *mcp.ListPromptsResult
	listPromptsErr    error
	listResourcesResult *mcp.ListResourcesResult
	listResourcesErr    error
	readResourceResult  *mcp.ReadResourceResult
	readResourceErr     error
}

func (f *fakeInner) Initialize(_ context.Context, _ mcp.InitializeRequest) (*mcp.InitializeResult, error) {
	return nil, nil
}

func (f *fakeInner) Close() error { return nil }

func (f *fakeInner) CallTool(_ context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return f.callToolResult, f.callToolErr
}

func (f *fakeInner) GetPrompt(_ context.Context, _ mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
	return f.getPromptResult, f.getPromptErr
}

func (f *fakeInner) ListTools(_ context.Context, _ mcp.ListToolsRequest) (*mcp.ListToolsResult, error) {
	return f.listToolsResult, f.listToolsErr
}

func (f *fakeInner) ListPrompts(_ context.Context, _ mcp.ListPromptsRequest) (*mcp.ListPromptsResult, error) {
	return f.listPromptsResult, f.listPromptsErr
}

func (f *fakeInner) ListResources(_ context.Context, _ mcp.ListResourcesRequest) (*mcp.ListResourcesResult, error) {
	return f.listResourcesResult, f.listResourcesErr
}

func (f *fakeInner) ReadResource(_ context.Context, _ mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
	return f.readResourceResult, f.readResourceErr
}

func newFakeClient(inner *fakeInner) *Client {
	return &Client{inner: inner}
}

func TestCallTool_Success(t *testing.T) {
	fake := &fakeInner{
		callToolResult: &mcp.CallToolResult{
			Content: []mcp.Content{
				mcp.TextContent{Type: "text", Text: "hello world"},
			},
		},
	}
	c := newFakeClient(fake)

	result, err := CallTool(context.Background(), c, "test_tool", map[string]any{"key": "value"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Content) != 1 {
		t.Fatalf("expected 1 content block, got %d", len(result.Content))
	}
	if result.Content[0].Text != "hello world" {
		t.Errorf("expected text %q, got %q", "hello world", result.Content[0].Text)
	}
	if result.IsError {
		t.Error("expected IsError=false")
	}
}

func TestCallTool_Error(t *testing.T) {
	fake := &fakeInner{
		callToolErr: fmt.Errorf("tool failed"),
	}
	c := newFakeClient(fake)

	_, err := CallTool(context.Background(), c, "test_tool", nil)
	if err == nil {
		t.Fatal("expected error")
	}
	if got := err.Error(); got != `call tool "test_tool": tool failed` {
		t.Errorf("unexpected error: %q", got)
	}
}

func TestCallTool_IsError(t *testing.T) {
	fake := &fakeInner{
		callToolResult: &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{Type: "text", Text: "bad input"},
			},
		},
	}
	c := newFakeClient(fake)

	result, err := CallTool(context.Background(), c, "test_tool", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.IsError {
		t.Error("expected IsError=true")
	}
}

func TestCallTool_NotConnected(t *testing.T) {
	c := NewClient(Config{Mode: ModeHTTP})

	_, err := CallTool(context.Background(), c, "test_tool", nil)
	if err == nil {
		t.Fatal("expected error for disconnected client")
	}
}

func TestReadResource_Success(t *testing.T) {
	fake := &fakeInner{
		readResourceResult: &mcp.ReadResourceResult{
			Contents: []mcp.ResourceContents{
				mcp.TextResourceContents{
					URI:      "codeql://server/overview",
					MIMEType: "text/markdown",
					Text:     "# Overview",
				},
			},
		},
	}
	c := newFakeClient(fake)

	result, err := ReadResource(context.Background(), c, "codeql://server/overview")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Contents) != 1 {
		t.Fatalf("expected 1 content item, got %d", len(result.Contents))
	}
	if result.Contents[0].URI != "codeql://server/overview" {
		t.Errorf("unexpected URI: %q", result.Contents[0].URI)
	}
	if result.Contents[0].Text != "# Overview" {
		t.Errorf("unexpected text: %q", result.Contents[0].Text)
	}
}

func TestReadResource_Error(t *testing.T) {
	fake := &fakeInner{
		readResourceErr: fmt.Errorf("resource not found"),
	}
	c := newFakeClient(fake)

	_, err := ReadResource(context.Background(), c, "codeql://unknown")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestReadResource_NotConnected(t *testing.T) {
	c := NewClient(Config{Mode: ModeHTTP})

	_, err := ReadResource(context.Background(), c, "codeql://test")
	if err == nil {
		t.Fatal("expected error for disconnected client")
	}
}

func TestGetPrompt_Success(t *testing.T) {
	fake := &fakeInner{
		getPromptResult: &mcp.GetPromptResult{
			Description: "Test prompt",
			Messages: []mcp.PromptMessage{
				{
					Role:    mcp.RoleUser,
					Content: mcp.TextContent{Type: "text", Text: "Hello from prompt"},
				},
			},
		},
	}
	c := newFakeClient(fake)

	result, err := GetPrompt(context.Background(), c, "test_prompt", map[string]string{"lang": "go"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Description != "Test prompt" {
		t.Errorf("unexpected description: %q", result.Description)
	}
	if len(result.Messages) != 1 {
		t.Fatalf("expected 1 message, got %d", len(result.Messages))
	}
	if result.Messages[0].Role != "user" {
		t.Errorf("unexpected role: %q", result.Messages[0].Role)
	}
	if result.Messages[0].Content != "Hello from prompt" {
		t.Errorf("unexpected content: %q", result.Messages[0].Content)
	}
}

func TestGetPrompt_Error(t *testing.T) {
	fake := &fakeInner{
		getPromptErr: fmt.Errorf("prompt not found"),
	}
	c := newFakeClient(fake)

	_, err := GetPrompt(context.Background(), c, "unknown_prompt", nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestGetPrompt_NotConnected(t *testing.T) {
	c := NewClient(Config{Mode: ModeHTTP})

	_, err := GetPrompt(context.Background(), c, "test_prompt", nil)
	if err == nil {
		t.Fatal("expected error for disconnected client")
	}
}

func TestListTools_Success(t *testing.T) {
	fake := &fakeInner{
		listToolsResult: &mcp.ListToolsResult{
			Tools: []mcp.Tool{
				{Name: "tool_a", Description: "Description A"},
				{Name: "tool_b", Description: "Description B"},
			},
		},
	}
	c := newFakeClient(fake)

	infos, err := ListTools(context.Background(), c)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(infos) != 2 {
		t.Fatalf("expected 2 tools, got %d", len(infos))
	}
	if infos[0].Name != "tool_a" {
		t.Errorf("expected tool_a, got %q", infos[0].Name)
	}
}

func TestListResources_Success(t *testing.T) {
	fake := &fakeInner{
		listResourcesResult: &mcp.ListResourcesResult{
			Resources: []mcp.Resource{
				{Name: "resource_a", URI: "codeql://test/a", Description: "Desc A"},
			},
		},
	}
	c := newFakeClient(fake)

	infos, err := ListResources(context.Background(), c)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(infos) != 1 {
		t.Fatalf("expected 1 resource, got %d", len(infos))
	}
	if infos[0].URI != "codeql://test/a" {
		t.Errorf("expected URI %q, got %q", "codeql://test/a", infos[0].URI)
	}
}

func TestListPrompts_Success(t *testing.T) {
	fake := &fakeInner{
		listPromptsResult: &mcp.ListPromptsResult{
			Prompts: []mcp.Prompt{
				{Name: "prompt_a", Description: "Desc A"},
				{Name: "prompt_b", Description: "Desc B"},
			},
		},
	}
	c := newFakeClient(fake)

	infos, err := ListPrompts(context.Background(), c)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(infos) != 2 {
		t.Fatalf("expected 2 prompts, got %d", len(infos))
	}
}

func TestFormatJSON(t *testing.T) {
	data := map[string]string{"key": "value"}
	result, err := FormatJSON(data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == "" {
		t.Error("expected non-empty JSON")
	}
}

func TestFormatToolResultText(t *testing.T) {
	tr := &ToolResult{
		Content: []ContentBlock{
			{Type: "text", Text: "line1"},
			{Type: "text", Text: "line2"},
		},
	}
	result := FormatToolResultText(tr)
	if result != "line1\nline2\n" {
		t.Errorf("unexpected result: %q", result)
	}
}

func TestFormatToolResultText_Error(t *testing.T) {
	tr := &ToolResult{
		IsError: true,
		Content: []ContentBlock{
			{Type: "text", Text: "bad input"},
		},
	}
	result := FormatToolResultText(tr)
	if result != "[ERROR]\nbad input\n" {
		t.Errorf("unexpected result: %q", result)
	}
}

func TestFormatResourceContentText(t *testing.T) {
	rc := &ResourceContent{
		Contents: []ResourceContentItem{
			{URI: "codeql://test", MIMEType: "text/markdown", Text: "# Hello"},
		},
	}
	result := FormatResourceContentText(rc)
	if result == "" {
		t.Error("expected non-empty text")
	}
}

func TestFormatPromptMessagesText(t *testing.T) {
	pm := &PromptMessages{
		Description: "Test",
		Messages: []PromptMessage{
			{Role: "user", Content: "Hello"},
		},
	}
	result := FormatPromptMessagesText(pm)
	if result == "" {
		t.Error("expected non-empty text")
	}
}

func TestFormatToolResultMarkdown(t *testing.T) {
	tr := &ToolResult{
		Content: []ContentBlock{
			{Type: "text", Text: "result"},
		},
	}
	result := FormatToolResultMarkdown(tr)
	if result != "result\n" {
		t.Errorf("unexpected result: %q", result)
	}
}

func TestFormatResourceContentMarkdown(t *testing.T) {
	rc := &ResourceContent{
		Contents: []ResourceContentItem{
			{Text: "# Hello"},
		},
	}
	result := FormatResourceContentMarkdown(rc)
	if result != "# Hello\n" {
		t.Errorf("unexpected result: %q", result)
	}
}

func TestFormatPromptMessagesMarkdown(t *testing.T) {
	pm := &PromptMessages{
		Messages: []PromptMessage{
			{Role: "user", Content: "Hello"},
		},
	}
	result := FormatPromptMessagesMarkdown(pm)
	if result == "" {
		t.Error("expected non-empty markdown")
	}
}
