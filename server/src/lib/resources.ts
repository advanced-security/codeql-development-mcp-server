/**
 * CodeQL learning resources utilities
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the getting started guide content
 */
export function getGettingStartedGuide(): string {
  try {
    return readFileSync(join(__dirname, '../resources/getting-started.md'), 'utf-8');
  } catch {
    return 'Getting started guide not available';
  }
}

/**
 * Get the query basics guide content
 */
export function getQueryBasicsGuide(): string {
  try {
    return readFileSync(join(__dirname, '../resources/query-basics.md'), 'utf-8');
  } catch {
    return 'Query basics guide not available';
  }
}

/**
 * Get the security templates content
 */
export function getSecurityTemplates(): string {
  try {
    return readFileSync(join(__dirname, '../resources/security-templates.md'), 'utf-8');
  } catch {
    return 'Security templates not available';
  }
}

/**
 * Get the performance patterns content
 */
export function getPerformancePatterns(): string {
  try {
    return readFileSync(join(__dirname, '../resources/performance-patterns.md'), 'utf-8');
  } catch {
    return 'Performance patterns not available';
  }
}