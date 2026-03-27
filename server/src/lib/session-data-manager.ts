/**
 * Session Data Management
 * Provides session lifecycle management backed by SqliteStore (sql.js asm.js)
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getProjectTmpBase } from '../utils/temp-dir';
import { SqliteStore } from './sqlite-store';
import {
  QueryDevelopmentSession,
  QueryState,
  MCPCallRecord,
  TestExecutionRecord,
  QualityScoreRecord,
  SessionFilter,
  MonitoringConfig,
  MonitoringConfigSchema,
} from '../types/monitoring';
import { logger } from '../utils/logger';

/**
 * Session Data Manager - handles all session persistence and lifecycle.
 *
 * Sessions are stored as JSON blobs keyed by session_id in the shared
 * SqliteStore, replacing the previous lowdb JSON-file backend.
 */
export class SessionDataManager {
  private store: SqliteStore;
  private config: MonitoringConfig;
  private storageDir: string;

  constructor(configOverrides: Partial<MonitoringConfig> = {}) {
    this.config = MonitoringConfigSchema.parse({
      ...MonitoringConfigSchema.parse({}),
      ...configOverrides,
    });

    this.storageDir = this.config.storageLocation;
    this.ensureStorageDirectory();

    this.store = new SqliteStore(this.storageDir);
  }

  /**
   * Initialize the database and ensure it's properly set up.
   * Must be awaited before any session operations (sql.js init is async).
   */
  async initialize(): Promise<void> {
    try {
      await this.store.initialize();
      const count = this.store.countSessions();
      logger.info(`Session data manager initialized with ${count} sessions`);
    } catch (error) {
      logger.error('Failed to initialize session database:', error);
      throw error;
    }
  }

  /**
   * Get the underlying SqliteStore (used by annotation and audit tools).
   */
  getStore(): SqliteStore {
    return this.store;
  }

