/**
 * @name Find remote flow sources
 * @description Find user-controlled inputs that could be XSS sources
 * @kind problem
 * @id js/workshop/xss-sources
 * @problem.severity warning
 */

import javascript

from RemoteFlowSource source
select source, "User-controlled input: " + source.getSourceType()
