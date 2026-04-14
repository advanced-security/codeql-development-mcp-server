package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"

	gh "github.com/advanced-security/codeql-development-mcp-server/client/internal/github"
)

// ---------------------------------------------------------------------------
// Apply data types
// ---------------------------------------------------------------------------

type applyAction struct {
	AlertNumber    int    `json:"alertNumber"`
	RuleID         string `json:"ruleId"`
	Action         string `json:"action"`
	DismissReason  string `json:"dismissReason,omitempty"`
	DismissComment string `json:"dismissComment,omitempty"`
	Reason         string `json:"reason,omitempty"`
	Authorized     bool   `json:"authorized"`
	Applied        bool   `json:"applied"`
	Error          string `json:"error,omitempty"`
}

type applySummary struct {
	TotalAlerts              int  `json:"totalAlerts"`
	DismissCount             int  `json:"dismissCount"`
	AuthorizedDismissCount   int  `json:"authorizedDismissCount"`
	UnauthorizedDismissCount int  `json:"unauthorizedDismissCount"`
	NoChangeCount            int  `json:"noChangeCount"`
	AppliedCount             int  `json:"appliedCount"`
	ErrorCount               int  `json:"errorCount"`
	DryRun                   bool `json:"dryRun"`
}

type applyPlan struct {
	Repository  string        `json:"repository,omitempty"`
	GeneratedAt string        `json:"generatedAt"`
	InputReport string        `json:"inputReport,omitempty"`
	Actions     []applyAction `json:"actions"`
	Summary     applySummary  `json:"summary"`
}

type applyOptions struct {
	dryRun               bool
	acceptAllChanges     bool
	acceptChangeForRules []string
	dismissReason        string
	dismissComment       string
}

// ---------------------------------------------------------------------------
// buildApplyPlan — pure function, no I/O
// ---------------------------------------------------------------------------

func buildApplyPlan(assessed []assessedAlert, opts applyOptions) applyPlan {
	acceptRules := make(map[string]bool)
	for _, r := range opts.acceptChangeForRules {
		acceptRules[r] = true
	}

	reason := opts.dismissReason
	if reason == "" {
		reason = "won't fix"
	}

	var actions []applyAction
	noChange := 0

	for _, a := range assessed {
		switch a.Recommendation {
		case "keep", "keep-dismissed", "keep-fixed":
			noChange++
			continue
		case "discard", "review":
			action := applyAction{
				AlertNumber:    a.Number,
				RuleID:         a.Rule.ID,
				Action:         "dismiss",
				DismissReason:  reason,
				DismissComment: opts.dismissComment,
				Reason:         a.RecommendReason,
			}
			if opts.acceptAllChanges || acceptRules[a.Rule.ID] {
				action.Authorized = true
			} else if a.Recommendation == "discard" && len(opts.acceptChangeForRules) == 0 {
				action.Authorized = true // discard auto-authorized when no rule filter set
			}
			actions = append(actions, action)
		default:
			noChange++
		}
	}

	var authorizedCount, unauthorizedCount int
	for _, a := range actions {
		if a.Authorized {
			authorizedCount++
		} else {
			unauthorizedCount++
		}
	}

	return applyPlan{
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Actions:     actions,
		Summary: applySummary{
			TotalAlerts:              len(assessed),
			DismissCount:             len(actions),
			AuthorizedDismissCount:   authorizedCount,
			UnauthorizedDismissCount: unauthorizedCount,
			NoChangeCount:            noChange,
			DryRun:                   opts.dryRun,
		},
	}
}

// ---------------------------------------------------------------------------
// Cobra command
// ---------------------------------------------------------------------------

var applyCmd = &cobra.Command{
	Use:   "apply",
	Short: "Apply alert lifecycle changes from an assess report",
	Long: `Apply the recommended changes from a Phase 2 assess report to
Code Scanning alerts via the GitHub API. Supports dry-run mode to preview
changes without making them, and per-rule or blanket acceptance flags.

This is Phase 3 of the three-phase Code Scanning alert lifecycle workflow.`,
	RunE: runApply,
}

var applyFlags struct {
	input                string
	output               string
	dryRun               bool
	acceptAllChanges     bool
	acceptChangeForRules []string
	dismissReason        string
	dismissComment       string
	repo                 string
}

