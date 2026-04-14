package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"
)

// ---------------------------------------------------------------------------
// Assessment data types
// ---------------------------------------------------------------------------

type assessedAlert struct {
	Number            int           `json:"number"`
	State             string        `json:"state"`
	Rule              ruleEntry     `json:"rule"`
	Location          locationEntry `json:"location"`
	Message           string        `json:"message,omitempty"`
	Created           string        `json:"createdAt,omitempty"`
	FixedAt           *string       `json:"fixedAt,omitempty"`
	DismissedReason   *string       `json:"dismissedReason,omitempty"`
	DismissedComment  *string       `json:"dismissedComment,omitempty"`
	DismissedBy       *string       `json:"dismissedBy,omitempty"`
	DismissedAt       *string       `json:"dismissedAt,omitempty"`
	Recommendation    string        `json:"recommendation"`
	RecommendReason   string        `json:"recommendReason,omitempty"`
	OverlappingAlerts []int         `json:"overlappingAlerts,omitempty"`
	ChurnRisk         string        `json:"churnRisk,omitempty"`
}

type assessSummary struct {
	TotalAssessed    int `json:"totalAssessed"`
	KeepCount        int `json:"keepCount"`
	KeepDismissed    int `json:"keepDismissedCount"`
	KeepFixed        int `json:"keepFixedCount"`
	DiscardCount     int `json:"discardCount"`
	ReviewCount      int `json:"reviewCount"`
	ChurnRiskCount   int `json:"churnRiskCount"`
	OverlapPairCount int `json:"overlapPairCount"`
}

type codeScanningAssessReport struct {
	Repository  string          `json:"repository"`
	GeneratedAt string          `json:"generatedAt"`
	InputReport string          `json:"inputReport,omitempty"`
	Alerts      []assessedAlert `json:"alerts"`
	Summary     assessSummary   `json:"summary"`
}

// ---------------------------------------------------------------------------
// assessAlerts — pure function, no I/O
// ---------------------------------------------------------------------------

// assessAlerts analyzes alerts for overlapping locations across different rules
// and produces recommendations. Alerts at the same file:line from different
// rules are flagged as potential duplicates. Dismissed and fixed alerts get
// stable recommendations so downstream consumers preserve lifecycle decisions.
func assessAlerts(alerts []alertEntry) []assessedAlert {
	// Build a location index: "path:line" -> list of alert indices
	type locKey struct {
		path string
		line int
	}
	locIndex := make(map[locKey][]int)
	for i, a := range alerts {
		k := locKey{path: a.Location.Path, line: a.Location.StartLine}
		locIndex[k] = append(locIndex[k], i)
	}

	result := make([]assessedAlert, len(alerts))

	for i, a := range alerts {
		assessed := assessedAlert{
			Number:           a.Number,
			State:            a.State,
			Rule:             a.Rule,
			Location:         a.Location,
			Message:          a.Message,
			Created:          a.Created,
			FixedAt:          a.FixedAt,
			DismissedReason:  a.DismissedReason,
			DismissedComment: a.DismissedComment,
			DismissedBy:      a.DismissedBy,
			DismissedAt:      a.DismissedAt,
		}

		// Determine recommendation based on current state
		switch a.State {
		case "dismissed":
			assessed.Recommendation = "keep-dismissed"
			assessed.RecommendReason = "already dismissed"
		case "fixed":
			assessed.Recommendation = "keep-fixed"
			assessed.RecommendReason = "already fixed"
		default:
			assessed.Recommendation = "keep"
		}

		// Find overlapping alerts at the same location from different rules
		k := locKey{path: a.Location.Path, line: a.Location.StartLine}
		peers := locIndex[k]
		if len(peers) > 1 {
			for _, j := range peers {
				if j == i {
					continue
				}
				peer := alerts[j]
				if peer.Rule.ID == a.Rule.ID {
					continue // same rule at same location is the same finding
				}
				assessed.OverlappingAlerts = append(assessed.OverlappingAlerts, peer.Number)

				// If an open alert overlaps with a dismissed alert, flag churn risk
				if a.State == "open" && peer.State == "dismissed" {
					assessed.ChurnRisk = fmt.Sprintf(
						"overlaps with dismissed alert #%d (rule %s, reason: %s) — may be semantically equivalent",
						peer.Number, peer.Rule.ID, ptrOr(peer.DismissedReason, "unknown"))
					assessed.Recommendation = "review"
					assessed.RecommendReason = fmt.Sprintf(
						"potential duplicate of dismissed alert #%d from rule %s",
						peer.Number, peer.Rule.ID)
				}

				// If both alerts are open, mark the higher-numbered one as discard
				if a.State == "open" && peer.State == "open" && assessed.Recommendation == "keep" {
					if a.Number > peer.Number {
						assessed.Recommendation = "discard"
						assessed.RecommendReason = fmt.Sprintf(
							"duplicate of canonical alert #%d from rule %s at same location",
							peer.Number, peer.Rule.ID)
					}
				}
			}
		}

		result[i] = assessed
	}

	return result
}

