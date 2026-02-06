---
name: upgrade-codeql-cli-and-packs
description: Upgrade the CodeQL CLI version and synchronize all ql-mcp-* pack dependencies to maintain compatibility. Use this skill when a new CodeQL CLI version is released and the MCP server needs to be updated to use it.
---

# Upgrade CodeQL CLI and QL Packs

This skill guides you through upgrading the CodeQL CLI version used by the MCP server and synchronizing all `ql-mcp-*` query packs to use compatible library versions.

## When to Use This Skill

- A new CodeQL CLI version has been released
- You need to update `.codeql-version` to a newer version
- Query unit tests are failing with database compatibility errors
- You see errors like "Cannot downgrade to..." or "database is not compatible with a QL library"

## Prerequisites

- Access to the CodeQL CLI (via `gh codeql` extension or direct installation)

## Key Concepts

### Version Alignment Strategy

This repository uses a **CLI-aligned versioning strategy** across all version-bearing files:

1. **`.codeql-version`**: Contains the target CLI version (e.g., `v2.23.9`)
2. **`package.json` versions**: All `package.json` files (root, client, server) use the CLI version number without the "v" prefix (e.g., `2.23.9`)
3. **`ql-mcp-*` pack versions**: Use the CLI version number without the "v" prefix (e.g., `2.23.9`)
4. **`codeql/*-all` dependencies**: Must have `cliVersion <= target CLI version`

### Why Database Compatibility Matters

CodeQL databases contain a **dbscheme** that defines the database structure. The dbscheme in:

- The **CLI's extractor** (used when creating databases)
- The **`codeql/*-all` library pack** (used when running queries)

**Must match exactly**, or queries will fail with compatibility errors.

### Common Compatibility Error

```
A fatal error occurred: The CodeQL database is not compatible with a QL library referenced by the query you are trying to run.
The database may be too new for the QL libraries the query is using; try upgrading them.
```

This occurs when:

- The CLI extractor uses a newer dbscheme than the library pack expects
- Using wildcard (`*`) dependencies that resolve to incompatible pack versions

## Upgrade Workflow

### Phase 1: Update CLI Version

#### 1.1 Update `.codeql-version`

Edit `.codeql-version` to the new target version:

```
vX.XX.Y
```

#### 1.2 Install the New CLI Version

```bash
gh codeql set-version vX.XX.Y
codeql version  # Verify installation
```

#### 1.3 Update package.json Versions

All `package.json` files must have their `version` field set to match the CLI version (without the "v" prefix):

| File                  | Field to Update |
| --------------------- | --------------- |
| `package.json`        | `version`       |
| `client/package.json` | `version`       |
| `server/package.json` | `version`       |

Example: If `.codeql-version` is `v2.23.9`, set all `package.json` versions to `"version": "2.23.9"`.

After updating, regenerate the lock file:

```bash
npm install
```

### Phase 2: Identify Compatible Pack Versions

#### 2.1 List Available Packs

Use the `codeql_pack_ls` MCP tool to see what pack versions are installed:

```json
{
  "dir": "~/.codeql/packages",
  "format": "json"
}
```

#### 2.2 Check Pack CLI Compatibility

For each `codeql/*-all` pack, verify it was built for a compatible CLI version by checking the `cliVersion` field in its `qlpack.yml`:

```bash
for lang in actions cpp csharp go java javascript python ruby swift; do
  version=$(ls ~/.codeql/packages/codeql/${lang}-all/ | head -1)
  echo "$lang-all@$version: $(cat ~/.codeql/packages/codeql/${lang}-all/$version/qlpack.yml | grep cliVersion)"
done
```

**Important**: The pack's `cliVersion` must be **≤** your target CLI version.

#### 2.3 Download Older Compatible Versions (If Needed)

If a pack has `cliVersion` newer than your target CLI, download an older version:

```bash
gh codeql pack download "codeql/{language}-all@{older-version}"
```

Then re-verify the `cliVersion` is compatible.

