# Monitoring and Reporting Specification for CodeQL Development MCP Server

## Overview

This specification defines monitoring and reporting capabilities for the CodeQL Development MCP Server that capture comprehensive data about query development sessions. The system tracks all interactions, test results, and quality metrics in a unified JSON structure, enabling multiple downstream applications including functional testing, comparative analysis, and development insights.

## Core Concept: Query Development Session

Each query development session is represented as a single, comprehensive JSON object that captures:

- **Session Metadata**: Timestamps, query path, language, session ID
- **MCP Call History**: Complete log of all MCP primitive calls with parameters and results
- **Test Execution Records**: Compilation attempts, test runs, and results over time
- **Quality Metrics**: Multi-dimensional scoring and assessment data
- **Development Progression**: Evolution of query state and recommendations

These session objects can be:

- **Aggregated** into arrays for batch analysis across multiple sessions/queries
- **Compared** to evaluate different development approaches for the same query
- **Processed** for functional testing (pass/fail determinations)
- **Analyzed** for reporting and insights generation
- **Post-processed** by external tools for custom analytics

## Goals

Enable comprehensive monitoring and flexible reporting by:

1. **Unified Session Tracking** - Single JSON object per query development session containing all relevant data
2. **MCP Usage Analytics** - Complete audit trail of which primitives are called, when, and with what results
3. **Quality Evolution Monitoring** - Track how query quality scores change over development iterations
4. **Flexible Data Export** - Session objects designed for easy aggregation and post-processing
5. **Multi-Purpose Analysis** - Support functional testing, comparative studies, and development insights from the same data
6. **Intelligent Guidance** - Leverage session history to provide contextual next-step recommendations

## Query Development Session Schema

The core data structure is a comprehensive JSON object representing a complete query development session:

```typescript
interface QueryDevelopmentSession {
  // Session Metadata
  sessionId: string;
  queryPath: string;
  language: string;
  queryType?: string;
  description?: string;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  status: 'active' | 'completed' | 'failed' | 'abandoned';

  // MCP Call History
  mcpCalls: MCPCallRecord[];

  // Test Execution Records
  testExecutions: TestExecutionRecord[];

  // Quality Metrics
  qualityScores: QualityScoreRecord[];

  // Development State
  currentState: QueryState;
  recommendations: string[];
  nextSuggestedTool?: string;
}

interface MCPCallRecord {
  callId: string;
  timestamp: string;
  toolName: string;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  duration: number; // milliseconds
  nextSuggestedTool?: string;
}

interface TestExecutionRecord {
  executionId: string;
  timestamp: string;
  type: 'compilation' | 'test_run' | 'database_build';
  success: boolean;
  details: Record<string, any>;
  metrics?: {
    passRate?: number;
    coverage?: number;
    performance?: number;
  };
}

interface QualityScoreRecord {
  scoreId: string;
  timestamp: string;
  overallScore: number; // 0-100
  dimensions: {
    syntacticCorrectness: number;
    testCoverageResults: number;
    documentationQuality: number;
    functionalCorrectness: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

interface QueryState {
  filesPresent: string[];
  compilationStatus: 'unknown' | 'success' | 'failed';
  testStatus: 'unknown' | 'passing' | 'failing' | 'no_tests';
  documentationStatus: 'unknown' | 'present' | 'missing' | 'incomplete';
  lastActivity: string; // ISO timestamp
}
```

## Production-Grade Query Requirements

A production-grade CodeQL query must have:

- ✅ Syntactically valid `.ql` file that compiles successfully
- ✅ Comprehensive documentation (`.md` or `.qhelp`) with compliant/non-compliant examples
- ✅ Valid test structure with `.qlref` file and test cases
- ✅ Passing tests where `.actual` matches `.expected` 100%
- ✅ Low false-positive rate with accurate detection

## Core Components

### 1. Session Data Management

Maintain unified JSON objects for each query development session:

