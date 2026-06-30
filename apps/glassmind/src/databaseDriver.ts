import type { GlassmindPersistenceDriver } from "./durableStore.js";
import type { GlassmindMemoryRecord, RecordScope, SourceReference } from "./types.js";

/**
 * Minimal database client seam, per
 * docs/architecture/Glassmind-Persistence-Runtime-Decision.md and
 * docs/architecture/Glassmind-Schema-Migration-Plan.md.
 *
 * Deliberately synchronous, matching GlassmindPersistenceDriver's own
 * synchronous shape exactly — a real database client is naturally
 * asynchronous, but evolving GlassmindStore/GlassmindPersistenceDriver to be
 * async is real, future work this skeleton does not presuppose (see the
 * identical note on GlassmindPersistenceDriver in durableStore.ts). No
 * concrete implementation of this interface exists yet; ships with no real
 * database connection, by design, per the schema migration plan's deferral
 * of database technology selection.
 */
export interface DatabaseClient {
  insert(record: GlassmindMemoryRecord): GlassmindMemoryRecord;
  update(record: GlassmindMemoryRecord): GlassmindMemoryRecord;
  findById(kind: GlassmindMemoryRecord["kind"], id: string): GlassmindMemoryRecord | undefined;
  findBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[];
  findByScope(scope: RecordScope): GlassmindMemoryRecord[];
}

/**
 * Adapts an injected DatabaseClient to the existing GlassmindPersistenceDriver
 * contract DurableGlassmindStore already depends on. Pure delegation only —
 * no business logic, no CommandCore knowledge, no enrichment of any record
 * with data the client did not already return.
 *
 * Provenance validation and not-found rejection are not duplicated here:
 * DurableGlassmindStore already performs both before this driver's methods
 * are ever called, per its own documented contract. This class trusts that
 * and adds nothing of its own — exactly as InMemoryGlassmindPersistenceDriver
 * does for its in-memory equivalent.
 *
 * GlassmindMemoryRecord has no payload/event-data field to begin with (see
 * Glassmind-Schema-Migration-Plan.md §7), so this driver has nothing to
 * strip or guard against duplicating — it simply never reads or writes
 * anything beyond the record shape the client itself returns.
 */
export class DatabaseGlassmindPersistenceDriver implements GlassmindPersistenceDriver {
  constructor(private readonly client: DatabaseClient) {}

  insertRecord(record: GlassmindMemoryRecord): GlassmindMemoryRecord {
    return this.client.insert(record);
  }

  updateRecord(record: GlassmindMemoryRecord): GlassmindMemoryRecord {
    return this.client.update(record);
  }

  findById(kind: GlassmindMemoryRecord["kind"], id: string): GlassmindMemoryRecord | undefined {
    return this.client.findById(kind, id);
  }

  findBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[] {
    return this.client.findBySourceReference(sourceReference);
  }

  findByScope(scope: RecordScope): GlassmindMemoryRecord[] {
    return this.client.findByScope(scope);
  }
}
