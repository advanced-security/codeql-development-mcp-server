/**
 * SQLite Store — unified persistence backend using sql.js (SQLite compiled to asm.js).
 *
 * Replaces lowdb for session storage and also provides the annotation store
 * for general-purpose notes/bookmarks and audit-state tracking.
 *
 * We import the asm.js build of sql.js (`sql.js/dist/sql-asm.js`) rather than
 * the default WASM build.  The asm.js build is pure JavaScript — no .wasm
 * binary, no native addons — so esbuild can bundle it inline into the single
 * output file.  This preserves the project's zero-external-dependency property
 * across all distribution channels (npm, VSIX, GitHub Release).
 */

import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

/**
 * Annotation record as returned by query methods.
 */
export interface Annotation {
  id: number;
  category: string;
  entity_key: string;
  label: string | null;
  content: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Filter criteria for listing annotations.
 */
export interface AnnotationFilter {
  category?: string;
  entityKeyPrefix?: string;
  entityKey?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * A thin wrapper around sql.js that provides:
 * - Automatic schema migration (sessions + annotations tables)
 * - Flush-on-write persistence to a single .db file
 * - Typed helpers for the session and annotation domains
 */
export class SqliteStore {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private storageDir: string;
  private dirty = false;
  private flushTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  /** Debounce interval (ms) for automatic disk writes after mutations. */
  private static readonly FLUSH_DEBOUNCE_MS = 200;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    this.dbPath = join(storageDir, 'ql-mcp.db');
  }

  /**
   * Initialize the database. Must be called (and awaited) before any other method.
   * Safe to call more than once — an already-open database is closed first.
   */
  async initialize(): Promise<void> {
    if (this.db) {
      this.close();
    }

    mkdirSync(this.storageDir, { recursive: true });

    const SQL = await initSqlJs();

    try {
      const fileBuffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } catch {
      // File doesn't exist or is unreadable — start with a fresh database.
      this.db = new SQL.Database();
    }

    this.createSchema();
    this.flush();
    logger.info(`SQLite store initialized at ${this.dbPath}`);
  }

  // ---------------------------------------------------------------------------
  // Schema
  // ---------------------------------------------------------------------------

  private createSchema(): void {
    this.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
    `);

    this.exec(`
      CREATE TABLE IF NOT EXISTS annotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        entity_key TEXT NOT NULL,
        label TEXT,
        content TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_annotations_category
        ON annotations (category);
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_annotations_entity_key
        ON annotations (entity_key);
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_annotations_category_entity
        ON annotations (category, entity_key);
    `);

    // FTS4 virtual table for full-text search over annotation text fields.
    // The unicode61 tokenizer provides case-insensitive, accent-insensitive matching.
    this.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS annotations_fts
        USING fts4(tokenize=unicode61, content, label, metadata);
    `);

    // Triggers keep the FTS index in sync with the annotations table.
    this.exec(`
      CREATE TRIGGER IF NOT EXISTS annotations_ai
        AFTER INSERT ON annotations BEGIN
          INSERT INTO annotations_fts(rowid, content, label, metadata)
            VALUES (new.id, new.content, new.label, new.metadata);
        END;
    `);

    this.exec(`
      CREATE TRIGGER IF NOT EXISTS annotations_ad
        AFTER DELETE ON annotations BEGIN
          DELETE FROM annotations_fts WHERE rowid = old.id;
        END;
    `);

    this.exec(`
      CREATE TRIGGER IF NOT EXISTS annotations_au
        AFTER UPDATE ON annotations BEGIN
          DELETE FROM annotations_fts WHERE rowid = old.id;
          INSERT INTO annotations_fts(rowid, content, label, metadata)
            VALUES (new.id, new.content, new.label, new.metadata);
        END;
    `);

    // Migration: backfill FTS for any existing rows that pre-date the FTS table.
    this.backfillAnnotationsFts();

