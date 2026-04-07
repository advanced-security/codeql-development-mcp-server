/**
 * Tool input validation enhancement for the MCP server.
 *
 * The upstream MCP SDK (`getParseErrorMessage` in `zod-compat.js`) extracts
 * only the *first* Zod issue when a tool call fails validation.  This module
 * overrides `McpServer.validateToolInput` so that **all** issues are surfaced
 * in a single, human-readable error message.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// ─── Error formatting ────────────────────────────────────────────────────────

/**
 * Format all Zod validation issues into a single, human-readable message.
 *
 * - Groups missing-required-field errors into one line
 *   (`must have required properties: 'a', 'b'`).
 * - Appends any other validation errors individually.
 */
export function formatAllValidationErrors(error: z.ZodError): string {
  const { issues } = error;

  if (issues.length === 0) return 'Unknown validation error';

  // Partition into "required-field missing" vs "everything else"
  const missingRequired: string[] = [];
  const otherErrors: string[] = [];

  for (const issue of issues) {
    const path = issue.path.join('.');

    if (issue.code === 'invalid_type' && issue.received === 'undefined' && path) {
      missingRequired.push(`'${path}'`);
    } else {
      otherErrors.push(path ? `${path}: ${issue.message}` : issue.message);
    }
  }

  const parts: string[] = [];

  if (missingRequired.length === 1) {
    parts.push(`must have required property ${missingRequired[0]}`);
  } else if (missingRequired.length > 1) {
    parts.push(`must have required properties: ${missingRequired.join(', ')}`);
  }

  parts.push(...otherErrors);

  return parts.join('; ');
}

// ─── Schema resolution ───────────────────────────────────────────────────────

/**
 * Resolve the tool's `inputSchema` into a parsable Zod schema.
 *
 * Handles both:
 * - Raw Zod shapes (`{ owner: z.string(), ... }`) — wraps with `z.object()`
 * - Pre-built Zod schemas (ZodObject, ZodEffects, etc.) — returns as-is
 */
function resolveZodSchema(inputSchema: unknown): z.ZodTypeAny | undefined {
  if (!inputSchema || typeof inputSchema !== 'object') return undefined;

  const schema = inputSchema as Record<string, unknown>;

  // Already a Zod schema instance (has _def for Zod v3 or _zod for v4)
  if ('_def' in schema || '_zod' in schema) {
    return inputSchema as z.ZodTypeAny;
  }

  // Check for raw Zod shape (all values are Zod schemas)
  const values = Object.values(schema);
  if (
    values.length > 0 &&
    values.every(
      (v) =>
        typeof v === 'object' &&
        v !== null &&
        ('_def' in (v as Record<string, unknown>) ||
          '_zod' in (v as Record<string, unknown>) ||
          typeof (v as Record<string, unknown>).parse === 'function'),
    )
  ) {
    return z.object(schema as z.ZodRawShape);
  }

  return undefined;
}

// ─── Prototype patch ─────────────────────────────────────────────────────────

/**
 * Patch `McpServer.prototype.validateToolInput` so that **all** validation
 * errors are reported in a single response instead of only the first one.
 *
 * Call this once after constructing the McpServer and before connecting
 * any transport.
 */
export function patchValidateToolInput(server: McpServer): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = server as any;

  instance.validateToolInput = async function (
    tool: { inputSchema?: unknown },
    args: unknown,
    toolName: string,
  ): Promise<unknown> {
    if (!tool.inputSchema) {
      return undefined;
    }

    const schema = resolveZodSchema(tool.inputSchema);
    if (!schema) {
      // Unrecognized schema type — fall back to no validation (same as SDK)
      return args;
    }

    const parseResult = await schema.safeParseAsync(args);

    if (!parseResult.success) {
      const errorMessage = formatAllValidationErrors(parseResult.error);
      throw new McpError(
        ErrorCode.InvalidParams,
        `Input validation error: Invalid arguments for tool ${toolName}: ${errorMessage}`,
      );
    }

    return parseResult.data;
  };
}
