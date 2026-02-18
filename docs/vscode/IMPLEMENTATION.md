# VS Code Extension — Implementation Tracker

> Tracks the implementation and testing of new features that integrate the
> `codeql-development-mcp-server` with the `github.vscode-codeql` extension.

## Branch

`dd/vscode-extension/1` (base: `main`)

## Completed on Branch

The initial commit (`9ea4b14`) adds:

- **VS Code extension** (`extensions/vscode/`) — registers the MCP server,
  discovers the CodeQL CLI, installs tool query packs, and bridges the
  vscode-codeql extension (database/query-results watchers).
- **Server: `list_codeql_databases` tool** — discovers databases from
  `CODEQL_DATABASES_BASE_DIRS`.
- **Server: `list_query_run_results` tool** — discovers query run result
  directories from `CODEQL_QUERY_RUN_RESULTS_DIRS`.
- **Server: `discovery-config` module** — parses colon-separated env var
  directory lists.
- Docs: `docs/vscode/extension.md`, updated `docs/ql-mcp/tools.md`.

---

## TODO 1: `list_mrva_run_results` Tool

**Status:** Not started

### Purpose

List available MRVA (Multi-Repository Variant Analysis) run results stored by
the vscode-codeql extension.

### Directory Structure (observed)

```
~/Library/Application Support/Code/User/globalStorage/github.vscode-codeql/variant-analyses/
├── 20438/
│   └── timestamp
├── 20439/
│   └── timestamp
├── 20440/
│   ├── repo_states.json
│   └── timestamp
├── 20442/
│   ├── repo_states.json
│   ├── timestamp
│   ├── arduino/Arduino/
│   │   ├── repo_task.json          # VariantAnalysisRepositoryTask
│   │   ├── results.zip
│   │   └── results/
│   │       ├── results.sarif
│   │       └── results.bqrs
│   └── exported-results/
│       └── results_<timestamp>/
│           ├── _summary.md
│           └── <owner>-<repo>.md
```

### `repo_task.json` Schema

```json
{
  "repository": { "id": 919161, "fullName": "arduino/Arduino", "private": false },
  "analysisStatus": "succeeded",
  "resultCount": 1,
  "artifactSizeInBytes": 14311,
  "databaseCommitSha": "a0df6e0...",
  "sourceLocationPrefix": "/home/runner/work/Arduino/Arduino",
  "artifactUrl": "https://..."
}
```

### `repo_states.json` Schema

```json
{
  "<repoId>": {
    "repositoryId": 919161,
    "downloadStatus": "succeeded"
  }
}
```

### Implementation Plan

1. **`server/src/lib/discovery-config.ts`** — add `getMrvaRunResultsDirs()`
   reading from `CODEQL_MRVA_RUN_RESULTS_DIRS` env var.
2. **`server/src/tools/codeql/list-mrva-run-results.ts`** — new tool that:
   - Scans each dir in `CODEQL_MRVA_RUN_RESULTS_DIRS` for numeric
     subdirectories (the MRVA run ID).
   - For each run, reads `repo_states.json` and enumerates
     `<owner>/<repo>/repo_task.json` entries.
   - Reports: run ID, timestamp, number of repos scanned, per-repo status,
     result counts, available artifacts (SARIF, BQRS).
   - Supports optional filtering by run ID.
3. **`server/src/tools/codeql/index.ts`** — export the new registration fn.
4. **`server/src/tools/codeql-tools.ts`** — register the new tool.
5. **`extensions/vscode/src/bridge/environment-builder.ts`** — set
   `CODEQL_MRVA_RUN_RESULTS_DIRS` to `storagePaths.getVariantAnalysisStoragePath()`.
6. **Unit tests:** `server/test/src/tools/codeql/list-mrva-run-results.test.ts`
   and `server/test/src/lib/discovery-config.test.ts` (extend).
7. **Client integration tests:**
   `client/integration-tests/primitives/tools/list_mrva_run_results/`.

### Acceptance Criteria

- [ ] Tool returns structured list of MRVA runs with repo details.
- [ ] Tool handles: empty dirs, missing `repo_states.json`, partial downloads.
- [ ] VS Code extension automatically sets the env var.
- [ ] Unit tests pass.
- [ ] Client integration tests pass.

---

## TODO 2: `profile_codeql_query_from_logs` Tool

**Status:** Not started

### Purpose

Parse CodeQL query evaluation logs into a performance profile, without
requiring re-execution of the query. Works with logs from:

- `codeql query run` (single query → single QUERY_STARTED/COMPLETED)
- `codeql database analyze` (multiple queries → multiple QUERY_STARTED/COMPLETED)
- vscode-codeql query runs (stored under `CODEQL_QUERY_RUN_RESULTS_DIRS`)