    this.exec(`
      CREATE TABLE IF NOT EXISTS query_result_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT NOT NULL UNIQUE,
        query_name TEXT NOT NULL,
        query_path TEXT NOT NULL,
        database_path TEXT NOT NULL,
        language TEXT NOT NULL,
        codeql_version TEXT NOT NULL,
        external_predicates TEXT,
        output_format TEXT NOT NULL,
        result_content TEXT,
        result_count INTEGER,
        bqrs_path TEXT,
        interpreted_path TEXT,
        execution_time_ms INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_qrc_cache_key
        ON query_result_cache (cache_key);
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_qrc_query_db
        ON query_result_cache (query_name, database_path);
    `);

    this.exec(`
      CREATE INDEX IF NOT EXISTS idx_qrc_language
        ON query_result_cache (language);
    `);
  }

  // ---------------------------------------------------------------------------
  // Low-level helpers
  // ---------------------------------------------------------------------------

  private ensureDb(): SqlJsDatabase {
    if (!this.db) throw new Error('SqliteStore not initialized — call initialize() first');
    return this.db;
  }

  private exec(sql: string, params?: Record<string, unknown>): void {
    const db = this.ensureDb();
    if (params) {
      db.run(sql, params as Record<string, string | number | null>);
    } else {
      db.run(sql);
    }
    this.dirty = true;
  }

  /**
   * Backfill the FTS index for any annotations rows that were inserted before
   * the FTS table existed (schema migration).  Compares row counts and rebuilds
   * the entire FTS index when there is a mismatch.
   */
  private backfillAnnotationsFts(): void {
    const db = this.ensureDb();
    const ftsCountResult = db.exec('SELECT COUNT(*) FROM annotations_fts');
    const annCountResult = db.exec('SELECT COUNT(*) FROM annotations');
    const ftsCount = (ftsCountResult[0]?.values[0][0] as number) ?? 0;
    const annCount = (annCountResult[0]?.values[0][0] as number) ?? 0;

    if (ftsCount < annCount) {
      // Clear and fully rebuild to avoid duplicate entries.
      db.run('DELETE FROM annotations_fts');
      db.run(
        'INSERT INTO annotations_fts(rowid, content, label, metadata) SELECT id, content, label, metadata FROM annotations',
      );
    }
  }

  /**
   * Get the number of rows modified by the last INSERT/UPDATE/DELETE.
   */
  private getRowsModified(): number {
    const db = this.ensureDb();
    const result = db.exec('SELECT changes()');
    return result.length > 0 ? (result[0].values[0][0] as number) : 0;
  }

  /**
   * Write the in-memory database to disk.
   *
   * On platforms where `renameSync` can atomically replace the destination
   * (for example, POSIX filesystems and Windows when the target is not
   * locked), this uses a write-to-temp + atomic rename pattern so a crash
   * mid-write cannot corrupt the existing database file. On some Windows
   * configurations where `renameSync` fails because the destination is
   * locked, we fall back to a direct overwrite, which is best-effort only
   * and not fully crash-safe.
   */
  flush(): void {
    if (this.flushTimer) {
      globalThis.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const tmpPath = this.dbPath + '.tmp';
    writeFileSync(tmpPath, buffer);
    try {
      renameSync(tmpPath, this.dbPath);
    } catch {
      // On some Windows configurations renameSync can fail if the destination
      // is locked; fall back to a direct overwrite and clean up the temp file.
      writeFileSync(this.dbPath, buffer);
      try { unlinkSync(tmpPath); } catch { /* ignore cleanup failure */ }
    }
    this.dirty = false;
  }

  /**
   * Schedule a debounced flush.  Multiple rapid writes are coalesced into
   * a single disk write after `FLUSH_DEBOUNCE_MS` of inactivity.
   */
  private scheduleFlush(): void {
    if (this.flushTimer) globalThis.clearTimeout(this.flushTimer);
    this.flushTimer = globalThis.setTimeout(() => {
      this.flushTimer = null;
      this.flushIfDirty();
    }, SqliteStore.FLUSH_DEBOUNCE_MS);
  }

  /**
   * Flush only if there are pending writes.
   */
  flushIfDirty(): void {
    if (this.dirty) this.flush();
  }

  /**
   * Close the database (and flush remaining changes).
   */
  close(): void {
    if (this.flushTimer) {
      globalThis.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushIfDirty();
    this.db?.close();
    this.db = null;
  }

  // ---------------------------------------------------------------------------
  // Session storage (mirrors the old lowdb interface)
  // ---------------------------------------------------------------------------

  /**
   * Store a session object (JSON-serialized) keyed by sessionId.
   */
  putSession(sessionId: string, data: unknown): void {
    const json = JSON.stringify(data);
    const db = this.ensureDb();
    db.run(
      'INSERT OR REPLACE INTO sessions (session_id, data) VALUES ($id, $data)',
      { $id: sessionId, $data: json },
    );
    this.dirty = true;
    this.scheduleFlush();
  }

  /**
   * Retrieve a single session by ID, or null if not found.
   */
  getSession(sessionId: string): unknown | null {
    const db = this.ensureDb();
    const stmt = db.prepare('SELECT data FROM sessions WHERE session_id = $id');
    stmt.bind({ $id: sessionId });
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return JSON.parse(row.data as string);
    }
    stmt.free();
    return null;
  }

  /**
   * Return all sessions as parsed objects.
   */
  getAllSessions(): unknown[] {
    const db = this.ensureDb();
    const results: unknown[] = [];
    const stmt = db.prepare('SELECT data FROM sessions');
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(JSON.parse(row.data as string));
    }
    stmt.free();
    return results;
  }

