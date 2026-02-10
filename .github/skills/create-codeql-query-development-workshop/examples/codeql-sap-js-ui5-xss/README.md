# JavaScript XSS Taint-Tracking Workshop

A CodeQL query development workshop that teaches you to find client-side cross-site scripting (XSS) vulnerabilities using taint-tracking analysis. Inspired by a production SAP UI5 XSS query pattern.

## Background

This workshop is modeled after a real-world production query (`UI5Xss.ql`) that detects XSS vulnerabilities in SAP UI5 applications. The production query uses the `DataFlow::ConfigSig` pattern with:

- **Sources**: `RemoteFlowSource` and DOM-based XSS sources
- **Sinks**: HTML injection sinks (`innerHTML`, `document.write`, etc.)
- **Barriers**: Sanitizer functions (`encodeHTML`, `encodeJS`, etc.)
- **Path-problem**: Full taint path visualization

Since the production query depends on custom SAP libraries, this workshop uses **only** `codeql/javascript-all` (version `2.6.19`) to teach the same core concepts with standard JavaScript APIs.

## Prerequisites

- CodeQL CLI v2.23.9 or later
- `codeql/javascript-all` pack (installed automatically via `codeql pack install`)

## Setup

```bash
# Navigate to the workshop directory
cd .github/skills/create-codeql-query-development-workshop/examples/codeql-sap-js-ui5-xss

# Install dependencies for all packs
codeql pack install solutions
codeql pack install solutions-tests
codeql pack install exercises
codeql pack install exercises-tests

# Build test databases (optional — tests do this automatically)
chmod +x build-databases.sh
./build-databases.sh
```

## Workshop Structure

```text
exercises/          — Your workspace (incomplete queries to complete)
exercises-tests/    — Tests that validate your solutions
solutions/          — Reference solutions (don't peek!)
solutions-tests/    — Tests for the solutions
tests-common/       — Shared test source code
```

## Test Code Overview

The test file (`tests-common/test.js`) contains carefully crafted cases:

| Case       | Function                  | Source                          | Sink                                   | Expected                 |
| ---------- | ------------------------- | ------------------------------- | -------------------------------------- | ------------------------ |
| POSITIVE 1 | `positiveDirectInnerHTML` | `document.location.search`      | `innerHTML`                            | Detected                 |
| POSITIVE 2 | `positiveDocumentWrite`   | `window.location.hash`          | `document.write()`                     | Detected                 |
| POSITIVE 3 | `positiveOuterHTML`       | URL param via `URLSearchParams` | `outerHTML`                            | Detected                 |
| NEGATIVE 1 | `negativeSanitized`       | `document.location.search`      | `innerHTML` (via `DOMPurify.sanitize`) | NOT detected (barrier)   |
| NEGATIVE 2 | `negativeHardcoded`       | hardcoded string                | `innerHTML`                            | NOT detected (no source) |
| EDGE CASE  | `edgeCaseEval`            | `window.location.hash`          | `eval()`                               | Detected                 |
| NEGATIVE 3 | `negativeEncoded`         | `document.location.search`      | `innerHTML` (via `encodeURIComponent`) | NOT detected (barrier)   |

## Exercises

Each exercise builds on the previous one, progressively teaching more advanced CodeQL concepts.

### Exercise 1: Find XSS Sinks

**Goal**: Write a query that identifies dangerous DOM operations that could introduce XSS.

**Concepts**: `DataFlow::Node`, `DataFlow::PropWrite`, `DataFlow::CallNode`, `DataFlow::globalVarRef`

**What you'll find**:

- Property writes to `innerHTML` and `outerHTML`
- Calls to `document.write()`
- Calls to `eval()`

**Validate**:

```bash
codeql test run exercises-tests/Exercise1
```

### Exercise 2: Find Remote Flow Sources

**Goal**: Identify all user-controlled inputs that could be XSS sources.

**Concepts**: `RemoteFlowSource`, `getSourceType()`

**What you'll find**:

- `document.location.search`, `window.location.hash`
- URL parameters via `URLSearchParams`
- Any other browser API that returns user-controlled data

**Validate**:

```bash
codeql test run exercises-tests/Exercise2
```

### Exercise 3: Basic Taint-Tracking Configuration

**Goal**: Connect sources to sinks using CodeQL's taint-tracking framework.

**Concepts**: `DataFlow::ConfigSig`, `TaintTracking::Global`, `isSource`, `isSink`, `flow()`

**Key pattern**:

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { ... }
  predicate isSink(DataFlow::Node sink) { ... }
}
module MyFlow = TaintTracking::Global<MyConfig>;
```

This exercise will find ALL XSS flows including the sanitized ones (no barriers yet).

**Validate**:

```bash
codeql test run exercises-tests/Exercise3
```

### Exercise 4: Add Sanitizer Barriers

**Goal**: Reduce false positives by adding barriers for sanitizer functions.

**Concepts**: `isBarrier` predicate, `DataFlow::CallNode`, `getCalleeName()`

**What changes**: Flows through `DOMPurify.sanitize()` and `encodeURIComponent()` are blocked.

**Validate**:

```bash
codeql test run exercises-tests/Exercise4
```

### Exercise 5: Full Path-Problem Query

**Goal**: Convert the query to a production-style `path-problem` query with full taint paths.

**Concepts**: `@kind path-problem`, `PathGraph`, `PathNode`, `flowPath()`

**What changes**:

- Query metadata includes `@kind path-problem`, `@security-severity`, CWE tags
- Uses `PathNode` instead of `Node` for source/sink
- Imports `PathGraph` for visualization
- Shows complete taint propagation paths in results

**Validate**:

```bash
codeql test run exercises-tests/Exercise5
```

## Validating Solutions

```bash
# Run all solution tests (should pass after accepting results)
codeql test run solutions-tests

# Run a specific exercise test
codeql test run solutions-tests/Exercise3

# Accept current results as expected baseline
codeql test run solutions-tests --learn
```

## Learning Path

```
Exercise 1 (Sinks)
    ↓
Exercise 2 (Sources)
    ↓
Exercise 3 (Taint Tracking) ← Core concept
    ↓
Exercise 4 (Barriers) ← Reducing false positives
    ↓
Exercise 5 (Path Problem) ← Production-ready query
```

## Relation to Production Query

| Workshop Concept                         | Production Query (`UI5Xss.ql`)               |
| ---------------------------------------- | -------------------------------------------- |
| `RemoteFlowSource`                       | `RemoteFlowSource` + SAP-specific sources    |
| `innerHTML`/`document.write` sinks       | SAP UI5 HTML injection sinks                 |
| `sanitize`/`encodeURIComponent` barriers | `encodeHTML`/`encodeJS`/`encodeCSS` barriers |
| `DataFlow::ConfigSig`                    | Same pattern                                 |
| `path-problem`                           | Same query kind                              |

## Tips

- Start with Exercise 1 and work sequentially — each builds on the previous
- Use `codeql test run --learn` to accept current output as expected results
- If stuck, look at the solution for the PREVIOUS exercise as a starting point
- The `tests-common/test.js` file has comments explaining each test case
