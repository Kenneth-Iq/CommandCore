# Nexus ↔ Glassmind Read-Client Boundary

## 1. Purpose

Defines the boundary and shape of a future Nexus-side client module that consumes the Glassmind read API (`docs/architecture/Glassmind-Read-Api-Contract.md`), without wiring it into any visible UI. This is a boundary/shape document only — no `apps/nexus-console` source changes as part of it, and no frontend wiring is authorized by it.

## 2. Nexus Must Consume The Read-Only Backend API, Not `apps/glassmind` Directly

Restated, unchanged, because this is the rule a "client module finally being designed" most tempts a shortcut around:

- **Process boundary.** `apps/nexus-console` is a browser application; the Glassmind read API (whether the current in-process dev/test stub, `GlassmindReadApiStub`, or a future real HTTP service) runs server-side. A browser cannot import server-side code and have it function as anything other than dead weight in the bundle.
- **Structural write-prevention.** Per `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4/§9 and `docs/architecture/Glassmind-Backend-Read-Api-Runtime-Decision.md` §5's risk note: a direct import of `apps/glassmind` would expose `GlassmindStore`'s full read+write interface to Nexus code, removing the mechanical guarantee that Nexus cannot write. A read-client module that only ever calls the read API's four operations preserves that guarantee structurally — the client module's own exported surface becomes the enforcement point.
- **Independent deploy lifecycles**, per `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §3 — unchanged; `apps/nexus-console` and `apps/glassmind` remain separate npm packages with no shared workspace tooling.

## 3. Future Nexus Client Module Location Recommendation

**`apps/nexus-console/src/glassmindReadClient.ts`** (not created by this document) — alongside this package's existing backend-facing client pattern (`commandcoreApi.ts`, referenced throughout prior Nexus-Glassmind planning documents), not inside a generic `utils/` or `lib/` directory. This keeps it discoverable as "the one place Nexus talks to Glassmind-backed data" and mirrors how `apps/jarvis-engine`'s `glassmindReadAdapter.ts` and `apps/glassmind`'s own `readApiStub.ts` are each named after exactly what they do, not generically.

The module exports plain async functions (§4), not a class — matching `commandcoreApi.ts`'s existing convention for this package's other backend-facing calls, so this client doesn't introduce a second calling convention for the same kind of thing.

## 4. Required Methods

