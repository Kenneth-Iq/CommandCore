# Nexus ↔ Glassmind Backend Read API Stub Design

## 1. Purpose

Designs a concrete, runnable stub for the read-only backend API `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` already specified at a planning level — naming actual request/response shapes, error handling, and a fourth endpoint (`readiness`) that plan didn't cover. This is still a design document: no route is implemented, no service hosts it, and no `apps/nexus-console` source changes as part of it. It sits between `Nexus-Glassmind-Read-Api-Plan.md` (the plan) and a real implementation (future work, per `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 9's "stub" framing).

## 2. Why Nexus Still Must Not Import `apps/glassmind` Directly

Unchanged from `Nexus-Glassmind-Read-Api-Plan.md` §2, restated because this is the rule a "stub finally being designed concretely" most tempts a shortcut around:

- **Process boundary.** `apps/nexus-console` is a browser application; `apps/glassmind`'s SQLite-backed driver (`SqliteGlassmindPersistenceDriver`, per `docs/architecture/Glassmind-DB-Technology-Decision.md`) and any future production driver both run server-side. A browser cannot hold that connection regardless of how close to "real" the backend now is.
- **Structural write-prevention.** Per `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4 and §9: routing every read through an API with no mutating endpoint is what makes the no-write rule mechanically true, not just conventionally true. A direct import — even now that real, working Glassmind code exists to import — would remove that guarantee.
- **Independent deploy lifecycles**, per `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §3 — unchanged; `apps/nexus-console` and `apps/glassmind` remain separate npm packages with no shared workspace tooling, confirmed again this sprint when `apps/glassmind/src/jarvisSqliteReadHarness.test.ts` hit the same `rootDir` boundary trying to reach `apps/jarvis-engine` (see `docs/engineering/Sprint-13-Implementation-Review.md` §2) — the identical mechanical reason applies to `apps/nexus-console`.

## 3. Backend API Responsibility

The API is the only process boundary-crossing component allowed to import `apps/glassmind` directly (a normal, same-language TypeScript dependency, not a structural mirror — unlike the Jarvis/Nexus side, this *is* the place a real import is appropriate, since the API and `apps/glassmind` can share a runtime). Its responsibilities, precisely:

- Translate an HTTP request into a call against `GlassmindStore`'s existing `retrieveBySourceReference`/`retrieveByScope` methods (no new Glassmind-side query methods are introduced).
- Translate the result into the `MemoryRetrievalStatus`-shaped envelope (§5).
- Enforce that no mutating Glassmind method (`record*`, `resolve*`, `update*`) is reachable from any route — structurally, via the route table itself (§8), not by developer discipline.
- Report its own backend health (§4.4) so Nexus can distinguish "no memory found" from "the backend is unreachable" (§6).

It does **not**: decide what counts as eligible for ingestion (that's `SafeIngestionPath`/`EventStoreIngestionAdapter`'s concern), perform any business validation Glassmind doesn't already perform, or hold any state of its own beyond what it reads through `GlassmindStore`.

## 4. Suggested Read-Only Endpoints

### 4.1 `GET /glassmind/memory/by-source-reference`

Maps directly onto `GlassmindStore.retrieveBySourceReference`.

**Request** (query parameters, at least one required):
```
?conversationId=...&messageId=...&recommendationId=...&eventId=...
```

**Response**: §5's envelope, `records` typed as `GlassmindMemoryRecord[]` when `found`.

### 4.2 `GET /glassmind/memory/by-scope`

Maps directly onto `GlassmindStore.retrieveByScope`.

**Request** (both required):
```
?entityKind=mission&entityId=m-1
```

**Response**: same envelope shape as §4.1.

### 4.3 `GET /glassmind/memory/trace`

Per `Nexus-Glassmind-Read-Api-Plan.md` §4.3: same query shape as §4.2, but the response is ordered chronologically across all four record kinds and annotated with each record's `kind` and (where resolved/updated) lifecycle status — the data source for the "future memory trace panel" `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §5 names.

**Request**:
```
?entityKind=mission&entityId=m-1
```

