# Nexus ↔ Glassmind Read API Plan

## 1. Purpose

Defines the read-only backend API boundary `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §9 already requires must exist before Nexus reads any Glassmind-backed evidence — concrete endpoint/query shapes, response honesty semantics, and per-component consumption guidance. This is a plan; no API is implemented, and no `apps/nexus-console` source changes as part of this document.

## 2. Why Nexus Must Not Import `apps/glassmind` Directly

- **Process boundary.** `apps/nexus-console` is a browser application; `apps/glassmind`'s durable store (`DurableGlassmindStore` + whatever `GlassmindPersistenceDriver` Sprint 12/13 eventually connects) runs server-side, wherever the still-undecided runtime from `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` ends up living. A browser cannot hold that connection — there is no version of "import `apps/glassmind` into Nexus" that would even run, regardless of architectural preference.
- **Boundary enforcement, not just convenience.** Per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4 and §9, the rule that Nexus never writes to Glassmind is enforced structurally by routing every read through an API whose surface has no mutating endpoint — a direct import would remove that structural guarantee and fall back on developer discipline alone, the exact failure mode every Glassmind-adjacent document in this repo has tried to design around (`GlassmindReadOnlyMemoryAdapter`'s one-method class, `commandCoreEventBridge.ts`'s no-`core/`-import test, etc.).
- **Independent deploy/version lifecycles.** `apps/nexus-console` and `apps/glassmind` are separate npm packages with no shared workspace tooling (`Glassmind-Repository-Boundary-Decision.md` §3). A direct dependency would couple their release cadence for no architectural benefit, mirroring the same reasoning that already kept `apps/jarvis-engine` from importing `apps/glassmind` directly (`glassmindReadAdapter.ts`'s structural-typing precedent).

## 3. Proposed Read-Only Backend API Shape

A thin HTTP/RPC layer hosted by whichever backend service ends up owning Glassmind persistence (per `Glassmind-Persistence-Runtime-Decision.md` §4, undecided) or the EventStore bridge runtime (per `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` §4, also undecided) — plausibly the same service, since both already require a long-lived TypeScript-capable process. This document does not require that decision to be made first; it specifies what the API must guarantee once it exists, consistent with `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §9's original deferral.

Shape, modeled after this repo's existing `apps/nexus-console/src/commandcoreApi.ts` read-only dashboard-data pattern (request in, typed JSON envelope out, no client-side mutation capability):

```
GET /glassmind/source-reference?conversationId=...&messageId=...&recommendationId=...&eventId=...
GET /glassmind/scope?entityKind=...&entityId=...
GET /glassmind/trace?entityKind=...&entityId=...
```

No `POST`/`PUT`/`PATCH`/`DELETE` route exists anywhere on this surface — enforced mechanically (§8), not left to convention.

## 4. Endpoints / Query Shapes

### 4.1 Retrieve by `sourceReference`

`GET /glassmind/source-reference` — query parameters mirror `SourceReference`'s four optional fields (`conversationId`, `messageId`, `recommendationId`, `eventId`), at least one required. Maps directly onto `GlassmindStore.retrieveBySourceReference`. Returns every record kind that matches, exactly as the underlying store method already does — no kind-filtering at this layer, since Nexus components decide what to do with each kind, not the API.

### 4.2 Retrieve by `scope`

`GET /glassmind/scope` — `entityKind` and `entityId` required, mirroring `RecordScope`. Maps directly onto `GlassmindStore.retrieveByScope`. This is the query `EntityEvidencePanel`'s "Related Evidence" section and most of the five components in §6 would use most often, since Nexus already organizes most views around an entity in focus.

### 4.3 Retrieve memory trace for conversation/decision/follow-up/approval