### Phase 3: Update codeql-pack.yml Files

#### 3.1 Files to Update

All `codeql-pack.yml` files under `server/ql/*/tools/`:

| Pack Type | Location                                      | Fields to Update                     |
| --------- | --------------------------------------------- | ------------------------------------ |
| Source    | `server/ql/{lang}/tools/src/codeql-pack.yml`  | `version`, `codeql/{lang}-all`       |
| Test      | `server/ql/{lang}/tools/test/codeql-pack.yml` | `version`, `ql-mcp-{lang}-tools-src` |

#### 3.2 Source Pack Template

```yaml
name: ql-mcp-{language}-tools-src
version: X.XX.Y # CLI version without 'v' prefix
library: false
dependencies:
  codeql/{language}-all: { compatible-version } # Explicit version, no wildcards
```

#### 3.3 Test Pack Template

```yaml
name: ql-mcp-{language}-tools-test
version: X.XX.Y # CLI version without 'v' prefix
dependencies:
  ql-mcp-{language}-tools-src: X.XX.Y # Same as version field
extractor: { language }
```

### Phase 4: Regenerate Lock Files

Use the `codeql_pack_install` MCP tool for each pack directory, or run the helper script:

```bash
./server/scripts/install-packs.sh
```

Or use the `codeql_pack_install` MCP tool for individual packs:

```json
{
  "packDir": "server/ql/{language}/tools/src"
}
```

### Phase 5: Validate Changes

#### 5.1 Run Query Unit Tests

Use the `codeql_test_run` MCP tool:

```json
{
  "tests": ["server/ql/{language}/tools/test"]
}
```

Or run all tests with the helper script:

```bash
./server/scripts/run-query-unit-tests.sh
```

#### 5.2 Handle Test Output Differences

Some library version upgrades cause non-deterministic output ordering changes. If tests fail with only ordering differences in `.expected` files (not logic changes), update the expected files to match the new output.

## Quick Reference: Languages and Pack Names

| Language   | Source Pack                 | Library Dependency    |
| ---------- | --------------------------- | --------------------- |
| actions    | ql-mcp-actions-tools-src    | codeql/actions-all    |
| cpp        | ql-mcp-cpp-tools-src        | codeql/cpp-all        |
| csharp     | ql-mcp-csharp-tools-src     | codeql/csharp-all     |
| go         | ql-mcp-go-tools-src         | codeql/go-all         |
| java       | ql-mcp-java-tools-src       | codeql/java-all       |
| javascript | ql-mcp-javascript-tools-src | codeql/javascript-all |
| python     | ql-mcp-python-tools-src     | codeql/python-all     |
| ruby       | ql-mcp-ruby-tools-src       | codeql/ruby-all       |
| swift      | ql-mcp-swift-tools-src      | codeql/swift-all      |

## Lessons Learned

### Never Use Wildcards in Dependencies

Wildcards resolve to the **latest** version, which may be incompatible:

```yaml
# Bad - may resolve to incompatible version
dependencies:
  codeql/cpp-all: '*'

# Good - explicit compatible version
dependencies:
  codeql/cpp-all: 6.1.4
```

### Pack cliVersion Rules

- Pack `cliVersion` must be **≤** target CLI version
- Packs built for the same minor version (e.g., 2.23.x) are usually compatible
- Different languages may require different pack versions due to independent release cycles

### Test Output Changes

Library upgrades can cause non-deterministic ordering changes in query output. These are cosmetic differences - update `.expected` files when the logic is unchanged but output order differs.

## Helper Script

See [verify-pack-compatibility.sh](verify-pack-compatibility.sh) for automated compatibility checking.

## Related Skills

- [add-mcp-support-for-new-language](../add-mcp-support-for-new-language/SKILL.md) - Adding support for new CodeQL languages
- [validate-ql-mcp-server-tools-queries](../validate-ql-mcp-server-tools-queries/SKILL.md) - Validating tool query functionality
