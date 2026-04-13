package cmd

import (
	"encoding/json"
	"testing"
)

func TestBuildApplyPlan_DryRunNoChanges(t *testing.T) {
	assessed := []assessedAlert{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1"}, Recommendation: "keep"},
		{Number: 2, State: "dismissed", Rule: ruleEntry{ID: "r2"}, Recommendation: "keep-dismissed"},
	}

	plan := buildApplyPlan(assessed, applyOptions{dryRun: true})

	if len(plan.Actions) != 0 {
		t.Errorf("expected 0 actions for all-keep plan, got %d", len(plan.Actions))
	}
	if plan.Summary.TotalAlerts != 2 {
		t.Errorf("totalAlerts = %d, want 2", plan.Summary.TotalAlerts)
	}
	if plan.Summary.NoChangeCount != 2 {
		t.Errorf("noChangeCount = %d, want 2", plan.Summary.NoChangeCount)
	}
}

func TestBuildApplyPlan_DiscardCreatesDismissAction(t *testing.T) {
	assessed := []assessedAlert{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1"}, Recommendation: "discard",
			RecommendReason: "duplicate of #2"},
	}

	plan := buildApplyPlan(assessed, applyOptions{dryRun: true})

	if len(plan.Actions) != 1 {
		t.Fatalf("expected 1 action, got %d", len(plan.Actions))
	}
	if plan.Actions[0].AlertNumber != 1 {
		t.Errorf("action alert = %d, want 1", plan.Actions[0].AlertNumber)
	}
	if plan.Actions[0].Action != "dismiss" {
		t.Errorf("action = %q, want dismiss", plan.Actions[0].Action)
	}
	if plan.Summary.DismissCount != 1 {
		t.Errorf("dismissCount = %d, want 1", plan.Summary.DismissCount)
	}
}

func TestBuildApplyPlan_AcceptAllChanges(t *testing.T) {
	assessed := []assessedAlert{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1"}, Recommendation: "discard"},
		{Number: 2, State: "open", Rule: ruleEntry{ID: "r2"}, Recommendation: "review",
			RecommendReason: "potential duplicate"},
	}

	plan := buildApplyPlan(assessed, applyOptions{
		dryRun:           true,
		acceptAllChanges: true,
	})

	// Both discard and review should produce dismiss actions when acceptAllChanges
	if len(plan.Actions) != 2 {
		t.Fatalf("expected 2 actions with acceptAllChanges, got %d", len(plan.Actions))
	}
	for _, a := range plan.Actions {
		if a.Action != "dismiss" {
			t.Errorf("action = %q, want dismiss", a.Action)
		}
		if !a.Authorized {
			t.Error("expected actions to be authorized with acceptAllChanges")
		}
	}
}

func TestBuildApplyPlan_AcceptForRule(t *testing.T) {
	assessed := []assessedAlert{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "js/sql-injection"}, Recommendation: "discard"},
		{Number: 2, State: "open", Rule: ruleEntry{ID: "js/xss"}, Recommendation: "discard"},
	}

	plan := buildApplyPlan(assessed, applyOptions{
		dryRun:               true,
		acceptChangeForRules: []string{"js/sql-injection"},
	})

	if len(plan.Actions) != 2 {
		t.Fatalf("expected 2 actions, got %d", len(plan.Actions))
	}

	for _, a := range plan.Actions {
		if a.AlertNumber == 1 && !a.Authorized {
			t.Error("alert #1 (js/sql-injection) should be authorized")
		}
		if a.AlertNumber == 2 && a.Authorized {
			t.Error("alert #2 (js/xss) should NOT be authorized")
		}
	}
}

func TestBuildApplyPlan_DismissReasonAndComment(t *testing.T) {
	assessed := []assessedAlert{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1"}, Recommendation: "discard",
			RecommendReason: "duplicate of #2"},
	}

	plan := buildApplyPlan(assessed, applyOptions{
		dryRun:         true,
		dismissReason:  "won't fix",
		dismissComment: "automated by ql-mcp-client assess",
	})

	if plan.Actions[0].DismissReason != "won't fix" {
		t.Errorf("dismissReason = %q, want won't fix", plan.Actions[0].DismissReason)
	}
	if plan.Actions[0].DismissComment != "automated by ql-mcp-client assess" {
		t.Errorf("dismissComment = %q", plan.Actions[0].DismissComment)
	}
}

func TestBuildApplyPlan_JSONRoundTrip(t *testing.T) {
	assessed := []assessedAlert{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1"}, Recommendation: "discard"},
	}
	plan := buildApplyPlan(assessed, applyOptions{dryRun: true, dismissReason: "won't fix"})

	data, err := json.MarshalIndent(plan, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded applyPlan
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(decoded.Actions) != 1 {
		t.Fatalf("decoded actions = %d, want 1", len(decoded.Actions))
	}
}

func TestBuildApplyPlan_ReviewWithoutAcceptIsNotAuthorized(t *testing.T) {
	assessed := []assessedAlert{
		{Number: 1, State: "open", Rule: ruleEntry{ID: "r1"}, Recommendation: "review"},
	}

	plan := buildApplyPlan(assessed, applyOptions{dryRun: true})

	if len(plan.Actions) != 1 {
		t.Fatalf("expected 1 action, got %d", len(plan.Actions))
	}
	if plan.Actions[0].Authorized {
		t.Error("review actions should not be auto-authorized")
	}
	if plan.Actions[0].Action != "dismiss" {
		t.Errorf("action = %q, want dismiss", plan.Actions[0].Action)
	}
}
