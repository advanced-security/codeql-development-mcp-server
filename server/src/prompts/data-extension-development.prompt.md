---
agent: agent
---

# Data Extension Development Workflow

Use this workflow to create CodeQL data extensions (Models-as-Data) for third-party libraries and frameworks. Data extensions let you customize taint tracking without writing QL code — you author YAML files that declare which functions are sources, sinks, summaries, barriers, or barrier guards.

For format reference, read the MCP resource: `codeql://learning/data-extensions`
For language-specific guidance, read the corresponding `codeql://languages/<language>/library-modeling` resource. Available for: `cpp`, `csharp`, `go`, `java`, `javascript`, `python`, `ruby`, `rust`, `swift`.

## Workflow Checklist

### Phase 1: Identify the Target

- [ ] **Confirm the target library and language**
  - Library name and version: {{libraryName}}
  - Target language: {{language}}
  - Determine the model format:
    - **MaD tuple format** (9–10 column tuples): C/C++ (`codeql/cpp-all`), C# (`codeql/csharp-all`), Go (`codeql/go-all`), Java/Kotlin (`codeql/java-all`), Swift (`codeql/swift-all`)
    - **API Graph format** (3–5 column tuples): JavaScript/TypeScript (`codeql/javascript-all`), Python (`codeql/python-all`), Ruby (`codeql/ruby-all`)
    - **Rust format**: Rust (`codeql/rust-all`) uses its own crate-path-based model format; follow `codeql://languages/rust/library-modeling`
  - Using the wrong format will cause the extension to silently fail to load.

- [ ] **Locate a CodeQL database**
  - Tool: #list_codeql_databases
  - Or create one: #codeql_database_create
  - The database must contain code that exercises the target library

- [ ] **Explore the library's API surface**
  - Tool: #read_database_source — browse source files to identify relevant API calls
  - Tool: #codeql_query_run with `queryName="PrintAST"` — visualize how library calls are represented
  - Skim the library's public API docs, type stubs, or source code

### Phase 2: Classify the API Surface

For each public function or method on the library, classify it:

1. **Does it return data from outside the program** (network, file, env, stdin)? → `sourceModel` with `kind` matching the threat model (usually `"remote"`)
2. **Does it consume data in a security-sensitive operation** (SQL, exec, path, redirect, eval, deserialize)? → `sinkModel` with `kind` matching the vulnerability class (e.g. `"sql-injection"`, `"command-injection"`)
3. **Does it pass data through opaque library code** (encode, decode, wrap, copy, iterate)? → `summaryModel` with `kind: "taint"` (derived) or `kind: "value"` (identity)
4. **Does it sanitize data so its output is safe for a specific sink kind?** → `barrierModel` with `kind` matching the sink kind it neutralizes
5. **Does it return a boolean indicating whether data is safe?** → `barrierGuardModel` with the appropriate `acceptingValue` (`"true"` or `"false"`) and matching `kind`
6. **Is the type a subclass of something already modeled?** → `typeModel` (API Graph languages) or set `subtypes: True` (MaD tuple languages)
7. **Did the auto-generated model assign a wrong summary?** → `neutralModel` to suppress it

A complete chain of **source → (summary\*) → sink** is required for end-to-end findings; missing a single hop will cause false negatives.

### Phase 3: Choose the Deployment Scope

Choose between two paths:

- **Single-repo shortcut** — drop `.model.yml` files under `.github/codeql/extensions/<pack-name>/` in the consuming repo. **No `codeql-pack.yml` is required**; Code Scanning auto-loads extensions from this directory. Use when the models only need to apply to one repo.
- **Reusable model pack** — create a pack directory with a `codeql-pack.yml` declaring `extensionTargets` and `dataExtensions`. Use when models will be consumed by multiple repos or by org-wide Default Setup.

### Phase 4: Author the `.model.yml` File(s)

