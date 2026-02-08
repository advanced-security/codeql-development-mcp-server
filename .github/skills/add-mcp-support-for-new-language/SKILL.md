---
name: add-mcp-support-for-new-language
description: Add first-class support for a new CodeQL-supported language to the CodeQL Development MCP Server. Use this skill when CodeQL adds support for a new language (e.g., Rust) and the MCP server needs to provide tool queries, prompts, and resources for that language.
---

# Add MCP Server Support for a New Language

This skill guides you through adding first-class support for a new CodeQL language to the CodeQL Development MCP Server.

## When to Use This Skill

- CodeQL releases support for a new language (e.g., Rust)
- The MCP server needs to provide PrintAST, PrintCFG, and CallGraph tool queries for the language
- Language-specific skills and documentation need to be created

## Prerequisites

- CodeQL CLI with the new language extractor available
- The `codeql/{language}-all` standard library pack published
- Knowledge of the language's CodeQL library structure (PrintAst module, CFG library, etc.)

## Helper Files

This skill includes automation scripts to accelerate implementation:

| File                                                   | Description                                             |
| ------------------------------------------------------ | ------------------------------------------------------- |
| [`scaffold-new-language.sh`](scaffold-new-language.sh) | Creates directory structure and boilerplate query files |
| [`workflow-template.yml`](workflow-template.yml)       | CI workflow template for OS-specific languages          |

**Quick Start:**

```bash
# Create scaffold for a new language (e.g., Rust)
./.github/skills/add-mcp-support-for-new-language/scaffold-new-language.sh rust rs
```

## Quick Reference: Files to Modify

| Category          | File Path                                                      | Change                                          |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| **TypeScript**    | `server/src/prompts/workflow-prompts.ts`                       | Add to `SUPPORTED_LANGUAGES`                    |
|                   | `server/src/lib/query-file-finder.ts`                          | Add to `LANGUAGE_EXTENSIONS`                    |
|                   | `server/src/lib/cli-tool-registry.ts`                          | Update error message strings                    |
| **Query Packs**   | `server/ql/{language}/tools/src/`                              | Create 4 tool queries                           |
|                   | `server/ql/{language}/tools/test/`                             | Create test cases                               |
| **npm Package**   | `server/package.json`                                          | Add `ql/{language}/tools/src/` to `files` array |
| **Scripts**       | `server/scripts/install-packs.sh`                              | Add to `VALID_LANGUAGES` + install call         |
|                   | `server/scripts/extract-test-databases.sh`                     | Add to `VALID_LANGUAGES`                        |
|                   | `server/scripts/run-query-unit-tests.sh`                       | Add to `VALID_LANGUAGES`                        |
| **Documentation** | `server/ql/README.md`                                          | Add language to list                            |
|                   | `server/src/prompts/tools-query-workflow.prompt.md`            | Add to supported languages                      |
|                   | `server/src/prompts/explain-codeql-query.prompt.md`            | Add to language list                            |
|                   | `server/src/prompts/document-codeql-query.prompt.md`           | Add to language list                            |
|                   | `docs/public.md`                                               | Add to Supported Languages table                |
| **Skills**        | `.github/skills/create-codeql-query-tdd-generic/SKILL.md`      | Add to supported languages                      |
|                   | `.github/skills/validate-ql-mcp-server-tools-queries/SKILL.md` | Add to language table                           |
| **CI/CD**         | `.github/workflows/query-unit-tests.yml`                       | Add to matrix (standard)                        |
|                   | `.github/workflows/query-unit-tests-{lang}.yml`                | Create if special OS needed                     |
|                   | `.github/workflows/release.yml`                                | Add to `LANGUAGES` list in pack publish step    |

## Phase 1: Create Query Pack Structure

### 1.1 Directory Structure

```
server/ql/{language}/tools/
├── src/
│   ├── codeql-pack.yml
│   ├── PrintAST/
│   │   └── PrintAST.ql
│   ├── PrintCFG/
│   │   └── PrintCFG.ql
│   ├── CallGraphFrom/
│   │   └── CallGraphFrom.ql
│   └── CallGraphTo/
│       └── CallGraphTo.ql
└── test/
    ├── codeql-pack.yml
    ├── PrintAST/
    │   ├── Example1.{ext}
    │   ├── PrintAST.qlref
    │   └── PrintAST.expected
    ├── PrintCFG/
    │   ├── Example1.{ext}
    │   ├── PrintCFG.qlref
    │   └── PrintCFG.expected
    ├── CallGraphFrom/
    │   ├── Example1.{ext}
    │   ├── CallGraphFrom.qlref
    │   └── CallGraphFrom.expected
    └── CallGraphTo/
        ├── Example1.{ext}
        ├── CallGraphTo.qlref
        └── CallGraphTo.expected
```

