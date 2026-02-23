/**
 * Utility functions for loading prompt template files.
 *
 * Prompt templates are imported as static string literals at build time via
 * esbuild's `loader: { '.md': 'text' }` configuration. This ensures they
 * are embedded in the bundled JS and available at runtime regardless of the
 * execution layout (monorepo source, npm install, or VSIX bundle).
 */

// Static imports — esbuild inlines the file contents as string literals.
import documentCodeqlQuery from './document-codeql-query.prompt.md';
import explainCodeqlQuery from './explain-codeql-query.prompt.md';
import qlLspIterativeDevelopment from './ql-lsp-iterative-development.prompt.md';
import qlTddAdvanced from './ql-tdd-advanced.prompt.md';
import qlTddBasic from './ql-tdd-basic.prompt.md';
import runQueryAndSummarizeFalsePositives from './run-query-and-summarize-false-positives.prompt.md';
import sarifRankFalsePositives from './sarif-rank-false-positives.prompt.md';
import sarifRankTruePositives from './sarif-rank-true-positives.prompt.md';
import toolsQueryWorkflow from './tools-query-workflow.prompt.md';
import workshopCreationWorkflow from './workshop-creation-workflow.prompt.md';

/**
 * Embedded prompt template map (filename → content).
 *
 * Every .prompt.md file in this directory must be listed here so it is
 * bundled into the output. The keys must match the filenames passed to
 * `loadPromptTemplate()` throughout the codebase.
 */
const PROMPT_TEMPLATES: Record<string, string> = {
  'document-codeql-query.prompt.md': documentCodeqlQuery,
  'explain-codeql-query.prompt.md': explainCodeqlQuery,
  'ql-lsp-iterative-development.prompt.md': qlLspIterativeDevelopment,
  'ql-tdd-advanced.prompt.md': qlTddAdvanced,
  'ql-tdd-basic.prompt.md': qlTddBasic,
  'run-query-and-summarize-false-positives.prompt.md': runQueryAndSummarizeFalsePositives,
  'sarif-rank-false-positives.prompt.md': sarifRankFalsePositives,
  'sarif-rank-true-positives.prompt.md': sarifRankTruePositives,
  'tools-query-workflow.prompt.md': toolsQueryWorkflow,
  'workshop-creation-workflow.prompt.md': workshopCreationWorkflow,
};

/**
 * Load a prompt template by filename.
 *
 * Returns the embedded template content, or a descriptive fallback message
 * if the template is not registered in the bundle.
 */
export function loadPromptTemplate(promptFileName: string): string {
  const content = PROMPT_TEMPLATES[promptFileName];
  if (content !== undefined) {
    return content;
  }
  return `Prompt template '${promptFileName}' not available: not found in embedded prompt templates. Add it to PROMPT_TEMPLATES in prompt-loader.ts.`;
}

/**
 * Process prompt template by replacing placeholders with actual values
 */
export function processPromptTemplate(template: string, variables: Record<string, string>): string {
  let processed = template;
  
  // Replace variables in the format {{variable}} or {variable}
  for (const [key, value] of Object.entries(variables)) {
    const patterns = [
      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
      new RegExp(`\\{${key}\\}`, 'g')
    ];
    
    for (const pattern of patterns) {
      processed = processed.replace(pattern, value);
    }
  }
  
  return processed;
}