// buildAssessReport creates the assess report wrapper.
func buildAssessReport(baseReport codeScanningReport, assessed []assessedAlert) codeScanningAssessReport {
	summary := assessSummary{TotalAssessed: len(assessed)}
	overlapPairs := make(map[[2]int]bool)

	for _, a := range assessed {
		switch a.Recommendation {
		case "keep":
			summary.KeepCount++
		case "keep-dismissed":
			summary.KeepDismissed++
		case "keep-fixed":
			summary.KeepFixed++
		case "discard":
			summary.DiscardCount++
		case "review":
			summary.ReviewCount++
		}
		if a.ChurnRisk != "" {
			summary.ChurnRiskCount++
		}
		for _, peer := range a.OverlappingAlerts {
			low, high := a.Number, peer
			if low > high {
				low, high = high, low
			}
			overlapPairs[[2]int{low, high}] = true
		}
	}
	summary.OverlapPairCount = len(overlapPairs)

	return codeScanningAssessReport{
		Repository:  baseReport.Repository,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Alerts:      assessed,
		Summary:     summary,
	}
}

// ptrOr returns the value of a string pointer, or a fallback.
func ptrOr(s *string, fallback string) string {
	if s != nil {
		return *s
	}
	return fallback
}

// ---------------------------------------------------------------------------
// Cobra command
// ---------------------------------------------------------------------------

var assessCmd = &cobra.Command{
	Use:   "assess",
	Short: "Assess Code Scanning alerts for overlaps and churn risk",
	Long: `Analyze a Phase 1 report to detect overlapping alerts across different
rules at the same code locations, and flag potential alert churn where open
alerts may be semantically equivalent to already-dismissed alerts.

This is Phase 2 of the three-phase Code Scanning alert lifecycle workflow.
The output can be fed into 'code-scanning apply' (Phase 3).`,
	RunE: runAssess,
}

var assessFlags struct {
	input  string
	output string
}

func init() {
	codeScanningCmd.AddCommand(assessCmd)

	f := assessCmd.Flags()
	f.StringVar(&assessFlags.input, "input", "", "Path to Phase 1 report JSON (required)")
	f.StringVar(&assessFlags.output, "output", "", "Output file path (default: <owner>_<repo>.cs-assess.json)")

	_ = assessCmd.MarkFlagRequired("input")
}

func runAssess(cmd *cobra.Command, _ []string) error {
	// Load Phase 1 report
	data, err := os.ReadFile(assessFlags.input)
	if err != nil {
		return fmt.Errorf("read input report: %w", err)
	}

	var report codeScanningReport
	if err := json.Unmarshal(data, &report); err != nil {
		return fmt.Errorf("parse input report: %w", err)
	}

	fmt.Fprintf(cmd.ErrOrStderr(), "Assessing %d alerts from %s...\n", len(report.Alerts), report.Repository)

	// Run assessment
	assessed := assessAlerts(report.Alerts)
	assessReport := buildAssessReport(report, assessed)
	assessReport.InputReport = assessFlags.input

	// Count results
	var reviewCount int
	for _, a := range assessed {
		if a.Recommendation == "review" {
			reviewCount++
		}
	}

	fmt.Fprintf(cmd.ErrOrStderr(), "  %d alerts assessed\n", assessReport.Summary.TotalAssessed)
	fmt.Fprintf(cmd.ErrOrStderr(), "  %d overlap pairs detected\n", assessReport.Summary.OverlapPairCount)
	fmt.Fprintf(cmd.ErrOrStderr(), "  %d alerts flagged for churn risk review\n", assessReport.Summary.ChurnRiskCount)
	if reviewCount > 0 {
		fmt.Fprintf(cmd.ErrOrStderr(), "  %d alerts need manual review (potential duplicates of dismissed alerts)\n", reviewCount)
	}

	// Write output
	outPath := assessFlags.output
	if outPath == "" {
		// Derive from repository name: owner_repo.cs-assess.json
		repo := assessReport.Repository
		if o, r, err := parseRepo(repo); err == nil {
			outPath = fmt.Sprintf("%s_%s.cs-assess.json", o, r)
		} else {
			outPath = "cs-assess.json"
		}
	}

	outData, err := json.MarshalIndent(assessReport, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal assess report: %w", err)
	}

	if err := os.WriteFile(outPath, outData, 0o600); err != nil {
		return fmt.Errorf("write assess report: %w", err)
	}

	fmt.Fprintf(cmd.ErrOrStderr(), "\nAssess report written to %s\n", outPath)

	if OutputFormat() == "json" {
		fmt.Fprintln(cmd.OutOrStdout(), string(outData))
	}

	return nil
}
