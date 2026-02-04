---
name: validate-ql-mcp-server-tools-queries
description: Validate that the CodeQL Development MCP Server reliably returns non-empty AST, CFG, and CallGraph data from the bundled tools queries. Use this skill to ensure the `codeql_query_run` tool properly executes PrintAST, PrintCFG, CallGraphFrom, and CallGraphTo queries for any supported language.
---

# Validate QL MCP Server Tools Queries

This skill provides a systematic approach to validating that the CodeQL Development MCP Server's tools queries (`PrintAST`, `PrintCFG`, `CallGraphFrom`, `CallGraphTo`) return **meaningful, non-empty output** for test code across all supported languages.

## Why This Skill Exists

> **⚠️ CRITICAL**: The most common failure mode in MCP server tool validation is tests that "go through the motions" without verifying that query output is substantive.

A test that:

- ✅ Invokes `codeql_query_run` with `PrintAST.ql`
- ✅ Receives a successful HTTP response
- ❌ **Does NOT verify the output contains actual AST nodes**

...is a **false positive** that masks real bugs.

## Supported Languages

The tools queries are available for all CodeQL-supported languages:

| Language   | Tools Pack Location           | Test Code Extension |
| ---------- | ----------------------------- | ------------------- |
| actions    | `server/ql/actions/tools/`    | `.yml`              |
| cpp        | `server/ql/cpp/tools/`        | `.cpp`              |
| csharp     | `server/ql/csharp/tools/`     | `.cs`               |
| go         | `server/ql/go/tools/`         | `.go`               |
| java       | `server/ql/java/tools/`       | `.java`             |
| javascript | `server/ql/javascript/tools/` | `.js`               |
| python     | `server/ql/python/tools/`     | `.py`               |
| ruby       | `server/ql/ruby/tools/`       | `.rb`               |
| swift      | `server/ql/swift/tools/`      | `.swift`            |

## Tools Queries Overview

Each language pack includes four standard tools queries:

### PrintAST

**Purpose**: Outputs a hierarchical representation of the Abstract Syntax Tree.

**Expected Output**: A graph with labeled nodes representing code elements (functions, classes, statements, expressions).

**Validation Check**: Output must contain multiple `semmle.label` properties with actual node names.

### PrintCFG

**Purpose**: Outputs the Control Flow Graph showing execution paths.

**Expected Output**: A graph with `nodes` (CFG nodes) and `edges` (control flow transitions).

**Validation Check**: Output must contain both `nodes` and `edges` predicates with non-zero results.

### CallGraphFrom

**Purpose**: Shows outbound function calls from a specified function.

**Expected Output**: Problem-style results showing call sites and their targets.

**Validation Check**: Output must contain call relationships when test code has function calls.

### CallGraphTo

**Purpose**: Shows inbound function calls to a specified function.

**Expected Output**: Problem-style results showing callers of the target function.

**Validation Check**: Output must contain caller relationships when test code has function definitions that are called.

## Validation Workflow

### Step 1: Select Language and Test Code

Choose a language and ensure valid test code exists:

```text
server/ql/<language>/tools/test/PrintAST/
├── Example1.<ext>       # Test source code
├── PrintAST.expected    # Expected results
└── PrintAST.qlref       # Reference to query
```

### Step 2: Extract Test Database

Use `codeql_test_extract` to create the test database:

```json
{
  "testPath": "server/ql/<language>/tools/test/PrintAST",
  "searchPath": ["server/ql/<language>/tools/src", "server/ql/<language>/tools/test"]
}
```

### Step 3: Run PrintAST Query

Use `codeql_query_run`:

```json
{
  "queryPath": "server/ql/<language>/tools/src/PrintAST/PrintAST.ql",
  "database": "server/ql/<language>/tools/test/PrintAST/PrintAST.testproj",
  "outputFormat": "bqrs"
}
```

### Step 4: Interpret Results

Use `codeql_bqrs_interpret` with `graphtext` format:

```json
{
  "file": "<path-to-results.bqrs>",
  "format": "graphtext",
  "output": "<path-to-output.txt>"
}
```

### Step 5: Validate Non-Empty Output

**CRITICAL**: Parse the output and verify it contains substantive data:

- For `PrintAST`: Count nodes with `semmle.label` > 0
- For `PrintCFG`: Verify both `nodes` and `edges` sections exist
- For `CallGraphFrom/To`: Count result rows > 0 (when calls exist)

## Language-Specific Examples

### JavaScript Example

**Test Code** (`server/ql/javascript/tools/test/PrintAST/Example1.js`):

```javascript
class Example1 {
  constructor(name = 'World') {
    this.name = name;
  }

  static main(args = []) {
    const example = new Example1();
    example.demo();
  }

  demo() {
    for (let i = 0; i < 3; i++) {
      console.log(i);
    }
  }
}
```

**Expected AST Output** (non-empty validation):

- Must contain `ClassDefinition` node for `Example1`
- Must contain `MethodDefinition` nodes for `constructor`, `main`, `demo`
- Must contain `ForStatement` node in `demo` method

**Expected CFG Output**:

- Must contain nodes for function entry/exit
- Must contain edges for loop control flow

**Expected CallGraph Output**:

- `CallGraphFrom(main)` → should find call to `Example1()` and `demo()`
- `CallGraphTo(demo)` → should find caller `main`

### C++ Example

**Test Code** (`server/ql/cpp/tools/test/PrintAST/Example1.cpp`):

