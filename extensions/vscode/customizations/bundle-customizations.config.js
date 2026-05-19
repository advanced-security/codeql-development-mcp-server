/**
 * bundle-customizations.config.js
 *
 * Allowlist of prompts and skills to bundle into the VS Code extension.
 *
 * Each entry uses `{ src, dst }` so the bundled copy can be renamed at copy
 * time without modifying the source-of-truth files (which other tooling \u2014
 * notably the MCP server\u2019s prompt IDs \u2014 still resolves by original name).
 *
 * - Prompts: `src` is a filename under `server/src/prompts/`.
 *   `dst` is the bundled filename under `extensions/vscode/prompts/`.
 * - Skills: `src` is a directory name under `.github/skills/`.
 *   `dst` is the bundled directory name under `extensions/vscode/skills/`.
 *   The `name:` frontmatter inside each bundled `SKILL.md` is rewritten to
 *   match `dst` so VS Code\u2019s skill registry resolves it consistently.
 *
 * Missing entries are silently skipped with a console.warn \u2014 the build never
 * fails due to absent optional files.
 */

export const prompts = [
  { src: 'ql-tdd-basic.prompt.md', dst: 'ql-mcp-ext-tdd-basic.prompt.md' },
  { src: 'ql-tdd-advanced.prompt.md', dst: 'ql-mcp-ext-tdd-advanced.prompt.md' },
  { src: 'tools-query-workflow.prompt.md', dst: 'ql-mcp-ext-tools-query-workflow.prompt.md' },
  { src: 'workshop-creation-workflow.prompt.md', dst: 'ql-mcp-ext-workshop-creation-workflow.prompt.md' },
];

export const skills = [
  { src: 'create-codeql-query-development-workshop', dst: 'ql-mcp-ext-create-workshop' },
  { src: 'validate-ql-mcp-server-tools-queries', dst: 'ql-mcp-ext-validate-tools-queries' },
];
