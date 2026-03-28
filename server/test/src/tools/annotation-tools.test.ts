/**
 * Tests for annotation tools — registration gating and handler behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, rmSync } from 'fs';
import { registerAnnotationTools } from '../../../src/tools/annotation-tools';
import { sessionDataManager } from '../../../src/lib/session-data-manager';
import { createProjectTempDir } from '../../../src/utils/temp-dir';

describe('Annotation Tools', () => {
  let mockServer: McpServer;
  let testStorageDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    testStorageDir = createProjectTempDir('annotation-tools-test-');
  });

  afterEach(() => {
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('registerAnnotationTools', () => {
    describe('opt-in behavior', () => {
      it('should not register annotation tools when enableAnnotationTools is false', () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: false,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        registerAnnotationTools(mockServer);

        expect(mockServer.tool).not.toHaveBeenCalled();
      });

      it('should register annotation tools when enableAnnotationTools is true', () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        registerAnnotationTools(mockServer);

        const toolCalls = (mockServer.tool as any).mock.calls;
        const toolNames = toolCalls.map((call: any) => call[0]);

        expect(toolNames).toContain('annotation_create');
        expect(toolNames).toContain('annotation_delete');
        expect(toolNames).toContain('annotation_get');
        expect(toolNames).toContain('annotation_list');
        expect(toolNames).toContain('annotation_search');
        expect(toolNames).toContain('annotation_update');
        expect(mockServer.tool).toHaveBeenCalledTimes(6);
      });
    });

    describe('tool schema validation', () => {
      beforeEach(() => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });
      });

      it('should define annotation_get with integer positive id schema', () => {
        registerAnnotationTools(mockServer);

        const getCall = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_get',
        );
        expect(getCall).toBeDefined();
        const schema = getCall[2];
        expect(schema).toHaveProperty('id');

        // Validate the schema rejects non-positive-integers
        const parseResult = schema.id.safeParse(-1);
        expect(parseResult.success).toBe(false);

        const floatResult = schema.id.safeParse(1.5);
        expect(floatResult.success).toBe(false);

        const validResult = schema.id.safeParse(1);
        expect(validResult.success).toBe(true);
      });

      it('should define annotation_update with integer positive id schema', () => {
        registerAnnotationTools(mockServer);

        const updateCall = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_update',
        );
        expect(updateCall).toBeDefined();
        const schema = updateCall[2];
        expect(schema).toHaveProperty('id');

        const parseResult = schema.id.safeParse(0);
        expect(parseResult.success).toBe(false);

        const validResult = schema.id.safeParse(5);
        expect(validResult.success).toBe(true);
      });
    });

    describe('handler behavior', () => {
      beforeEach(async () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        await sessionDataManager.initialize();
      });

      afterEach(() => {
        sessionDataManager.getStore().close();
      });

      it('should create and retrieve an annotation', async () => {
        registerAnnotationTools(mockServer);

        const createHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_create',
        )[3];

        const createResult = await createHandler({
          category: 'note',
          entityKey: 'file:/src/main.ts:L10',
          content: 'This is a test note',
          label: 'test-label',
        });

        expect(createResult.content[0].text).toBeDefined();
        const created = JSON.parse(createResult.content[0].text);
        expect(created.id).toBeDefined();
        expect(created.category).toBe('note');

        // Now retrieve it
        const getHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_get',
        )[3];

        const getResult = await getHandler({ id: created.id });
        const annotation = JSON.parse(getResult.content[0].text);
        expect(annotation.content).toBe('This is a test note');
        expect(annotation.label).toBe('test-label');
      });

      it('should return not found for non-existent annotation', async () => {
        registerAnnotationTools(mockServer);

        const getHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_get',
        )[3];

        const result = await getHandler({ id: 99999 });
        expect(result.content[0].text).toContain('not found');
      });

      it('should list annotations with category filter', async () => {
        registerAnnotationTools(mockServer);

        const createHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_create',
        )[3];

        await createHandler({ category: 'bookmark', entityKey: 'a', content: 'one' });
        await createHandler({ category: 'note', entityKey: 'b', content: 'two' });
        await createHandler({ category: 'bookmark', entityKey: 'c', content: 'three' });

        const listHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_list',
        )[3];

        const result = await listHandler({ category: 'bookmark' });
        const items = JSON.parse(result.content[0].text);
        expect(items).toHaveLength(2);
      });

      it('should update an annotation', async () => {
        registerAnnotationTools(mockServer);

        const createHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_create',
        )[3];
        const createResult = await createHandler({
          category: 'note',
          entityKey: 'test',
          content: 'original',
        });
        const { id } = JSON.parse(createResult.content[0].text);

        const updateHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_update',
        )[3];

        const updateResult = await updateHandler({ id, content: 'updated' });
        const updated = JSON.parse(updateResult.content[0].text);
        expect(updated.content).toBe('updated');
      });

      it('should delete an annotation by id', async () => {
        registerAnnotationTools(mockServer);

        const createHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_create',
        )[3];
        const createResult = await createHandler({
          category: 'note',
          entityKey: 'to-delete',
          content: 'ephemeral',
        });
        const { id } = JSON.parse(createResult.content[0].text);

        const deleteHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_delete',
        )[3];

        const deleteResult = await deleteHandler({ id });
        expect(deleteResult.content[0].text).toContain('Deleted 1');
      });

      it('should require at least one filter for deletion', async () => {
        registerAnnotationTools(mockServer);

        const deleteHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_delete',
        )[3];

        const result = await deleteHandler({});
        expect(result.content[0].text).toContain('At least one filter');
      });

      it('should search annotations via FTS', async () => {
        registerAnnotationTools(mockServer);

        const createHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_create',
        )[3];

        await createHandler({
          category: 'finding',
          entityKey: 'a',
          content: 'SQL injection vulnerability in handler',
        });
        await createHandler({
          category: 'finding',
          entityKey: 'b',
          content: 'Cross-site scripting in template',
        });

        const searchHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'annotation_search',
        )[3];

        const result = await searchHandler({ search: 'injection' });
        const items = JSON.parse(result.content[0].text);
        expect(items.length).toBeGreaterThanOrEqual(1);
        expect(items[0].content).toContain('injection');
      });
    });
  });
});
