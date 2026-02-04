/**
 * @name Test Query with Syntax Errors Fixed
 * @description A query with syntax errors corrected based on language server diagnostics
 * @kind problem
 */

// Fixed: added proper 'from' clause and valid type
from string x
where x = "test"
select x, "This has syntax errors fixed"