func init() {
	codeScanningCmd.AddCommand(applyCmd)

	f := applyCmd.Flags()
	f.StringVar(&applyFlags.input, "input", "", "Path to Phase 2 assess report JSON (required)")
	f.StringVar(&applyFlags.output, "output", "", "Output file path (default: <owner>_<repo>.cs-apply.json)")
	f.StringVar(&applyFlags.repo, "repo", "", "Repository in owner/repo format (overrides report)")
	f.BoolVar(&applyFlags.dryRun, "dry-run", false, "Preview changes without applying them")
	f.BoolVar(&applyFlags.acceptAllChanges, "accept-all-changes", false, "Auto-authorize all recommended changes")
	f.StringSliceVar(&applyFlags.acceptChangeForRules, "accept-change-for-rule", nil, "Auto-authorize changes for specific rule IDs")
	f.StringVar(&applyFlags.dismissReason, "dismiss-reason", "won't fix", "Reason for dismissing alerts (false positive, won't fix, used in tests)")
	f.StringVar(&applyFlags.dismissComment, "dismiss-comment", "", "Comment to attach to dismissed alerts")

	_ = applyCmd.MarkFlagRequired("input")
}

func runApply(cmd *cobra.Command, _ []string) error {
	data, err := os.ReadFile(applyFlags.input)
	if err != nil {
		return fmt.Errorf("read input: %w", err)
	}

	var assessReport codeScanningAssessReport
	if err := json.Unmarshal(data, &assessReport); err != nil {
		return fmt.Errorf("parse assess report: %w", err)
	}

	repo := applyFlags.repo
	if repo == "" {
		repo = assessReport.Repository
	}

	owner, repoName, err := parseRepo(repo)
	if err != nil {
		return err
	}

	plan := buildApplyPlan(assessReport.Alerts, applyOptions{
		dryRun:               applyFlags.dryRun,
		acceptAllChanges:     applyFlags.acceptAllChanges,
		acceptChangeForRules: applyFlags.acceptChangeForRules,
		dismissReason:        applyFlags.dismissReason,
		dismissComment:       applyFlags.dismissComment,
	})
	plan.Repository = repo
	plan.InputReport = applyFlags.input

	if applyFlags.dryRun {
		fmt.Fprintf(cmd.ErrOrStderr(), "DRY RUN — no changes will be made to %s/%s\n", owner, repoName)
	}

	fmt.Fprintf(cmd.ErrOrStderr(), "Plan: %d alerts, %d to dismiss, %d unchanged\n",
		plan.Summary.TotalAlerts, plan.Summary.DismissCount, plan.Summary.NoChangeCount)

	// Execute actions (unless dry-run)
	if !applyFlags.dryRun && len(plan.Actions) > 0 {
		client, err := gh.NewClient()
		if err != nil {
			return err
		}

		for i, action := range plan.Actions {
			if !action.Authorized {
				fmt.Fprintf(cmd.ErrOrStderr(), "  Skipping #%d (%s) — not authorized\n",
					action.AlertNumber, action.RuleID)
				continue
			}

			fmt.Fprintf(cmd.ErrOrStderr(), "  Dismissing #%d (%s)...\n",
				action.AlertNumber, action.RuleID)

			_, err := client.UpdateAlert(gh.UpdateAlertOptions{
				Owner:            owner,
				Repo:             repoName,
				AlertNumber:      action.AlertNumber,
				State:            "dismissed",
				DismissedReason:  action.DismissReason,
				DismissedComment: action.DismissComment,
			})
			if err != nil {
				plan.Actions[i].Error = err.Error()
				plan.Summary.ErrorCount++
				fmt.Fprintf(cmd.ErrOrStderr(), "    Error: %v\n", err)
			} else {
				plan.Actions[i].Applied = true
				plan.Summary.AppliedCount++
			}
		}
	}

	// Write output
	outPath := applyFlags.output
	if outPath == "" {
		// Derive from repository name: owner_repo.cs-apply.json
		if o, r, err := parseRepo(repo); err == nil {
			outPath = fmt.Sprintf("%s_%s.cs-apply.json", o, r)
		} else {
			outPath = "cs-apply.json"
		}
	}

	outData, err := json.MarshalIndent(plan, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal plan: %w", err)
	}

	if err := os.WriteFile(outPath, outData, 0o600); err != nil {
		return fmt.Errorf("write plan: %w", err)
	}

	mode := "Plan"
	if !applyFlags.dryRun {
		mode = "Results"
	}
	fmt.Fprintf(cmd.ErrOrStderr(), "\n%s written to %s\n", mode, outPath)
	if plan.Summary.AppliedCount > 0 {
		fmt.Fprintf(cmd.ErrOrStderr(), "  %d alerts dismissed\n", plan.Summary.AppliedCount)
	}
	if plan.Summary.ErrorCount > 0 {
		fmt.Fprintf(cmd.ErrOrStderr(), "  %d errors\n", plan.Summary.ErrorCount)
	}

	if OutputFormat() == "json" {
		fmt.Fprintln(cmd.OutOrStdout(), string(outData))
	}

	return nil
}
