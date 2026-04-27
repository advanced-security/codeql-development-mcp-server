/**
 * Generic JSON Schema validation for ALL MCP server tools.
 *
 * Regression test for the class of bug where Zod types (e.g. `z.tuple()`)
 * serialize to JSON Schema values that strict validators (GitHub Copilot Chat,
 * OpenAI) reject with HTTP 400. Specifically, every property's JSON Schema
 * value MUST be an object or boolean — never a bare array.
 *
 * This test registers every tool category and validates the serialized
 * JSON Schema output so that no future tool can introduce a similar problem.
 *
 * @see https://github.com/advanced-security/codeql-development-mcp-server/pull/263
 */

import { describe, expect, it, vi } from 'vitest';

// Mock the logger to silence output during tests
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock session-data-manager to prevent file system side effects
vi.mock('../../../src/lib/session-data-manager', () => ({
  sessionDataManager: {
    getStore: vi.fn().mockReturnValue({
      getCacheEntryMeta: vi.fn(),
      listCacheEntries: vi.fn().mockReturnValue([]),
      getCacheEntryContent: vi.fn(),
      clearCacheEntries: vi.fn(),
    }),
    getConfig: vi.fn().mockReturnValue({
      storageLocation: '.tmp/test',
      autoTrackSessions: false,
      retentionDays: 90,
      includeCallParameters: false,
      includeCallResults: false,
      maxActiveSessionsPerQuery: 3,
      scoringFrequency: 'per_call',
      archiveCompletedSessions: false,
      enableAnnotationTools: true,
      enableRecommendations: false,
      enableMonitoringTools: true,
    }),
    initialize: vi.fn(),
  },
}));

// Mock CLI executor to prevent actual CodeQL binary resolution
vi.mock('../../../src/lib/cli-executor', () => ({
  resolveCodeQLBinary: vi.fn().mockReturnValue('codeql'),
  executeCodeQLCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

// Mock server-manager to prevent JVM warm-up
vi.mock('../../../src/lib/server-manager', () => ({
  initServerManager: vi.fn().mockReturnValue({
    warmUpLanguageServer: vi.fn(),
    warmUpCLIServer: vi.fn(),
  }),
  shutdownServerManager: vi.fn(),
  getServerManager: vi.fn().mockReturnValue(null),
}));

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { registerAnnotationTools } from '../../../src/tools/annotation-tools';
import { registerAuditTools } from '../../../src/tools/audit-tools';
import { registerCacheTools } from '../../../src/tools/cache-tools';
import { registerCodeQLTools } from '../../../src/tools/codeql-tools';
import { registerLSPTools } from '../../../src/tools/lsp';
import { registerMonitoringTools } from '../../../src/tools/monitoring-tools';
import { registerSarifTools } from '../../../src/tools/sarif-tools';

/**
 * Helper: register all tool categories onto a single McpServer instance,
 * mirroring the registration order in `codeql-development-mcp-server.ts`.
 */
function registerAllTools(server: McpServer): void {
  registerCodeQLTools(server);
  registerLSPTools(server);
  registerMonitoringTools(server);
  registerAnnotationTools(server);
  registerAuditTools(server);
  registerCacheTools(server);
  registerSarifTools(server);
}

/**
 * Helper: list all tools via the public `tools/list` JSON-RPC method using
 * an in-memory client/server pair. This exercises the same code path as a
 * real MCP client and avoids reaching into SDK-private fields.
 */
async function listToolsViaPublicAPI(server: McpServer): Promise<Tool[]> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'schema-test-client', version: '0.0.0' });
  await client.connect(clientTransport);
  try {
    const { tools } = await client.listTools();
    return tools;
  } finally {
    await client.close();
    await server.close();
  }
}

