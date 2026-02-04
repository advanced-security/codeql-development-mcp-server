/**
 * @id javascript/integration-tests/codeql-test-extract/example-query-1
 * @name ExampleQuery1
 * @description Example query for integration testing of the codeql_test_extract MCP server tool.
 * @kind problem
 * @precision medium
 * @problem.severity warning
 * @tags mcp-integration-tests
 */

import javascript

from File f
where f.getBaseName() = "ExampleQuery1.js"
select f, "Example test code file found for codeql_test_extract example query."
