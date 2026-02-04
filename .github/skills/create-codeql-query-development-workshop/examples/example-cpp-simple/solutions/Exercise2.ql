/**
 * @name Find Null Literals
 * @description Find null pointer literals
 * @kind problem
 * @id cpp/exercise2-null
 * @problem.severity warning
 */

import cpp

from Literal lit
where lit.getValue() = "0" or lit.toString() = "nullptr"
select lit, "Null literal"