  /**
   * Delete a session by ID.
   */
  deleteSession(sessionId: string): void {
    this.exec('DELETE FROM sessions WHERE session_id = $id', { $id: sessionId });
    this.scheduleFlush();
  }

  /**
   * Count active sessions.
   */
  countSessions(): number {
    const db = this.ensureDb();
    const stmt = db.prepare('SELECT COUNT(*) as cnt FROM sessions');
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row.cnt as number;
  }

  // ---------------------------------------------------------------------------
  // Annotation storage
  // ---------------------------------------------------------------------------

  /**
   * Create a new annotation. Returns the new row id.
   */
  createAnnotation(
    category: string,
    entityKey: string,
    content?: string | null,
    label?: string | null,
    metadata?: string | null,
  ): number {
    const db = this.ensureDb();
    db.run(
      `INSERT INTO annotations (category, entity_key, label, content, metadata, created_at, updated_at)
       VALUES ($category, $entity_key, $label, $content, $metadata, datetime('now'), datetime('now'))`,
      {
        $category: category,
        $entity_key: entityKey,
        $label: label ?? null,
        $content: content ?? null,
        $metadata: metadata ?? null,
      },
    );
    this.dirty = true;

    // Retrieve the last inserted row id via scalar query
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result.length > 0 ? (result[0].values[0][0] as number) : 0;

    this.scheduleFlush();
    return id;
  }

