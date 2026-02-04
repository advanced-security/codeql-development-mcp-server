/**
 * @name Test Query with Semantic Errors
 * @description A query with semantic/type errors for testing language server validation
 * @kind problem
 */

from NonExistentType item
where item.someProperty() = "value"
select item, "This has semantic errors"