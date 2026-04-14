package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/spf13/cobra"

	gh "github.com/advanced-security/codeql-development-mcp-server/client/internal/github"
)

// ---------------------------------------------------------------------------
// Report data types
// ---------------------------------------------------------------------------

type ruleEntry struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Severity string `json:"severity"`
}

type locationEntry struct {
	Path      string `json:"path"`
	StartLine int    `json:"startLine"`
	EndLine   int    `json:"endLine,omitempty"`
}

type alertEntry struct {
	Number           int           `json:"number"`
	State            string        `json:"state"`
	Rule             ruleEntry     `json:"rule"`
	Location         locationEntry `json:"location"`
	Message          string        `json:"message,omitempty"`
	Created          string        `json:"createdAt,omitempty"`
	FixedAt          *string       `json:"fixedAt,omitempty"`
	DismissedReason  *string       `json:"dismissedReason,omitempty"`
	DismissedComment *string       `json:"dismissedComment,omitempty"`
	DismissedBy      *string       `json:"dismissedBy,omitempty"`
	DismissedAt      *string       `json:"dismissedAt,omitempty"`
}

type ruleSummary struct {
	RuleID         string   `json:"ruleId"`
	RuleName       string   `json:"ruleName"`
	Severity       string   `json:"severity"`
	AlertCount     int      `json:"alertCount"`
	OpenCount      int      `json:"openCount"`
	DismissedCount int      `json:"dismissedCount"`
	FixedCount     int      `json:"fixedCount"`
	Locations      []string `json:"locations"`
}

type reportSummary struct {
	TotalAlerts int            `json:"totalAlerts"`
	ByState     map[string]int `json:"byState"`
	ByRule      []ruleSummary  `json:"byRule"`
	BySeverity  map[string]int `json:"bySeverity"`
}

type analysisEntry struct {
	ID           int    `json:"id"`
	Ref          string `json:"ref"`
	CommitSHA    string `json:"commitSHA"`
	Tool         string `json:"tool"`
	ResultsCount int    `json:"resultsCount"`
	RulesCount   int    `json:"rulesCount"`
	CreatedAt    string `json:"createdAt"`
	Category     string `json:"category,omitempty"`
}

type codeScanningReport struct {
	Repository  string          `json:"repository"`
	GeneratedAt string          `json:"generatedAt"`
	Analyses    []analysisEntry `json:"analyses"`
	Alerts      []alertEntry    `json:"alerts"`
	Summary     reportSummary   `json:"summary"`
}

// ---------------------------------------------------------------------------
// buildReport — pure function, no I/O
// ---------------------------------------------------------------------------

func buildReport(repo string, analyses []analysisEntry, alerts []alertEntry) codeScanningReport {
	summary := reportSummary{
		TotalAlerts: len(alerts),
		ByState:     make(map[string]int),
		BySeverity:  make(map[string]int),
	}

	// Group alerts by rule
	ruleAlerts := make(map[string][]alertEntry)
	ruleInfo := make(map[string]ruleEntry)

	for _, a := range alerts {
		summary.ByState[a.State]++
		if a.Rule.Severity != "" {
			summary.BySeverity[a.Rule.Severity]++
		}
		ruleAlerts[a.Rule.ID] = append(ruleAlerts[a.Rule.ID], a)
		ruleInfo[a.Rule.ID] = a.Rule
	}

	// Build per-rule summaries sorted by alert count descending
	for ruleID, rAlerts := range ruleAlerts {
		info := ruleInfo[ruleID]
		var locations []string
		var openCount, dismissedCount, fixedCount int
		for _, a := range rAlerts {
			locations = append(locations, fmt.Sprintf("%s:%d", a.Location.Path, a.Location.StartLine))
			switch a.State {
			case "open":
				openCount++
			case "dismissed":
				dismissedCount++
			case "fixed":
				fixedCount++
			}
		}
		summary.ByRule = append(summary.ByRule, ruleSummary{
			RuleID:         ruleID,
			RuleName:       info.Name,
			Severity:       info.Severity,
			AlertCount:     len(rAlerts),
			OpenCount:      openCount,
			DismissedCount: dismissedCount,
			FixedCount:     fixedCount,
			Locations:      locations,
		})
	}
	sort.Slice(summary.ByRule, func(i, j int) bool {
		if summary.ByRule[i].AlertCount != summary.ByRule[j].AlertCount {
			return summary.ByRule[i].AlertCount > summary.ByRule[j].AlertCount
		}
		return summary.ByRule[i].RuleID < summary.ByRule[j].RuleID
	})

	return codeScanningReport{
		Repository:  repo,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Analyses:    analyses,
		Alerts:      alerts,
		Summary:     summary,
	}
}

