# Performance Optimization Patterns

## Efficient Joins

```ql
// Efficient - Proper join condition
from Method m, MethodAccess ma
where ma.getMethod() = m
select m, ma
```

## Early Filtering

```ql
// Filter early for better performance
from Expr e
where e.getEnclosingCallable().getDeclaringType().hasName("Controller")
  and e.getType().hasName("String")
```
