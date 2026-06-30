-- Glassmind Phase 1 schema, per docs/architecture/Glassmind-Schema-Migration-Plan.md
-- and docs/architecture/Glassmind-Migration-Location-Decision.md.
--
-- SQLite dialect, for the dev/test driver only (apps/glassmind/src/sqliteDriver.ts),
-- per docs/architecture/Glassmind-DB-Technology-Decision.md. Not a production schema.
--
-- Each table stores the record's full shape as JSON in `data` (per
-- Glassmind-Schema-Migration-Plan.md §4.5's recommendation against
-- normalizing small, never-independently-queried structures like evidence),
-- plus a small set of extracted, indexed columns mirroring the six required
-- index dimensions: sourceReference, scope, record type/category (implicit,
-- one table per kind), status, createdAt (occurred_at), updatedAt.
--
-- The CHECK constraint on each table enforces Glassmind-Schema-Migration-Plan.md
-- §6's provenance rule at the schema level for the record's primary source
-- reference: at least one of the four source_* columns must be populated.
-- This is deliberately a SECOND, independent enforcement of the same rule
-- DurableGlassmindStore already enforces at the application layer — see
-- docs/architecture/Glassmind-Durable-Adapter-Design.md §8's requirement
-- that the application-level check run regardless of what the storage layer
-- can or cannot enforce natively, and Sprint-13-Implementation-Plan.md §3
-- item 5's requirement that this sprint prove the storage layer can enforce
-- it too. This migration does NOT enforce the lifecycle-level source
-- reference (resolution_source_reference / update_source_reference) at the
-- schema level — that reference is nested, conditionally-present JSON
-- inside `data`, not a flat column, and enforcing it would require a
-- trigger; it remains an application-level-only check for this migration,
-- a deliberate, documented scope limit (Glassmind-Migration-Location-Decision.md §4).

CREATE TABLE IF NOT EXISTS glassmind_conversation_turns (
  id TEXT PRIMARY KEY,
  scope_entity_kind TEXT NOT NULL,
  scope_entity_id TEXT NOT NULL,
  source_conversation_id TEXT,
  source_message_id TEXT,
  source_recommendation_id TEXT,
  source_event_id TEXT,
  occurred_at TEXT NOT NULL,
  status TEXT,
  updated_at TEXT,
  data TEXT NOT NULL,
  CHECK (
    source_conversation_id IS NOT NULL OR source_message_id IS NOT NULL OR
    source_recommendation_id IS NOT NULL OR source_event_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_conversation_turns_scope ON glassmind_conversation_turns (scope_entity_kind, scope_entity_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_source_conversation ON glassmind_conversation_turns (source_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_source_message ON glassmind_conversation_turns (source_message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_source_recommendation ON glassmind_conversation_turns (source_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_source_event ON glassmind_conversation_turns (source_event_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_status ON glassmind_conversation_turns (status);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_occurred_at ON glassmind_conversation_turns (occurred_at);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_updated_at ON glassmind_conversation_turns (updated_at);

CREATE TABLE IF NOT EXISTS glassmind_follow_ups (
  id TEXT PRIMARY KEY,
  scope_entity_kind TEXT NOT NULL,
  scope_entity_id TEXT NOT NULL,
  source_conversation_id TEXT,
  source_message_id TEXT,
  source_recommendation_id TEXT,
  source_event_id TEXT,
  occurred_at TEXT NOT NULL,
  status TEXT,
  updated_at TEXT,
  data TEXT NOT NULL,
  CHECK (
    source_conversation_id IS NOT NULL OR source_message_id IS NOT NULL OR
    source_recommendation_id IS NOT NULL OR source_event_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_scope ON glassmind_follow_ups (scope_entity_kind, scope_entity_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_source_conversation ON glassmind_follow_ups (source_conversation_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_source_message ON glassmind_follow_ups (source_message_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_source_recommendation ON glassmind_follow_ups (source_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_source_event ON glassmind_follow_ups (source_event_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON glassmind_follow_ups (status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_occurred_at ON glassmind_follow_ups (occurred_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_updated_at ON glassmind_follow_ups (updated_at);

CREATE TABLE IF NOT EXISTS glassmind_deferred_decisions (
  id TEXT PRIMARY KEY,
  scope_entity_kind TEXT NOT NULL,
  scope_entity_id TEXT NOT NULL,
  source_conversation_id TEXT,
  source_message_id TEXT,
  source_recommendation_id TEXT,
  source_event_id TEXT,
  occurred_at TEXT NOT NULL,
  status TEXT,
  updated_at TEXT,
  data TEXT NOT NULL,
  CHECK (
    source_conversation_id IS NOT NULL OR source_message_id IS NOT NULL OR
    source_recommendation_id IS NOT NULL OR source_event_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_deferred_decisions_scope ON glassmind_deferred_decisions (scope_entity_kind, scope_entity_id);
CREATE INDEX IF NOT EXISTS idx_deferred_decisions_source_conversation ON glassmind_deferred_decisions (source_conversation_id);
CREATE INDEX IF NOT EXISTS idx_deferred_decisions_source_message ON glassmind_deferred_decisions (source_message_id);
CREATE INDEX IF NOT EXISTS idx_deferred_decisions_source_recommendation ON glassmind_deferred_decisions (source_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_deferred_decisions_source_event ON glassmind_deferred_decisions (source_event_id);
CREATE INDEX IF NOT EXISTS idx_deferred_decisions_status ON glassmind_deferred_decisions (status);
CREATE INDEX IF NOT EXISTS idx_deferred_decisions_occurred_at ON glassmind_deferred_decisions (occurred_at);
CREATE INDEX IF NOT EXISTS idx_deferred_decisions_updated_at ON glassmind_deferred_decisions (updated_at);

CREATE TABLE IF NOT EXISTS glassmind_approval_waiting_states (
  id TEXT PRIMARY KEY,
  scope_entity_kind TEXT NOT NULL,
  scope_entity_id TEXT NOT NULL,
  source_conversation_id TEXT,
  source_message_id TEXT,
  source_recommendation_id TEXT,
  source_event_id TEXT,
  occurred_at TEXT NOT NULL,
  status TEXT,
  updated_at TEXT,
  data TEXT NOT NULL,
  CHECK (
    source_conversation_id IS NOT NULL OR source_message_id IS NOT NULL OR
    source_recommendation_id IS NOT NULL OR source_event_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_approval_waiting_states_scope ON glassmind_approval_waiting_states (scope_entity_kind, scope_entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_waiting_states_source_conversation ON glassmind_approval_waiting_states (source_conversation_id);
CREATE INDEX IF NOT EXISTS idx_approval_waiting_states_source_message ON glassmind_approval_waiting_states (source_message_id);
CREATE INDEX IF NOT EXISTS idx_approval_waiting_states_source_recommendation ON glassmind_approval_waiting_states (source_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_approval_waiting_states_source_event ON glassmind_approval_waiting_states (source_event_id);
CREATE INDEX IF NOT EXISTS idx_approval_waiting_states_status ON glassmind_approval_waiting_states (status);
CREATE INDEX IF NOT EXISTS idx_approval_waiting_states_occurred_at ON glassmind_approval_waiting_states (occurred_at);
CREATE INDEX IF NOT EXISTS idx_approval_waiting_states_updated_at ON glassmind_approval_waiting_states (updated_at);