```cpp
class someClass {
public:
    void f(void);
    int g(int i, int j);
};

void fun3(someClass *sc) {
    int i;
    sc->f();
    i = sc->g(1, 2);
}
```

**Expected AST Output**:

- Must contain `Class` node for `someClass`
- Must contain `MemberFunction` nodes for `f` and `g`
- Must contain `Function` node for `fun3`

**Expected CallGraph Output**:

- `CallGraphFrom(fun3)` → should find calls to `f()` and `g()`
- `CallGraphTo(f)` → should find caller `fun3`

### Python Example

**Test Code** (`server/ql/python/tools/test/PrintAST/Example1.py`):

```python
class Example1:
    def __init__(self, name="World"):
        self.name = name

    def demo(self):
        for i in range(3):
            print(i)

def main():
    example = Example1()
    example.demo()
```

**Expected AST Output**:

- Must contain `ClassDef` node for `Example1`
- Must contain `FunctionDef` nodes for `__init__`, `demo`, `main`
- Must contain `For` node in `demo`

### Java Example

**Test Code** (`server/ql/java/tools/test/PrintAST/Example1.java`):

```java
public class Example1 {
    private String name;

    public Example1(String name) {
        this.name = name;
    }

    public void demo() {
        for (int i = 0; i < 3; i++) {
            System.out.println(i);
        }
    }

    public static void main(String[] args) {
        Example1 example = new Example1("World");
        example.demo();
    }
}
```

**Expected AST Output**:

- Must contain `ClassOrInterface` node for `Example1`
- Must contain `Method` nodes for constructor, `demo`, `main`
- Must contain `ForStmt` node in `demo`

## Validation Failure Indicators

| Symptom                 | Likely Cause                     | Resolution                                          |
| ----------------------- | -------------------------------- | --------------------------------------------------- |
| Empty AST output        | Database not extracted properly  | Re-run `codeql_test_extract`                        |
| Only headers in output  | Query ran but no results matched | Check query's source file selection logic           |
| Empty CFG nodes/edges   | Test code has no control flow    | Add functions with loops/conditionals               |
| Empty CallGraph         | No function calls in test code   | Add function calls or verify `targetFunction` param |
| BQRS decode error       | Incompatible CodeQL version      | Update CodeQL CLI and re-run                        |
| Query compilation error | Missing pack dependencies        | Run `codeql pack install` in tools pack             |
| "Nothing to extract"    | Missing test source files        | Run workshop's `initialize-qltests.sh` script       |
| Pack not found          | Older pack version not cached    | Run `codeql pack install` in solutions directory    |

## Handling External Workshops

When validating against external workshops (outside the current workspace), follow these guidelines:

### Pre-Validation Setup

1. **Install pack dependencies**: External workshops often use older CodeQL pack versions

   ```bash
   cd /path/to/external/workshop
   codeql pack install solutions
   codeql pack install solutions-tests
   ```

2. **Run initialization scripts**: Many workshops have scripts that copy test files from shared directories

   ```bash
   ./initialize-qltests.sh  # Copies from tests-common/ to test directories
   ```

3. **Verify test files exist**: Check that test source files are present before running tests

   ```bash
   ls solutions-tests/Exercise*/test.*
   ```

### File Access Patterns

When the external workshop is outside your workspace:

- Use **terminal commands** (`cat`, `ls`, `head`) to read files
- Use **MCP tools** (`codeql_query_run`, `codeql_test_run`) with absolute paths
- Pre-built databases in the workshop root can be used for tools queries

## Integration with Prompts and Agents

This skill is designed to be used with:

- **Prompt**: [validate-ql-mcp-server-tools-via-workshop](../../prompts/validate-ql-mcp-server-tools-via-workshop.prompt.md) - Uses this skill as part of workshop creation validation
- **Agent**: [mcp-enabled-ql-workshop-developer](../../agents/mcp-enabled-ql-workshop-developer.md) - Orchestrates validation during workshop creation
- **Agent**: [ql-mcp-tool-tester](../../agents/ql-mcp-tool-tester.md) - Tests MCP tools including tools query execution

## MCP Tools Used

This skill exercises the following MCP server tools:

| Tool                    | Purpose                             |
| ----------------------- | ----------------------------------- |
| `codeql_test_extract`   | Create test database from test code |
| `codeql_query_run`      | Execute tools queries               |
| `codeql_bqrs_decode`    | Decode raw BQRS results             |
| `codeql_bqrs_interpret` | Convert results to readable formats |
| `codeql_pack_install`   | Install pack dependencies           |
| `codeql_pack_ls`        | List available packs                |

## Success Criteria

Validation passes when **ALL** of the following are true:

- [ ] `PrintAST` returns ≥10 labeled AST nodes for test code
- [ ] `PrintCFG` returns both `nodes` and `edges` with ≥5 entries each
- [ ] `CallGraphFrom` returns ≥1 result when test code contains function calls
- [ ] `CallGraphTo` returns ≥1 result when test code contains called functions
- [ ] No MCP tool errors or timeouts occurred
- [ ] Results are consistent across multiple runs

## Related Resources

- [Server Documentation](../../../server/QL-MCP-SERVER.md)
- [create-codeql-query-tdd-generic](../create-codeql-query-tdd-generic/SKILL.md) - TDD workflow that uses AST/CFG analysis
- [create-codeql-query-development-workshop](../create-codeql-query-development-workshop/SKILL.md) - Workshop creation that depends on tools queries