- **Session Lifecycle**: Create, update, and finalize session objects with complete development history
- **Transparent Integration**: Automatically capture all MCP calls and associate them with active sessions
- **Real-time Updates**: Continuously update session objects as development progresses
- **Persistent Storage**: Store session objects using [lowdb](https://github.com/typicode/lowdb) for reliable JSON persistence
- **Query Association**: Link all activities to specific `.ql` file paths, updating MCP primitive schemas to include `queryPath` parameters

### 2. Comprehensive Call Tracking

Record complete audit trails of MCP server interactions:

- **Call Logging**: Capture every MCP primitive call with full parameters and results
- **Performance Metrics**: Track call duration and success rates
- **Context Preservation**: Maintain relationship between sequential calls within a session
- **Transparent Operation**: Integrate tracking without affecting existing MCP tool behavior

### 3. Multi-Dimensional Quality Assessment

Continuous evaluation system integrated into session objects:

- **Syntactic Correctness** (25%): Compilation status, syntax quality, library usage
- **Test Coverage & Results** (30%): Test existence, pass rates, result accuracy
- **Documentation Quality** (20%): Documentation presence, completeness, examples
- **Functional Correctness** (25%): True/false positive rates, performance characteristics

Scores stored as time-series data within session objects for evolution tracking.

### 4. Intelligent Guidance System

Leverage session history to provide contextual recommendations:

- **Next Action Suggestions**: Include `nextSuggestedTool` in all MCP responses based on session state
- **Development Insights**: Analyze patterns across sessions to suggest optimal approaches
- **Progress Assessment**: Identify when sessions are stagnating and recommend interventions
- **Adaptive Recommendations**: Adjust suggestions based on query type, language, and historical success patterns

### 5. Flexible Reporting and Analysis

Generate insights from session object collections:

- **Session Reports**: Detailed analysis of individual query development sessions
- **Comparative Analysis**: Cross-session comparisons for the same query across different approaches
- **Aggregate Insights**: Batch analysis of multiple sessions for pattern identification
- **Export Capabilities**: JSON (primary), HTML, and Markdown formats for different consumption needs
- **Functional Testing**: Process session collections to generate pass/fail results for automated testing

## MCP Tool APIs

### Session Management

- `session_start(queryPath: string, language?: string, queryType?: string, description?: string)` → `sessionId`
- `session_end(sessionId: string, status: 'completed' | 'failed' | 'abandoned')` → `QueryDevelopmentSession`
- `session_get(sessionId: string)` → `QueryDevelopmentSession`
- `session_list(filters?: { queryPath?: string, status?: string, dateRange?: [string, string] })` → `QueryDevelopmentSession[]`
- `session_update_state(sessionId: string, stateUpdate: Partial<QueryState>)` → `QueryDevelopmentSession`

### Session Analytics

- `session_get_call_history(sessionId: string, limit?: number)` → `MCPCallRecord[]`
- `session_get_test_history(sessionId: string, limit?: number)` → `TestExecutionRecord[]`
- `session_get_score_history(sessionId: string, limit?: number)` → `QualityScoreRecord[]`
- `session_calculate_current_score(sessionId: string)` → `QualityScoreRecord`

### Batch Operations

- `sessions_compare(sessionIds: string[], dimensions?: string[])` → `ComparisonReport`
- `sessions_aggregate(filters: SessionFilter)` → `AggregateReport`
- `sessions_export(sessionIds: string[], format?: 'json' | 'html' | 'markdown')` → `ExportResult`

### Functional Testing Support

- `sessions_evaluate_functional_tests(sessionIds: string[])` → `FunctionalTestResult[]`
- `sessions_generate_test_report(sessionIds: string[], criteria: TestCriteria)` → `TestReport`

## Data Storage

Unified JSON storage approach using [lowdb](https://github.com/typicode/lowdb) in `.ql-mcp-tracking/`:

```text
.ql-mcp-tracking/
├── sessions.json                    # Primary storage: array of QueryDevelopmentSession objects
├── sessions-archive/               # Completed sessions moved for performance
│   ├── 2024-09/{sessionId}.json   # Archived by month
│   └── 2024-10/{sessionId}.json
├── exports/                        # Generated reports and exports
│   ├── comparative-analysis-{timestamp}.json
│   ├── functional-test-results-{timestamp}.json
│   └── session-reports-{timestamp}.html
└── config.json                     # Storage configuration and metadata
```

### Storage Strategy

- **Primary Storage**: Active sessions in `sessions.json` as a single array of `QueryDevelopmentSession` objects
- **Performance Optimization**: Archive completed sessions to monthly files to maintain lookup performance
- **Unified Structure**: All session data (calls, tests, scores) embedded within session objects
- **Export Support**: Generate static reports and export files for external processing
- **Backup-Friendly**: Simple JSON files easily backed up and version controlled

### Data Model Benefits

- **Single Source of Truth**: Each session object contains complete development history
- **Aggregation Ready**: Session arrays can be directly processed by analysis tools
- **Cross-Session Analysis**: Multiple session objects easily compared and aggregated
- **Export Flexibility**: Session objects serialize naturally to JSON for external tools
- **Functional Testing**: Session collections map directly to test execution results

## Integration Strategy

- **Unified Data Model**: Single session object per query development containing all tracking data
- **Transparent Monitoring**: Automatic session updates during MCP primitive calls without affecting existing functionality
- **Backwards Compatible**: All monitoring features opt-in; existing tools work unchanged
- **Session-Aware Primitives**: Update MCP primitive schemas to include optional `sessionId` parameter for explicit session association
- **Performance Optimized**: <10% overhead through efficient JSON operations and configurable tracking depth
- **Multi-Purpose Design**: Session objects support functional testing, reporting, and analysis without additional data transformation

## Implementation Phases

1. **Unified Data Model & Storage** (2 weeks)
   - Define `QueryDevelopmentSession` schema and related interfaces
   - Implement lowdb-based storage with session object management
   - Create session lifecycle management APIs

2. **Transparent Session Integration** (2 weeks)
   - Update MCP primitive schemas to include session parameters
   - Implement automatic session updates during MCP calls
   - Add session-aware call tracking and state management

3. **Quality Assessment & Guidance** (2 weeks)
   - Implement multi-dimensional scoring within session objects
   - Build intelligent next-step recommendation system
   - Integrate quality metrics with session state tracking

4. **Reporting & Analysis Tools** (2 weeks)
   - Build session comparison and aggregation capabilities
   - Implement export functionality for multiple formats
   - Create functional testing evaluation from session collections

## Success Criteria

- **Complete Session Tracking**: Every MCP call associated with a query development captured in session objects
- **Unified Data Structure**: Single JSON object per session containing all development data (calls, tests, scores, state)
- **Flexible Analysis Support**: Session objects easily aggregated and processed for multiple purposes
- **Performance Efficiency**: <10% overhead for session tracking and data updates
- **Multi-Purpose Utility**: Same session data serves functional testing, reporting, and development insights
- **Backwards Compatibility**: Existing MCP tools work unchanged with optional session integration

## Use Cases Enabled

### Functional Testing

Process collections of session objects to determine pass/fail status based on configurable criteria:

```typescript
const testResults = await sessions_evaluate_functional_tests(sessionIds);
// Returns: { sessionId, queryPath, passed: boolean, criteria: TestCriteria, details: any }[]
```

### Comparative Analysis

Compare multiple development approaches for the same query:

```typescript
const comparison = await sessions_compare([sessionA, sessionB, sessionC]);
// Returns: detailed comparison of approaches, success rates, and recommendations
```

### Development Insights

Analyze patterns across sessions to improve development processes:

```typescript
const insights = await sessions_aggregate({ queryType: 'security', language: 'java' });
// Returns: aggregated metrics, common patterns, success factors
```

### Progress Monitoring

Track individual query development in real-time:

```typescript
const session = await session_get(sessionId);
// Returns: complete QueryDevelopmentSession with current state and recommendations
```

## Configuration

```typescript
interface MonitoringConfig {
  storageLocation: string; // Default: ".ql-mcp-tracking/"
  autoTrackSessions: boolean; // Auto-track when sessions active
  retentionDays: number; // Data retention period for archived sessions
  includeCallParameters: boolean; // Log detailed MCP call parameters
  includeCallResults: boolean; // Log detailed MCP call results
  maxActiveSessionsPerQuery: number; // Limit concurrent sessions per query
  scoringFrequency: 'per_call' | 'periodic' | 'manual'; // When to calculate quality scores
  archiveCompletedSessions: boolean; // Move completed sessions to archive
  enableRecommendations: boolean; // Provide next-step suggestions
}
```

This specification provides the foundation for implementing comprehensive monitoring and reporting capabilities that enable functional testing, comparative analysis, and development insights through unified query development session tracking.