### 1.2 Source Pack Configuration

Create `server/ql/{language}/tools/src/codeql-pack.yml`:

```yaml
name: advanced-security/ql-mcp-{language}-tools-src
version: 0.0.1
library: false
dependencies:
  codeql/{language}-all: '*'
```

### 1.3 Test Pack Configuration

Create `server/ql/{language}/tools/test/codeql-pack.yml`:

```yaml
name: advanced-security/ql-mcp-{language}-tools-test
version: 0.0.1
dependencies:
  codeql/{language}-queries: '*'
  advanced-security/ql-mcp-{language}-tools-src: ${workspace}
extractor: { language }
```

### 1.4 Tool Queries

Each tool query must:

1. Use an external predicate for source file selection
2. Fall back to `Example1.{ext}` for unit tests
3. Follow the language's CodeQL library conventions

See [templates/](#templates) section for query templates.

## Phase 2: TypeScript Source Updates

### 2.1 Add to SUPPORTED_LANGUAGES

In `server/src/prompts/workflow-prompts.ts`, add the language alphabetically:

```typescript
export const SUPPORTED_LANGUAGES = [
  'actions',
  'cpp',
  'csharp',
  'go',
  'java',
  'javascript',
  'python',
  'ruby',
  '{language}' // Add here alphabetically
] as const;
```

### 2.2 Add to LANGUAGE_EXTENSIONS

In `server/src/lib/query-file-finder.ts`, add the language with its file extension:

```typescript
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  'actions': 'yml',
  'cpp': 'cpp',
  'csharp': 'cs',
  'go': 'go',
  'java': 'java',
  'javascript': 'js',
  'python': 'py',
  'ruby': 'rb',
  '{language}': '{ext}', // Add here alphabetically
  'typescript': 'ts'
};
```

### 2.3 Update Error Messages

In `server/src/lib/cli-tool-registry.ts`, search for supported languages error messages and add the new language:

```typescript
// Find and update these strings (around line 568-569):
'Supported languages: actions, cpp, csharp, go, java, javascript, python, ruby, {language}';
```

## Phase 3: Script Updates

### 3.1 install-packs.sh

In `server/scripts/install-packs.sh`:

1. Add to `VALID_LANGUAGES` array:

```bash
VALID_LANGUAGES=("actions" "cpp" "csharp" "go" "java" "javascript" "python" "ruby" "{language}")
```

2. Add install call at the end of the "all languages" block:

```bash
install_packs "server/ql/{language}/tools"
```

### 3.2 extract-test-databases.sh

In `server/scripts/extract-test-databases.sh`, add to `VALID_LANGUAGES`:

```bash
VALID_LANGUAGES=("actions" "cpp" "csharp" "go" "java" "javascript" "python" "ruby" "{language}")
```

### 3.3 run-query-unit-tests.sh

In `server/scripts/run-query-unit-tests.sh`, add to `VALID_LANGUAGES`:

```bash
VALID_LANGUAGES=("actions" "cpp" "csharp" "go" "java" "javascript" "python" "ruby" "{language}")
```

## Phase 4: Documentation Updates

Update language lists in these files:

1. **`server/ql/README.md`** - Add to supported languages list
2. **`server/src/prompts/tools-query-workflow.prompt.md`** - Add to supported languages
3. **`server/src/prompts/explain-codeql-query.prompt.md`** - Add to language list
4. **`server/src/prompts/document-codeql-query.prompt.md`** - Add to language list

## Phase 5: Skills Updates

### 5.1 Update Generic Skills

Update these existing skills to include the new language:

1. **`.github/skills/create-codeql-query-tdd-generic/SKILL.md`** - Update description and supported languages list
2. **`.github/skills/validate-ql-mcp-server-tools-queries/SKILL.md`** - Add row to language table

### 5.2 Create Language-Specific Skills (Optional)

Consider creating:

- `.github/skills/create-codeql-query-unit-test-{language}/SKILL.md`
- `.github/skills/update-codeql-query-dataflow-{language}/SKILL.md`

## Phase 6: CI/CD Configuration

### 6.1 Standard Languages (Ubuntu-compatible)

Add the language to the matrix in `.github/workflows/query-unit-tests.yml`:

```yaml
strategy:
  matrix:
    language:
      ['actions', 'cpp', 'csharp', 'go', 'java', 'javascript', 'python', 'ruby', '{language}']
```

### 6.2 Special OS Requirements

If the language requires a specific OS (like Swift requires macOS), create a dedicated workflow:

```yaml
# .github/workflows/query-unit-tests-{language}.yml
name: Query Unit Tests - {Language} ({os})

on:
  pull_request:
    branches: ['main']
    paths:
      - '.codeql-version'
      - '.github/actions/setup-codeql-environment/**'
      - '.github/workflows/query-unit-tests-{language}.yml'
      - '.node-version'
      - 'server/ql/{language}/**'
      - 'server/scripts/install-packs.sh'
      - 'server/scripts/run-query-unit-tests.sh'
  push:
    branches: ['main']
    paths:
      # Same as above
  workflow_dispatch:

permissions:
  contents: read

jobs:
  query-unit-tests-{language}:
    name: Query Unit Tests - {language}
    runs-on: {os}-latest  # e.g., macos-latest, windows-latest

    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          cache: 'npm'
          node-version-file: '.node-version'
      - run: npm ci --workspaces
      - uses: ./.github/actions/setup-codeql-environment
        with:
          install-language-runtimes: false
      - run: ./server/scripts/install-packs.sh --language {language}
      - run: ./server/scripts/run-query-unit-tests.sh --language {language}
```

## Phase 7: Build and Test

### 7.1 Generate Lock Files

```bash
# Install packs to generate lock files
codeql pack install --no-strict-mode \
  --additional-packs=server/ql/{language}/tools \
  -- server/ql/{language}/tools/src

codeql pack install --no-strict-mode \
  --additional-packs=server/ql/{language}/tools \
  -- server/ql/{language}/tools/test
```

### 7.2 Run Query Tests

```bash
# Run tests for the new language
./server/scripts/run-query-unit-tests.sh --language {language}
```

### 7.3 Build Server Bundle

```bash
# Rebuild the MCP server bundle
npm run build --workspace=server
```

### 7.4 Run Full Test Suite

```bash
npm run build-and-test
```

---

## Templates

### PrintAST.ql Template

```ql
/**
 * @name Print AST for {language}
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id {language}/tools/print-ast
 * @kind graph
 * @tags ast
 */

import {language}
import {printast-module}  // e.g., semmle.code.java.PrintAst or codeql.swift.printast.PrintAst

/**
 * Gets the source files to generate AST from.
 */
external string selectedSourceFiles();

string getSelectedSourceFile() { result = selectedSourceFiles().splitAt(",").trim() }

File getSelectedFile() {
  exists(string selectedFile |
    selectedFile = getSelectedSourceFile() and
    (
      result.getRelativePath() = selectedFile
      or
      not selectedFile.matches("%/%") and result.getBaseName() = selectedFile
      or
      result.getAbsolutePath().suffix(result.getAbsolutePath().length() - selectedFile.length()) = selectedFile
    )
  )
}

class Cfg extends PrintAstConfiguration {
  override predicate shouldPrint({element-type} e, {location-type} l) {
    super.shouldPrint(e, l) and
    (
      l.getFile() = getSelectedFile()
      or
      not exists(getSelectedFile()) and
      l.getFile().getBaseName() = "Example1.{ext}"
    )
  }
}
```

### PrintCFG.ql Template

```ql
/**
 * @name Print CFG for {language}
 * @description Produces a representation of a file's Control Flow Graph.
 * @id {language}/tools/print-cfg
 * @kind graph
 * @tags cfg
 */

import {language}
import {cfg-module}

external string selectedSourceFiles();

string getSelectedSourceFile() { result = selectedSourceFiles().splitAt(",").trim() }

File getSelectedFile() {
  exists(string selectedFile |
    selectedFile = getSelectedSourceFile() and
    (
      result.getRelativePath() = selectedFile or
      not selectedFile.matches("%/%") and result.getBaseName() = selectedFile or
      result.getAbsolutePath().suffix(result.getAbsolutePath().length() - selectedFile.length()) = selectedFile
    )
  )
}

predicate shouldPrintNode(ControlFlowNode node) {
  node.getLocation().getFile() = getSelectedFile()
  or
  not exists(getSelectedFile()) and
  node.getLocation().getFile().getBaseName() = "Example1.{ext}"
}

query predicate nodes(ControlFlowNode node, string property, string value) {
  shouldPrintNode(node) and
  property = "semmle.label" and
  value = node.toString()
}

query predicate edges(ControlFlowNode pred, ControlFlowNode succ) {
  shouldPrintNode(pred) and shouldPrintNode(succ) and
  pred.getASuccessor() = succ
}
```

### CallGraphFrom.ql Template

```ql
/**
 * @name Call Graph From for {language}
 * @description Displays calls made from a specified function.
 * @id {language}/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import {language}

external string sourceFunction();

string getSourceFunctionName() { result = sourceFunction().splitAt(",").trim() }

{function-type} getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    result.getName() = selectedFunc
  )
}

string getCalleeName({call-type} call) {
  if exists(call.{get-target}())
  then result = call.{get-target}().getName()
  else result = call.toString()
}

from {call-type} call, {function-type} source
where
  call.{get-enclosing}() = source and
  (
    source = getSourceFunction()
    or
    not exists(getSourceFunction()) and
    source.getFile().getBaseName() = "Example1.{ext}"
  )
select call, "Call from `" + source.getName() + "` to `" + getCalleeName(call) + "`"
```

### CallGraphTo.ql Template

```ql
/**
 * @name Call Graph To for {language}
 * @description Displays calls made to a specified function.
 * @id {language}/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import {language}

external string targetFunction();

string getTargetFunctionName() { result = targetFunction().splitAt(",").trim() }

string getCallerName({call-type} call) {
  if exists(call.{get-enclosing}())
  then result = call.{get-enclosing}().getName()
  else result = "Top-level"
}

string getCalleeName({call-type} call) {
  if exists(call.{get-target}())
  then result = call.{get-target}().getName()
  else result = call.toString()
}

from {call-type} call
where
  call.{get-target}().getName() = getTargetFunctionName()
  or
  not exists(getTargetFunctionName()) and
  call.getLocation().getFile().getBaseName() = "Example1.{ext}"
select call, "Call to `" + getCalleeName(call) + "` from `" + getCallerName(call) + "`"
```

---

## Language-Specific Notes

### Standard Languages (Ubuntu CI)

- cpp, csharp, go, java, javascript, python, ruby, actions
- Add to the matrix in `query-unit-tests.yml`

### macOS-Required Languages

- **Swift**: Requires Xcode and macOS SDK
- Create dedicated `query-unit-tests-{language}.yml` with `runs-on: macos-latest`

### Windows-Required Languages

- Create dedicated workflow with `runs-on: windows-latest`
- May need PowerShell script variants

### Languages with Special Extractors

- Some languages may require specific environment setup
- Check CodeQL documentation for extractor requirements

---

## Quality Checklist

Before submitting the PR:

- [ ] All 4 tool queries created (PrintAST, PrintCFG, CallGraphFrom, CallGraphTo)
- [ ] Test cases with `.expected` files populated (run on appropriate OS)
- [ ] Pack lock files generated (`codeql-pack.lock.yml`)
- [ ] TypeScript source updated and builds successfully
- [ ] All scripts updated with new language
- [ ] `server/package.json` `files` array includes `ql/{language}/tools/src/`
- [ ] `.github/workflows/release.yml` `LANGUAGES` list includes new language
- [ ] `docs/public.md` Supported Languages table updated
- [ ] Documentation updated (4+ files)
- [ ] Skills updated (2+ files)
- [ ] CI workflow configured (matrix or dedicated)
- [ ] Server bundle rebuilt (`server/dist/codeql-development-mcp-server.js`)
- [ ] All existing tests still pass
- [ ] New language tests pass
- [ ] `npm pack --dry-run` (from `server/`) includes the new language's `.ql`, `.md`, and `codeql-pack.yml` files

## Success Criteria

The new language is successfully integrated when:

1. ✅ `codeql_query_run` tool accepts the language for tool queries
2. ✅ PrintAST returns valid AST for source files
3. ✅ PrintCFG returns valid CFG for source files
4. ✅ CallGraph queries work with source/target functions
5. ✅ All CI tests pass (including new language)
6. ✅ Server responds to prompts mentioning the new language
