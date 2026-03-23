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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    this.dbPath = join(storageDir, 'ql-mcp.db');
  }

  /**
   * Initialize the database. Must be called (and awaited) before any other method.
   */
  async initialize(): Promise<void> {
    mkdirSync(this.storageDir, { recursive: true });

    const SQL = await initSqlJs();

    if (existsSync(this.dbPath)) {
      try {
        const fileBuffer = readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } catch {
        logger.warn('Failed to read existing database, creating new one');
        this.db = new SQL.Database();
      }
    } else {
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
   * Get the number of rows modified by the last INSERT/UPDATE/DELETE.
   */
  private getRowsModified(): number {
    const db = this.ensureDb();
    const result = db.exec('SELECT changes()');
    return result.length > 0 ? (result[0].values[0][0] as number) : 0;
  }

  /**
   * Write the in-memory database to disk.
   */
  flush(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    writeFileSync(this.dbPath, buffer);
    this.dirty = false;
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
    this.flush();
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
    this.flush();
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
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO annotations (category, entity_key, label, content, metadata, created_at, updated_at)
       VALUES ($category, $entity_key, $label, $content, $metadata, $created_at, $updated_at)`,
      {
        $category: category,
        $entity_key: entityKey,
        $label: label ?? null,
        $content: content ?? null,
        $metadata: metadata ?? null,
        $created_at: now,
        $updated_at: now,
      },
    );
    this.dirty = true;

    // Retrieve the last inserted row id via scalar query
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result.length > 0 ? (result[0].values[0][0] as number) : 0;

    this.flush();
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
      conditions.push('(content LIKE $search OR metadata LIKE $search OR label LIKE $search)');
      params.$search = '%' + filter.search + '%';
    }

    let sql = 'SELECT * FROM annotations';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY updated_at DESC';

    if (filter?.limit) {
      sql += ' LIMIT $limit';
      params.$limit = filter.limit;
    }
    if (filter?.offset) {
      sql += ' OFFSET $offset';
      params.$offset = filter.offset;
    }

    const stmt = db.prepare(sql);
    stmt.bind(params);

    const results: Annotation[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as Annotation);
    }
    stmt.free();
    return results;
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
    this.flush();

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
    this.flush();

    return deleted;
  }
}
