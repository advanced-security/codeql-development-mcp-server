/**
 * CodeQL resources registration for MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getGettingStartedGuide,
  getQueryBasicsGuide,
  getSecurityTemplates,
  getPerformancePatterns,
} from '../lib/resources';

/**
 * Register all CodeQL resources with the MCP server
 */
export function registerCodeQLResources(server: McpServer): void {
  // Getting Started Guide
  server.resource(
    'CodeQL Getting Started',
    'codeql://learning/getting-started',
    {
      description: 'Comprehensive introduction to CodeQL for beginners',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://learning/getting-started',
            mimeType: 'text/markdown',
            text: getGettingStartedGuide(),
          },
        ],
      };
    }
  );

  // Query Basics Guide
  server.resource(
    'CodeQL Query Basics',
    'codeql://learning/query-basics',
    {
      description: 'Learn the fundamentals of writing CodeQL queries',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://learning/query-basics',
            mimeType: 'text/markdown',
            text: getQueryBasicsGuide(),
          },
        ],
      };
    }
  );

  // Security Templates
  server.resource(
    'CodeQL Security Templates',
    'codeql://templates/security',
    {
      description: 'Ready-to-use security query templates',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://templates/security',
            mimeType: 'text/markdown',
            text: getSecurityTemplates(),
          },
        ],
      };
    }
  );

  // Performance Patterns
  server.resource(
    'CodeQL Performance Patterns',
    'codeql://patterns/performance',
    {
      description: 'Best practices for writing efficient CodeQL queries',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://patterns/performance',
            mimeType: 'text/markdown',
            text: getPerformancePatterns(),
          },
        ],
      };
    }
  );
}
