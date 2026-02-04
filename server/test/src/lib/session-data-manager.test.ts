/**
 * Tests for session data manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionDataManager } from '../../../src/lib/session-data-manager';
import { existsSync, rmSync } from 'fs';

describe('SessionDataManager', () => {
  let sessionManager: SessionDataManager;
  const testStorageDir = '.ql-mcp-tracking-test';

  beforeEach(() => {
    // Clean up any existing test storage
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true });
    }
    
    sessionManager = new SessionDataManager({
      storageLocation: testStorageDir,
      autoTrackSessions: true,
    });
  });

  afterEach(() => {
    // Clean up test storage
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  describe('Session Lifecycle', () => {
    it('should start a new session', async () => {
      const sessionId = await sessionManager.startSession(
        '/test/query.ql',
        'javascript',
        'security',
        'Test query development'
      );
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should retrieve a session after creation', async () => {
      const queryPath = '/test/query.ql';
      const sessionId = await sessionManager.startSession(queryPath, 'javascript');
      
      const session = await sessionManager.getSession(sessionId);
      
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.queryPath).toBe(queryPath);
      expect(session?.language).toBe('javascript');
      expect(session?.status).toBe('active');
      expect(session?.mcpCalls).toEqual([]);
      expect(session?.testExecutions).toEqual([]);
      expect(session?.qualityScores).toEqual([]);
    });

    it('should end a session', async () => {
      const sessionId = await sessionManager.startSession('/test/query.ql', 'javascript');
      
      const endedSession = await sessionManager.endSession(sessionId, 'completed');
      
      expect(endedSession).toBeDefined();
      expect(endedSession?.status).toBe('completed');
      expect(endedSession?.endTime).toBeDefined();
    });

    it('should return null for non-existent session', async () => {
      const session = await sessionManager.getSession('non-existent-id');
      expect(session).toBeNull();
    });

    it('should list sessions', async () => {
      const sessionId1 = await sessionManager.startSession('/test/query1.ql', 'javascript');
      const sessionId2 = await sessionManager.startSession('/test/query2.ql', 'python');
      
      const sessions = await sessionManager.listSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions.find(s => s.sessionId === sessionId1)).toBeDefined();
      expect(sessions.find(s => s.sessionId === sessionId2)).toBeDefined();
    });

    it('should filter sessions by query path', async () => {
      await sessionManager.startSession('/test/query1.ql', 'javascript');
      await sessionManager.startSession('/test/query2.ql', 'python');
      
      const filteredSessions = await sessionManager.listSessions({
        queryPath: 'query1'
      });
      
      expect(filteredSessions).toHaveLength(1);
      expect(filteredSessions[0].queryPath).toBe('/test/query1.ql');
    });

    it('should filter sessions by language', async () => {
      await sessionManager.startSession('/test/query1.ql', 'javascript');
      await sessionManager.startSession('/test/query2.ql', 'python');
      
      const filteredSessions = await sessionManager.listSessions({
        language: 'python'
      });
      
      expect(filteredSessions).toHaveLength(1);
      expect(filteredSessions[0].language).toBe('python');
    });
  });

  describe('Session State Management', () => {
    it('should update session state', async () => {
      const sessionId = await sessionManager.startSession('/test/query.ql', 'javascript');
      
      const updatedSession = await sessionManager.updateSessionState(sessionId, {
        compilationStatus: 'success',
        testStatus: 'passing',
        filesPresent: ['/test/query.ql', '/test/query.md']
      });
      
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.currentState.compilationStatus).toBe('success');
      expect(updatedSession?.currentState.testStatus).toBe('passing');
      expect(updatedSession?.currentState.filesPresent).toEqual(['/test/query.ql', '/test/query.md']);
    });

    it('should track MCP calls', async () => {
      const sessionId = await sessionManager.startSession('/test/query.ql', 'javascript');
      
      const mcpCall = {
        callId: 'call-123',
        timestamp: new Date().toISOString(),
        toolName: 'codeql_query_compile',
        parameters: { query: '/test/query.ql' },
        result: { success: true },
        success: true,
        duration: 1500,
      };
      
      await sessionManager.addMCPCall(sessionId, mcpCall);
      
      const session = await sessionManager.getSession(sessionId);
      expect(session?.mcpCalls).toHaveLength(1);
      expect(session?.mcpCalls[0]).toEqual(mcpCall);
    });

    it('should track test executions', async () => {
      const sessionId = await sessionManager.startSession('/test/query.ql', 'javascript');
      
      const testExecution = {
        executionId: 'test-123',
        timestamp: new Date().toISOString(),
        type: 'test_run' as const,
        success: true,
        details: { passedTests: 5, failedTests: 0 },
        metrics: { passRate: 1.0, coverage: 0.9 }
      };
      
      await sessionManager.addTestExecution(sessionId, testExecution);
      
      const session = await sessionManager.getSession(sessionId);
      expect(session?.testExecutions).toHaveLength(1);
      expect(session?.testExecutions[0]).toEqual(testExecution);
      expect(session?.currentState.testStatus).toBe('passing');
    });

    it('should track quality scores', async () => {
      const sessionId = await sessionManager.startSession('/test/query.ql', 'javascript');
      
      const qualityScore = {
        scoreId: 'score-123',
        timestamp: new Date().toISOString(),
        overallScore: 85,
        dimensions: {
          syntacticCorrectness: 90,
          testCoverageResults: 80,
          documentationQuality: 75,
          functionalCorrectness: 95,
        },
        grade: 'B' as const,
        recommendations: ['Improve documentation coverage', 'Add more test cases'],
      };
      
      await sessionManager.addQualityScore(sessionId, qualityScore);
      
      const session = await sessionManager.getSession(sessionId);
      expect(session?.qualityScores).toHaveLength(1);
      expect(session?.qualityScores[0]).toEqual(qualityScore);
      expect(session?.recommendations).toEqual(qualityScore.recommendations);
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config = sessionManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.storageLocation).toBe(testStorageDir);
      expect(config.autoTrackSessions).toBe(true);
    });

    it('should update configuration', async () => {
      await sessionManager.updateConfig({
        autoTrackSessions: false,
        enableRecommendations: false,
      });
      
      const config = sessionManager.getConfig();
      expect(config.autoTrackSessions).toBe(false);
      expect(config.enableRecommendations).toBe(false);
    });
  });

  describe('Active Session Management', () => {
    it('should find active sessions for query', async () => {
      const queryPath = '/test/query.ql';
      const sessionId1 = await sessionManager.startSession(queryPath, 'javascript');
      const sessionId2 = await sessionManager.startSession(queryPath, 'javascript');
      
      // End one session
      await sessionManager.endSession(sessionId1, 'completed');
      
      const activeSessions = await sessionManager.getActiveSessionsForQuery(queryPath);
      
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].sessionId).toBe(sessionId2);
      expect(activeSessions[0].status).toBe('active');
    });

    it('should return empty array for query with no active sessions', async () => {
      const activeSessions = await sessionManager.getActiveSessionsForQuery('/nonexistent/query.ql');
      expect(activeSessions).toEqual([]);
    });
  });
});
