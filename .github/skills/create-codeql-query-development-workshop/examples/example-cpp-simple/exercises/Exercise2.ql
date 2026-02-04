/**
 * @name Find Null Literals
 * @description Find null pointer literals
 * @kind problem
 * @id cpp/exercise2-null
 * @problem.severity warning
 */

import cpp

from Literal lit
where
  // TODO: Identify null literals
  // Hint: Check for null values (nullptr, NULL, 0)
  none()
select lit, "Null literal"
