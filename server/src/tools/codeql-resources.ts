/**
 * CodeQL resources registration for MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getGettingStartedGuide,
  getPerformancePatterns,
  getQueryBasicsGuide,
  getSecurityTemplates,
  getServerPrompts,
  getServerTools,
  getTestDrivenDevelopment,
} from '../lib/resources';

/**
 * Register all CodeQL resources with the MCP server
 */
export function registerCodeQLResources(server: McpServer): void {
  // Server Overview (primary onboarding guide)
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
            text: getGettingStartedGuide(),
          },
        ],
      };
    }
  );

  // Server Prompts Overview
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

  // Server Queries Guide
  server.resource(
    'CodeQL Query Writing Guide',
    'codeql://server/queries',
    {
      description: 'Practical reference for writing and validating CodeQL queries using MCP tools',
      mimeType: 'text/markdown',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'codeql://server/queries',
            mimeType: 'text/markdown',
            text: getQueryBasicsGuide(),
          },
        ],
      };
    }
  );

  // Server Tools Overview
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

  // Test-Driven Development Guide
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

  // Security Templates
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

  // Performance Patterns
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
}
