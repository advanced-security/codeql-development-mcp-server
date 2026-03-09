/**
 * CodeQL learning resources utilities.
 *
 * Resource files are imported as static string literals at build time via
 * esbuild's `loader: { '.md': 'text' }` configuration. This ensures they
 * are embedded in the bundled JS and available at runtime regardless of the
 * execution layout (monorepo source, npm install, or VSIX bundle).
 */

// Static imports — esbuild inlines the file contents as string literals.
import dataflowMigrationContent from '../resources/dataflow-migration-v1-to-v2.md';
import learningQueryBasicsContent from '../resources/learning-query-basics.md';
import performancePatternsContent from '../resources/performance-patterns.md';
import qlTestDrivenDevelopmentContent from '../resources/ql-test-driven-development.md';
import queryUnitTestingContent from '../resources/codeql-query-unit-testing.md';
import securityTemplatesContent from '../resources/security-templates.md';
import serverOverviewContent from '../resources/server-overview.md';
import serverPromptsContent from '../resources/server-prompts.md';
import serverQueriesContent from '../resources/server-queries.md';
import serverToolsContent from '../resources/server-tools.md';

/**
 * Get the query basics learning guide content
 */
export function getLearningQueryBasics(): string {
  return learningQueryBasicsContent;
}

/**
 * Get the performance patterns content
 */
export function getPerformancePatterns(): string {
  return performancePatternsContent;
}

/**
 * Get the security templates content
 */
export function getSecurityTemplates(): string {
  return securityTemplatesContent;
}

/**
 * Get the server overview content
 */
export function getServerOverview(): string {
  return serverOverviewContent;
}

/**
 * Get the server prompts overview content
 */
export function getServerPrompts(): string {
  return serverPromptsContent;
}

/**
 * Get the server queries (bundled tools queries) overview content
 */
export function getServerQueries(): string {
  return serverQueriesContent;
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
  return qlTestDrivenDevelopmentContent;
}

/**
 * Get the query unit testing guide content
 */
export function getQueryUnitTesting(): string {
  return queryUnitTestingContent;
}

/**
 * Get the dataflow migration (v1 to v2) guide content
 */
export function getDataflowMigration(): string {
  return dataflowMigrationContent;
}