**Response**: §5's envelope, `records` typed as an array of `{ kind: GlassmindMemoryRecord["kind"]; occurredAt: string; lifecycleStatus?: string; lifecycleAt?: string; record: GlassmindMemoryRecord }`, sorted by `occurredAt` ascending.

### 4.4 `GET /glassmind/health/readiness`

Not present in `Nexus-Glassmind-Read-Api-Plan.md` — added here because §6's "unavailable backend" error case needs a way for Nexus to distinguish "the backend answered honestly with no memory" from "the backend could not be reached or isn't ready," and a generic 5xx on a memory endpoint conflates the two. A dedicated readiness check keeps that distinction explicit and queryable on its own, the same pattern `apps/nexus-console`'s existing `OperationalHealthRibbon` already uses for other backend health signals.

**Request**: none.

**Response**:
```
{ "ready": true }
{ "ready": false, "reason": "string" }
```

Never returns a `MemoryRetrievalStatus` envelope — this endpoint answers "can I talk to the backend at all," not "what does it know."

## 5. Request/Response Shapes

A single, shared response envelope for §4.1-§4.3, mirroring `apps/jarvis-engine/src/types.ts`'s `MemoryRetrievalStatus` exactly (per `Nexus-Glassmind-Read-Api-Plan.md` §5's requirement to reuse, not reinvent, that vocabulary):

```ts
type GlassmindReadApiResponse<TRecord> =
  | { status: "not_queried" }
  | { status: "no_memory_found" }
  | { status: "found"; recordCount: number; records: TRecord[] }
  | { status: "error"; error: GlassmindReadApiError };
```

`status: "error"` is new relative to `MemoryRetrievalStatus`'s three-value union — `MemoryRetrievalStatus` was designed for a caller (Jarvis) that always has a real, in-process `JarvisMemoryStore` to ask, where failure isn't a meaningful state; an HTTP API call can fail for reasons no in-process call can (network, malformed request, backend down), so this fourth value is added specifically at the API boundary, not pushed back into `MemoryRetrievalStatus` itself.

## 6. Error Handling