  /**
   * Retrieve a single annotation by id.
   */
  getAnnotation(id: number): Annotation | null {
    const db = this.ensureDb();
    const stmt = db.prepare('SELECT * FROM annotations WHERE id = $id');
    stmt.bind({ $id: id });
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as Annotation;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  /**
   * List annotations with optional filtering.
   */
  listAnnotations(filter?: AnnotationFilter): Annotation[] {
    const db = this.ensureDb();
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    if (filter?.category) {
      conditions.push('category = $category');
      params.$category = filter.category;
    }
    if (filter?.entityKey) {
      conditions.push('entity_key = $entity_key');
      params.$entity_key = filter.entityKey;
    }
    if (filter?.entityKeyPrefix) {
      conditions.push('entity_key LIKE $entity_key_prefix');
      params.$entity_key_prefix = filter.entityKeyPrefix + '%';
    }
    if (filter?.search) {
      // Use the FTS4 index for efficient, case-insensitive full-text search
      // across content, label, and metadata fields. Also match the category
      // column directly (not in FTS) so searches like "performance" find
      // annotations whose category is "performance".
      conditions.push('(id IN (SELECT rowid FROM annotations_fts WHERE annotations_fts MATCH $search) OR category = $search_cat COLLATE NOCASE)');
      params.$search = filter.search;
      params.$search_cat = filter.search;
    }

    let sql = 'SELECT * FROM annotations';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY updated_at DESC';

    if (filter?.limit !== undefined) {
      sql += ' LIMIT $limit';
      params.$limit = filter.limit;
    }
    if (filter?.offset !== undefined) {
      if (filter?.limit === undefined) {
        // SQLite requires LIMIT when OFFSET is used; -1 means unlimited.
        sql += ' LIMIT -1';
      }
      sql += ' OFFSET $offset';
      params.$offset = filter.offset;
    }

    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const results: Annotation[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as Annotation);
      }
      return results;
    } catch (err) {
      if (filter?.search) {
        // Invalid FTS MATCH syntax (e.g. trailing operator) — return an empty
        // result set rather than propagating the parse error to callers.
        logger.warn('FTS MATCH query failed (invalid syntax?); returning empty results:', err);
        return [];
      }
      throw err;
    } finally {
      stmt.free();
    }
  }

  /**
   * Update an annotation's content, label, and/or metadata.
   */
  updateAnnotation(
    id: number,
    updates: { content?: string | null; label?: string | null; metadata?: string | null },
  ): boolean {
    const setClauses: string[] = [];
    const params: Record<string, string | number | null> = { $id: id };

    if (updates.content !== undefined) {
      setClauses.push('content = $content');
      params.$content = updates.content;
    }
    if (updates.label !== undefined) {
      setClauses.push('label = $label');
      params.$label = updates.label;
    }
    if (updates.metadata !== undefined) {
      setClauses.push('metadata = $metadata');
      params.$metadata = updates.metadata;
    }

    if (setClauses.length === 0) return false;

    setClauses.push("updated_at = datetime('now')");

    const db = this.ensureDb();
    db.run(
      `UPDATE annotations SET ${setClauses.join(', ')} WHERE id = $id`,
      params as Record<string, string | number | null>,
    );
    const changed = this.getRowsModified();
    this.dirty = true;
    this.scheduleFlush();

    return changed > 0;
  }

  /**
   * Delete annotations matching the given filter.
   * At least one filter criterion must be provided (safety guard).
   * Returns the number of deleted rows.
   */
  deleteAnnotations(filter: { id?: number; category?: string; entityKeyPrefix?: string }): number {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    if (filter.id !== undefined) {
      conditions.push('id = $id');
      params.$id = filter.id;
    }
    if (filter.category) {
      conditions.push('category = $category');
      params.$category = filter.category;
    }
    if (filter.entityKeyPrefix) {
      conditions.push('entity_key LIKE $entity_key_prefix');
      params.$entity_key_prefix = filter.entityKeyPrefix + '%';
    }

    if (conditions.length === 0) {
      throw new Error('deleteAnnotations requires at least one filter criterion');
    }

    const db = this.ensureDb();
    db.run(
      `DELETE FROM annotations WHERE ${conditions.join(' AND ')}`,
      params as Record<string, string | number>,
    );
    const deleted = this.getRowsModified();
    this.dirty = true;
    this.scheduleFlush();

    return deleted;
  }

  // ---------------------------------------------------------------------------
  // Query result cache
  // ---------------------------------------------------------------------------

  /**
   * Store a query result in the cache.
   */
  putCacheEntry(entry: {
    cacheKey: string;
    queryName: string;
    queryPath: string;
    databasePath: string;
    language: string;
    codeqlVersion: string;
    externalPredicates?: string | null;
    outputFormat: string;
    resultContent?: string | null;
    resultCount?: number | null;
    bqrsPath?: string | null;
    interpretedPath?: string | null;
    executionTimeMs?: number | null;
  }): void {
    const db = this.ensureDb();
    db.run(
      `INSERT OR REPLACE INTO query_result_cache
       (cache_key, query_name, query_path, database_path, language, codeql_version,
        external_predicates, output_format, result_content, result_count,
        bqrs_path, interpreted_path, execution_time_ms, created_at)
       VALUES ($cache_key, $query_name, $query_path, $database_path, $language,
        $codeql_version, $external_predicates, $output_format, $result_content,
        $result_count, $bqrs_path, $interpreted_path, $execution_time_ms,
        datetime('now'))`,
      {
        $cache_key: entry.cacheKey,
        $query_name: entry.queryName,
        $query_path: entry.queryPath,
        $database_path: entry.databasePath,
        $language: entry.language,
        $codeql_version: entry.codeqlVersion,
        $external_predicates: entry.externalPredicates ?? null,
        $output_format: entry.outputFormat,
        $result_content: entry.resultContent ?? null,
        $result_count: entry.resultCount ?? null,
        $bqrs_path: entry.bqrsPath ?? null,
        $interpreted_path: entry.interpretedPath ?? null,
        $execution_time_ms: entry.executionTimeMs ?? null,
      },
    );
    this.dirty = true;
    this.scheduleFlush();
  }

  /**
   * Look up a cache entry by key. Returns metadata (no content) or null.
   */
  getCacheEntryMeta(cacheKey: string): {
    cacheKey: string;
    queryName: string;
    databasePath: string;
    language: string;
    outputFormat: string;
    resultCount: number | null;
    createdAt: string;
  } | null {
    const db = this.ensureDb();
    const stmt = db.prepare(
      `SELECT cache_key, query_name, database_path, language, output_format,
              result_count, created_at
       FROM query_result_cache WHERE cache_key = $key`,
    );
    stmt.bind({ $key: cacheKey });
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        cacheKey: row.cache_key as string,
        queryName: row.query_name as string,
        databasePath: row.database_path as string,
        language: row.language as string,
        outputFormat: row.output_format as string,
        resultCount: row.result_count as number | null,
        createdAt: row.created_at as string,
      };
    }
    stmt.free();
    return null;
  }

  /**
   * Get the full cached result content by key.
   */
  getCacheContent(cacheKey: string): string | null {
    const db = this.ensureDb();
    const stmt = db.prepare(
      'SELECT result_content FROM query_result_cache WHERE cache_key = $key',
    );
    stmt.bind({ $key: cacheKey });
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row.result_content as string | null;
    }
    stmt.free();
    return null;
  }

  /**
   * Retrieve a subset of cached result content via line range or maxLines.
   */
  getCacheContentSubset(
    cacheKey: string,
    options: {
      lineRange?: [number, number];
      maxLines?: number;
    },
  ): { content: string; totalLines: number; returnedLines: number; truncated: boolean } | null {
    const fullContent = this.getCacheContent(cacheKey);
    if (fullContent === null) return null;

    const allLines = fullContent.split('\n');
    const totalLines = allLines.length;
    let selectedLines = allLines;
    const maxLines = options.maxLines ?? 500;

    if (options.lineRange) {
      const [start, end] = options.lineRange;
      const startIdx = Math.max(0, start - 1);
      const endIdx = Math.min(totalLines, end);
      selectedLines = selectedLines.slice(startIdx, endIdx);
    }

    const truncated = selectedLines.length > maxLines;
    if (truncated) {
      selectedLines = selectedLines.slice(0, maxLines);
    }

    return {
      content: selectedLines.join('\n'),
      totalLines,
      returnedLines: selectedLines.length,
      truncated,
    };
  }

  /**
   * Retrieve a subset of cached SARIF results by index range or file filter.
   */
  getCacheSarifSubset(
    cacheKey: string,
    options: {
      resultIndices?: [number, number];
      fileFilter?: string;
      maxResults?: number;
    },
  ): { content: string; totalResults: number; returnedResults: number; truncated: boolean } | null {
    const fullContent = this.getCacheContent(cacheKey);
    if (fullContent === null) return null;

    try {
      const sarif = JSON.parse(fullContent);
      const results: unknown[] = sarif?.runs?.[0]?.results ?? [];
      const totalResults = results.length;
      let selected = results;
      const maxResults = options.maxResults ?? 100;

      if (options.fileFilter) {
        const filter = options.fileFilter;
        selected = selected.filter((r: unknown) => {
          const result = r as { locations?: Array<{ physicalLocation?: { artifactLocation?: { uri?: string } } }> };
          return result.locations?.some(
            loc => loc.physicalLocation?.artifactLocation?.uri?.includes(filter),
          );
        });
      }

      if (options.resultIndices) {
        const [rawStart, rawEnd] = options.resultIndices;
        const total = selected.length;
        if (Number.isFinite(rawStart) && Number.isFinite(rawEnd) && total > 0) {
          const start = Math.max(0, Math.min(total - 1, Math.floor(rawStart)));
          const end = Math.max(0, Math.min(total - 1, Math.floor(rawEnd)));
          // resultIndices is treated as an inclusive [start, end] range
          selected = end >= start ? selected.slice(start, end + 1) : [];
        } else {
          selected = [];
        }
      }

      const truncated = selected.length > maxResults;
      if (truncated) {
        selected = selected.slice(0, maxResults);
      }

      const subset = {
        version: sarif.version,
        runs: [{
          tool: sarif.runs?.[0]?.tool,
          results: selected,
        }],
      };

      return {
        content: JSON.stringify(subset, null, 2),
        totalResults,
        returnedResults: selected.length,
        truncated,
      };
    } catch {
      // Cached content is not valid SARIF JSON; fall back to line-oriented
      // retrieval with a dedicated line limit.
      const FALLBACK_MAX_LINES = 500;
      const fallback = this.getCacheContentSubset(cacheKey, { maxLines: FALLBACK_MAX_LINES });
      if (!fallback) return null;
      return {
        content: fallback.content,
        totalResults: 0,
        returnedResults: 0,
        truncated: fallback.truncated,
      };
    }
  }

  /**
   * List cache entries, optionally filtered.
   */
  listCacheEntries(filter?: {
    queryName?: string;
    databasePath?: string;
    language?: string;
    limit?: number;
  }): Array<{
    cacheKey: string;
    queryName: string;
    databasePath: string;
    language: string;
    outputFormat: string;
    resultCount: number | null;
    executionTimeMs: number | null;
    createdAt: string;
  }> {
    const db = this.ensureDb();
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    if (filter?.queryName) {
      conditions.push('query_name = $query_name');
      params.$query_name = filter.queryName;
    }
    if (filter?.databasePath) {
      conditions.push('database_path = $database_path');
      params.$database_path = filter.databasePath;
    }
    if (filter?.language) {
      conditions.push('language = $language');
      params.$language = filter.language;
    }

    let sql = `SELECT cache_key, query_name, database_path, language, output_format,
                      result_count, execution_time_ms, created_at
               FROM query_result_cache`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    if (filter?.limit !== undefined) {
      sql += ' LIMIT $limit';
      params.$limit = filter.limit;
    }

    const stmt = db.prepare(sql);
    stmt.bind(params);

    const results: Array<{
      cacheKey: string;
      queryName: string;
      databasePath: string;
      language: string;
      outputFormat: string;
      resultCount: number | null;
      executionTimeMs: number | null;
      createdAt: string;
    }> = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        cacheKey: row.cache_key as string,
        queryName: row.query_name as string,
        databasePath: row.database_path as string,
        language: row.language as string,
        outputFormat: row.output_format as string,
        resultCount: row.result_count as number | null,
        executionTimeMs: row.execution_time_ms as number | null,
        createdAt: row.created_at as string,
      });
    }
    stmt.free();
    return results;
  }

  /**
   * Clear cache entries matching the given filter. Returns deleted count.
   */
  clearCacheEntries(filter?: {
    cacheKey?: string;
    queryName?: string;
    databasePath?: string;
    all?: boolean;
  }): number {
    if (filter?.all) {
      this.exec('DELETE FROM query_result_cache');
      const deleted = this.getRowsModified();
      this.scheduleFlush();
      return deleted;
    }

    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filter?.cacheKey) {
      conditions.push('cache_key = $cache_key');
      params.$cache_key = filter.cacheKey;
    }
    if (filter?.queryName) {
      conditions.push('query_name = $query_name');
      params.$query_name = filter.queryName;
    }
    if (filter?.databasePath) {
      conditions.push('database_path = $database_path');
      params.$database_path = filter.databasePath;
    }

    if (conditions.length === 0) return 0;

    const db = this.ensureDb();
    db.run(
      `DELETE FROM query_result_cache WHERE ${conditions.join(' AND ')}`,
      params,
    );
    const deleted = this.getRowsModified();
    this.dirty = true;
    this.scheduleFlush();
    return deleted;
  }
}
