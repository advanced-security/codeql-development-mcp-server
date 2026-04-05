// Package github provides a typed client for the GitHub Code Scanning REST API.
package github

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"

	ghapi "github.com/cli/go-gh/v2/pkg/api"
)

// Client wraps the go-gh REST client for Code Scanning API calls.
type Client struct {
	rest *ghapi.RESTClient
}

// NewClient creates a new GitHub API client using gh auth credentials.
func NewClient() (*Client, error) {
	opts := ghapi.ClientOptions{
		Headers: map[string]string{
			"X-GitHub-Api-Version": "2026-03-10",
		},
	}
	rest, err := ghapi.NewRESTClient(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create GitHub REST client (is gh authenticated?): %w", err)
	}
	return &Client{rest: rest}, nil
}

// ListAnalysesOptions configures the list analyses request.
type ListAnalysesOptions struct {
	Owner     string
	Repo      string
	Ref       string
	ToolName  string
	SarifID   string
	Sort      string
	Direction string
	Page      int
	PerPage   int
}

// ListAnalyses lists code scanning analyses for a repository.
func (c *Client) ListAnalyses(opts ListAnalysesOptions) ([]Analysis, error) {
	path := fmt.Sprintf("repos/%s/%s/code-scanning/analyses", opts.Owner, opts.Repo)
	query := buildQuery(map[string]string{
		"ref":       opts.Ref,
		"tool_name": opts.ToolName,
		"sarif_id":  opts.SarifID,
		"sort":      opts.Sort,
		"direction": opts.Direction,
		"page":      intToStr(opts.Page),
		"per_page":  intToStr(opts.PerPage),
	})
	if query != "" {
		path += "?" + query
	}

	var analyses []Analysis
	if err := c.rest.Get(path, &analyses); err != nil {
		return nil, fmt.Errorf("list analyses: %w", err)
	}
	return analyses, nil
}

// GetAnalysisSARIF downloads the SARIF content for a specific analysis.
// Uses Accept: application/sarif+json to get SARIF instead of analysis metadata.
func (c *Client) GetAnalysisSARIF(owner, repo string, analysisID int) ([]byte, error) {
	path := fmt.Sprintf("repos/%s/%s/code-scanning/analyses/%d", owner, repo, analysisID)

	// Need a separate client with SARIF Accept header
	sarifOpts := ghapi.ClientOptions{
		Headers: map[string]string{
			"Accept":               "application/sarif+json",
			"X-GitHub-Api-Version": "2026-03-10",
		},
	}
	sarifClient, err := ghapi.NewRESTClient(sarifOpts)
	if err != nil {
		return nil, fmt.Errorf("create SARIF client: %w", err)
	}

	var sarif json.RawMessage
	if err := sarifClient.Do("GET", path, nil, &sarif); err != nil {
		return nil, fmt.Errorf("get analysis SARIF: %w", err)
	}
	return sarif, nil
}

// ListAlertsOptions configures the list alerts request.
type ListAlertsOptions struct {
	Owner     string
	Repo      string
	Ref       string
	State     string
	Severity  string
	ToolName  string
	Sort      string
	Direction string
	Page      int
	PerPage   int
}

// ListAlerts lists code scanning alerts for a repository.
func (c *Client) ListAlerts(opts ListAlertsOptions) ([]Alert, error) {
	path := fmt.Sprintf("repos/%s/%s/code-scanning/alerts", opts.Owner, opts.Repo)
	query := buildQuery(map[string]string{
		"ref":       opts.Ref,
		"state":     opts.State,
		"severity":  opts.Severity,
		"tool_name": opts.ToolName,
		"sort":      opts.Sort,
		"direction": opts.Direction,
		"page":      intToStr(opts.Page),
		"per_page":  intToStr(opts.PerPage),
	})
	if query != "" {
		path += "?" + query
	}

	var alerts []Alert
	if err := c.rest.Get(path, &alerts); err != nil {
		return nil, fmt.Errorf("list alerts: %w", err)
	}
	return alerts, nil
}

// GetAlert retrieves a single code scanning alert by number.
func (c *Client) GetAlert(owner, repo string, alertNumber int) (*Alert, error) {
	path := fmt.Sprintf("repos/%s/%s/code-scanning/alerts/%d", owner, repo, alertNumber)

	var alert Alert
	if err := c.rest.Get(path, &alert); err != nil {
		return nil, fmt.Errorf("get alert %d: %w", alertNumber, err)
	}
	return &alert, nil
}

// ListAlertInstances lists all instances of a code scanning alert.
func (c *Client) ListAlertInstances(owner, repo string, alertNumber int) ([]AlertInstance, error) {
	path := fmt.Sprintf("repos/%s/%s/code-scanning/alerts/%d/instances", owner, repo, alertNumber)

	var instances []AlertInstance
	if err := c.rest.Get(path, &instances); err != nil {
		return nil, fmt.Errorf("list alert instances for alert %d: %w", alertNumber, err)
	}
	return instances, nil
}

// UpdateAlertOptions configures an alert update (dismiss or reopen).
type UpdateAlertOptions struct {
	Owner            string
	Repo             string
	AlertNumber      int
	State            string // "open" or "dismissed"
	DismissedReason  string // "false positive", "won't fix", "used in tests"
	DismissedComment string
}

// UpdateAlert updates the state of a code scanning alert.
func (c *Client) UpdateAlert(opts UpdateAlertOptions) (*Alert, error) {
	path := fmt.Sprintf("repos/%s/%s/code-scanning/alerts/%d", opts.Owner, opts.Repo, opts.AlertNumber)

	body := map[string]any{
		"state": opts.State,
	}
	if opts.State == "dismissed" {
		if opts.DismissedReason != "" {
			body["dismissed_reason"] = opts.DismissedReason
		}
		if opts.DismissedComment != "" {
			body["dismissed_comment"] = opts.DismissedComment
		}
	}

	bodyJSON, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal update body: %w", err)
	}

	var alert Alert
	if err := c.rest.Do("PATCH", path, bytes.NewReader(bodyJSON), &alert); err != nil {
		return nil, fmt.Errorf("update alert %d: %w", opts.AlertNumber, err)
	}
	return &alert, nil
}

// buildQuery constructs a URL query string from a map, omitting empty values.
func buildQuery(params map[string]string) string {
	q := url.Values{}
	for k, v := range params {
		if v != "" && v != "0" {
			q.Set(k, v)
		}
	}
	return q.Encode()
}

// intToStr converts an int to string, returning "" for zero values.
func intToStr(i int) string {
	if i == 0 {
		return ""
	}
	return strconv.Itoa(i)
}
