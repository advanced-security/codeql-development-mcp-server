/**
 * Language-specific resources implementation
 * Dynamically loads and serves language-specific AST references and security patterns
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { LANGUAGE_RESOURCES } from '../types/language-types';
import { logger } from '../utils/logger';

/**
 * Get the base path for ql resources
 */
function getQLBasePath(): string {
  // In production, this would be the path to the ql submodule
  // For now, we assume we're running from the server directory
  return join(process.cwd(), '..');
}

/**
 * Load content from a resource file
 */
function loadResourceContent(relativePath: string): string | null {
  try {
    const fullPath = join(getQLBasePath(), relativePath);
    
    if (!existsSync(fullPath)) {
      logger.warn(`Resource file not found: ${fullPath}`);
      return null;
    }
    
    return readFileSync(fullPath, 'utf-8');
  } catch (error) {
    logger.error(`Error loading resource file ${relativePath}:`, error);
    return null;
  }
}

/**
 * Register language-specific AST resources
 */
export function registerLanguageASTResources(server: McpServer): void {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.astFile) continue;
    
    const resourceUri = `codeql://languages/${langResource.language}/ast`;
    
    server.resource(
      `${langResource.language.toUpperCase()} AST Reference`,
      resourceUri,
      {
        description: `CodeQL AST class reference for ${langResource.language} programs`,
        mimeType: 'text/markdown'
      },
      async () => {
        const content = loadResourceContent(langResource.astFile!);
        
        if (!content) {
          return {
            contents: [{
              uri: resourceUri,
              mimeType: 'text/markdown',
              text: `# ${langResource.language.toUpperCase()} AST Reference\n\nResource file not found or could not be loaded.`
            }]
          };
        }
        
        return {
          contents: [{
            uri: resourceUri,
            mimeType: 'text/markdown',
            text: content
          }]
        };
      }
    );
  }
}

/**
 * Register language-specific security pattern resources
 */
export function registerLanguageSecurityResources(server: McpServer): void {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.securityFile) continue;
    
    const resourceUri = `codeql://languages/${langResource.language}/security`;
    
    server.resource(
      `${langResource.language.toUpperCase()} Security Patterns`,
      resourceUri,
      {
        description: `CodeQL security query patterns and framework modeling for ${langResource.language}`,
        mimeType: 'text/markdown'
      },
      async () => {
        const content = loadResourceContent(langResource.securityFile!);
        
        if (!content) {
          return {
            contents: [{
              uri: resourceUri,
              mimeType: 'text/markdown',
              text: `# ${langResource.language.toUpperCase()} Security Patterns\n\nResource file not found or could not be loaded.`
            }]
          };
        }
        
        return {
          contents: [{
            uri: resourceUri,
            mimeType: 'text/markdown',
            text: content
          }]
        };
      }
    );
  }
}

/**
 * Register additional language-specific resources (like Go's dataflow patterns)
 */
export function registerLanguageAdditionalResources(server: McpServer): void {
  for (const langResource of LANGUAGE_RESOURCES) {
    if (!langResource.additionalFiles) continue;
    
    for (const [resourceType, filePath] of Object.entries(langResource.additionalFiles)) {
      const resourceUri = `codeql://languages/${langResource.language}/${resourceType}`;
      
      server.resource(
        `${langResource.language.toUpperCase()} ${resourceType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        resourceUri,
        {
          description: `CodeQL ${resourceType.replace('-', ' ')} guide for ${langResource.language}`,
          mimeType: 'text/markdown'
        },
        async () => {
          const content = loadResourceContent(filePath);
          
          if (!content) {
            return {
              contents: [{
                uri: resourceUri,
                mimeType: 'text/markdown',
                text: `# ${langResource.language.toUpperCase()} ${resourceType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\nResource file not found or could not be loaded.`
              }]
            };
          }
          
          return {
            contents: [{
              uri: resourceUri,
              mimeType: 'text/markdown',
              text: content
            }]
          };
        }
      );
    }
  }
}

/**
 * Register all language-specific resources
 */
export function registerLanguageResources(server: McpServer): void {
  logger.info('Registering language-specific resources...');
  
  // Register AST references for all languages
  registerLanguageASTResources(server);
  
  // Register security patterns for languages that have them
  registerLanguageSecurityResources(server);
  
  // Register additional resources (like Go's dataflow patterns)
  registerLanguageAdditionalResources(server);
  
  logger.info(`Registered resources for ${LANGUAGE_RESOURCES.length} languages`);
}