### Evaluator Log Format (`evaluator-log.jsonl`)

Pretty-printed JSON objects separated by `}\n{`. Event types observed:

| Event Type            | Single Query | Multi Query | Description                        |
| --------------------- | ------------ | ----------- | ---------------------------------- |
| `LOG_HEADER`          | 1            | 1           | Version info, start time           |
| `QUERY_STARTED`       | 1            | N           | Query name, eventId                |
| `PREDICATE_STARTED`   | many         | many        | Has `queryCausingWork` → eventId   |
| `PREDICATE_COMPLETED` | many         | many        | `startEvent`, duration, resultSize |
| `PIPELINE_STARTED`    | many         | many        | `predicateStartEvent`, raReference |
| `PIPELINE_COMPLETED`  | many         | many        | Mirrors PIPELINE_STARTED           |
| `CACHE_LOOKUP`        | some         | some        | Cache hits                         |
| `SENTINEL_EMPTY`      | many         | many        | Empty predicate evaluations        |
| `QUERY_COMPLETED`     | 1            | N           | `startEvent` → query eventId       |
| `LOG_FOOTER`          | 1            | 1           | End marker                         |

**Key multi-query insight:** Each `PREDICATE_STARTED` event has
`queryCausingWork` referencing the `eventId` of the `QUERY_STARTED` event that
triggered it. This allows grouping predicates by query in `database analyze`
logs.

### vscode-codeql Generated Files Per Query Run

| File                                 | Size     | Purpose                      |
| ------------------------------------ | -------- | ---------------------------- |
| `evaluator-log.jsonl`                | ~13-80MB | Raw structured evaluator log |
| `evaluator-log.summary`              | ~23MB    | Human-readable summary       |
| `evaluator-log.summary.jsonl`        | ~18MB    | Machine-readable summary     |
| `evaluator-log.summary.map`          | ~1MB     | Source mapping               |
| `evaluator-log.summary.symbols.json` | ~1.6MB   | Symbol metadata              |
| `evaluator-log-end.summary`          | ~61KB    | End-of-evaluation summary    |
| `query.log`                          | ~7.6MB   | Full query server log        |
| `results.bqrs`                       | varies   | Binary query results         |
| `results-interpreted.sarif`          | varies   | Interpreted SARIF results    |
| `results.dil`                        | ~26MB    | DIL representation           |
| `timestamp`                          | 13B      | ISO timestamp                |

### `evaluator-log.summary.jsonl` Format

Unlike the raw log, the summary uses **different key sets** per event type
(no `type` field). Key patterns:

1. **Header**: `{ summaryLogVersion, codeqlVersion, startTime }`
2. **Sentinel empty**: `{ completionTime, raHash, predicateName, appearsAs,
evaluationStrategy: "SENTINEL_EMPTY", sentinelRaHash, isCached? }`
3. **Computed predicate**: `{ completionTime, raHash, predicateName, appearsAs,
evaluationStrategy, dependencies, millis, pipelineRuns, position?,
queryCausingWork, ra, resultSize }`
4. **Recursive predicate**: additionally has `deltaSizes, layerSize,
predicateIterationMillis, mainHash`

### Implementation Plan

1. **`server/src/lib/evaluator-log-parser.ts`** — reusable streaming parser:
   - `parseEvaluatorLogStreaming(logPath, callback)` — stream-parses raw
     `evaluator-log.jsonl` using readline + brace-depth tracking.
   - `parseEvaluatorLogSummary(logPath, callback)` — stream-parses
     `evaluator-log.summary.jsonl`.
   - Shared `ProfileData` interface with per-query breakdown.
2. **`server/src/tools/codeql/profile-codeql-query-from-logs.ts`** — new tool:
   - Input: `evaluatorLog` (path to `evaluator-log.jsonl` or
     `evaluator-log.summary.jsonl`) + optional `outputDir`.
   - Auto-detects format (raw vs summary) from the first event.
   - Produces `ProfileData` with:
     - Per-query breakdown (for multi-query logs).
     - Top-N most expensive predicates.
     - Total duration, pipeline counts, cache hit rates.
   - Outputs JSON profile + optional Mermaid diagram.
   - Works with logs from any source: query runs, database analyze,
     vscode-codeql query history.
3. **`server/src/tools/codeql/index.ts`** — export new registration fn.
4. **`server/src/tools/codeql-tools.ts`** — register the new tool.
5. **Unit tests:** `server/test/src/lib/evaluator-log-parser.test.ts` and
   `server/test/src/tools/codeql/profile-codeql-query-from-logs.test.ts`.
6. **Client integration tests:**
   `client/integration-tests/primitives/tools/profile_codeql_query_from_logs/`.