Four functions, one per read API operation (`docs/architecture/Glassmind-Read-Api-Contract.md` §2), each returning a `Promise` (a real HTTP call is asynchronous, even though the current dev/test stub's handlers are synchronous):

```ts
async function fetchMemoryBySourceReference(query: BySourceReferenceQuery): Promise<NexusMemoryViewModel>;
async function fetchMemoryByScope(query: ByScopeQuery): Promise<NexusMemoryViewModel>;
async function fetchMemoryTrace(query: ByScopeQuery): Promise<NexusTraceViewModel>;
async function fetchGlassmindReadiness(): Promise<NexusReadinessViewModel>;
```

No fifth function exists, and no function in this module ever issues a non-`GET`-shaped call — restated as a requirement here exactly as it is on the API itself, since the client module is the second of two places (API stub, client) where the no-write guarantee must independently hold.

### 4.1 How Each Maps To The Read API Contract

| Client function | API contract operation (`Glassmind-Read-Api-Contract.md` §2) |
| --- | --- |
| `fetchMemoryBySourceReference` | §2.1 `GET /glassmind/memory/by-source-reference` |
| `fetchMemoryByScope` | §2.2 `GET /glassmind/memory/by-scope` |
| `fetchMemoryTrace` | §2.3 `GET /glassmind/memory/trace` |
| `fetchGlassmindReadiness` | §2.4 `GET /glassmind/health/readiness` |

Each function's query parameter type (`BySourceReferenceQuery`/`ByScopeQuery`) mirrors the API contract's own query shapes (§2.1-§2.3) — declared independently in `apps/nexus-console`, not imported from `apps/glassmind`, per §2's boundary, the same "declare structurally independent" pattern this repo has used at every other package boundary (`GlassmindLikeStore` in `apps/jarvis-engine`, `EvidenceLink` in `apps/glassmind`).

### 4.2 Nexus-Safe View Models

The client's return types are not the raw `GlassmindReadApiResponse<TRecord>` envelope (`Glassmind-Read-Api-Contract.md` §4) — they are Nexus-shaped view models the client maps the envelope into, so every consuming component works with one consistent, frontend-appropriate shape regardless of which underlying API state produced it:

```ts
type NexusMemoryViewModel =
  | { state: "not_queried" }
  | { state: "no_memory_found" }
  | { state: "found"; recordCount: number; records: NexusMemoryRecordView[] }
  | { state: "unavailable"; reason: string };

type NexusMemoryRecordView = {
  kind: string;
  summary: string;
  evidence?: { label: string; page: string; selection?: Record<string, string | undefined> };
  occurredAt: string;
};
```

`unavailable` collapses the API's `invalid_request`/`permission_denied`/`backend_unavailable` error codes (§6) into one Nexus-facing state — a component rendering "I can't show memory right now" doesn't need to distinguish *why* at the rendering layer; the distinction matters for logging/diagnostics (handled inside the client function, not exposed to components), not for what a panel displays.

## 5. How Components May Later Consume It

Unchanged in spirit from `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` §6 and `docs/architecture/Nexus-Glassmind-Backend-Read-Api-Stub-Design.md` §8, restated against this document's concrete client functions:

| Component | Client function |
| --- | --- |
| `EvidenceCard` | Whichever call produced the `EvidenceLink` it's already resolving — no direct call of its own. |
| `ConversationContextBar` | `fetchMemoryBySourceReference`, scoped to the active conversation. |
| `DecisionQueuePanel` | `fetchMemoryByScope`, filtered client-side to `deferred_decision` records. |
| `PendingFollowUpsPanel` | `fetchMemoryByScope`, filtered client-side to `follow_up` records. |
| `ApprovalCardsPanel` | `fetchMemoryByScope`, filtered client-side to `approval_waiting_state` records — labeled as Glassmind's memory, never the live Approval Engine, per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §8. |

No component consumes `fetchMemoryTrace` or `fetchGlassmindReadiness` directly yet, mirroring `Nexus-Glassmind-Backend-Read-Api-Stub-Design.md` §8's identical reasoning: `trace` awaits the not-yet-built memory trace panel, and `readiness` is infrastructure for whatever shared data-fetching layer eventually calls the other three, not a panel-level concern.

## 6. Error-State Handling

| API error/status | Client-level handling |
| --- | --- |
| `invalid_request` | Maps to `{ state: "unavailable", reason: "..." }`. This should only ever occur from a client-side bug (a malformed query the client itself built) — not a state any component should design around, but the client must not crash or throw uncaught on it either. |
| `permission_denied` | Maps to `{ state: "unavailable", reason: "..." }`. No auth model exists yet (per `docs/engineering/Sprint-12-Remaining-Gaps.md`), so no real call produces this today — handled now so adding auth later doesn't require every consuming component to learn a new state. |
| `backend_unavailable` | Maps to `{ state: "unavailable", reason: "..." }`. The most realistic error case today (the dev/test stub or a future real service simply not reachable) — components should render this distinctly from `no_memory_found` (§7's honesty requirement), never silently as an empty result. |
| `no_memory_found` | Maps to `{ state: "no_memory_found" }` — passed through unchanged, since this is already an honest, successful outcome at the API layer and needs no client-side reinterpretation. |

## 7. Required Tests Before UI Wiring

Per Sprint 15's sequencing (`docs/roadmap/Sprint-15-Implementation-Plan.md` §3):

- **No-write-method test**: structural, mirroring `apps/glassmind/src/readApiStub.test.ts`'s own pattern — enumerate the client module's exports and assert none is write/ingest/update/resolve/delete-shaped.
- **View-model mapping tests** for all four `MemoryRetrievalStatus`/error states (§4.2, §6): each API response shape maps to the correct `NexusMemoryViewModel`/`NexusTraceViewModel`/`NexusReadinessViewModel` state.
- **Mocked-client tests for `EvidenceCard`-compatible data**: confirm a `found` response's `NexusMemoryRecordView[]` shape is exactly what `EvidenceCard`'s existing props expect, without requiring `EvidenceCard` itself to be modified or wired yet.
- **Mocked-client tests for `ConversationContextBar`-compatible data**: same requirement, for that component's expected shape.
- **No-fabricated-evidence test**: a record with no `evidence` field maps to a `NexusMemoryRecordView` with `evidence: undefined`, never an invented placeholder.
- **No direct `apps/glassmind` import test**: structural, confirming the client module's own source has no import statement referencing `apps/glassmind` — extending the same pattern `Glassmind-Backend-Read-Api-Runtime-Decision.md` §5 already names as a risk to test against, now from the Nexus side.

## 8. Non-Goals

- **No frontend writes.** Every client function in §4 is read-only, mapping only `GET`-shaped API operations. No mutating call is designed, stubbed, or implied anywhere in this document.
- **No EventStore ingestion from Nexus.** This client has no relationship to `SafeIngestionPath`/`EventStoreIngestionAdapter`/`DefaultCommandCoreEventBridge` — those remain entirely backend-internal.
- **No approval authority in Nexus.** A component consuming `fetchMemoryByScope`'s `approval_waiting_state` records does not gain any authority over the real approval process — per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, it remains a read-only window onto Glassmind's memory of a process that happens entirely in CommandCore.
- **No direct Glassmind import from Nexus.** Restated as the single most important rule in this document (§2) — the client module exists specifically so this never needs to happen.

## 9. Cross-References

- `docs/architecture/Glassmind-Read-Api-Contract.md` — the contract this client module implements against.
- `docs/architecture/Glassmind-Backend-Read-Api-Runtime-Decision.md`, `docs/architecture/Nexus-Glassmind-Backend-Read-Api-Stub-Design.md` — the placement/design decisions this document's client-side counterpart follows.
- `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, §6, §8 — the boundary and per-component mapping this document restates and makes concrete on the client side.
- `apps/glassmind/src/readApiStub.ts` — the dev/test stub this client would call against today, if wired (not authorized by this document).
- `docs/roadmap/Sprint-15-Implementation-Plan.md` — where this document's recommendations become a sequenced implementation plan.
