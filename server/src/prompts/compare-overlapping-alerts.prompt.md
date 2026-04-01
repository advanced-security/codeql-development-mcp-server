---
agent: agent
---

# Compare Overlapping Alerts

## Goal

Compare CodeQL SARIF alerts across **any combination** of SARIF files, analysis runs, CodeQL databases, CodeQL versions, or query packs. Detect overlapping, redundant, or divergent results and classify each finding to guide query development decisions.

This workflow supports:

- Comparing alerts from **different rules** in the same SARIF (e.g., standard vs custom queries)
- Comparing alerts from **different SARIF files** (e.g., two separate `codeql database analyze` runs)
- Checking for **behavioral deviations** across CodeQL CLI versions or database rebuilds
- Detecting **redundancy** between custom query packs and standard query packs

## Workflow

### Step 1: Discover available rules

Use `sarif_list_rules` on each SARIF source to understand what rules and result counts are present:

```
sarif_list_rules(sarifPath="{{sarifPathA}}")
sarif_list_rules(sarifPath="{{sarifPathB}}")
```

If comparing within a single file, call it once. The response includes `ruleId`, `resultCount`, `kind`, `precision`, `severity`, and `tags` for each rule.

### Step 2: Choose a comparison strategy

Depending on the use case, choose the appropriate strategy:

**Same-file, different rules** (custom vs standard overlap):

- Use `sarif_extract_rule` to extract each rule's results from the same file
- Use `sarif_compare_alerts` to compare individual alert pairs

**Different files, same rule** (behavioral deviation across runs):

- Use `sarif_diff_runs` to get a high-level diff of added/removed/changed rules
- For changed rules, use `sarif_extract_rule` on both files and compare results

**Different files, different rules** (cross-pack overlap):

- Use `sarif_extract_rule` on each file with the respective rule IDs
- Use `sarif_compare_alerts` with different `sarifPath` values for alertA and alertB

### Step 3: Diff runs (for cross-run comparison)

When comparing two analysis runs, start with a structural diff:

```
sarif_diff_runs(
  sarifPathA="{{sarifPathA}}",
  sarifPathB="{{sarifPathB}}",
  labelA="baseline",
  labelB="comparison"
)
```

This returns `addedRules`, `removedRules`, `changedRules` (with result count deltas), and `unchangedRules`. Focus investigation on `changedRules` and `addedRules`.

### Step 4: Extract and visualize results

For rules of interest, extract full results and generate markdown reports:

```
sarif_extract_rule(sarifPath="{{sarifPathA}}", ruleId="<ruleId>")
sarif_rule_to_markdown(sarifPath="{{sarifPathA}}", ruleId="<ruleId>")
```

The markdown report includes:

- Rule summary with severity, precision, tags
- Query help text
- Results table with file, line, and message
- Mermaid `flowchart LR` diagrams for each dataflow path

### Step 5: Compare specific alerts for overlap

Use `sarif_compare_alerts` to compare individual results between rules or files. Each alert specifier can reference a **different SARIF file**:

```
sarif_compare_alerts(
  alertA={sarifPath="{{sarifPathA}}", ruleId="<ruleIdA>", resultIndex=0},
  alertB={sarifPath="{{sarifPathB}}", ruleId="<ruleIdB>", resultIndex=0},
  overlapMode="sink"
)
```

If sink overlap is found, re-check with `source` and `full-path` modes:

- **sink**: same primary alert location (file + line + column range overlap)
- **source**: same dataflow source (first step in threadFlow)
- **any-location**: any location in alertA overlaps any location in alertB (including intermediate steps)
- **full-path**: Jaccard similarity on dataflow path steps; `pathSimilarity` 0.0–1.0

### Step 6: Read source code context

For each overlapping pair, use `read_database_source` to read the relevant source file from the CodeQL database. **Note**: the `filePath` parameter uses the URI from the SARIF alert location, not an absolute path:

```
read_database_source(database="{{databasePath}}", filePath="<uri-from-alert>")
```

Read 10–20 lines around the flagged location for context. When comparing across databases, read from each database separately.

### Step 7: Classify each finding

For each overlapping or divergent pair, classify as:

1. **Redundant** — Same problem, same or very similar code path (`pathSimilarity > 0.7`). One query subsumes the other.
   - **Action**: add a `not` exclusion predicate to the more specific query, or configure alert suppression

2. **Complementary** — Same sink but different source models or taint configurations (`pathSimilarity < 0.3`). Both queries add defensive value.
   - **Action**: keep both; document the overlap in query help text

3. **False overlap** — Same file and line but semantically different issues (different arguments, different properties).
   - **Action**: no change needed

4. **Behavioral regression** — A rule that previously found N results now finds fewer (or zero). Visible via `sarif_diff_runs` `changedRules`.
   - **Action**: investigate query or library changes between CodeQL versions

5. **New coverage** — A rule appears in `addedRules` or has increased results. Indicates improved detection.
   - **Action**: review new results for false positive rate

### Step 8: Produce summary

Create a structured summary with:

- SARIF sources compared (file paths, labels, tool versions)
- Total alerts per rule per source
- Run diff summary: added/removed/changed rule counts
- For each overlap: classification, both alert messages, shared locations, path similarity
- Recommendations: which queries to prioritize, exclusion predicates to add, follow-up analysis needed

## Notes

- `ruleId` values correspond to CodeQL query `@id` metadata (e.g., `js/sql-injection`)
- `sarif_compare_alerts` supports **cross-file** comparison: `alertA.sarifPath` and `alertB.sarifPath` can be different files
- `sarif_diff_runs` compares by rule ID, not by result content — use it for high-level structural comparison, then drill into individual alerts
- `read_database_source` requires the database path — pass via the `databasePath` parameter or resolve it with `list_codeql_databases`
- When working from cached results, substitute `cacheKey` for `sarifPath` in all tool calls
- Path similarity above 0.7 usually indicates redundancy; below 0.3 indicates complementary coverage
- For cross-version comparison, run `codeql database analyze` with two different CodeQL CLI versions against the same database, save both SARIF files, and use `sarif_diff_runs` to compare
