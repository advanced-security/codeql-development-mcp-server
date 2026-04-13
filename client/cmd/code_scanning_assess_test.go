package cmd

import (
	"encoding/json"
	"testing"
)

func TestAssessAlerts_IdentifiesDuplicatesByLocation(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
		{Number: 2, State: "open", Rule: ruleEntry{ID: "js/sql-injection-v2"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
		{Number: 3, State: "open", Rule: ruleEntry{ID: "js/xss"}, Location: locationEntry{Path: "src/views.js", StartLine: 30}},
	}

	assessed := assessAlerts(alerts)

	// Alerts 1 and 2 share the same location — one should flag the other
	var overlaps []assessedAlert
	for _, a := range assessed {
		if len(a.OverlappingAlerts) > 0 {
			overlaps = append(overlaps, a)
		}
	}
	if len(overlaps) < 1 {
		t.Error("expected at least one alert with overlapping alerts detected")
	}
}

func TestAssessAlerts_PreservesExistingDismissals(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "dismissed", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "src/db.js", StartLine: 42},
			DismissedReason: strPtr("false positive"), DismissedBy: strPtr("alice")},
		{Number: 2, State: "open", Rule: ruleEntry{ID: "js/sql-injection-v2"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
	}

	assessed := assessAlerts(alerts)

	// Alert 1 is already dismissed — recommendation should be "keep-dismissed"
	for _, a := range assessed {
		if a.Number == 1 {
			if a.Recommendation != "keep-dismissed" {
				t.Errorf("alert #1 recommendation = %q, want keep-dismissed", a.Recommendation)
			}
		}
	}

	// Alert 2 is open but overlaps with a dismissed alert — should flag churn risk
	for _, a := range assessed {
		if a.Number == 2 {
			if a.ChurnRisk == "" {
				t.Error("alert #2 should have churn risk flagged due to overlap with dismissed alert")
			}
		}
	}
}

func TestAssessAlerts_NoOverlapsAllKeep(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
		{Number: 2, State: "open", Rule: ruleEntry{ID: "js/xss"}, Location: locationEntry{Path: "src/views.js", StartLine: 30}},
	}

	assessed := assessAlerts(alerts)

	for _, a := range assessed {
		if a.Recommendation != "keep" {
			t.Errorf("alert #%d recommendation = %q, want keep", a.Number, a.Recommendation)
		}
	}
}

func TestAssessAlerts_FixedAlertsPreserved(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "fixed", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
	}

	assessed := assessAlerts(alerts)

	if len(assessed) != 1 {
		t.Fatalf("expected 1 assessed alert, got %d", len(assessed))
	}
	if assessed[0].Recommendation != "keep-fixed" {
		t.Errorf("recommendation = %q, want keep-fixed", assessed[0].Recommendation)
	}
}

func TestAssessAlerts_JSONRoundTrip(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1"}, Location: locationEntry{Path: "a.js", StartLine: 1}},
	}
	assessed := assessAlerts(alerts)

	data, err := json.MarshalIndent(assessed, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded []assessedAlert
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(decoded) != 1 {
		t.Fatalf("decoded length = %d, want 1", len(decoded))
	}
	if decoded[0].Recommendation != "keep" {
		t.Errorf("decoded recommendation = %q, want keep", decoded[0].Recommendation)
	}
}

func TestBuildAssessReport_Summary(t *testing.T) {
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
		{Number: 2, State: "open", Rule: ruleEntry{ID: "js/sql-injection-v2"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
		{Number: 3, State: "dismissed", Rule: ruleEntry{ID: "js/xss"}, Location: locationEntry{Path: "src/views.js", StartLine: 30},
			DismissedReason: strPtr("false positive")},
	}

	report := buildReport("test/repo", nil, alerts)
	assessed := assessAlerts(alerts)
	assessReport := buildAssessReport(report, assessed)

	if assessReport.Repository != "test/repo" {
		t.Errorf("repository = %q, want test/repo", assessReport.Repository)
	}
	if assessReport.Summary.TotalAssessed != 3 {
		t.Errorf("totalAssessed = %d, want 3", assessReport.Summary.TotalAssessed)
	}
	if assessReport.Summary.KeepCount < 1 {
		t.Error("expected at least 1 keep recommendation")
	}
}

func TestBuildAssessReport_ReviewCountSeparateFromKeep(t *testing.T) {
	// Alert 1 is open with an overlap to a dismissed alert -> "review"
	// Alert 2 is dismissed -> "keep-dismissed"
	// Alert 3 is open, no overlaps -> "keep"
	alerts := []alertEntry{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "js/sql-injection-v2"}, Location: locationEntry{Path: "src/db.js", StartLine: 42}},
		{Number: 2, State: "dismissed", Rule: ruleEntry{ID: "js/sql-injection"}, Location: locationEntry{Path: "src/db.js", StartLine: 42},
			DismissedReason: strPtr("false positive")},
		{Number: 3, State: "open", Rule: ruleEntry{ID: "js/xss"}, Location: locationEntry{Path: "src/views.js", StartLine: 30}},
	}

	report := buildReport("test/repo", nil, alerts)
	assessed := assessAlerts(alerts)
	assessReport := buildAssessReport(report, assessed)

	if assessReport.Summary.ReviewCount != 1 {
		t.Errorf("reviewCount = %d, want 1", assessReport.Summary.ReviewCount)
	}
	if assessReport.Summary.KeepCount != 1 {
		t.Errorf("keepCount = %d, want 1 (only pure keep, not review)", assessReport.Summary.KeepCount)
	}
	if assessReport.Summary.KeepDismissed != 1 {
		t.Errorf("keepDismissedCount = %d, want 1", assessReport.Summary.KeepDismissed)
	}
}
