import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import initSqlJs, { type Database } from "sql.js";
import type { GlassmindPersistenceDriver } from "./durableStore.js";
import type { GlassmindMemoryRecord, RecordScope, SourceReference } from "./types.js";

/**
 * First real, dev/test-scoped GlassmindPersistenceDriver implementation, per
 * docs/architecture/Glassmind-DB-Technology-Decision.md and
 * docs/roadmap/Sprint-13-Implementation-Plan.md §3 items 1-3.
 *
 * Uses sql.js — pure WASM SQLite, no native compilation — matching the
 * existing precedent already in this repo (app/package.json's `sql.js`
 * dependency, used in app/src/main/log.js). This is real, working SQL
 * against a real (if in-memory or test-file-scoped) SQLite database: real
 * tables, real indexes, real CHECK constraints — not a fake or simulation.
 *
 * Like InMemoryGlassmindPersistenceDriver, this is a dumb, business-logic-
 * free CRUD store: no provenance checks beyond the schema-level CHECK
 * constraint applied in migrations/001_glassmind_phase_1.sql, no id-not-
 * found rejection. DurableGlassmindStore remains the provenance/business
 * gate, called before this driver ever sees a record — see
 * provenanceBoundary.test.ts's existing pattern, extended to this driver in
 * sqliteDriver.test.ts.
 *
 * Never stores a raw EventStore payload — GlassmindMemoryRecord has no
 * payload-shaped field to begin with (see types.ts), and this driver only
 * ever serializes the record it is given, never anything from outside it.
 */

const TABLE_BY_KIND: Record<GlassmindMemoryRecord["kind"], string> = {
  conversation_turn: "glassmind_conversation_turns",
  follow_up: "glassmind_follow_ups",
  deferred_decision: "glassmind_deferred_decisions",
  approval_waiting_state: "glassmind_approval_waiting_states",
};

/**
 * Reads migrations/001_glassmind_phase_1.sql from disk, relative to this
 * compiled module's own location (works whether running from src/ under
 * vitest or dist/ after a build, since migrations/ sits one level up from
 * either in apps/glassmind's own package root... see the two candidate
 * paths tried below).
 */
function loadMigrationSql(): string {
  const candidates = [
    fileURLToPath(new URL("../migrations/001_glassmind_phase_1.sql", import.meta.url)),
    fileURLToPath(new URL("../../migrations/001_glassmind_phase_1.sql", import.meta.url)),
  ];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf-8");
    } catch {
      continue;
    }
  }
  throw new Error("Could not locate migrations/001_glassmind_phase_1.sql relative to sqliteDriver.ts");
}

function deriveStatusColumn(record: GlassmindMemoryRecord): string | null {
  if (record.kind === "conversation_turn") {
    return record.approvalStatus;
  }
  return record.status;
}

function deriveUpdatedAtColumn(record: GlassmindMemoryRecord): string | null {
  if (record.kind === "follow_up" || record.kind === "deferred_decision") {
    return record.resolution?.resolvedAt ?? null;
  }
  if (record.kind === "approval_waiting_state") {
    return record.update?.updatedAt ?? null;
  }
  return null;
}

function recordColumns(record: GlassmindMemoryRecord): unknown[] {
  return [
    record.id,
    record.scope.entityKind,
    record.scope.entityId,
    record.sourceReference.conversationId ?? null,
    record.sourceReference.messageId ?? null,
    record.sourceReference.recommendationId ?? null,
    record.sourceReference.eventId ?? null,
    record.occurredAt,
    deriveStatusColumn(record),
    deriveUpdatedAtColumn(record),
    JSON.stringify(record),
  ];
}

export class SqliteGlassmindPersistenceDriver implements GlassmindPersistenceDriver {
  constructor(private readonly db: Database) {}

