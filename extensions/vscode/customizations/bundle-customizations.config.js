/**
 * bundle-customizations.config.js
 *
 * Whitelist of prompts and skills to bundle into the VS Code extension.
 * Prompts are sourced from server/src/prompts/.
 * Skills are sourced from .github/skills/<name>/SKILL.md.
 *
 * Missing entries are silently skipped with a console.warn — the build
 * never fails due to absent optional files.
 */

export const prompts = [
  'ql-tdd-basic.prompt.md',
  'ql-tdd-advanced.prompt.md',
  'tools-query-workflow.prompt.md',
  'workshop-creation-workflow.prompt.md',
];

export const skills = [
  'create-codeql-query-development-workshop',
  'create-codeql-query-tdd-generic',
  'validate-ql-mcp-server-tools-queries',
];
