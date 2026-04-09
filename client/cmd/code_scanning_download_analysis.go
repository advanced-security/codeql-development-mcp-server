package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	gh "github.com/advanced-security/codeql-development-mcp-server/client/internal/github"
	"github.com/spf13/cobra"
)

var downloadAnalysisCmd = &cobra.Command{
	Use:   "download-analysis",
	Short: "Download a Code Scanning analysis as SARIF",
	RunE:  runDownloadAnalysis,
}

var downloadAnalysisFlags struct {
	repo       string
	analysisID int
	output     string
}

func init() {
	codeScanningCmd.AddCommand(downloadAnalysisCmd)

	f := downloadAnalysisCmd.Flags()
	f.StringVar(&downloadAnalysisFlags.repo, "repo", "", "Repository in owner/repo format (required)")
	f.IntVar(&downloadAnalysisFlags.analysisID, "analysis-id", 0, "Analysis ID to download (required)")
	f.StringVar(&downloadAnalysisFlags.output, "output", "", "Output file path (default: sarif-downloads/<repo>/<id>.sarif)")

	_ = downloadAnalysisCmd.MarkFlagRequired("repo")
	_ = downloadAnalysisCmd.MarkFlagRequired("analysis-id")
}

func runDownloadAnalysis(cmd *cobra.Command, _ []string) error {
	owner, repo, err := parseRepo(downloadAnalysisFlags.repo)
	if err != nil {
		return err
	}

	client, err := gh.NewClient()
	if err != nil {
		return err
	}

	sarif, err := client.GetAnalysisSARIF(owner, repo, downloadAnalysisFlags.analysisID)
	if err != nil {
		return err
	}

	// Determine output path
	outPath := downloadAnalysisFlags.output
	if outPath == "" {
		outPath = filepath.Join("sarif-downloads", fmt.Sprintf("%s_%s", owner, repo),
			fmt.Sprintf("%d.sarif", downloadAnalysisFlags.analysisID))
	}

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(outPath), 0o750); err != nil {
		return fmt.Errorf("create output directory: %w", err)
	}

	// Pretty-print the JSON
	var pretty json.RawMessage
	if err := json.Unmarshal(sarif, &pretty); err != nil {
		// If not valid JSON, write as-is
		if writeErr := os.WriteFile(outPath, sarif, 0o600); writeErr != nil {
			return fmt.Errorf("write SARIF file: %w", writeErr)
		}
	} else {
		formatted, _ := json.MarshalIndent(pretty, "", "  ")
		if err := os.WriteFile(outPath, formatted, 0o600); err != nil {
			return fmt.Errorf("write SARIF file: %w", err)
		}
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Downloaded SARIF to %s (%d bytes)\n", outPath, len(sarif))
	return nil
}
