---
agent: agent
---

# Document a CodeQL Query

This prompt guides you through creating or updating documentation for a CodeQL query file. The documentation is stored as a sibling file to the query with a standardized markdown format.

## Purpose

The `document_codeql_query` prompt creates/updates **query documentation files** for a specific version of a CodeQL query. Documentation files are stored alongside the query file and provide concise yet comprehensive information about what the query does.

For creating **workshop learning content** with detailed explanations and visual diagrams, use the `explain_codeql_query` prompt instead.

## Required Inputs

- **queryPath**: Path to the CodeQL query file (`.ql` or `.qlref`)
- **language**: Target programming language (actions, cpp, csharp, go, java, javascript, python, ruby, swift)

## Documentation File Conventions

### File Location and Naming

For a query file `QueryFileBaseName.ql`, the documentation file should be:

- **Primary**: `QueryFileBaseName.md` (markdown format, preferred)
- **Legacy**: `QueryFileBaseName.qhelp` (XML-based query help format)

Documentation files are **siblings** to the query file (same directory).

### Handling Existing Documentation

1. **No documentation exists**: Create new `QueryFileBaseName.md` file
2. **`.md` file exists**: Update the existing markdown file
3. **`.qhelp` file exists**: Use `codeql_generate_query-help` tool to convert to markdown, then update

## Workflow Checklist

Use the following MCP server tools to gather context before creating documentation:

### Phase 1: Query Discovery

- [ ] **Step 1: Locate query files**
  - Tool: `find_codeql_query_files`
  - Parameters: `queryPath` = provided query path
  - Gather: Query source file path, existing documentation files, test files
  - Check: Does `QueryFileBaseName.md` or `QueryFileBaseName.qhelp` exist?

- [ ] **Step 2: Read query metadata**
  - Tool: `codeql_resolve_metadata`
  - Parameters: `query` = query file path
  - Gather: @name, @description, @kind, @id, @tags, @precision, @severity

### Phase 2: Convert Existing qhelp (if needed)

- [ ] **Step 3: Convert qhelp to markdown** (only if `.qhelp` exists)
  - Tool: `codeql_generate_query-help`
  - Parameters: `query` = query file path, `format` = "markdown"
  - Use output as starting point for updated documentation

### Phase 3: Gather Query Context

- [ ] **Step 4: Validate query structure**
  - Tool: `validate_codeql_query`
  - Parameters: `query` = query source code
  - Gather: Structural validation, suggestions
  - Note: This is a heuristic check only — for full validation, use `codeql_query_compile`

- [ ] **Step 5: Explore query types** (if deeper understanding needed)
  - Tool: `codeql_lsp_definition` — navigate to class/predicate definitions
  - Tool: `codeql_lsp_completion` — explore member predicates on types used in the query
  - Parameters: `file_path`, `line` (0-based), `character` (0-based), `workspace_uri` (pack root)
  - Run `codeql_pack_install` first — LSP tools require resolved dependencies

- [ ] **Step 6: Run tests** (if tests exist from Step 1)
  - Tool: `codeql_test_run`
  - Parameters: `tests` = test directories
  - Gather: Pass/fail status, confirms query behavior

### Phase 4: Create/Update Documentation

Based on gathered context, create or update the documentation file.

## Documentation Format

The documentation file (`QueryFileBaseName.md`) should follow this standardized format with these sections:

### Section 1: Title and Description

- H1 heading with the query name from @name metadata
- One paragraph description from @description, expanded if needed

### Section 2: Metadata Table

A table with these rows:

- ID: The @id value in backticks
- Kind: The @kind value (problem, path-problem, etc.)
- Severity: The @severity value
- Precision: The @precision value
- Tags: The @tags values

### Section 3: Overview

Concise explanation of what vulnerability/issue this query detects and why it matters. 2-4 sentences.

### Section 4: Recommendation

Brief guidance on how developers should fix issues flagged by this query. Include code patterns to use or avoid.

### Section 5: Example

Two subsections:

- **Vulnerable Code**: A code block showing a pattern that would be flagged by this query
- **Fixed Code**: A code block showing the corrected version of the code

Use the appropriate language identifier for the code blocks (e.g., `javascript`, `python`, `java`).

### Section 6: References

A list of links to:

- Relevant CWE if security query
- Relevant documentation or standards
- CodeQL documentation for related concepts

## Output Actions

After generating documentation content:

1. **For new documentation**: Create the file at `[QueryDirectory]/QueryFileBaseName.md`
2. **For existing `.md` file**: Update the file with new content, preserving any custom sections
3. **For existing `.qhelp` file**: Create new `.md` file (keeping `.qhelp` for backward compatibility)

## Important Notes

- **Be concise**: Documentation should be brief but complete. This is reference documentation, not tutorial content.
- **Keep it current**: Documentation should reflect the current behavior of the query.
- **Use examples from tests**: If unit tests exist, use those code patterns as examples.
- **Standard format**: Always use the format above for consistency across all query documentation.
- **Metadata accuracy**: Ensure documented metadata matches actual query metadata.
- **For workshops**: Use `explain_codeql_query` prompt when creating workshop content that requires deeper explanations and visual diagrams.
