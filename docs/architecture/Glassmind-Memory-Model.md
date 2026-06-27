# Glassmind Memory Model

## 1. Purpose

Expands `docs/architecture/Glassmind-Architecture.md` §3's seven memory kinds into schema-level detail: what fields each kind actually needs, how each relates to existing CommandCore and Nexus entities, and where the boundary between "real CommandCore state" and "Glassmind's record of it" sits precisely.

## 2. Shared Fields

Every memory record, regardless of kind, carries the same baseline fields so retrieval (`Glassmind-Retrieval.md`) and evidence validation (`Conversation-Evidence.md`) can treat them uniformly:

```text
MemoryRecord {
  id
  kind: working | conversation | company | knowledge | vector | semantic
  scope: { entityKind, entityId }        // what this memory is about
  sourceReference: { conversationId? missionId? eventId? }  // provenance, never optional
  createdAt
  promotedAt?                            // set only if promoted to long-term, per Architecture §5
  confidence                              // signal-derived, never cosmetic, per Reasoning-Architecture §5
}
```

A memory record without a `sourceReference` should be rejected at write time — this is the same enforcement point already specified in the Architecture document's §2 and is repeated here because it is the single most important constraint in this whole model.

## 3. Per-Kind Schema

- **Working memory**: `MemoryRecord` plus `turnId` and `expiresAt` (cleared at end of turn, never persisted past it).
- **Conversation memory**: not a separate store — indexes the existing Conversation/Thread/Message records by `conversationId`, `missionId`, and participant. Glassmind's schema here is an index definition, not a new table.
- **Company memory**: `MemoryRecord` plus `pattern` (a short description of the recurring observation) and `occurrenceCount`. Scoped strictly to one company/workspace/project per `Glassmind-Workspace-Knowledge.md`'s isolation rules.
- **Knowledge memory**: `MemoryRecord` plus `assetId` and `citedInContext` (what reasoning or conversation cited the asset), separate from the Knowledge Centre's own asset content.
- **Vector memory** (Phase 3): `MemoryRecord` plus `embedding` and `embeddingModelVersion` — the version field exists so that a future embedding-model change doesn't silently mix incompatible vectors.
- **Semantic memory**: `MemoryRecord` plus `generalization` (the abstracted fact) and `supportingRecordIds` (which company/knowledge memories it was generalized from) — semantic memory must always be traceable back to the concrete memories that produced it.
- **Long-term memory**: not a distinct kind — any of the above with `promotedAt` set, per the promotion rule in Architecture §5.

## 4. Relationship To CommandCore And Nexus Entities

Glassmind's `scope.entityId` always refers to a real CommandCore/Nexus entity ID (mission, agent, tool, knowledge asset, conversation, workspace, company, project) — the exact same identifier space `RouteSelection` and `EvidenceLink` already use throughout Nexus. Glassmind does not mint its own entity identifiers; this is what makes its memories resolvable into real evidence links rather than a parallel, disconnected dataset.

## 5. What Glassmind Does Not Store

- Current/live state (a mission's current status, a tool's current health) — that remains CommandCore's registries and runtimes, queried fresh every time. Glassmind stores what was *observed and judged worth remembering*, not a cache of current state.
- Raw event payloads — those live in the EventStore. Glassmind's `sourceReference.eventId` points at them; it does not duplicate them.
- Anything without a confidence value — per §2, every record carries one, even if Beta-1/Beta-2's confidence model is simple.

## 6. Cross-References

- `docs/architecture/Glassmind-Architecture.md` §3 — the seven memory kinds this document gives schema to.
- `docs/architecture/Glassmind-Ingestion.md` — how these records get created.
- `docs/architecture/Glassmind-Workspace-Knowledge.md` — the isolation boundary for company/knowledge memory.

## 7. Risks

- If `sourceReference` is ever made optional for implementation convenience, every downstream evidence guarantee in this product silently breaks — this field should be enforced at the storage layer, not just documented as a convention.
- Treating "current state" and "remembered state" as interchangeable in the schema (e.g., caching a mission's live status inside a memory record) would let stale data masquerade as a fresh observation — §5's exclusion list exists specifically to prevent this.
