package cmd

import (
	"encoding/json"
	"fmt"
	"text/tabwriter"

	gh "github.com/advanced-security/codeql-development-mcp-server/client/internal/github"
	"github.com/spf13/cobra"
)

var listAnalysesCmd = &cobra.Command{
	Use:   "list-analyses",
	Short: "List Code Scanning analyses for a repository",
	RunE:  runListAnalyses,
}

var listAnalysesFlags struct {
	repo      string
	ref       string
	toolName  string
	sarifID   string
	sort      string
	direction string
	perPage   int
}

func init() {
	codeScanningCmd.AddCommand(listAnalysesCmd)

	f := listAnalysesCmd.Flags()
	f.StringVar(&listAnalysesFlags.repo, "repo", "", "Repository in owner/repo format (required)")
	f.StringVar(&listAnalysesFlags.ref, "ref", "", "Git ref to filter by")
	f.StringVar(&listAnalysesFlags.toolName, "tool-name", "", "Tool name to filter by (e.g. CodeQL)")
	f.StringVar(&listAnalysesFlags.sarifID, "sarif-id", "", "SARIF ID to filter by")
	f.StringVar(&listAnalysesFlags.sort, "sort", "", "Sort by (created)")
	f.StringVar(&listAnalysesFlags.direction, "direction", "", "Sort direction (asc, desc)")
	f.IntVar(&listAnalysesFlags.perPage, "per-page", 30, "Results per page (max 100)")

	_ = listAnalysesCmd.MarkFlagRequired("repo")
}

func runListAnalyses(cmd *cobra.Command, _ []string) error {
	owner, repo, err := parseRepo(listAnalysesFlags.repo)
	if err != nil {
		return err
	}

	client, err := gh.NewClient()
	if err != nil {
		return err
	}

	analyses, err := client.ListAnalyses(gh.ListAnalysesOptions{
		Owner:     owner,
		Repo:      repo,
		Ref:       listAnalysesFlags.ref,
		ToolName:  listAnalysesFlags.toolName,
		SarifID:   listAnalysesFlags.sarifID,
		Sort:      listAnalysesFlags.sort,
		Direction: listAnalysesFlags.direction,
		PerPage:   listAnalysesFlags.perPage,
	})
	if err != nil {
		return err
	}

	if OutputFormat() == "json" {
		enc := json.NewEncoder(cmd.OutOrStdout())
		enc.SetIndent("", "  ")
		return enc.Encode(analyses)
	}

	w := tabwriter.NewWriter(cmd.OutOrStdout(), 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tTOOL\tREF\tCATEGORY\tRESULTS\tRULES\tCREATED")
	for _, a := range analyses {
		fmt.Fprintf(w, "%d\t%s\t%s\t%s\t%d\t%d\t%s\n",
			a.ID, a.Tool.Name, a.Ref, a.Category, a.ResultsCount, a.RulesCount, a.CreatedAt)
	}
	return w.Flush()
}