// ---------------------------------------------------------------------------
// Cobra command
// ---------------------------------------------------------------------------

var reportCmd = &cobra.Command{
	Use:   "report",
	Short: "Generate a Code Scanning report for a repository",
	Long: `Download all Code Scanning analyses and alerts for a repository and
produce a structured JSON summary report. The report groups alerts by rule,
state, and severity for downstream processing.

This is Phase 1 of the three-phase Code Scanning alert lifecycle workflow.
The output can be fed into 'code-scanning assess' (Phase 2).`,
	RunE: runReport,
}

var reportFlags struct {
	repo         string
	ref          string
	toolName     string
	state        string
	output       string
	includeSarif bool
	perPage      int
}

func init() {
	codeScanningCmd.AddCommand(reportCmd)

	f := reportCmd.Flags()
	f.StringVar(&reportFlags.repo, "repo", "", "Repository in owner/repo format (required)")
	f.StringVar(&reportFlags.ref, "ref", "", "Git ref to filter by (e.g. refs/heads/main)")
	f.StringVar(&reportFlags.toolName, "tool-name", "", "Tool name to filter by (e.g. CodeQL)")
	f.StringVar(&reportFlags.state, "state", "", "Alert state filter: open, dismissed, fixed")
	f.StringVar(&reportFlags.output, "output", "", "Output file path (default: <owner>_<repo>.cs-report.json)")
	f.BoolVar(&reportFlags.includeSarif, "include-sarif", false, "Also download SARIF files for each analysis")
	f.IntVar(&reportFlags.perPage, "per-page", 100, "Results per page for API calls (max 100)")

	_ = reportCmd.MarkFlagRequired("repo")
}

