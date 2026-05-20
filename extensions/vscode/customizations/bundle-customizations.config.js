/**
 * bundle-customizations.config.js
 *
 * Allowlist of skills to bundle into the VS Code extension.
 *
 * Workflow prompts are intentionally NOT bundled: they are served by the
 * `ql-mcp` MCP server via `prompts/list` and surfaced by VS Code Copilot
 * Chat as slash commands (e.g. `/ql_tdd_basic`). Bundling prompts here
 * would create two slash-command IDs for the same content and a stale
 * extension-side copy whenever the MCP-server prompt evolves. The empty
 * `prompts` array below preserves the bundler's `{ src, dst }` contract
 * so future bundling decisions are reversible without an API change.
 *
 * Each skill entry uses `{ src, dst }` so the bundled copy can be renamed
 * at copy time without modifying the source-of-truth files. The `name:`
 * frontmatter inside each bundled `SKILL.md` is rewritten to match `dst`
 * so VS Code's skill registry resolves it consistently.
 *
 * Missing entries are silently skipped with a console.warn — the build
 * never fails due to absent optional files.
 */

export const prompts = [];

export const skills = [
  { src: 'create-codeql-query-development-workshop', dst: 'ql-mcp-ext-create-workshop' },
  { src: 'validate-ql-mcp-server-tools-queries', dst: 'ql-mcp-ext-validate-tools-queries' },
];
