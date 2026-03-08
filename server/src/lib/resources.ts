/**
 * CodeQL learning resources utilities.
 *
 * Resource files are imported as static string literals at build time via
 * esbuild's `loader: { '.md': 'text' }` configuration. This ensures they
 * are embedded in the bundled JS and available at runtime regardless of the
 * execution layout (monorepo source, npm install, or VSIX bundle).
 */

// Static imports — esbuild inlines the file contents as string literals.
import gettingStartedContent from '../resources/getting-started.md';
import performancePatternsContent from '../resources/performance-patterns.md';
import queryBasicsContent from '../resources/query-basics.md';
import securityTemplatesContent from '../resources/security-templates.md';
import serverPromptsContent from '../resources/server-prompts.md';
import serverToolsContent from '../resources/server-tools.md';
import testDrivenDevelopmentContent from '../resources/ql-test-driven-development.md';

/**
 * Get the getting started guide content
 */
export function getGettingStartedGuide(): string {
  return gettingStartedContent;
}

/**
 * Get the performance patterns content
 */
export function getPerformancePatterns(): string {
  return performancePatternsContent;
}

/**
 * Get the query basics guide content
 */
export function getQueryBasicsGuide(): string {
  return queryBasicsContent;
}

/**
 * Get the security templates content
 */
export function getSecurityTemplates(): string {
  return securityTemplatesContent;
}

/**
 * Get the server prompts overview content
 */
export function getServerPrompts(): string {
  return serverPromptsContent;
}

/**
 * Get the server tools overview content
 */
export function getServerTools(): string {
  return serverToolsContent;
}

/**
 * Get the test-driven development guide content
 */
export function getTestDrivenDevelopment(): string {
  return testDrivenDevelopmentContent;
}