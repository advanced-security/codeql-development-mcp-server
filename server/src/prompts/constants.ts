/**
 * Shared constants for MCP server workflow prompts and completions.
 *
 * This module exists to break the circular dependency between
 * `workflow-prompts.ts` and `prompt-completions.ts` — both need
 * access to the supported-language list, so it lives here instead
 * of in either consumer.
 */

/** Supported CodeQL languages for tools queries */
export const SUPPORTED_LANGUAGES = [
  'actions',
  'cpp',
  'csharp',
  'go',
  'java',
  'javascript',
  'python',
  'ruby',
  'rust',
  'swift',
] as const;

/**
 * CodeQL languages that support Models-as-Data (MaD) data extensions.
 *
 * This is the subset of {@link SUPPORTED_LANGUAGES} for which the server
 * registers a `codeql://languages/<language>/library-modeling` resource.
 * `actions` is intentionally excluded because the GitHub Actions language
 * does not support data extensions upstream.
 */
export const MAD_SUPPORTED_LANGUAGES = [
  'cpp',
  'csharp',
  'go',
  'java',
  'javascript',
  'python',
  'ruby',
  'rust',
  'swift',
] as const;
