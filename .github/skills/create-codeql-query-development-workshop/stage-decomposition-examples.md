# Stage Decomposition Examples

This document provides real-world examples of how to decompose complex CodeQL queries into incremental workshop stages.

## Example 1: Null Pointer Dereference (C++)

### Source Query Complexity

- Finds pointer dereferences
- Identifies null pointer sources
- Uses local data flow
- Filters out checked dereferences

### Decomposition Strategy: Building Blocks

**Stage 1: Find Dereferences**

- Query: Find all `PointerDereferenceExpr`
- Focus: Basic pattern matching
- Teaching: CodeQL class hierarchy

**Stage 2: Find Null Literals**

- Query: Find null pointer literals
- Focus: Literal values and types
- Teaching: Value constraints

**Stage 3: Connect with Data Flow**

- Query: Use `DataFlow::localFlow` to connect nulls to dereferences
- Focus: Data flow analysis
- Teaching: Sources, sinks, flow

### Progression Logic

Each stage builds on previous:

1. Students learn to find elements → 2. Learn to find specific values → 3. Learn to track flow

## Example 2: SQL Injection (Java)

### Source Query Complexity

- Finds database query methods
- Identifies user input sources
- Uses global taint tracking
- Includes sanitizers

### Decomposition Strategy: Syntactic to Semantic

**Stage 1: Find Database Calls**

- Query: Find calls to `Statement.execute*` methods
- Focus: Method call patterns
- Teaching: Java method analysis

**Stage 2: Identify User Input**

- Query: Find servlet request parameters, HTTP inputs
- Focus: Source identification
- Teaching: Entry points

**Stage 3: Local Taint Tracking**

- Query: Use `TaintTracking::localTaint` to find simple cases
- Focus: Local propagation
- Teaching: Taint concepts

**Stage 4: Global Taint Tracking**

- Query: Extend to `TaintTracking::global`
- Focus: Inter-procedural analysis
- Teaching: Global configuration

**Stage 5: Add Sanitizers**

- Query: Exclude validated inputs
- Focus: Barrier guards
- Teaching: False positive reduction

### Progression Logic

Simple → Complex → Comprehensive:

1. Understand sinks → 2. Understand sources → 3. Local connections → 4. Global connections → 5. Refinement

## Example 3: XSS (JavaScript)

### Source Query Complexity

- Finds DOM manipulation sinks
- Identifies untrusted data sources
- Uses taint tracking with custom steps
- Handles client-side and server-side

### Decomposition Strategy: Local to Global

**Stage 1: Find DOM Sinks**

- Query: Find `innerHTML`, `outerHTML`, `document.write`
- Focus: Property access patterns
- Teaching: JavaScript DOM API

**Stage 2: Find URL Parameters**

- Query: Find `location.search`, `window.location.href`
- Focus: Browser API sources
- Teaching: Untrusted data

**Stage 3: Add Request Sources**

- Query: Add Express.js request parameters
- Focus: Server-side sources
- Teaching: Multiple source types

**Stage 4: Local Taint Tracking**

- Query: Connect sources to sinks locally
- Focus: String operations
- Teaching: Taint flow

**Stage 5: Global Taint Tracking**

- Query: Track across function boundaries
- Focus: Full application flow
- Teaching: Configuration

**Stage 6: Custom Taint Steps**

- Query: Add framework-specific propagation
- Focus: Library modeling
- Teaching: Extensibility

### Progression Logic

API knowledge → Data flow → Framework specifics:

1. Know what to look for → 2. Know where it comes from → 3. Connect them → 4. Handle complexities

## Example 4: Path Traversal (Multiple Languages)

### Source Query Complexity

- Finds file system operations
- Identifies external path inputs
- Tracks string concatenation
- Detects missing validation

### Decomposition Strategy: Simple to Filtered

**Stage 1: Find File Operations**

- Query: Find all filesystem API calls
- Focus: High recall
- Teaching: API patterns (high false positive rate acceptable)

**Stage 2: Find External Inputs**

- Query: Find HTTP parameters, command-line args
- Focus: Source enumeration
- Teaching: Attack surface

**Stage 3: Connect with Taint Tracking**

- Query: Track external input to file operations
- Focus: Flow analysis
- Teaching: Connection (many results, some false positives)

**Stage 4: Filter Path Validation**

- Query: Exclude cases with `contains("..")` checks
- Focus: Basic filtering
- Teaching: Guards (fewer results)

**Stage 5: Advanced Filtering**

- Query: Recognize path normalization, sandboxing
- Focus: Sophisticated guards
- Teaching: False positive elimination (high precision)

### Progression Logic

High recall → High precision:

1. Find all candidates → 2. Track dangerous flows → 3. Remove obvious safe cases → 4. Remove subtle safe cases

## Decomposition Patterns Summary

### Pattern A: Building Blocks

Best for: Queries with independent components

