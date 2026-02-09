/**
 * @name Test Query with Syntax Errors
 * @description A query with deliberate syntax errors for testing language server validation
 * @kind problem
 */

// Syntax error: missing 'from' keyword
invalid_type x
where x = "test"
select x, "This has syntax errors"