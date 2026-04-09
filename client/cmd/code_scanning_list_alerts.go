package cmd

import (
	"encoding/json"
	"fmt"
	"text/tabwriter"

	gh "github.com/advanced-security/codeql-development-mcp-server/client/internal/github"
	"github.com/spf13/cobra"
)

var listAlertsCmd = &cobra.Command{
	Use:   "list-alerts",
	Short: "List Code Scanning alerts for a repository",
	RunE:  runListAlerts,
}

var listAlertsFlags struct {
	repo      string
	ref       string
	state     string
	severity  string
	toolName  string
	sort      string
	direction string
	perPage   int
}

func init() {
	codeScanningCmd.AddCommand(listAlertsCmd)

	f := listAlertsCmd.Flags()
	f.StringVar(&listAlertsFlags.repo, "repo", "", "Repository in owner/repo format (required)")
	f.StringVar(&listAlertsFlags.ref, "ref", "", "Git ref to filter by")
	f.StringVar(&listAlertsFlags.state, "state", "", "Alert state: open, closed, dismissed, fixed")
	f.StringVar(&listAlertsFlags.severity, "severity", "", "Severity: critical, high, medium, low, warning, note, error")
	f.StringVar(&listAlertsFlags.toolName, "tool-name", "", "Tool name to filter by")
	f.StringVar(&listAlertsFlags.sort, "sort", "", "Sort by (created, updated)")
	f.StringVar(&listAlertsFlags.direction, "direction", "", "Sort direction (asc, desc)")
	f.IntVar(&listAlertsFlags.perPage, "per-page", 30, "Results per page (max 100)")

	_ = listAlertsCmd.MarkFlagRequired("repo")
}

func runListAlerts(cmd *cobra.Command, _ []string) error {
	owner, repo, err := parseRepo(listAlertsFlags.repo)
	if err != nil {
		return err
	}

	client, err := gh.NewClient()
	if err != nil {
		return err
	}

	alerts, err := client.ListAlerts(gh.ListAlertsOptions{
		Owner:     owner,
		Repo:      repo,
		Ref:       listAlertsFlags.ref,
		State:     listAlertsFlags.state,
		Severity:  listAlertsFlags.severity,
		ToolName:  listAlertsFlags.toolName,
		Sort:      listAlertsFlags.sort,
		Direction: listAlertsFlags.direction,
		PerPage:   listAlertsFlags.perPage,
	})
	if err != nil {
		return err
	}

	if OutputFormat() == "json" {
		enc := json.NewEncoder(cmd.OutOrStdout())
		enc.SetIndent("", "  ")
		return enc.Encode(alerts)
	}

	w := tabwriter.NewWriter(cmd.OutOrStdout(), 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "NUM\tSTATE\tRULE\tSEVERITY\tFILE:LINE\tCREATED")
	for _, a := range alerts {
		loc := a.MostRecentInstance.Location
		locStr := fmt.Sprintf("%s:%d", loc.Path, loc.StartLine)
		fmt.Fprintf(w, "%d\t%s\t%s\t%s\t%s\t%s\n",
			a.Number, a.State, a.Rule.ID, a.Rule.Severity, locStr, a.CreatedAt)
	}
	return w.Flush()
}