### Acceptance Criteria

- [ ] Parses single-query `evaluator-log.jsonl` (from `codeql query run`).
- [ ] Parses multi-query `evaluator-log.jsonl` (from `codeql database analyze`).
- [ ] Parses `evaluator-log.summary.jsonl` (from vscode-codeql query history).
- [ ] Produces per-query profiling breakdown for multi-query logs.
- [ ] Reports top-N most expensive predicates with durations.
- [ ] Handles large logs (80MB+) without excessive memory usage.
- [ ] Unit tests pass.
- [ ] Client integration tests pass.

---

## TODO 3: Enhance `codeql_query_run` and `codeql_database_analyze` Logging

**Status:** Not started

### Purpose

Both tools should always produce the full set of log files that vscode-codeql
generates per query run, so that `profile_codeql_query_from_logs` can analyze
any run without special setup. This will allow deprecating and eventually
removing the `profile_codeql_query` tool.

### Current State

**`codeql_query_run`** already:

- Sets `--evaluator-log` to the log directory ✓
- Sets `--output` for BQRS ✓
- Generates SARIF interpretation post-run ✓
- Creates a `timestamp` file ✓
- Uses `--logdir` and `--verbosity=progress+` ✓
- Uses `timeout: 0` (no timeout) via FRESH_PROCESS_SUBCOMMANDS ✓

**Missing for `codeql_query_run`:**

- Does NOT run `codeql generate log-summary` to produce summary files.
- Does NOT enable `--tuple-counting` by default when evaluator logging is on.

**`codeql_database_analyze`** currently:

- Has NO log directory setup ✗
- Does NOT set `--evaluator-log` automatically ✗
- Does NOT generate summary files ✗
- Does NOT create a timestamp ✗
- Does NOT have a `logDir` parameter ✗
- Uses `timeout: 0` via FRESH_PROCESS_SUBCOMMANDS ✓

### Implementation Plan

1. **`server/src/tools/codeql/database-analyze.ts`** — add `logDir` parameter
   and `evaluator-log` / `tuple-counting` / `evaluator-log-level` options to
   the input schema.
2. **`server/src/lib/cli-tool-registry.ts`** — in the `registerCLITool`:
   - Add `codeql_database_analyze` alongside `codeql_query_run` in the log
     directory setup block (set `--evaluator-log`, `--logdir`, `timestamp`,
     `--verbosity`).
   - For both tools, after successful execution, run
     `codeql generate log-summary --format=jsonl` piping the raw evaluator log
     to produce `evaluator-log.summary.jsonl`.
   - Enable `--tuple-counting` by default when evaluator logging is active.
3. **Update unit tests** for the modified tools.

### Acceptance Criteria

- [ ] `codeql_query_run` produces: `evaluator-log.jsonl`,
      `evaluator-log.summary.jsonl`, `results.bqrs`, `results-interpreted.sarif`,
      `timestamp`.
- [ ] `codeql_database_analyze` produces the same set of log files.
- [ ] `--tuple-counting` is enabled by default for both tools.
- [ ] Logs are discoverable by `list_query_run_results`.
- [ ] Unit tests pass.

---

## TODO 4: VS Code Extension Updates

**Status:** Not started

### `environment-builder.ts` Changes

- Set `CODEQL_DATABASES_BASE_DIRS` from database storage path.
- Set `CODEQL_QUERY_RUN_RESULTS_DIRS` → `storagePaths.getQueryStoragePath()`
- Set `CODEQL_MRVA_RUN_RESULTS_DIRS` → `storagePaths.getVariantAnalysisStoragePath()`

### Documentation Updates

- `docs/ql-mcp/tools.md` — add `list_mrva_run_results` and
  `profile_codeql_query_from_logs` to tool tables.
- `docs/vscode/extension.md` — document the new env vars and discovery.

---

## Test Data

Fresh evaluator logs generated for testing:

| Log                                     | Location                                                        | Queries                      | Size |
| --------------------------------------- | --------------------------------------------------------------- | ---------------------------- | ---- |
| Single query (`codeql query run`)       | `.tmp/logs-query-run/evaluator-log.jsonl`                       | 1 (ListRemoteFlowSources.ql) | 13MB |
| Multi query (`codeql database analyze`) | `.tmp/logs-db-analyze/evaluator-log.jsonl`                      | 10 (UI5 pack)                | 79MB |
| vscode-codeql query run                 | `~/Library/.../queries/UI5Xss.ql-*/evaluator-log.jsonl`         | 1                            | 30MB |
| vscode-codeql query run                 | `~/Library/.../queries/UI5Xss.ql-*/evaluator-log.summary.jsonl` | 1                            | 18MB |