  /**
   * Ensure storage directory structure exists
   */
  private ensureStorageDirectory(): void {
    try {
      // mkdirSync with recursive: true is a no-op if directories already exist
      mkdirSync(this.storageDir, { recursive: true });

      // Create subdirectories
      const subdirs = ['sessions-archive', 'exports'];
      for (const subdir of subdirs) {
        mkdirSync(join(this.storageDir, subdir), { recursive: true });
      }

      // Use 'wx' flag (exclusive create) to atomically create config only
      // if it doesn't exist, avoiding TOCTOU race (CWE-367).
      const configPath = join(this.storageDir, 'config.json');
      try {
        writeFileSync(configPath, JSON.stringify(this.config, null, 2), { flag: 'wx' });
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code !== 'EEXIST') throw e;
      }

      logger.debug(`Storage directory initialized: ${this.storageDir}`);
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
      throw error;
    }
  }

  /**
   * Start a new query development session
   */
  async startSession(
    queryPath: string,
    language?: string,
    queryType?: string,
    description?: string
  ): Promise<string> {
    const sessionId = randomUUID();
    const startTime = new Date().toISOString();

    const session: QueryDevelopmentSession = {
      sessionId,
      queryPath,
      language: language || 'unknown',
      queryType,
      description,
      startTime,
      status: 'active',
      mcpCalls: [],
      testExecutions: [],
      qualityScores: [],
      currentState: {
        filesPresent: [],
        compilationStatus: 'unknown',
        testStatus: 'unknown',
        documentationStatus: 'unknown',
        lastActivity: startTime,
      },
      recommendations: [],
    };

    this.store.putSession(sessionId, session);

    logger.info(`Started new session: ${sessionId} for query: ${queryPath}`);
    return sessionId;
  }

  /**
   * End a session with final status
   */
  async endSession(
    sessionId: string,
    status: 'completed' | 'failed' | 'abandoned'
  ): Promise<QueryDevelopmentSession | null> {
    const session = this.store.getSession(sessionId) as QueryDevelopmentSession | null;
    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return null;
    }

    session.status = status;
    session.endTime = new Date().toISOString();
    session.currentState.lastActivity = session.endTime;

    this.store.putSession(sessionId, session);

    // Archive completed session if enabled
    if (this.config.archiveCompletedSessions && status === 'completed') {
      await this.archiveSession(sessionId);
    }

    logger.info(`Ended session: ${sessionId} with status: ${status}`);
    return session;
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<QueryDevelopmentSession | null> {
    const session = this.store.getSession(sessionId) as QueryDevelopmentSession | null;
    return session || null;
  }

  /**
   * List sessions with optional filtering
   */
  async listSessions(filters?: SessionFilter): Promise<QueryDevelopmentSession[]> {
    let sessions = this.store.getAllSessions() as QueryDevelopmentSession[];

    if (filters) {
      if (filters.queryPath) {
        sessions = sessions.filter(s => s.queryPath.includes(filters.queryPath!));
      }
      if (filters.status) {
        sessions = sessions.filter(s => s.status === filters.status);
      }
      if (filters.language) {
        sessions = sessions.filter(s => s.language === filters.language);
      }
      if (filters.queryType) {
        sessions = sessions.filter(s => s.queryType === filters.queryType);
      }
      if (filters.dateRange) {
        const [start, end] = filters.dateRange;
        sessions = sessions.filter(s => 
          s.startTime >= start && s.startTime <= end
        );
      }
    }

    return sessions;
  }

  /**
   * Update session state
   */
  async updateSessionState(
    sessionId: string,
    stateUpdate: Partial<QueryState>
  ): Promise<QueryDevelopmentSession | null> {
    const session = this.store.getSession(sessionId) as QueryDevelopmentSession | null;
    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return null;
    }

    session.currentState = {
      ...session.currentState,
      ...stateUpdate,
      lastActivity: new Date().toISOString(),
    };

    this.store.putSession(sessionId, session);
    return session;
  }

  /**
   * Add MCP call record to session
   */
  async addMCPCall(sessionId: string, callRecord: MCPCallRecord): Promise<void> {
    const session = this.store.getSession(sessionId) as QueryDevelopmentSession | null;
    if (!session) {
      logger.warn(`Session not found for MCP call: ${sessionId}`);
      return;
    }

    session.mcpCalls.push(callRecord);
    session.currentState.lastActivity = callRecord.timestamp;

    // Update next suggested tool if provided
    if (callRecord.nextSuggestedTool) {
      session.nextSuggestedTool = callRecord.nextSuggestedTool;
    }

    this.store.putSession(sessionId, session);
  }

  /**
   * Add test execution record to session
   */
  async addTestExecution(sessionId: string, testRecord: TestExecutionRecord): Promise<void> {
    const session = this.store.getSession(sessionId) as QueryDevelopmentSession | null;
    if (!session) {
      logger.warn(`Session not found for test execution: ${sessionId}`);
      return;
    }

    session.testExecutions.push(testRecord);
    session.currentState.lastActivity = testRecord.timestamp;

    // Update compilation/test status based on execution
    if (testRecord.type === 'compilation') {
      session.currentState.compilationStatus = testRecord.success ? 'success' : 'failed';
    } else if (testRecord.type === 'test_run') {
      session.currentState.testStatus = testRecord.success ? 'passing' : 'failing';
    }

    this.store.putSession(sessionId, session);
  }

  /**
   * Add quality score record to session
   */
  async addQualityScore(sessionId: string, scoreRecord: QualityScoreRecord): Promise<void> {
    const session = this.store.getSession(sessionId) as QueryDevelopmentSession | null;
    if (!session) {
      logger.warn(`Session not found for quality score: ${sessionId}`);
      return;
    }

    session.qualityScores.push(scoreRecord);
    session.currentState.lastActivity = scoreRecord.timestamp;
    session.recommendations = scoreRecord.recommendations;

    this.store.putSession(sessionId, session);
  }

  /**
   * Archive a completed session to monthly file
   */
  private async archiveSession(sessionId: string): Promise<void> {
    try {
      const session = this.store.getSession(sessionId) as QueryDevelopmentSession | null;
      if (!session) return;

      const date = new Date(session.endTime || session.startTime);
      const monthDir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const archiveDir = join(this.storageDir, 'sessions-archive', monthDir);

      mkdirSync(archiveDir, { recursive: true });

      const archiveFile = join(archiveDir, `${sessionId}.json`);
      writeFileSync(archiveFile, JSON.stringify(session, null, 2));

      // Remove from active sessions
      this.store.deleteSession(sessionId);

      logger.info(`Archived session: ${sessionId} to ${archiveFile}`);
    } catch (error) {
      logger.error(`Failed to archive session ${sessionId}:`, error);
    }
  }

  /**
   * Get active sessions for a specific query path
   */
  async getActiveSessionsForQuery(queryPath: string): Promise<QueryDevelopmentSession[]> {
    const sessions = this.store.getAllSessions() as QueryDevelopmentSession[];
    return sessions.filter(s =>
      s.queryPath === queryPath && s.status === 'active'
    );
  }

  /**
   * Clean up old sessions based on retention policy
   */
  async cleanupOldSessions(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    const cutoffTimestamp = cutoffDate.toISOString();

    const sessions = this.store.getAllSessions() as QueryDevelopmentSession[];
    const sessionsToRemove = sessions.filter(s =>
      s.endTime && s.endTime < cutoffTimestamp
    );

    for (const session of sessionsToRemove) {
      this.store.deleteSession(session.sessionId);
    }

    if (sessionsToRemove.length > 0) {
      logger.info(`Cleaned up ${sessionsToRemove.length} old sessions`);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MonitoringConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfig(configUpdate: Partial<MonitoringConfig>): Promise<void> {
    this.config = MonitoringConfigSchema.parse({
      ...this.config,
      ...configUpdate,
    });

    // Update config.json file only
    const configPath = join(this.storageDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(this.config, null, 2));

    logger.info('Updated monitoring configuration');
  }
}

/**
 * Parse boolean environment variable
 */
function parseBoolEnv(envVar: string | undefined, defaultValue: boolean): boolean {
  if (envVar === undefined) return defaultValue;
  return envVar.toLowerCase() === 'true' || envVar === '1';
}

// Export singleton instance with environment variable support
export const sessionDataManager = new SessionDataManager({
  storageLocation: process.env.MONITORING_STORAGE_LOCATION || join(getProjectTmpBase(), '.ql-mcp-tracking'),
  enableMonitoringTools: parseBoolEnv(process.env.ENABLE_MONITORING_TOOLS, false),
  enableAnnotationTools: parseBoolEnv(process.env.ENABLE_ANNOTATION_TOOLS, false),
});