  insertRecord(record: GlassmindMemoryRecord): GlassmindMemoryRecord {
    const table = TABLE_BY_KIND[record.kind];
    this.db.run(
      `INSERT INTO ${table}
        (id, scope_entity_kind, scope_entity_id, source_conversation_id, source_message_id, source_recommendation_id, source_event_id, occurred_at, status, updated_at, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recordColumns(record) as never[],
    );
    return record;
  }

  updateRecord(record: GlassmindMemoryRecord): GlassmindMemoryRecord {
    const table = TABLE_BY_KIND[record.kind];
    this.db.run(
      `UPDATE ${table} SET
        scope_entity_kind = ?, scope_entity_id = ?, source_conversation_id = ?, source_message_id = ?,
        source_recommendation_id = ?, source_event_id = ?, occurred_at = ?, status = ?, updated_at = ?, data = ?
       WHERE id = ?`,
      [...recordColumns(record).slice(1), record.id] as never[],
    );

    if (this.db.getRowsModified() === 0) {
      // DurableGlassmindStore always calls findById and rejects an unknown id
      // before ever reaching updateRecord, so this path should not be
      // reachable in practice — inserting defensively, mirroring
      // InMemoryGlassmindPersistenceDriver's identical fallback, rather than
      // throwing a business-rule error this driver has no opinion about.
      this.insertRecord(record);
    }

    return record;
  }

  findById(kind: GlassmindMemoryRecord["kind"], id: string): GlassmindMemoryRecord | undefined {
    const table = TABLE_BY_KIND[kind];
    const result = this.db.exec(`SELECT data FROM ${table} WHERE id = ?`, [id]);
    return this.parseResults(result)[0];
  }

  findBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[] {
    const conditions: string[] = [];
    const matchParams: string[] = [];

    if (sourceReference.conversationId !== undefined) {
      conditions.push("source_conversation_id = ?");
      matchParams.push(sourceReference.conversationId);
    }
    if (sourceReference.messageId !== undefined) {
      conditions.push("source_message_id = ?");
      matchParams.push(sourceReference.messageId);
    }
    if (sourceReference.recommendationId !== undefined) {
      conditions.push("source_recommendation_id = ?");
      matchParams.push(sourceReference.recommendationId);
    }
    if (sourceReference.eventId !== undefined) {
      conditions.push("source_event_id = ?");
      matchParams.push(sourceReference.eventId);
    }

    if (conditions.length === 0) {
      return [];
    }

    const whereClause = conditions.join(" OR ");
    const tables = Object.values(TABLE_BY_KIND);
    const unionQuery = tables.map((table) => `SELECT data FROM ${table} WHERE ${whereClause}`).join(" UNION ALL ");
    const allParams = tables.flatMap(() => matchParams);

    const result = this.db.exec(unionQuery, allParams as never[]);
    return this.parseResults(result);
  }

  findByScope(scope: RecordScope): GlassmindMemoryRecord[] {
    const tables = Object.values(TABLE_BY_KIND);
    const unionQuery = tables
      .map((table) => `SELECT data FROM ${table} WHERE scope_entity_kind = ? AND scope_entity_id = ?`)
      .join(" UNION ALL ");
    const allParams = tables.flatMap(() => [scope.entityKind, scope.entityId]);

    const result = this.db.exec(unionQuery, allParams as never[]);
    return this.parseResults(result);
  }

  /** Closes the underlying sql.js database. Test-only convenience; no production lifecycle depends on this. */
  close(): void {
    this.db.close();
  }

  private parseResults(result: ReturnType<Database["exec"]>): GlassmindMemoryRecord[] {
    if (result.length === 0) {
      return [];
    }
    const [{ values }] = result;
    return values.map(([dataJson]) => JSON.parse(dataJson as string) as GlassmindMemoryRecord);
  }
}

/**
 * Creates a SqliteGlassmindPersistenceDriver backed by a fresh, in-memory
 * sql.js database with migrations/001_glassmind_phase_1.sql already applied.
 * Async only because sql.js's WASM module must be loaded first
 * (initSqlJs()) — every method on the returned driver is synchronous,
 * matching GlassmindPersistenceDriver's existing interface exactly, with no
 * change to that interface.
 *
 * In-memory by default — no file is created or touched on disk, which is
 * also what keeps this fully test-isolated per Glassmind-Schema-Migration-Plan.md
 * §10's requirements (isolated, fast, reset-capable) without any cleanup
 * step. An optional existing database file buffer can be supplied for the
 * rare case a test wants to seed from a known starting state.
 */
export async function createSqliteDriver(seed?: Uint8Array): Promise<SqliteGlassmindPersistenceDriver> {
  const SQL = await initSqlJs();
  const db = seed ? new SQL.Database(seed) : new SQL.Database();
  db.exec(loadMigrationSql());
  return new SqliteGlassmindPersistenceDriver(db);
}
