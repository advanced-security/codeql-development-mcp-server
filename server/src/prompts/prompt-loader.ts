/**
 * Utility functions for loading prompt template files
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a prompt template from a .prompt.md file
 */
export function loadPromptTemplate(promptFileName: string): string {
  try {
    const promptPath = join(__dirname, promptFileName);
    return readFileSync(promptPath, 'utf-8');
  } catch (error) {
    return `Prompt template '${promptFileName}' not available: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
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