/**
 * Language-specific resources implementation.
 *
 * Resource content is statically imported at build time via esbuild's
 * `.md: 'text'` loader (same pattern as `server/src/lib/resources.ts`).
 * No runtime filesystem access is needed.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LANGUAGE_RESOURCES } from '../types/language-types';
import { logger } from '../utils/logger';

/**
 * Register language-specific AST resources
 */
export function registerLanguageASTResources(server: McpServer): void {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.astContent) continue;

    const resourceUri = `codeql://languages/${langResource.language}/ast`;
    const content = langResource.astContent;

    server.resource(
      `${langResource.language.toUpperCase()} AST Reference`,
      resourceUri,
      {
        description: `CodeQL AST class reference for ${langResource.language} programs`,
        mimeType: 'text/markdown'
      },
      async () => ({
        contents: [{
          uri: resourceUri,
          mimeType: 'text/markdown',
          text: content
        }]
      })
    );
  }
}

/**
 * Register language-specific security pattern resources
 */
export function registerLanguageSecurityResources(server: McpServer): void {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.securityContent) continue;

    const resourceUri = `codeql://languages/${langResource.language}/security`;
    const content = langResource.securityContent;

    server.resource(
      `${langResource.language.toUpperCase()} Security Patterns`,
      resourceUri,
      {
        description: `CodeQL security query patterns and framework modeling for ${langResource.language}`,
        mimeType: 'text/markdown'
      },
      async () => ({
        contents: [{
          uri: resourceUri,
          mimeType: 'text/markdown',
          text: content
        }]
      })
    );
  }
}

/**
 * Register additional language-specific resources (like Go's dataflow patterns)
 */
export function registerLanguageAdditionalResources(server: McpServer): void {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.additionalResources) continue;

    for (const [resourceType, content] of Object.entries(langResource.additionalResources)) {
      const resourceUri = `codeql://languages/${langResource.language}/${resourceType}`;

      server.resource(
        `${langResource.language.toUpperCase()} ${resourceType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        resourceUri,
        {
          description: `CodeQL ${resourceType.replace('-', ' ')} guide for ${langResource.language}`,
          mimeType: 'text/markdown'
        },
        async () => ({
          contents: [{
            uri: resourceUri,
            mimeType: 'text/markdown',
            text: content
          }]
        })
      );
    }
  }
}

/**
 * Register all language-specific resources
 */
export function registerLanguageResources(server: McpServer): void {
  logger.info('Registering language-specific resources...');

  registerLanguageASTResources(server);
  registerLanguageSecurityResources(server);
  registerLanguageAdditionalResources(server);

  logger.info(`Registered resources for ${LANGUAGE_RESOURCES.length} languages`);
}