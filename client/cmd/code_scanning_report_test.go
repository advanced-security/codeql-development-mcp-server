package cmd

import (
	"encoding/json"
	"testing"
)

func TestBuildReport_GroupsAlertsByRule(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "js/sql-injection", Name: "SQL injection", Severity: "8.8"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
		{Number: 2, State: "open", Rule: ruleEntry{ID: "js/sql-injection", Name: "SQL injection", Severity: "8.8"}, Location: locationEntry{Path: "src/api.js", StartLine: 15}},
		{Number: 3, State: "open", Rule: ruleEntry{ID: "js/xss", Name: "XSS", Severity: "6.1"}, Location: locationEntry{Path: "src/views.js", StartLine: 30}},
	}

	report := buildReport("owner/repo", nil, alerts)

	if report.Repository != "owner/repo" {
		t.Errorf("repository = %q, want owner/repo", report.Repository)
	}
	if report.Summary.TotalAlerts != 3 {
		t.Errorf("totalAlerts = %d, want 3", report.Summary.TotalAlerts)
	}
	if report.Summary.ByState["open"] != 3 {
		t.Errorf("byState[open] = %d, want 3", report.Summary.ByState["open"])
	}
	if len(report.Summary.ByRule) != 2 {
		t.Fatalf("byRule length = %d, want 2", len(report.Summary.ByRule))
	}

	// Rules should be sorted by alert count descending
	if report.Summary.ByRule[0].RuleID != "js/sql-injection" {
		t.Errorf("first rule = %q, want js/sql-injection", report.Summary.ByRule[0].RuleID)
	}
	if report.Summary.ByRule[0].AlertCount != 2 {
		t.Errorf("first rule alertCount = %d, want 2", report.Summary.ByRule[0].AlertCount)
	}
}

func TestBuildReport_CountsByState(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1"}, Location: locationEntry{Path: "a.js", StartLine: 1}},
		{Number: 2, State: "dismissed", Rule: ruleEntry{ID: "r1"}, Location: locationEntry{Path: "b.js", StartLine: 2},
			DismissedReason: strPtr("won't fix"), DismissedBy: strPtr("alice")},
		{Number: 3, State: "fixed", Rule: ruleEntry{ID: "r1"}, Location: locationEntry{Path: "c.js", StartLine: 3}},
		{Number: 4, State: "open", Rule: ruleEntry{ID: "r2"}, Location: locationEntry{Path: "d.js", StartLine: 4}},
	}

	report := buildReport("test/repo", nil, alerts)

	if report.Summary.ByState["open"] != 2 {
		t.Errorf("byState[open] = %d, want 2", report.Summary.ByState["open"])
	}
	if report.Summary.ByState["dismissed"] != 1 {
		t.Errorf("byState[dismissed] = %d, want 1", report.Summary.ByState["dismissed"])
	}
	if report.Summary.ByState["fixed"] != 1 {
		t.Errorf("byState[fixed] = %d, want 1", report.Summary.ByState["fixed"])
	}
}

func TestBuildReport_EmptyAlerts(t *testing.T) {
	report := buildReport("empty/repo", nil, nil)

	if report.Summary.TotalAlerts != 0 {
		t.Errorf("totalAlerts = %d, want 0", report.Summary.TotalAlerts)
	}
	if len(report.Summary.ByRule) != 0 {
		t.Errorf("byRule length = %d, want 0", len(report.Summary.ByRule))
	}
}

func TestBuildReport_JSONRoundTrip(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "js/sql-injection", Name: "SQL injection", Severity: "8.8"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
	}
	report := buildReport("test/repo", nil, alerts)

	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded codeScanningReport
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Repository != "test/repo" {
		t.Errorf("decoded.repository = %q, want test/repo", decoded.Repository)
	}
	if decoded.Summary.TotalAlerts != 1 {
		t.Errorf("decoded.totalAlerts = %d, want 1", decoded.Summary.TotalAlerts)
	}
}

func TestBuildReport_BySeverity(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1", Severity: "8.8"}, Location: locationEntry{Path: "a.js", StartLine: 1}},
		{Number: 2, State: "open", Rule: ruleEntry{ID: "r2", Severity: "6.1"}, Location: locationEntry{Path: "b.js", StartLine: 2}},
		{Number: 3, State: "open", Rule: ruleEntry{ID: "r3", Severity: "8.8"}, Location: locationEntry{Path: "c.js", StartLine: 3}},
	}

	report := buildReport("test/repo", nil, alerts)

	if report.Summary.BySeverity["8.8"] != 2 {
		t.Errorf("bySeverity[8.8] = %d, want 2", report.Summary.BySeverity["8.8"])
	}
	if report.Summary.BySeverity["6.1"] != 1 {
		t.Errorf("bySeverity[6.1] = %d, want 1", report.Summary.BySeverity["6.1"])
	}
}

