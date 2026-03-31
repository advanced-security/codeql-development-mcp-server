/**
 * Audit Tools — security-audit-state tracking built on the annotation store.
 *
 * These tools provide a repo-keyed workflow for storing CodeQL analysis
 * findings with notes, mirroring the seclab codeql_python MCP server's
 * SQLite-backed source tracking — but now backed by the shared SqliteStore.
 *
 * Enabled when ENABLE_ANNOTATION_TOOLS=true (disabled by default when annotation tools are off).
 * Audit tools are layered on annotations; there is no separate ENABLE_AUDIT_TOOLS flag.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sessionDataManager } from '../lib/session-data-manager';
import { logger } from '../utils/logger';

const AUDIT_CATEGORY = 'audit-finding';

/**
 * Register all audit tools with the MCP server.
 */
export function registerAuditTools(server: McpServer): void {
  const config = sessionDataManager.getConfig();

  if (!config.enableAnnotationTools) {
    logger.info(
      'Audit tools are disabled (opt-in). Set ENABLE_ANNOTATION_TOOLS=true to enable audit_* and annotation_* tools.',
    );
    return;
  }

  registerAuditStoreFindingsTool(server);
  registerAuditListFindingsTool(server);
  registerAuditAddNotesTool(server);
  registerAuditClearRepoTool(server);

  logger.info('Registered audit tools');
}

/**
 * Build a canonical repo key: "repo:owner/name" (lowercased).
 */
