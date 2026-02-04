import { z } from 'zod';

/**
 * Monitoring and Reporting types for CodeQL Development MCP Server
 * Based on the specification in docs/mcp-server-monitoring-and-reporting.md
 */

/**
 * MCP Call Record - captures individual MCP tool calls
 */
export const MCPCallRecordSchema = z.object({
  callId: z.string(),
  timestamp: z.string(), // ISO timestamp
  toolName: z.string(),
  parameters: z.record(z.any()),
  result: z.any(),
  success: z.boolean(),
  duration: z.number(), // milliseconds
  nextSuggestedTool: z.string().optional(),
});

export type MCPCallRecord = z.infer<typeof MCPCallRecordSchema>;

/**
 * Test Execution Record - captures query compilation and test runs
 */
export const TestExecutionRecordSchema = z.object({
  executionId: z.string(),
  timestamp: z.string(),
  type: z.enum(['compilation', 'test_run', 'database_build']),
  success: z.boolean(),
  details: z.record(z.any()),
  metrics: z.object({
    passRate: z.number().optional(),
    coverage: z.number().optional(),
    performance: z.number().optional(),
  }).optional(),
});

export type TestExecutionRecord = z.infer<typeof TestExecutionRecordSchema>;

/**
 * Quality Score Record - multi-dimensional quality assessment
 */
export const QualityScoreRecordSchema = z.object({
  scoreId: z.string(),
  timestamp: z.string(),
  overallScore: z.number().min(0).max(100), // 0-100
  dimensions: z.object({
    syntacticCorrectness: z.number().min(0).max(100),
    testCoverageResults: z.number().min(0).max(100),
    documentationQuality: z.number().min(0).max(100),
    functionalCorrectness: z.number().min(0).max(100),
  }),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  recommendations: z.array(z.string()),
});

export type QualityScoreRecord = z.infer<typeof QualityScoreRecordSchema>;

/**
 * Query State - current state of the query development
 */
export const QueryStateSchema = z.object({
  filesPresent: z.array(z.string()),
  compilationStatus: z.enum(['unknown', 'success', 'failed']),
  testStatus: z.enum(['unknown', 'passing', 'failing', 'no_tests']),
  documentationStatus: z.enum(['unknown', 'present', 'missing', 'incomplete']),
  lastActivity: z.string(), // ISO timestamp
});

export type QueryState = z.infer<typeof QueryStateSchema>;

/**
 * Query Development Session - main data structure for tracking
 */
export const QueryDevelopmentSessionSchema = z.object({
  // Session Metadata
  sessionId: z.string(),
  queryPath: z.string(),
  language: z.string(),
  queryType: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string(), // ISO timestamp
  endTime: z.string().optional(), // ISO timestamp
  status: z.enum(['active', 'completed', 'failed', 'abandoned']),

  // MCP Call History
  mcpCalls: z.array(MCPCallRecordSchema),

  // Test Execution Records
  testExecutions: z.array(TestExecutionRecordSchema),

  // Quality Metrics
  qualityScores: z.array(QualityScoreRecordSchema),

  // Development State
  currentState: QueryStateSchema,
  recommendations: z.array(z.string()),
  nextSuggestedTool: z.string().optional(),
});

export type QueryDevelopmentSession = z.infer<typeof QueryDevelopmentSessionSchema>;

/**
 * Session Filter for listing and searching
 */
export const SessionFilterSchema = z.object({
  queryPath: z.string().optional(),
  status: z.string().optional(),
  dateRange: z.tuple([z.string(), z.string()]).optional(),
  language: z.string().optional(),
  queryType: z.string().optional(),
});

export type SessionFilter = z.infer<typeof SessionFilterSchema>;

/**
 * Comparison Report for analyzing multiple sessions
 */
export const ComparisonReportSchema = z.object({
  sessionIds: z.array(z.string()),
  dimensions: z.array(z.string()),
  timestamp: z.string(),
  results: z.record(z.any()),
});

export type ComparisonReport = z.infer<typeof ComparisonReportSchema>;

/**
 * Aggregate Report for batch analysis
 */
export const AggregateReportSchema = z.object({
  filters: SessionFilterSchema,
  timestamp: z.string(),
  totalSessions: z.number(),
  successRate: z.number(),
  averageQualityScore: z.number(),
  commonPatterns: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type AggregateReport = z.infer<typeof AggregateReportSchema>;

/**
 * Export Result for data export operations
 */
export const ExportResultSchema = z.object({
  format: z.enum(['json', 'html', 'markdown']),
  filename: z.string(),
  content: z.string(),
  timestamp: z.string(),
});

export type ExportResult = z.infer<typeof ExportResultSchema>;

/**
 * Functional Test Result for automated testing
 */
export const FunctionalTestResultSchema = z.object({
  sessionId: z.string(),
  queryPath: z.string(),
  passed: z.boolean(),
  criteria: z.record(z.any()),
  details: z.record(z.any()),
  timestamp: z.string(),
});

export type FunctionalTestResult = z.infer<typeof FunctionalTestResultSchema>;

/**
 * Test Report for comprehensive test analysis
 */
export const TestReportSchema = z.object({
  sessionIds: z.array(z.string()),
  criteria: z.record(z.any()),
  timestamp: z.string(),
  overallPassRate: z.number(),
  results: z.array(FunctionalTestResultSchema),
  summary: z.record(z.any()),
});

export type TestReport = z.infer<typeof TestReportSchema>;

/**
 * Monitoring Configuration
 */
export const MonitoringConfigSchema = z.object({
  storageLocation: z.string().default('.ql-mcp-tracking/'),
  autoTrackSessions: z.boolean().default(true),
  retentionDays: z.number().default(90),
  includeCallParameters: z.boolean().default(true),
  includeCallResults: z.boolean().default(true),
  maxActiveSessionsPerQuery: z.number().default(3),
  scoringFrequency: z.enum(['per_call', 'periodic', 'manual']).default('per_call'),
  archiveCompletedSessions: z.boolean().default(true),
  enableRecommendations: z.boolean().default(true),
  enableMonitoringTools: z.boolean().default(false), // Opt-in: session_* tools disabled by default for end-users
});

export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;