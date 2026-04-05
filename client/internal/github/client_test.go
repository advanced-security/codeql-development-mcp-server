package github

import (
	"encoding/json"
	"testing"
)

func TestAnalysis_JSONRoundTrip(t *testing.T) {
	input := `{
		"id": 201,
		"ref": "refs/heads/main",
		"commit_sha": "d99612c3e1f2970085cfbaeadf8f010ef69bad83",
		"analysis_key": ".github/workflows/codeql-analysis.yml:analyze",
		"environment": "{\"language\":\"python\"}",
		"error": "",
		"category": ".github/workflows/codeql-analysis.yml:analyze/language:python",
		"created_at": "2020-08-27T15:05:21Z",
		"results_count": 17,
		"rules_count": 49,
		"sarif_id": "6c81cd8e-b078-4ac3-a3be-1dad7dbd0b53",
		"url": "https://api.github.com/repos/octocat/hello-world/code-scanning/analyses/201",
		"deletable": true,
		"warning": "",
		"tool": {
			"name": "CodeQL",
			"guid": null,
			"version": "2.4.0"
		}
	}`

	var analysis Analysis
	if err := json.Unmarshal([]byte(input), &analysis); err != nil {
		t.Fatalf("failed to unmarshal analysis: %v", err)
	}

	if analysis.ID != 201 {
		t.Errorf("ID = %d, want 201", analysis.ID)
	}
	if analysis.Ref != "refs/heads/main" {
		t.Errorf("Ref = %q, want %q", analysis.Ref, "refs/heads/main")
	}
	if analysis.ResultsCount != 17 {
		t.Errorf("ResultsCount = %d, want 17", analysis.ResultsCount)
	}
	if analysis.Tool.Name != "CodeQL" {
		t.Errorf("Tool.Name = %q, want %q", analysis.Tool.Name, "CodeQL")
	}
	if analysis.Tool.Version != "2.4.0" {
		t.Errorf("Tool.Version = %q, want %q", analysis.Tool.Version, "2.4.0")
	}
	if !analysis.Deletable {
		t.Error("Deletable should be true")
	}
}

func TestAlert_JSONRoundTrip(t *testing.T) {
	input := `{
		"number": 42,
		"created_at": "2020-06-19T11:21:34Z",
		"url": "https://api.github.com/repos/octocat/hello-world/code-scanning/alerts/42",
		"html_url": "https://github.com/octocat/hello-world/code-scanning/42",
		"state": "dismissed",
		"fixed_at": null,
		"dismissed_by": {
			"login": "octocat",
			"id": 1
		},
		"dismissed_at": "2020-02-14T12:29:18Z",
		"dismissed_reason": "false positive",
		"dismissed_comment": "This alert is not actually correct.",
		"rule": {
			"id": "js/zipslip",
			"severity": "error",
			"security_severity_level": "high",
			"description": "Arbitrary file write during zip extraction",
			"name": "js/zipslip",
			"tags": ["security", "external/cwe/cwe-022"]
		},
		"tool": {
			"name": "CodeQL",
			"guid": null,
			"version": "2.4.0"
		},
		"most_recent_instance": {
			"ref": "refs/heads/main",
			"analysis_key": ".github/workflows/codeql-analysis.yml:CodeQL-Build",
			"environment": "{}",
			"category": ".github/workflows/codeql-analysis.yml:CodeQL-Build",
			"state": "dismissed",
			"commit_sha": "39406e42cb832f683daa691dd652a8dc36ee8930",
			"message": {"text": "This path depends on a user-provided value."},
			"location": {
				"path": "spec-main/api-session-spec.ts",
				"start_line": 917,
				"end_line": 917,
				"start_column": 7,
				"end_column": 18
			},
			"classifications": ["test"]
		},
		"instances_url": "https://api.github.com/repos/octocat/hello-world/code-scanning/alerts/42/instances"
	}`

	var alert Alert
	if err := json.Unmarshal([]byte(input), &alert); err != nil {
		t.Fatalf("failed to unmarshal alert: %v", err)
	}

	if alert.Number != 42 {
		t.Errorf("Number = %d, want 42", alert.Number)
	}
	if alert.State != "dismissed" {
		t.Errorf("State = %q, want %q", alert.State, "dismissed")
	}
	if alert.DismissedBy == nil || alert.DismissedBy.Login != "octocat" {
		t.Error("DismissedBy should be octocat")
	}
	if alert.DismissedReason == nil || *alert.DismissedReason != "false positive" {
		t.Error("DismissedReason should be 'false positive'")
	}
	if alert.Rule.ID != "js/zipslip" {
		t.Errorf("Rule.ID = %q, want %q", alert.Rule.ID, "js/zipslip")
	}
	if alert.Rule.SecuritySeverityLevel != "high" {
		t.Errorf("Rule.SecuritySeverityLevel = %q, want %q", alert.Rule.SecuritySeverityLevel, "high")
	}
	if len(alert.Rule.Tags) != 2 {
		t.Errorf("Rule.Tags length = %d, want 2", len(alert.Rule.Tags))
	}
	if alert.MostRecentInstance.Location.StartLine != 917 {
		t.Errorf("Location.StartLine = %d, want 917", alert.MostRecentInstance.Location.StartLine)
	}
	if len(alert.MostRecentInstance.Classifications) != 1 || alert.MostRecentInstance.Classifications[0] != "test" {
		t.Errorf("Classifications = %v, want [test]", alert.MostRecentInstance.Classifications)
	}
}

func TestBuildQuery(t *testing.T) {
	tests := []struct {
		name   string
		params map[string]string
		want   string
	}{
		{
			name:   "empty",
			params: map[string]string{},
			want:   "",
		},
		{
			name:   "skips empty values",
			params: map[string]string{"state": "open", "ref": "", "severity": ""},
			want:   "state=open",
		},
		{
			name:   "skips zero values",
			params: map[string]string{"page": "0", "per_page": "30"},
			want:   "per_page=30",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildQuery(tt.params)
			if got != tt.want {
				t.Errorf("buildQuery(%v) = %q, want %q", tt.params, got, tt.want)
			}
		})
	}
}

func TestIntToStr(t *testing.T) {
	if intToStr(0) != "" {
		t.Errorf("intToStr(0) = %q, want empty", intToStr(0))
	}
	if intToStr(42) != "42" {
		t.Errorf("intToStr(42) = %q, want %q", intToStr(42), "42")
	}
}