function repoKey(owner: string, repo: string): string {
  return `repo:${owner}/${repo}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// audit_store_findings
// ---------------------------------------------------------------------------

function registerAuditStoreFindingsTool(server: McpServer): void {
  server.tool(
    'audit_store_findings',
    'Store CodeQL analysis findings for a repository. Each finding is persisted as an annotation with category "audit-finding".',
    {
      owner: z.string().describe('Repository owner.'),
      repo: z.string().describe('Repository name.'),
      findings: z.array(z.object({
        sourceLocation: z.string().describe('File path of the finding.'),
        line: z.number().int().min(1).describe('Line number of the finding (integer >= 1).'),
        sourceType: z.string().describe('Type of the source (e.g. "RemoteFlowSource").'),
        description: z.string().optional().describe('Human-readable description.'),
      })).describe('Array of findings to store.'),
    },
    async ({ owner, repo, findings }) => {
      const store = sessionDataManager.getStore();
      const entityPrefix = repoKey(owner, repo);
      let stored = 0;

      for (const f of findings) {
        const entityKey = `${entityPrefix}:${f.sourceLocation}:L${f.line}`;
        const metadata = JSON.stringify({
          sourceType: f.sourceType,
          line: f.line,
          sourceLocation: f.sourceLocation,
        });

        // Check for existing annotation at this exact location to avoid duplicates
        const existing = store.listAnnotations({
          category: AUDIT_CATEGORY,
          entityKey,
          limit: 1,
        });

        if (existing.length === 0) {
          store.createAnnotation(AUDIT_CATEGORY, entityKey, f.description ?? null, f.sourceType, metadata);
          stored++;
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: `Stored ${stored} new finding(s) for ${owner}/${repo} (${findings.length - stored} duplicates skipped).`,
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// audit_list_findings
// ---------------------------------------------------------------------------

function registerAuditListFindingsTool(server: McpServer): void {
  server.tool(
    'audit_list_findings',
    'List all audit findings for a repository, including any analyst notes.',
    {
      owner: z.string().describe('Repository owner.'),
      repo: z.string().describe('Repository name.'),
      limit: z.number().int().positive().max(1000).optional().describe('Maximum number of results (1–1000).'),
    },
    async ({ owner, repo, limit }) => {
      const store = sessionDataManager.getStore();
      const entityPrefix = repoKey(owner, repo);
      const results = store.listAnnotations({
        category: AUDIT_CATEGORY,
        entityKeyPrefix: entityPrefix,
        limit: limit ?? 200,
      });

      // Enrich with parsed metadata for convenience
      const findings = results.map(a => {
        let meta: Record<string, unknown> = {};
        try { meta = JSON.parse(a.metadata || '{}'); } catch { /* ignore */ }
        return {
          id: a.id,
          sourceLocation: meta.sourceLocation ?? a.entity_key,
          line: meta.line,
          sourceType: a.label ?? meta.sourceType,
          notes: a.content,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        };
      });

      return { content: [{ type: 'text' as const, text: JSON.stringify(findings, null, 2) }] };
    },
  );
}

// ---------------------------------------------------------------------------
// audit_add_notes
// ---------------------------------------------------------------------------

function registerAuditAddNotesTool(server: McpServer): void {
  server.tool(
    'audit_add_notes',
    'Append notes to an existing audit finding. Identify the finding by findingId (preferred) or by owner+repo+sourceLocation+line.',
    {
      findingId: z.number().int().positive().optional().describe('Annotation ID of the finding (returned by audit_store_findings and audit_list_findings). Preferred lookup method.'),
      owner: z.string().optional().describe('Repository owner (required when findingId is not provided).'),
      repo: z.string().optional().describe('Repository name (required when findingId is not provided).'),
      sourceLocation: z.string().optional().describe('File path of the finding (required when findingId is not provided).'),
      line: z.number().int().min(1).optional().describe('Line number of the finding (required when findingId is not provided).'),
      notes: z.string().describe('Notes to append.'),
    },
    async ({ findingId, owner, repo, sourceLocation, line, notes }) => {
      const store = sessionDataManager.getStore();

      // Primary lookup by findingId
      if (findingId) {
        const annotation = store.getAnnotation(findingId);
        if (!annotation || annotation.category !== AUDIT_CATEGORY) {
          return {
            content: [{ type: 'text' as const, text: `No audit finding found with id ${findingId}.` }],
          };
        }
        const updatedContent = (annotation.content || '') + '\n' + notes;
        store.updateAnnotation(annotation.id, { content: updatedContent.trim() });
        return {
          content: [{ type: 'text' as const, text: `Updated notes for finding id ${findingId}.` }],
        };
      }

      // Fallback lookup by composite key
      if (!owner || !repo || !sourceLocation || !line) {
        return {
          content: [{ type: 'text' as const, text: 'Either findingId or all of owner+repo+sourceLocation+line must be provided.' }],
        };
      }

      const entityKey = `${repoKey(owner, repo)}:${sourceLocation}:L${line}`;

      const existing = store.listAnnotations({
        category: AUDIT_CATEGORY,
        entityKey,
        limit: 1,
      });

      if (existing.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `No finding found at ${sourceLocation}:${line} in ${owner}/${repo}.` }],
        };
      }

      const annotation = existing[0];
      const updatedContent = (annotation.content || '') + '\n' + notes;
      store.updateAnnotation(annotation.id, { content: updatedContent.trim() });

      return {
        content: [{ type: 'text' as const, text: `Updated notes for finding at ${sourceLocation}:${line} in ${owner}/${repo}.` }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// audit_clear_repo
// ---------------------------------------------------------------------------

function registerAuditClearRepoTool(server: McpServer): void {
  server.tool(
    'audit_clear_repo',
    'Delete all audit findings for a repository.',
    {
      owner: z.string().describe('Repository owner.'),
      repo: z.string().describe('Repository name.'),
    },
    async ({ owner, repo }) => {
      const store = sessionDataManager.getStore();
      const entityPrefix = repoKey(owner, repo);
      const deleted = store.deleteAnnotations({
        category: AUDIT_CATEGORY,
        entityKeyPrefix: entityPrefix,
      });
      return {
        content: [{ type: 'text' as const, text: `Cleared ${deleted} finding(s) for ${owner}/${repo}.` }],
      };
    },
  );
}
