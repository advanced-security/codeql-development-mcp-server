/**
 * @name Valid Test Query
 * @description A valid CodeQL query with no syntax errors
 * @id test/valid-query
 * @kind problem
 * @problem.severity warning
 */

from string x
where x = "test"
select x, "This is a valid query"
