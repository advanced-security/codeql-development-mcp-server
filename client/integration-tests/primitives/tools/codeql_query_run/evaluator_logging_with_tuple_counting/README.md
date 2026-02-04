# Integration Test : `codeql_query_run/evaluator_logging_with_tuple_counting`

## PURPOSE

This test validates that evaluator logging parameters are accepted and processed correctly.

## INPUTS

This following static files are used as inputs for this test:

- `./test-config.json`: Configuration file specifying the parameters for the test.
- `../../../../static/javascript/src/ExampleQuery1/ExampleQuery1.ql`: A simple, example CodeQL query to be run by the MCP server tool under test.

## OUTPUTS

Integration testing of the `codeql_query_run` MCP server tool will generate files to the absolute paths specified in the `test-config.json` file.
