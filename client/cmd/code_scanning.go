package cmd

import "github.com/spf13/cobra"

var codeScanningCmd = &cobra.Command{
	Use:     "code-scanning",
	Aliases: []string{"cs"},
	Short:   "Manage Code Scanning analyses and alerts",
	Long:    "Commands for listing, downloading, dismissing, and reopening Code Scanning analyses and alerts via the GitHub REST API.",
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

func init() {
	rootCmd.AddCommand(codeScanningCmd)
}