- [ ] **Create the model file**
  - Use naming convention `<library>-<module>.model.yml` (lowercase, hyphen-separated)
  - Split per logical module rather than putting an entire ecosystem in one file
  - Read `codeql://languages/{{language}}/library-modeling` for the exact column layout and examples

- [ ] **Write the YAML with correct extensible predicates**

  ```yaml
  extensions:
    - addsTo:
        pack: codeql/{{language}}-all
        extensible: sinkModel
      data:
        # Add tuples here — column count must exactly match the predicate schema
        - [...]
  ```

  - Every row must have the **exact column count** for its extensible predicate — an invalid row will fail silently or cause errors
  - Use `provenance: 'manual'` (MaD format) for hand-written rows
  - Ensure `kind` values match across the chain (e.g. a `"sql-injection"` barrier must guard a `"sql-injection"` sink)

### Phase 5: Configure `codeql-pack.yml` (Model-Pack Path Only)

Skip this step if you chose the `.github/codeql/extensions/` shortcut in Phase 3.

For a reusable pack, create or update `codeql-pack.yml`:

```yaml
name: <org>/<language>-<pack-name>
version: 0.0.1
library: true
extensionTargets:
  codeql/<language>-all: '*'
dataExtensions:
  - models/**/*.yml
```

- `library: true` — model packs are always libraries, never queries
- `extensionTargets` — names the upstream pack the extensions extend
- `dataExtensions` — a glob that picks up every `.model.yml` you author

- [ ] **Install pack dependencies**
  - Tool: #codeql_pack_install — resolve dependencies for the model pack

### Phase 6: Test with `codeql query run`

Validate the model against a real database:

- [ ] **Run a relevant security query with the extension applied**
  - Tool: #codeql_query_run
  - Pass the model pack directory via the `additionalPacks` parameter
  - Pick a query whose sink kind matches what you modeled (e.g. a `sql-injection` query when adding SQL sinks)
  - Decode results: #codeql_bqrs_decode or #codeql_bqrs_interpret

- [ ] **Verify expected findings appear**
  - New sources/sinks should produce findings that were absent without the extension
  - Barriers/barrier guards should suppress findings that were previously reported

### Phase 7: Run Unit Tests with `codeql test run`

- [ ] **Create a test case for the extension**
  - Write a small test file that exercises the new source/sink/summary chain end-to-end
  - Include both positive cases (vulnerable code detected) and negative cases (safe code not flagged)

- [ ] **Run the tests**
  - Tool: #codeql_test_run
  - Pass the model pack directory via the `additionalPacks` parameter
  - Note: `codeql test run` does **not** accept `--model-packs`; extensions must be wired via `codeql-pack.yml` or `--additional-packs`

- [ ] **Accept correct results**
  - Tool: #codeql_test_accept — accept the `.actual` output as the `.expected` baseline once you confirm it is correct

### Phase 8: Decide Next Steps

- If the `.model.yml` lives under `.github/codeql/extensions/` of the consuming repo, you are **done** — Code Scanning will load it on the next analysis.
- If you authored a reusable model pack and want it to apply across an organization, publish it to GHCR with `codeql pack publish` and configure it under org Code security → Global settings → CodeQL analysis → Model packs.

## Validation Checklist

- [ ] Correct tuple format for the language (API Graph vs MaD)
- [ ] Every row has the exact column count for its extensible predicate
- [ ] Sink/barrier `kind` values match across the chain
- [ ] At least one end-to-end test exercises the new model and produces expected findings
- [ ] `codeql-pack.yml` `dataExtensions` glob actually matches the new files
- [ ] No regressions in pre-existing tests under the same pack

## Related Resources

- `codeql://learning/data-extensions` — Common data extensions overview (both model formats)
- `codeql://languages/{{language}}/library-modeling` — Language-specific library modeling guide
- `codeql://templates/security` — Security query templates
- `codeql://learning/test-driven-development` — TDD workflow for CodeQL queries
