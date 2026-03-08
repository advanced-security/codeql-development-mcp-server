# CodeQL C++ Security Query Implementation Guide

This document provides specific, actionable instructions for implementing C++ security queries in CodeQL, focusing on advanced data flow analysis, type validation patterns, and union type safety based on real-world workshop examples.

## Core Concepts for LLM Understanding

### Required Imports and Dependencies

**For Security Query Implementation (.ql/.qll files):**

```ql
// Standard security query imports - USE THESE FOR ALL C++ SECURITY QUERIES
import cpp
import semmle.code.cpp.dataflow.new.DataFlow
import semmle.code.cpp.dataflow.new.TaintTracking
import semmle.code.cpp.controlflow.Guards

// Optional: Include path graph support for path-problem queries
import DataFlow::PathGraph

// For flow-state queries
import DataFlow::StateConfigSig

// For debugging data flow
import DataFlow::Impl::FlowExploration as FlowExploration
import FlowExploration::PartialPathGraph
```

**For Advanced Analysis:**

```ql
// Memory management and pointer analysis
import semmle.code.cpp.security.BufferWrite
import semmle.code.cpp.security.SecurityOptions
import semmle.code.cpp.security.TaintTracking

// Control flow and guard analysis
import semmle.code.cpp.controlflow.BasicBlocks
import semmle.code.cpp.controlflow.Guards
```

## Essential Security Patterns for C++

### 1. Union Type Safety and Dynamic Input Validation

**Pattern: Detecting improper union field access without type validation**

Based on workshop examples with `dyn_input_t` union types:

```ql
/**
 * Models a dynamic input union that requires type validation before access
 */
class DynamicInputAccess extends ArrayExpr {
  DynamicInputAccess() {
    this.getArrayBase().getType().(DerivedType).getBaseType().getName() = "dyn_input_t"
  }

  /**
   * Gets the array index being accessed
   */
  Expr getArrayOffset() { result = ArrayExpr.super.getArrayOffset() }
}

/**
 * Models calls to type validation macros like DYN_INPUT_TYPE
 */
class TypeValidationCall extends FunctionCall {
  TypeValidationCall() {
    this.getTarget().hasName("DYN_INPUT_TYPE") or
    this.getTarget().hasName(["VALIDATE_TYPE", "CHECK_INPUT_TYPE"])
  }

  /**
   * Gets the expected type for a specific input index
   */
  int getExpectedInputType(int input_index) {
    result = this.getArgument(input_index).getValue().toInt()
  }
}

/**
 * Checks if a field access matches the expected type from validation
 */
predicate typeValidationCallMatchesUse(TypeValidationCall call, DynamicInputAccess use) {
  exists(FieldAccess f, int expected |
    expected = call.getExpectedInputType(use.getArrayOffset().getValue().toInt()) and
    f.getQualifier() = use and
    (
      expected = 1 and f.getTarget().getName() = "ptr"  // MEM type
      or
      expected = 2 and f.getTarget().getName() = "val"  // VAL type
    )
  )
}
```

### 2. Guard Condition Analysis for Type Safety

**Pattern: Modeling validation guards that protect unsafe operations**

```ql
/**
 * Relates a validation call to a guard condition that protects a basic block
 */
predicate typeValidationGuard(
  GuardCondition guard, TypeValidationCall call, Expr other, BasicBlock block
) {
  exists(Expr dest |
    // Local flow from validation call to guard comparison
    DataFlow::localExprFlow(call, dest) and
    // Guard ensures equality between validation result and input_types
    guard.ensuresEq(dest, other, 0, block, true) and
    // Validate that 'other' flows from an input_types parameter
    InputTypesToTypeValidation::hasFlowToExpr(other)
  )
}

/**
 * Extends guard analysis to inter-procedural cases
 */
predicate typeValidationGuardOrIndirect(
  GuardCondition guard, TypeValidationCall call, Expr other, BasicBlock block
) {
  typeValidationGuard(guard, call, other, block)
  or
  // Check for validation in calling functions
  typeValidationGuardOrIndirect(guard, call, other,
    block.getEnclosingFunction().getACallToThisFunction().getBasicBlock())
}
```

### 3. Multiple Data Flow Configurations

**Pattern: Tracking different aspects with separate configurations to avoid recursion**

