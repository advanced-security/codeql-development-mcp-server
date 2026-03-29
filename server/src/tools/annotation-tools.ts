/**
 * Annotation Tools — general-purpose notes and bookmarks on any entity.
 *
 * Opt-in via ENABLE_ANNOTATION_TOOLS=true (disabled by default).
 * Uses the shared SqliteStore from the session data manager.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sessionDataManager } from '../lib/session-data-manager';
import { logger } from '../utils/logger';

/**
 * Register all annotation tools with the MCP server.
 */
export function registerAnnotationTools(server: McpServer): void {
  const config = sessionDataManager.getConfig();

  if (!config.enableAnnotationTools) {
    logger.info(
      'Annotation tools are disabled (opt-in). Set ENABLE_ANNOTATION_TOOLS=true to enable annotation_* tools.',
    );
    return;
  }

  registerAnnotationCreateTool(server);
  registerAnnotationGetTool(server);
  registerAnnotationListTool(server);
  registerAnnotationUpdateTool(server);
  registerAnnotationDeleteTool(server);
  registerAnnotationSearchTool(server);

  logger.info('Registered annotation tools');
}

// ---------------------------------------------------------------------------
// annotation_create
// ---------------------------------------------------------------------------

function registerAnnotationCreateTool(server: McpServer): void {
  server.tool(
    'annotation_create',
    'Create a new annotation (note, bookmark, finding) on any entity.',
    {
      category: z.string().describe('Annotation category (e.g. "bookmark", "note", "finding", "audit-source").'),
      entityKey: z.string().describe('Entity key — a stable identifier for the annotated object (e.g. "repo:owner/name", "file:/path:L10", "query-result:id").'),
      content: z.string().optional().describe('Free-text content of the annotation.'),
      label: z.string().optional().describe('Short human-readable label.'),
      metadata: z.string().optional().describe('JSON-encoded structured metadata.'),
    },
    async ({ category, entityKey, content, label, metadata }) => {
      const store = sessionDataManager.getStore();
      const id = store.createAnnotation(category, entityKey, content, label, metadata);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ id, category, entityKey }, null, 2) }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// annotation_get
// ---------------------------------------------------------------------------

function registerAnnotationGetTool(server: McpServer): void {
  server.tool(
    'annotation_get',
    'Retrieve a single annotation by its numeric ID.',
    {
      id: z.number().int().positive().describe('The annotation ID (positive integer primary key).'),
    },
    async ({ id }) => {
      const store = sessionDataManager.getStore();
      const annotation = store.getAnnotation(id);
      if (!annotation) {
        return { content: [{ type: 'text' as const, text: `Annotation ${id} not found.` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(annotation, null, 2) }] };
    },
  );
}

// ---------------------------------------------------------------------------
// annotation_list
// ---------------------------------------------------------------------------

function registerAnnotationListTool(server: McpServer): void {
  server.tool(
    'annotation_list',
    'List annotations with optional filtering by category, entity key, or entity key prefix.',
    {
      category: z.string().optional().describe('Filter by annotation category.'),
      entityKey: z.string().optional().describe('Filter by exact entity key.'),
      entityKeyPrefix: z.string().optional().describe('Filter by entity key prefix (e.g. "repo:owner/name").'),
      limit: z.number().int().positive().optional().describe('Maximum number of results (default: 100).'),
      offset: z.number().int().nonnegative().optional().describe('Number of results to skip.'),
    },
    async ({ category, entityKey, entityKeyPrefix, limit, offset }) => {
      const store = sessionDataManager.getStore();
      const results = store.listAnnotations({
        category,
        entityKey,
        entityKeyPrefix,
        limit: limit ?? 100,
        offset,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
    },
  );
}

// ---------------------------------------------------------------------------
// annotation_update
// ---------------------------------------------------------------------------

function registerAnnotationUpdateTool(server: McpServer): void {
  server.tool(
    'annotation_update',
    'Update the content, label, or metadata of an existing annotation.',
    {
      id: z.number().int().positive().describe('The annotation ID to update (positive integer primary key).'),
      content: z.string().optional().describe('New content (replaces existing).'),
      label: z.string().optional().describe('New label (replaces existing).'),
      metadata: z.string().optional().describe('New JSON-encoded metadata (replaces existing).'),
    },
    async ({ id, content, label, metadata }) => {
      const store = sessionDataManager.getStore();
      const updated = store.updateAnnotation(id, { content, label, metadata });
      if (!updated) {
        return { content: [{ type: 'text' as const, text: `Annotation ${id} not found or no changes applied.` }] };
      }
      const annotation = store.getAnnotation(id);
      return { content: [{ type: 'text' as const, text: JSON.stringify(annotation, null, 2) }] };
    },
  );
}

// ---------------------------------------------------------------------------
// annotation_delete
// ---------------------------------------------------------------------------

function registerAnnotationDeleteTool(server: McpServer): void {
  server.tool(
    'annotation_delete',
    'Delete annotations by ID, category, or entity key prefix.',
    {
      id: z.number().optional().describe('Delete a specific annotation by ID.'),
      category: z.string().optional().describe('Delete all annotations in a category.'),
      entityKeyPrefix: z.string().optional().describe('Delete annotations matching an entity key prefix.'),
    },
    async ({ id, category, entityKeyPrefix }) => {
      if (id === undefined && !category && !entityKeyPrefix) {
        return { content: [{ type: 'text' as const, text: 'At least one filter (id, category, or entityKeyPrefix) is required.' }] };
      }
      const store = sessionDataManager.getStore();
      const deleted = store.deleteAnnotations({ id, category, entityKeyPrefix });
      return { content: [{ type: 'text' as const, text: `Deleted ${deleted} annotation(s).` }] };
    },
  );
}

// ---------------------------------------------------------------------------
// annotation_search
// ---------------------------------------------------------------------------

function registerAnnotationSearchTool(server: McpServer): void {
  server.tool(
    'annotation_search',
    'Full-text search across annotation content, metadata, and labels using SQLite FTS (token-based MATCH; use * suffix for prefix matching, e.g. "vulnerab*").',
    {
      search: z.string().describe('Full-text search query matched against annotation content, metadata, and label (SQLite FTS MATCH syntax; use * for prefix matching).'),
      category: z.string().optional().describe('Restrict search to a specific category.'),
      limit: z.number().int().positive().optional().describe('Maximum number of results (default: 50).'),
    },
    async ({ search, category, limit }) => {
      const store = sessionDataManager.getStore();
      const results = store.listAnnotations({
        search,
        category,
        limit: limit ?? 50,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
    },
  );
}
