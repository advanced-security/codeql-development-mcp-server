# `codeql_database_analyze` - analyze_with_output_subdir

## Purpose

Tests the `codeql_database_analyze` tool with an `output` path whose parent
directory does not exist. Before the fix, the CodeQL CLI would fail with
`NoSuchFileException` after completing all query evaluations — wasting minutes
of compute time only to fail at the final SARIF export step.

Also exercises the `rerun` parameter to force fresh evaluation.

## Inputs

- Test database at `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj`
- Single query at `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- Output path `{{tmpdir}}/analyze-subdir-test/results.sarif` (nested non-existent directory)

## Expected Behavior

- The parent directory `{{tmpdir}}/analyze-subdir-test/` is auto-created
- The analysis completes successfully with SARIF output written