```ql
/**
 * Configuration tracking input_types parameter flow to validation guards
 */
module InputTypesToTypeValidation = DataFlow::Make<InputTypesToTypeValidationConfig>;

module InputTypesToTypeValidationConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    exists(EntrypointFunction ep | ep.getInputTypesParameter() = source.asParameter())
  }

  predicate isSink(DataFlow::Node sink) {
    // Avoid non-monotonic recursion by limiting to variable accesses
    sink.asExpr() instanceof VariableAccess
  }
}

/**
 * Configuration tracking input parameter flow to unsafe accesses
 */
module InputToAccess = DataFlow::Make<InputToAccessConfig>;

module InputToAccessConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    exists(EntrypointFunction ep | ep.getInputParameter() = source.asParameter())
  }

  predicate isSink(DataFlow::Node sink) {
    exists(DynamicInputAccess access |
      sink.asExpr() = access.getArrayBase() and
      access.isTypeNotValidated()
    )
  }

  predicate isAdditionalFlowStep(DataFlow::Node node1, DataFlow::Node node2) {
    // Model wrapper functions that return their input
    exists(FunctionCall fc |
      fc.getTarget().hasName("lock_input") and
      fc.getArgument(0) = node1.asExpr() and
      fc = node2.asExpr()
    )
  }
}
```

### 4. Flow-State for Advanced Path Sensitivity

**Pattern: Tracking validation state throughout data flow paths**

```ql
/**
 * Flow states representing validation status
 */
newtype TTypeValidationState =
  TTypeUnvalidatedState() or
  TTypeValidatedState(TypeValidationCall call)

class TypeValidationState extends TTypeValidationState {
  string toString() {
    this = TTypeUnvalidatedState() and result = "unvalidated"
    or
    this = TTypeValidatedState(_) and result = "validated"
  }
}

/**
 * State representing validated inputs with specific validation call
 */
class TypeValidatedState extends TypeValidationState, TTypeValidatedState {
  TypeValidationCall call;
  DataFlow::Node node1;
  DataFlow::Node node2;

  TypeValidatedState() {
    this = TTypeValidatedState(call) and
    exists(GuardCondition gc |
      DataFlow::localFlowStep(node1, node2) and
      typeValidationGuard(gc, call, _, node2.asExpr().getBasicBlock()) and
      not typeValidationGuard(gc, call, _, node1.asExpr().getBasicBlock())
    )
  }

  TypeValidationCall getCall() { result = call }
  DataFlow::Node getFstNode() { result = node1 }
  DataFlow::Node getSndNode() { result = node2 }
}

/**
 * Stateful data flow configuration
 */
module StatefulInputToAccess = DataFlow::MakeWithState<StatefulInputToAccessConfig>;

module StatefulInputToAccessConfig implements DataFlow::StateConfigSig {
  class FlowState = TTypeValidationState;

  predicate isSource(DataFlow::Node source, FlowState state) {
    exists(EntrypointFunction ep | ep.getInputParameter() = source.asParameter()) and
    state instanceof TypeUnvalidatedState
  }

  predicate isSink(DataFlow::Node sink, FlowState state) {
    exists(DynamicInputAccess access |
      sink.asExpr() = access.getArrayBase() and
      (
        state instanceof TypeUnvalidatedState
        or
        state instanceof TypeValidatedState and
        not typeValidationCallMatchesUse(state.(TypeValidatedState).getCall(), access)
      )
    )
  }

  predicate isAdditionalFlowStep(
    DataFlow::Node node1, FlowState state1, DataFlow::Node node2, FlowState state2
  ) {
    state1 instanceof TypeUnvalidatedState and
    node1 = state2.(TypeValidatedState).getFstNode() and
    node2 = state2.(TypeValidatedState).getSndNode()
  }

  predicate isBarrier(DataFlow::Node node, FlowState state) {
    exists(TypeValidationCall call |
      typeValidationGuard(_, call, _, node.asExpr().getBasicBlock()) and
      (
        state instanceof TypeUnvalidatedState
        or
        state.(TypeValidatedState).getCall() != call
      )
    )
  }
}
```

### 5. Entry Point Modeling

**Pattern: Identifying security-relevant entry points**