| Case | HTTP status | Response body |
| --- | --- | --- |
| Invalid `sourceReference` (no field populated, §4.1) | `400` | `{ "status": "error", "error": { "code": "invalid_source_reference", "message": "At least one of conversationId, messageId, recommendationId, eventId is required." } }` |
| Invalid `scope` (missing `entityKind` or `entityId`, §4.2/§4.3) | `400` | `{ "status": "error", "error": { "code": "invalid_scope", "message": "Both entityKind and entityId are required." } }` |
| Backend unavailable (Glassmind's store/driver unreachable) | `503` | `{ "status": "error", "error": { "code": "backend_unavailable", "message": "..." } }` — distinct from `no_memory_found`; a client must not treat this as "nothing was found." |
| Permission denied (later — no auth model exists yet per `docs/engineering/Sprint-12-Remaining-Gaps.md`) | `403` (reserved) | `{ "status": "error", "error": { "code": "permission_denied", "message": "..." } }` — the shape is reserved now so adding real auth later doesn't require a response-envelope migration; no endpoint returns this today since no auth model exists to deny anything. |

A `400`/`503`/`403` never reuses `no_memory_found` — conflating "I asked and there's nothing" with "I couldn't ask" or "I wasn't allowed to ask" would violate the same empty-retrieval-honesty rule `Nexus-Glassmind-Read-Api-Plan.md` §5 and every Glassmind retrieval document in this repo already establishes.

## 7. How `MemoryRetrievalStatus` Maps Into Responses

- **`not_queried`** — primarily meaningful client-side (the request hasn't completed, or this Nexus surface doesn't call the API at all for the current view). The API itself would only return this in the unusual case it's asked to report on a query it deliberately didn't run — not expected from any of §4.1-§4.3's endpoints, which always run their query when called. Reserved in the type for symmetry with Jarvis's identical vocabulary, per §5.
- **`no_memory_found`** — returned whenever the underlying `GlassmindStore` call returns `[]`. Always `200`, never a `4xx`/`5xx` — an honest, successful answer.
- **`found`** — returned with `recordCount` and `records` populated exactly as `apps/glassmind/src/types.ts` already shapes each kind. Always `200`.

## 8. Which Nexus Components May Consume This Later

Unchanged from `Nexus-Glassmind-Read-Api-Plan.md` §6, restated with this document's concrete endpoints named:

| Component | Endpoint |
| --- | --- |
| `EvidenceCard` | Whichever endpoint produced the `EvidenceLink` it's already resolving — no direct call of its own. |
| `ConversationContextBar` | §4.1, scoped to the active conversation. |
| `DecisionQueuePanel` | §4.2, filtered client-side to `deferred_decision` records. |
| `PendingFollowUpsPanel` | §4.2, filtered client-side to `follow_up` records. |
| `ApprovalCardsPanel` | §4.2, filtered client-side to `approval_waiting_state` records — labeled as Glassmind's memory, never the live Approval Engine, per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §8. |

No component consumes §4.3 (`trace`) or §4.4 (`readiness`) directly yet — `trace` awaits the not-yet-built "future memory trace panel," and `readiness` is infrastructure for whatever shared fetch layer eventually calls the other three, not a panel-level concern.

## 9. Required Tests Before Frontend Wiring

- **Response envelope contract tests** for all three memory endpoints (§4.1-§4.3): confirm `not_queried`/`no_memory_found`/`found`/`error` are each produced exactly as §5-§7 specify, extending `Nexus-Glassmind-Read-Api-Plan.md` §7's existing requirement with the new `error` case.
- **Error-case tests** for each row of §6's table — invalid source reference, invalid scope, backend unavailable (simulated, e.g., by injecting a `GlassmindStore` that throws) — confirming the correct HTTP status and `error.code`, and specifically that none of them returns `no_memory_found`.
- **Readiness endpoint test**: confirms `/glassmind/health/readiness` never returns a `MemoryRetrievalStatus`-shaped body and correctly reports `ready: false` when the backend's `GlassmindStore` is unreachable.
- **No-write-surface test**, mechanical, per `Nexus-Glassmind-Read-Api-Plan.md` §7: enumerate the real route table and assert no route uses a mutating HTTP method (`POST`/`PUT`/`PATCH`/`DELETE`) anywhere on this API's surface — this is the test that makes §2's structural-write-prevention claim actually true, not just designed to be true.
- **`trace` ordering test**: confirms §4.3's chronological-across-kinds ordering is correct given records from multiple kinds with interleaved `occurredAt` values.
- **Per-component consumption tests**, only once frontend wiring actually happens (not in this sprint): extending the existing `DecisionQueuePanel.test.tsx`/`PendingFollowUpsPanel.test.tsx`/`ApprovalCardsPanel.test.tsx`/etc. with mocked-API-response cases, per `Nexus-Glassmind-Read-Api-Plan.md` §7's identical requirement.

## 10. Non-Goals

- **No frontend writes.** Every endpoint in §4 is `GET`. No mutating endpoint is designed, stubbed, or implied anywhere in this document.
- **No EventStore ingestion from Nexus.** This API has no relationship to `SafeIngestionPath`/`EventStoreIngestionAdapter`/`DefaultCommandCoreEventBridge` — those remain backend-internal, per `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` §4.
- **No approval authority in Nexus.** §4.2/§4.3 returning `approval_waiting_state` records does not make Nexus part of the approval process — per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, it remains a read-only window onto Glassmind's memory of a process that happens entirely in CommandCore.
- **No vector/semantic memory.** Every response shape in §5 serializes Phase 1's existing record types exactly — no embedding field, no similarity ranking, no new record kind.

## 11. Cross-References

- `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` — the plan this document turns into concrete shapes.
- `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, §8, §9 — the boundary and honesty rules §2, §6, §8 restate.
- `apps/jarvis-engine/src/types.ts` (`MemoryRetrievalStatus`) — the vocabulary §5 extends with an `error` case.
- `apps/glassmind/src/store.ts`, `apps/glassmind/src/types.ts` — the methods and record shapes §3-§4 map directly onto.
- `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §3 — the package-separation reasoning §2 restates.
- `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 9 — the backlog item this document delivers.
