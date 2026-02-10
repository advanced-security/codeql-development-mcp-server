/**
 * @name Find remote flow sources
 * @description Find user-controlled inputs that could be XSS sources
 * @kind problem
 * @id js/workshop/xss-sources
 * @problem.severity warning
 */

import javascript

// TODO: Implement - find all RemoteFlowSource instances
// Hint: The RemoteFlowSource class represents user-controlled inputs such as
//       document.location, window.location, URL parameters, etc.
//       Use `source instanceof RemoteFlowSource` in your from/where/select.
//       The getSourceType() method returns a descriptive string for each source.
from RemoteFlowSource source
where none()
select source, "User-controlled input: " + source.getSourceType()