```ql
/**
 * Functions that serve as entry points for security analysis
 */
class EntrypointFunction extends Function {
  EntrypointFunction() {
    // Explicit entry points
    this.hasName(["EP_example", "EP_copy_mem", "EP_print_val", "EP_write_val_to_mem"])
    or
    // Heuristic: functions with specific signature patterns not called internally
    (
      this.getNumberOfParameters() >= 2 and
      this.getParameter(0).getType().toString().matches("%input%") and
      this.getParameter(1).getType().toString().matches("%types%") and
      not exists(FunctionCall call | call.getTarget() = this)
    )
  }

  Parameter getInputParameter() { result = this.getParameter(0) }
  Parameter getInputTypesParameter() { result = this.getParameter(1) }
}
```

## Advanced Debugging Techniques

### 1. Partial Flow Analysis for Missing Edges

```ql
// Debug missing flow paths using partial flow
from FlowExploration::PartialPathNode source, FlowExploration::PartialPathNode sink
where FlowExploration::hasPartialFlow(source, sink, _)
select source, sink, "Partial flow detected - may indicate missing flow step"

// Use this to identify where additional flow steps are needed
predicate isAdditionalFlowStep(DataFlow::Node node1, DataFlow::Node node2) {
  // Add custom flow steps based on partial flow analysis results
  exists(FunctionCall fc |
    fc.getTarget().hasName("wrapper_function") and
    fc.getArgument(0) = node1.asExpr() and
    fc = node2.asExpr()
  )
}
```

### 2. Path-Problem Query Structure

```ql
/**
 * Complete path-problem query for union type safety
 * @id cpp/union-type-confusion
 * @name Union type confusion
 * @kind path-problem
 */

import StatefulInputToAccess::PathGraph

from
  StatefulInputToAccess::PathNode source,
  StatefulInputToAccess::PathNode sink,
  string message,
  Expr additionalExpr
where
  StatefulInputToAccess::hasFlowPath(source, sink) and
  (
    if sink.getState() instanceof TypeUnvalidatedState
    then (
      message = "Union field access without type validation." and
      additionalExpr = sink.getNode().asExpr()
    ) else (
      message = "Union field access does not match type validation $@." and
      additionalExpr = sink.getState().(TypeValidatedState).getCall()
    )
  )
select sink, source, sink, message, additionalExpr, "validation call"
```

## Common Anti-Patterns to Avoid

### 1. Non-Monotonic Recursion

```ql
// WRONG: This creates circular dependency
predicate typeValidationGuard(GuardCondition guard, Expr other, BasicBlock block) {
  guard.ensuresEq(_, other, 0, block, true) and
  MyConfig::hasFlowToExpr(other)  // MyConfig uses typeValidationGuard in isSink
}

// CORRECT: Use separate configurations
module TypeValidationFlow = DataFlow::Make<TypeValidationConfig>;
predicate typeValidationGuard(GuardCondition guard, Expr other, BasicBlock block) {
  guard.ensuresEq(_, other, 0, block, true) and
  TypeValidationFlow::hasFlowToExpr(other)  // Separate config avoids recursion
}
```

### 2. Overly Broad Barriers

```ql
// WRONG: Blocks too much flow
predicate isBarrier(DataFlow::Node node) {
  exists(GuardCondition guard |
    guard.getBasicBlock() = node.asExpr().getBasicBlock()
  )
}

// CORRECT: Specific barrier conditions
predicate isBarrier(DataFlow::Node node, FlowState state) {
  exists(TypeValidationCall call |
    typeValidationGuard(_, call, _, node.asExpr().getBasicBlock()) and
    state.(TypeValidatedState).getCall() != call
  )
}
```

### 3. Missing Flow Steps

Use partial flow analysis to identify where custom flow steps are needed for:

- Wrapper functions that pass through parameters
- Return value flows from indirect calls
- Field-to-field data flow in complex structures

## Best Practices Summary

1. **Use separate data flow configurations** to avoid recursion between predicates
2. **Employ flow-state** for path-sensitive analysis of validation contexts
3. **Model entry points explicitly** rather than relying only on heuristics
4. **Use partial flow debugging** to identify missing flow edges
5. **Implement precise barrier conditions** to avoid false negatives
6. **Match validation with usage** using domain-specific predicates
7. **Handle inter-procedural validation** with recursive guard analysis

This guide enables implementing sophisticated C++ security queries that can detect complex type confusion vulnerabilities, validation bypasses, and inter-procedural security flaws.
