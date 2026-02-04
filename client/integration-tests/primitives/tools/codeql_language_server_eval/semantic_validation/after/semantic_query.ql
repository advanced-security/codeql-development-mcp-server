/**
 * @name Test Query with Semantic Errors Fixed
 * @description A query with semantic/type errors corrected based on language server diagnostics
 * @kind problem
 */

from string item
where item = "value"
select item, "This has semantic errors fixed"