`GET /glassmind/trace` — same `entityKind`/`entityId` query shape as §4.2, but returns records grouped and ordered for the "future memory trace panel" `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §5 names: a chronological interleaving of all four record kinds touching that entity, each tagged with its kind, `occurredAt`, and (for follow-ups/decisions/approvals) its current `status` and lifecycle metadata if resolved/updated. This is a presentation-shaped view over the same underlying `retrieveByScope` data `EvidenceCard`/`DecisionQueuePanel`/etc. consume individually — not a new Glassmind-side query method, just a different shape of the same response for the one component that wants all four kinds interleaved rather than separated by kind.

## 5. How Responses Represent Retrieval Status

Every endpoint in §4 returns a response envelope distinguishing the same three outcomes `apps/jarvis-engine`'s `MemoryRetrievalStatus` already establishes — reused, not reinvented, per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §10's explicit requirement that Nexus and Jarvis present memory honesty consistently:

```
{ "status": "not_queried" }
{ "status": "no_memory_found" }
{ "status": "found", "recordCount": <n>, "records": [...] }
```

- **`not_queried`** is primarily a frontend-side concept (the request hasn't completed, or this view doesn't call the API at all) rather than something the API itself usually returns — but the API's envelope shape reserves the value so a consuming component can represent "haven't asked yet" and "asked, got nothing" with the same vocabulary it uses for the other two states, rather than inventing a separate frontend-only convention.
- **`no_memory_found`** is what the API returns when the underlying `retrieveBySourceReference`/`retrieveByScope` call returns `[]` — never an error, never an empty `200` with an ambiguous body, always this explicit, named status.
- **`found`** includes `recordCount` and the records themselves, shaped per record kind exactly as `apps/glassmind/src/types.ts` already defines each `GlassmindMemoryRecord` variant — the API does not invent a new, separate response shape per record kind; it serializes the existing ones.

### 5.1 Stale/Low-Confidence Memory, Later

Per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §8: Phase 1's `confidence` field is simple and not yet a ranking signal, so the API's `found` response does not add any confidence-weighted sorting or filtering — it returns `confidence` and `occurredAt` (and, where present, `resolution.resolvedAt`/`update.updatedAt`) exactly as stored, letting the frontend display age/confidence as-is. A future, separately-reviewed API revision could add a `stale: boolean` or similar derived flag once Phase 2's corroboration model (`Glassmind-Memory-Model.md` §3) exists to make that judgment meaningfully — not simulated early with Phase 1's simple number, per that document's own non-goal.

## 6. How The Five Named Components May Consume This Later

| Component | Query used | Notes |
| --- | --- | --- |
| `EvidenceCard` | Whichever query produced the `EvidenceLink` it's already resolving — no new query of its own. | Already structurally ready (`Nexus-Glassmind-Read-Only-Evidence-Plan.md` §5); the API supplies the data, the card's resolve/expand shape doesn't change. |
| `ConversationContextBar` | §4.1 (by `sourceReference`, scoped to the active conversation) | Informs the `investigation` field with recent conversation memory, read-only, exactly as already scoped in `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §5. |
| `DecisionQueuePanel` | §4.2 (by `scope`), filtered client-side to `deferred_decision` records | Replaces `buildDecisionQueue`'s recomputed list with the API's `found`/`no_memory_found` response; same four-status UI shape. |
| `PendingFollowUpsPanel` | §4.2 (by `scope`), filtered client-side to `follow_up` records | Replaces `buildFollowUps`; resolution status now durable instead of session-local, per `Glassmind-Phase-1-Persistence-Path.md` §3.2. |
| `ApprovalCardsPanel` | §4.2 (by `scope`), filtered client-side to `approval_waiting_state` records | Replaces `buildApprovalCards`; per §5.1 and `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §8, must visibly label this as Glassmind's memory of approval activity, not the live Approval Engine. |

Filtering by record kind happens client-side in this plan (the API returns whatever matches the scope, the component picks its kind) rather than adding a `kind` query parameter to §4.2 — consistent with `GlassmindStore.retrieveByScope`'s own existing shape, which has no kind filter either. If a future revision finds this wasteful (e.g., a panel re-fetching the same scope five times across five components), a shared fetch/cache layer is a frontend concern to solve in `apps/nexus-console`, not a reason to add kind-filtering to this API now.

## 7. Tests Required Before Frontend Wiring

- **Response envelope contract tests**, once the API is implemented: confirm `not_queried`/`no_memory_found`/`found` are produced exactly as §5 specifies for each of the three endpoints, mirroring `apps/jarvis-engine`'s existing `MemoryRetrievalStatus` test patterns so the two stay provably consistent rather than just documented as intending to be.
- **No-write-surface test**, mirroring `apps/glassmind/src/commandCoreEventBridge.test.ts`'s "no CommandCore import" structural-test pattern and restating `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §10's existing requirement: a test enumerating the API's actual registered routes and asserting none of them is a mutating HTTP method, checked mechanically against the real route table, not just asserted by reading the code.
- **Empty-retrieval honesty test**: confirm all three endpoints return `no_memory_found` (never a `404`, never an error status) when the underlying store has nothing — extending the same "empty retrieval is honest, not an error" assertion already proven at the `GlassmindStore` layer (`glassmindStoreParity.test.ts`) up through this API layer.
- **Per-component consumption tests**, only once frontend wiring actually happens (explicitly not in Sprint 12, per §8): extend `DecisionQueuePanel.test.tsx`/`PendingFollowUpsPanel.test.tsx`/`ApprovalCardsPanel.test.tsx`/etc. with cases for the API-backed `found`/`no_memory_found`/`not_queried` states, using a mocked API response — not a new test framework, the same `buildMockWorld`-style pattern these files already use.

## 8. Non-Goals

- **No frontend writes.** This plan defines read-only `GET` endpoints only; nothing here authorizes or implies a write path from Nexus into Glassmind, ever.
- **No direct EventStore ingestion.** Nexus has no relationship to `SafeIngestionPath`, `EventStoreIngestionAdapter`, or `DefaultCommandCoreEventBridge` — those remain backend-only, per `Glassmind-Package-Integration-Map.md` §7 and `CommandCore-EventStore-Bridge-Runtime-Decision.md` §4.
- **No approval/follow-up/decision authority in Nexus.** Displaying records through this API does not make Nexus part of the approval, follow-up, or decision process — it remains a read-only window onto Glassmind's memory of processes that happen entirely in CommandCore and the conversation engine, per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4.
- **No vector/semantic memory.** This API serializes Phase 1's existing record shapes exactly; it adds no similarity search, no embedding field, no ranking beyond what `confidence`/`occurredAt` already provide as raw, unprocessed values.
- **No implementation in this sprint.** No route is built, no service hosts it yet, and no `apps/nexus-console` source changes — this document satisfies Sprint 12I's planning requirement only.

## 9. Cross-References

- `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, §7, §8, §9, §10 — the plan this document operationalizes into concrete endpoint/response shapes.
- `docs/architecture/Glassmind-Persistence-Runtime-Decision.md`, `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` — the still-undecided runtime questions this API's eventual host depends on.
- `apps/jarvis-engine/src/types.ts` (`MemoryRetrievalStatus`) — the vocabulary §5 reuses rather than reinventing.
- `apps/glassmind/src/types.ts`, `apps/glassmind/src/store.ts` — the record shapes and query methods §4 maps directly onto.
- `apps/nexus-console/src/components/EvidenceCard.tsx`, `ConversationContextBar.tsx`, `DecisionQueuePanel.tsx`, `PendingFollowUpsPanel.tsx`, `ApprovalCardsPanel.tsx` — the five components §6 maps queries onto.
- `docs/roadmap/Sprint-12-Implementation-Plan.md` §3 item 9 — the backlog item this document delivers.