func TestBuildReport_PreservesDismissalMetadata(t *testing.T) {
	alerts := []alertEntry{
		{
			Number:           10,
			State:            "dismissed",
			Rule:             ruleEntry{ID: "js/sql-injection", Name: "SQL injection", Severity: "8.8"},
			Location:         locationEntry{Path: "src/db.js", StartLine: 42},
			DismissedReason:  strPtr("false positive"),
			DismissedComment: strPtr("Not exploitable in this context"),
			DismissedBy:      strPtr("securitybot"),
			DismissedAt:      strPtr("2025-01-15T10:30:00Z"),
		},
		{
			Number:          11,
			State:           "dismissed",
			Rule:            ruleEntry{ID: "js/xss", Name: "XSS", Severity: "6.1"},
			Location:        locationEntry{Path: "src/views.js", StartLine: 30},
			DismissedReason: strPtr("won't fix"),
			DismissedBy:     strPtr("dev-lead"),
		},
	}

	report := buildReport("test/repo", nil, alerts)

	// Verify dismissal metadata survives the report
	found := false
	for _, a := range report.Alerts {
		if a.Number == 10 {
			found = true
			if a.DismissedReason == nil || *a.DismissedReason != "false positive" {
				t.Error("expected dismissedReason = 'false positive'")
			}
			if a.DismissedComment == nil || *a.DismissedComment != "Not exploitable in this context" {
				t.Error("expected dismissedComment preserved")
			}
			if a.DismissedBy == nil || *a.DismissedBy != "securitybot" {
				t.Error("expected dismissedBy = 'securitybot'")
			}
			if a.DismissedAt == nil || *a.DismissedAt != "2025-01-15T10:30:00Z" {
				t.Error("expected dismissedAt preserved")
			}
		}
	}
	if !found {
		t.Error("dismissed alert #10 not found in report")
	}
}

func TestBuildReport_RuleSummaryByState(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "a.js", StartLine: 1}},
		{Number: 2, State: "dismissed", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "b.js", StartLine: 2}},
		{Number: 3, State: "fixed", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "c.js", StartLine: 3}},
		{Number: 4, State: "open", Rule: ruleEntry{ID: "js/xss"}, Location: locationEntry{Path: "d.js", StartLine: 4}},
	}

	report := buildReport("test/repo", nil, alerts)

	// Find js/sql-injection rule summary
	var sqlRule *ruleSummary
	for i := range report.Summary.ByRule {
		if report.Summary.ByRule[i].RuleID == "js/sql-injection" {
			sqlRule = &report.Summary.ByRule[i]
			break
		}
	}
	if sqlRule == nil {
		t.Fatal("js/sql-injection rule not found in summary")
	}

	if sqlRule.AlertCount != 3 {
		t.Errorf("sql-injection alertCount = %d, want 3", sqlRule.AlertCount)
	}
	if sqlRule.OpenCount != 1 {
		t.Errorf("sql-injection openCount = %d, want 1", sqlRule.OpenCount)
	}
	if sqlRule.DismissedCount != 1 {
		t.Errorf("sql-injection dismissedCount = %d, want 1", sqlRule.DismissedCount)
	}
	if sqlRule.FixedCount != 1 {
		t.Errorf("sql-injection fixedCount = %d, want 1", sqlRule.FixedCount)
	}
}

func TestBuildReport_JSONRoundTripWithDismissal(t *testing.T) {
	alerts := []alertEntry{
		{
			Number:          5,
			State:           "dismissed",
			Rule:            ruleEntry{ID: "r1", Name: "Rule One"},
			Location:        locationEntry{Path: "x.js", StartLine: 10},
			DismissedReason: strPtr("false positive"),
			DismissedBy:     strPtr("user1"),
		},
	}
	report := buildReport("test/repo", nil, alerts)

	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded codeScanningReport
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(decoded.Alerts) != 1 {
		t.Fatalf("decoded alerts = %d, want 1", len(decoded.Alerts))
	}
	a := decoded.Alerts[0]
	if a.DismissedReason == nil || *a.DismissedReason != "false positive" {
		t.Error("dismissedReason lost in JSON roundtrip")
	}
	if a.DismissedBy == nil || *a.DismissedBy != "user1" {
		t.Error("dismissedBy lost in JSON roundtrip")
	}
}

// strPtr returns a pointer to s.
func strPtr(s string) *string {
	return &s
}
