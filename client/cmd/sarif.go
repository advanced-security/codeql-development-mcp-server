package cmd

import "github.com/spf13/cobra"

var sarifCmd = &cobra.Command{
	Use:   "sarif",
	Short: "SARIF analysis and alert comparison tools",
	Long:  "Commands for comparing, deduplicating, and validating SARIF alerts using MCP server tools and LLM-driven analysis.",
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

func init() {
	rootCmd.AddCommand(sarifCmd)
}
