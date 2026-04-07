/**
 * Tests for tool-validation — aggregated error reporting.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formatAllValidationErrors, patchValidateToolInput } from '../../../src/lib/tool-validation';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ─── formatAllValidationErrors ───────────────────────────────────────────────

describe('formatAllValidationErrors', () => {
  it('should report a single missing required field', () => {
    const schema = z.object({ owner: z.string() });
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatAllValidationErrors(result.error);
      expect(msg).toBe("must have required property 'owner'");
    }
  });

  it('should aggregate multiple missing required fields', () => {
    const schema = z.object({
      owner: z.string(),
      repo: z.string(),
      sourceLocation: z.string(),
    });
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatAllValidationErrors(result.error);
      expect(msg).toBe("must have required properties: 'owner', 'repo', 'sourceLocation'");
    }
  });

  it('should report type errors with path', () => {
    const schema = z.object({
      count: z.number(),
    });
    const result = schema.safeParse({ count: 'not-a-number' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatAllValidationErrors(result.error);
      expect(msg).toContain('count:');
      expect(msg).toContain('Expected number');
    }
  });

  it('should combine missing fields and type errors', () => {
    const schema = z.object({
      owner: z.string(),
      repo: z.string(),
      count: z.number(),
    });
    const result = schema.safeParse({ count: 'not-a-number' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatAllValidationErrors(result.error);
      expect(msg).toContain("must have required properties: 'owner', 'repo'");
      expect(msg).toContain('count:');
      expect(msg).toContain(';');
    }
  });

  it('should handle nested path errors', () => {
    const schema = z.object({
      findings: z.array(z.object({
        sourceLocation: z.string(),
        line: z.number(),
      })),
    });
    const result = schema.safeParse({ findings: [{ sourceLocation: 123 }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatAllValidationErrors(result.error);
      expect(msg).toContain('findings.0');
    }
  });

  it('should return fallback for empty issues', () => {
    const error = new z.ZodError([]);
    const msg = formatAllValidationErrors(error);
    expect(msg).toBe('Unknown validation error');
  });

  it('should handle custom Zod issues', () => {
    const schema = z.string().refine((s) => s.length > 3, {
      message: 'Must be longer than 3 characters',
    });
    const result = schema.safeParse('ab');
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatAllValidationErrors(result.error);
      expect(msg).toBe('Must be longer than 3 characters');
    }
  });
});

// ─── patchValidateToolInput ──────────────────────────────────────────────────

describe('patchValidateToolInput', () => {
  it('should override validateToolInput on the server instance', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
     
    const original = (server as any).validateToolInput;
    patchValidateToolInput(server);
     
    expect((server as any).validateToolInput).not.toBe(original);
  });

  it('should return undefined when tool has no inputSchema', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    patchValidateToolInput(server);
     
    const result = await (server as any).validateToolInput({}, {}, 'test_tool');
    expect(result).toBeUndefined();
  });

  it('should return parsed data for valid input with raw shape', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    patchValidateToolInput(server);
    const tool = {
      inputSchema: { owner: z.string(), repo: z.string() },
    };
     
    const result = await (server as any).validateToolInput(
      tool,
      { owner: 'octocat', repo: 'hello-world' },
      'test_tool',
    );
    expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' });
  });

  it('should return parsed data for valid input with Zod object schema', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    patchValidateToolInput(server);
    const tool = {
      inputSchema: z.object({ owner: z.string(), repo: z.string() }),
    };
     
    const result = await (server as any).validateToolInput(
      tool,
      { owner: 'octocat', repo: 'hello-world' },
      'test_tool',
    );
    expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' });
  });

  it('should throw with ALL missing fields for raw shape', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    patchValidateToolInput(server);
    const tool = {
      inputSchema: {
        owner: z.string(),
        repo: z.string(),
        sourceLocation: z.string(),
      },
    };
    try {
       
      await (server as any).validateToolInput(tool, {}, 'audit_store_findings');
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      const err = error as Error;
      expect(err.message).toContain('audit_store_findings');
      expect(err.message).toContain("'owner'");
      expect(err.message).toContain("'repo'");
      expect(err.message).toContain("'sourceLocation'");
      expect(err.message).toContain('must have required properties:');
    }
  });

  it('should throw with ALL missing fields for Zod object schema', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    patchValidateToolInput(server);
    const tool = {
      inputSchema: z.object({
        category: z.string(),
        entityKey: z.string(),
      }),
    };
    try {
       
      await (server as any).validateToolInput(tool, {}, 'annotation_create');
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      const err = error as Error;
      expect(err.message).toContain('annotation_create');
      expect(err.message).toContain("'category'");
      expect(err.message).toContain("'entityKey'");
      expect(err.message).toContain('must have required properties:');
    }
  });

  it('should throw with single missing field message (not plural)', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    patchValidateToolInput(server);
    const tool = {
      inputSchema: { owner: z.string(), repo: z.string().optional() },
    };
    try {
       
      await (server as any).validateToolInput(tool, {}, 'test_tool');
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      const err = error as Error;
      expect(err.message).toContain("must have required property 'owner'");
      expect(err.message).not.toContain('properties:');
    }
  });

  it('should report combined required and type errors', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    patchValidateToolInput(server);
    const tool = {
      inputSchema: {
        owner: z.string(),
        count: z.number(),
      },
    };
    try {
       
      await (server as any).validateToolInput(
        tool,
        { count: 'not-a-number' },
        'test_tool',
      );
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      const err = error as Error;
      expect(err.message).toContain("must have required property 'owner'");
      expect(err.message).toContain('count:');
    }
  });

  it('should pass through args for unrecognized schema types', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    patchValidateToolInput(server);
    const tool = { inputSchema: 'not-a-zod-schema' };
     
    const result = await (server as any).validateToolInput(
      tool,
      { foo: 'bar' },
      'test_tool',
    );
    expect(result).toEqual({ foo: 'bar' });
  });
});

// ─── E2E with InMemoryTransport ──────────────────────────────────────────────

describe('patchValidateToolInput (E2E with InMemoryTransport)', () => {
  it('should report all missing fields in one response via MCP protocol', async () => {
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');

    const server = new McpServer({ name: 'e2e-test', version: '1.0.0' });
    patchValidateToolInput(server);

    server.tool(
      'audit_store_findings',
      'Store findings',
      {
        owner: z.string().describe('Owner.'),
        repo: z.string().describe('Repo.'),
        sourceLocation: z.string().describe('Path.'),
      },
      async ({ owner, repo, sourceLocation }) => ({
        content: [{ type: 'text' as const, text: `${owner}/${repo}:${sourceLocation}` }],
      }),
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      // Call with no arguments — should report all three missing fields at once
      const result = await client.callTool({
        name: 'audit_store_findings',
        arguments: {},
      });

      // The SDK converts McpError into a tool error result
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)
        .map((c) => c.text)
        .join('');
      expect(text).toContain("'owner'");
      expect(text).toContain("'repo'");
      expect(text).toContain("'sourceLocation'");
      expect(text).toContain('must have required properties:');
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('should report single missing field (singular) via MCP protocol', async () => {
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');

    const server = new McpServer({ name: 'e2e-test', version: '1.0.0' });
    patchValidateToolInput(server);

    server.tool(
      'annotation_create',
      'Create annotation',
      {
        category: z.string().describe('Cat.'),
        entityKey: z.string().describe('Key.'),
      },
      async ({ category, entityKey }) => ({
        content: [{ type: 'text' as const, text: `${category}:${entityKey}` }],
      }),
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      // Supply only one of two required fields
      const result = await client.callTool({
        name: 'annotation_create',
        arguments: { category: 'note' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)
        .map((c) => c.text)
        .join('');
      expect(text).toContain("must have required property 'entityKey'");
      // Singular — should NOT contain "properties:"
      expect(text).not.toContain('properties:');
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('should succeed when all required fields are provided', async () => {
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');

    const server = new McpServer({ name: 'e2e-test', version: '1.0.0' });
    patchValidateToolInput(server);

    server.tool(
      'audit_store_findings',
      'Store findings',
      {
        owner: z.string().describe('Owner.'),
        repo: z.string().describe('Repo.'),
      },
      async ({ owner, repo }) => ({
        content: [{ type: 'text' as const, text: `${owner}/${repo}` }],
      }),
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const result = await client.callTool({
        name: 'audit_store_findings',
        arguments: { owner: 'octocat', repo: 'hello' },
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)
        .map((c) => c.text)
        .join('');
      expect(text).toBe('octocat/hello');
    } finally {
      await client.close();
      await server.close();
    }
  });
});
