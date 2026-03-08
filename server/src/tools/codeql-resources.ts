/**
 * CodeQL resources registration for MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getLearningQueryBasics,
  getPerformancePatterns,
  getSecurityTemplates,
  getServerOverview,
  getServerPrompts,
  getServerQueries,
  getServerTools,
  getTestDrivenDevelopment,
} from '../lib/resources';

/**
 * Register all CodeQL resources with the MCP server
 */
export function registerCodeQLResources(server: McpServer): void {
  // Learning: Query Basics
  server.resource(
    'CodeQL Query Basics',
    'codeql://learning/query-basics',
    {
      description: 'QL query writing reference: syntax, metadata, from/where/select, common patterns, testing conventions',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://learning/query-basics',
            mimeType: 'text/markdown',
            text: getLearningQueryBasics(),
          },
        ],
      };
    }
  );

  // Learning: Test-Driven Development
  server.resource(
    'CodeQL Test-Driven Development',
    'codeql://learning/test-driven-development',
    {
      description: 'TDD theory and workflow for developing CodeQL queries with MCP tools',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://learning/test-driven-development',
            mimeType: 'text/markdown',
            text: getTestDrivenDevelopment(),
          },
        ],
      };
    }
  );

  // Patterns: Performance
  server.resource(
    'CodeQL Performance Patterns',
    'codeql://patterns/performance',
    {
      description: 'Performance profiling and optimization for CodeQL queries',
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

  // Server: Overview (primary onboarding guide)
  server.resource(
    'CodeQL Server Overview',
    'codeql://server/overview',
    {
      description: 'MCP server orientation guide: available tools, prompts, resources, and workflows',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://server/overview',
            mimeType: 'text/markdown',
            text: getServerOverview(),
          },
        ],
      };
    }
  );

  // Server: Prompts
  server.resource(
    'CodeQL Server Prompts',
    'codeql://server/prompts',
    {
      description: 'Complete reference of MCP prompts for CodeQL development workflows',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://server/prompts',
            mimeType: 'text/markdown',
            text: getServerPrompts(),
          },
        ],
      };
    }
  );

  // Server: Queries (bundled tools queries overview)
  server.resource(
    'CodeQL Server Queries',
    'codeql://server/queries',
    {
      description: 'Overview of bundled tools queries: PrintAST, PrintCFG, CallGraphFrom, CallGraphTo',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://server/queries',
            mimeType: 'text/markdown',
            text: getServerQueries(),
          },
        ],
      };
    }
  );

  // Server: Tools
  server.resource(
    'CodeQL Server Tools',
    'codeql://server/tools',
    {
      description: 'Complete reference of default MCP tools for CodeQL development',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://server/tools',
            mimeType: 'text/markdown',
            text: getServerTools(),
          },
        ],
      };
    }
  );

  // Templates: Security
  server.resource(
    'CodeQL Security Templates',
    'codeql://templates/security',
    {
      description: 'Security query templates for multiple languages and vulnerability classes',
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
}