func runReport(cmd *cobra.Command, _ []string) error {
	owner, repo, err := parseRepo(reportFlags.repo)
	if err != nil {
		return err
	}

	if err := validatePerPage(reportFlags.perPage); err != nil {
		return err
	}

	client, err := gh.NewClient()
	if err != nil {
		return err
	}

	// Phase 1: Download analyses
	fmt.Fprintf(cmd.ErrOrStderr(), "Fetching analyses for %s/%s...\n", owner, repo)
	ghAnalyses, err := client.ListAnalyses(gh.ListAnalysesOptions{
		Owner:    owner,
		Repo:     repo,
		Ref:      reportFlags.ref,
		ToolName: reportFlags.toolName,
		PerPage:  reportFlags.perPage,
	})
	if err != nil {
		return fmt.Errorf("list analyses: %w", err)
	}

	var analyses []analysisEntry
	for _, a := range ghAnalyses {
		analyses = append(analyses, analysisEntry{
			ID:           a.ID,
			Ref:          a.Ref,
			CommitSHA:    a.CommitSHA,
			Tool:         a.Tool.Name,
			ResultsCount: a.ResultsCount,
			RulesCount:   a.RulesCount,
			CreatedAt:    a.CreatedAt,
			Category:     a.Category,
		})
	}
	fmt.Fprintf(cmd.ErrOrStderr(), "  Found %d analyses\n", len(analyses))

	// Phase 2: Download alerts across all states for complete lifecycle picture.
	// When no --state filter is given, we fetch each state separately to ensure
	// dismissed and fixed alerts are captured (the API returns open by default).
	fmt.Fprintf(cmd.ErrOrStderr(), "Fetching alerts...\n")

	states := []string{reportFlags.state}
	if reportFlags.state == "" {
		states = []string{"open", "dismissed", "fixed"}
	}

	var ghAlerts []gh.Alert
	for _, state := range states {
		stateAlerts, err := client.ListAlerts(gh.ListAlertsOptions{
			Owner:    owner,
			Repo:     repo,
			Ref:      reportFlags.ref,
			State:    state,
			ToolName: reportFlags.toolName,
			PerPage:  reportFlags.perPage,
		})
		if err != nil {
			return fmt.Errorf("list alerts (state=%s): %w", state, err)
		}
		ghAlerts = append(ghAlerts, stateAlerts...)
	}

	var alerts []alertEntry
	for _, a := range ghAlerts {
		entry := alertEntry{
			Number: a.Number,
			State:  a.State,
			Rule: ruleEntry{
				ID:       a.Rule.ID,
				Name:     a.Rule.Name,
				Severity: a.Rule.Severity,
			},
			Location: locationEntry{
				Path:      a.MostRecentInstance.Location.Path,
				StartLine: a.MostRecentInstance.Location.StartLine,
				EndLine:   a.MostRecentInstance.Location.EndLine,
			},
			Message: a.MostRecentInstance.Message.Text,
			Created: a.CreatedAt,
			FixedAt: a.FixedAt,
		}
		if a.DismissedReason != nil {
			entry.DismissedReason = a.DismissedReason
		}
		if a.DismissedComment != nil {
			entry.DismissedComment = a.DismissedComment
		}
		if a.DismissedAt != nil {
			entry.DismissedAt = a.DismissedAt
		}
		if a.DismissedBy != nil {
			entry.DismissedBy = &a.DismissedBy.Login
		}
		alerts = append(alerts, entry)
	}
	fmt.Fprintf(cmd.ErrOrStderr(), "  Found %d alerts\n", len(alerts))

	// Phase 3: Optionally download SARIF files
	if reportFlags.includeSarif && len(ghAnalyses) > 0 {
		sarifDir := filepath.Join("sarif-downloads", fmt.Sprintf("%s_%s", owner, repo))
		if err := os.MkdirAll(sarifDir, 0o750); err != nil {
			return fmt.Errorf("create sarif directory: %w", err)
		}
		fmt.Fprintf(cmd.ErrOrStderr(), "Downloading SARIF files to %s/...\n", sarifDir)
		for _, a := range ghAnalyses {
			outPath := filepath.Join(sarifDir, fmt.Sprintf("%d.sarif", a.ID))
			// Skip if already downloaded
			if _, err := os.Stat(outPath); err == nil {
				fmt.Fprintf(cmd.ErrOrStderr(), "  Skipping %d (already exists)\n", a.ID)
				continue
			}
			sarif, err := client.GetAnalysisSARIF(owner, repo, a.ID)
			if err != nil {
				fmt.Fprintf(cmd.ErrOrStderr(), "  Warning: failed to download analysis %d: %v\n", a.ID, err)
				continue
			}
			var pretty json.RawMessage
			if err := json.Unmarshal(sarif, &pretty); err == nil {
				formatted, _ := json.MarshalIndent(pretty, "", "  ")
				sarif = formatted
			}
			if err := os.WriteFile(outPath, sarif, 0o600); err != nil {
				fmt.Fprintf(cmd.ErrOrStderr(), "  Warning: failed to write %s: %v\n", outPath, err)
				continue
			}
			fmt.Fprintf(cmd.ErrOrStderr(), "  Downloaded %d (%d bytes)\n", a.ID, len(sarif))
		}
	}

	// Build report
	report := buildReport(fmt.Sprintf("%s/%s", owner, repo), analyses, alerts)

	// Determine output path
	outPath := reportFlags.output
	if outPath == "" {
		outPath = fmt.Sprintf("%s_%s.cs-report.json", owner, repo)
	}

	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal report: %w", err)
	}

	if err := os.WriteFile(outPath, data, 0o600); err != nil {
		return fmt.Errorf("write report: %w", err)
	}

	fmt.Fprintf(cmd.ErrOrStderr(), "\nReport written to %s\n", outPath)
	fmt.Fprintf(cmd.ErrOrStderr(), "  %d analyses, %d alerts across %d rules\n",
		len(analyses), report.Summary.TotalAlerts, len(report.Summary.ByRule))

	// If format is json, also output to stdout
	if OutputFormat() == "json" {
		fmt.Fprintln(cmd.OutOrStdout(), string(data))
	}

	return nil
}
