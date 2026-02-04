# CodeQL Query Basics

## Query Structure

```ql
/**
 * @name Query Name
 * @description What this query finds
 */

import language

from Variable declarations
where Conditions
select Results
```

## Core Clauses

- **from**: Declares variables and types
- **where**: Specifies conditions
- **select**: Defines output

## Example

```ql
from Method m
where m.getName() = "execute"
select m, "Found execute method"
```