- Stage 1: Component A
- Stage 2: Component B
- Stage 3: Combine A + B
- Stage 4: Filter/refine

Example: Null pointer (find dereferences, find nulls, connect)

### Pattern B: Syntactic to Semantic

Best for: Queries increasing in semantic depth

- Stage 1: Syntactic patterns
- Stage 2: Type-based filtering
- Stage 3: Control flow
- Stage 4: Data flow

Example: Type confusion (syntax → types → flow → validation)

### Pattern C: Local to Global

Best for: Queries using data/taint flow

- Stage 1: Find sources
- Stage 2: Find sinks
- Stage 3: Local flow
- Stage 4: Global flow
- Stage 5: Custom steps

Example: XSS, SQL injection

### Pattern D: Simple to Filtered

Best for: Queries with many false positives

- Stage 1: Over-approximate (high recall)
- Stage 2: Basic constraints
- Stage 3: Filtering predicates
- Stage 4: Advanced filtering

Example: Path traversal, command injection

## Choosing the Right Pattern

### Consider Query Characteristics

**Independent predicates?** → Use Building Blocks

- Query has multiple standalone parts
- Each part can be understood independently
- Example: Find X and Y, then combine

**Increasing abstraction?** → Use Syntactic to Semantic

- Query starts with concrete syntax
- Progressively adds semantic analysis
- Example: Find syntax → Add types → Add flow

**Data flow based?** → Use Local to Global

- Query primarily about tracking values
- Natural progression from simple to complex flow
- Example: Track taint from source to sink

**Many false positives?** → Use Simple to Filtered

- Query initially over-approximates
- Refinement stages eliminate FPs
- Example: Find all, then filter

## Anti-Patterns to Avoid

### Too Many Stages

**Problem**: 15+ stages fragments learning
**Solution**: Combine related concepts, aim for 4-8 stages

### Uneven Difficulty

**Problem**: Easy, easy, easy, VERY HARD
**Solution**: Smooth difficulty curve, consistent complexity increases

### Missing Foundations

**Problem**: Stage 3 requires understanding not taught in Stages 1-2
**Solution**: Ensure each stage builds on previous knowledge

### Duplicate Stages

**Problem**: Stages 3 and 4 teach the same concept
**Solution**: Each stage should teach something new

### Non-Monotonic

**Problem**: Later stages find fewer results than earlier stages unexpectedly
**Solution**: Progression should generally increase precision (may reduce recall)

## Testing Your Decomposition

### Validation Questions

1. **Can each stage be completed independently?**
   - Student should be able to complete Stage N without peeking at Stage N+1

2. **Does each stage add value?**
   - Each stage should teach a new concept or technique

3. **Is progression logical?**
   - Order should make intuitive sense
   - No "why are we suddenly doing this?" moments

4. **Are expected results sensible?**
   - Results should validate the stage's concept
   - Should see progression in precision/recall

5. **Can you explain the transition?**
   - "Now that we know X, let's learn Y" should be clear

## Workshop Quality Metrics

### Good Workshop Signs

- Students complete stages in sequence without confusion
- Each stage has "aha!" moment
- Final stage approaches production quality
- Test cases clearly demonstrate concepts
- Smooth learning curve

### Warning Signs

- Students skip ahead or get stuck
- Stage purpose unclear
- Large conceptual gaps between stages
- Test cases don't illustrate the concept
- Difficulty spikes

## Iteration and Refinement

### After Creating Initial Workshop

1. **Self-test**: Try completing exercises without looking at solutions
2. **Peer review**: Have colleague attempt workshop
3. **Observe students**: Watch actual usage patterns
4. **Collect feedback**: What was confusing? What worked well?
5. **Refine stages**: Adjust boundaries, add hints, improve tests
6. **Update documentation**: Clarify confusing parts

### Common Refinements

- **Split stage**: Too much in one stage → Break into two
- **Merge stages**: Two stages teach same thing → Combine
- **Reorder stages**: Illogical flow → Swap order
- **Add scaffolding**: Too difficult → Add more hints/structure
- **Remove scaffolding**: Too easy → Remove hand-holding
- **Better tests**: Unclear concept → Create clearer test cases

## Language-Specific Considerations

### C/C++

- Pointer operations more complex than other languages
- Memory management concepts need careful staging
- Control flow analysis particularly important

### Java

- Framework knowledge (Spring, servlets) crucial
- Reflection and dynamic calls add complexity
- Type hierarchy considerations

### JavaScript

- Dynamic typing requires different approach
- Client vs server side distinctions
- Framework diversity (React, Angular, Vue, Express)

### Python

- Dynamic nature affects analysis
- Framework specifics (Django, Flask)
- Decorator and metaprogramming patterns

## Resources

- [SKILL.md](./SKILL.md) - Main workshop creation skill
- [Workshop Structure Reference](./workshop-structure-reference.md)
- [MCP Tools Reference](./mcp-tools-reference.md)
- [Example Workshops](./examples/)