describe('Tool JSON Schema Validation (all tools)', () => {
  it('every tool inputSchema property must be an object or boolean — never a bare array', async () => {
    const server = new McpServer({ name: 'schema-test', version: '0.0.0' });
    registerAllTools(server);

    const tools = await listToolsViaPublicAPI(server);
    expect(tools.length).toBeGreaterThan(0);

    const offending: string[] = [];

    for (const tool of tools) {
      const jsonSchema = tool.inputSchema as {
        type?: string;
        properties?: Record<string, unknown>;
      };

      // Top-level schema must be an object, not an array.
      if (Array.isArray(jsonSchema)) {
        offending.push(`${tool.name} (top-level schema is an array)`);
        continue;
      }

      // Walk every property's schema value.
      for (const [propName, propSchema] of Object.entries(jsonSchema.properties ?? {})) {
        const isValid =
          typeof propSchema === 'boolean' ||
          (typeof propSchema === 'object' && propSchema !== null && !Array.isArray(propSchema));
        if (!isValid) {
          offending.push(`${tool.name}.${propName} = ${JSON.stringify(propSchema)}`);
        }

        // Recurse one level into nested object properties (catches nested
        // tuples like `z.object({ nested: z.tuple([...]) })`).
        if (
          typeof propSchema === 'object' &&
          propSchema !== null &&
          !Array.isArray(propSchema)
        ) {
          const nested = (propSchema as { properties?: Record<string, unknown> }).properties;
          if (nested) {
            for (const [nestedName, nestedSchema] of Object.entries(nested)) {
              const isNestedValid =
                typeof nestedSchema === 'boolean' ||
                (typeof nestedSchema === 'object' && nestedSchema !== null && !Array.isArray(nestedSchema));
              if (!isNestedValid) {
                offending.push(
                  `${tool.name}.${propName}.${nestedName} = ${JSON.stringify(nestedSchema)}`,
                );
              }
            }
          }
        }
      }
    }

    expect(offending).toEqual([]);
  });

  it('should register a meaningful number of tools (smoke check)', async () => {
    const server = new McpServer({ name: 'schema-test', version: '0.0.0' });
    registerAllTools(server);

    const tools = await listToolsViaPublicAPI(server);

    // Sanity: we expect at least 30 tools across all categories. If this
    // drops significantly it likely means a registration function is broken.
    expect(tools.length).toBeGreaterThanOrEqual(30);
  });

  it('no tool property uses z.tuple serialization (bare array items)', async () => {
    const server = new McpServer({ name: 'schema-test', version: '0.0.0' });
    registerAllTools(server);

    const tools = await listToolsViaPublicAPI(server);

    const tupleProps: string[] = [];

    for (const tool of tools) {
      const jsonSchema = tool.inputSchema as {
        properties?: Record<string, unknown>;
      };

      for (const [propName, propSchema] of Object.entries(jsonSchema.properties ?? {})) {
        // A z.tuple([...]) serializes with `items` as an array (positional).
        // Standard z.array() serializes `items` as a single schema object.
        if (
          typeof propSchema === 'object' &&
          propSchema !== null &&
          'items' in propSchema &&
          Array.isArray((propSchema as { items: unknown }).items)
        ) {
          tupleProps.push(`${tool.name}.${propName}`);
        }
      }
    }

    expect(
      tupleProps,
      `Tools with tuple-serialized properties (use z.object instead): ${tupleProps.join(', ')}`,
    ).toEqual([]);
  });

  it('query_results_cache_retrieve lineRange and resultIndices serialize as object types', async () => {
    const server = new McpServer({ name: 'schema-test', version: '0.0.0' });
    registerAllTools(server);

    const tools = await listToolsViaPublicAPI(server);
    const retrieveTool = tools.find(t => t.name === 'query_results_cache_retrieve');
    expect(retrieveTool, 'query_results_cache_retrieve must be registered').toBeTruthy();

    const jsonSchema = retrieveTool!.inputSchema as {
      properties: Record<string, { type?: string; properties?: Record<string, unknown> }>;
    };

    for (const propName of ['lineRange', 'resultIndices']) {
      const prop = jsonSchema.properties[propName];
      expect(prop, `${propName} must be present in JSON Schema`).toBeTruthy();
      expect(typeof prop, `${propName} schema must be an object`).toBe('object');
      expect(Array.isArray(prop), `${propName} schema must not be a bare array`).toBe(false);
      expect(prop.type, `${propName} must be type=object`).toBe('object');
      expect(prop.properties, `${propName} must declare start/end sub-properties`).toBeTruthy();
      expect(prop.properties).toHaveProperty('start');
      expect(prop.properties).toHaveProperty('end');
    }
  });
});
