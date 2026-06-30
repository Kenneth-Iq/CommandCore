# Glassmind Read API Contract

## 1. Purpose

Defines the exact request/response contract for the four read-only Glassmind API endpoints, per `docs/architecture/Nexus-Glassmind-Backend-Read-Api-Stub-Design.md` and the placement decided in `docs/architecture/Glassmind-Backend-Read-Api-Runtime-Decision.md`. This contract is implementation-shape-agnostic: it is satisfied identically whether called as an in-process handler function (the Sprint 14C dev/test stub) or, later, as a real HTTP endpoint — the contract does not change when the transport does.

## 2. Endpoints

### 2.1 `GET /glassmind/memory/by-source-reference`

Maps onto `GlassmindStore.retrieveBySourceReference`.

**Query parameters** (all optional individually, at least one required):
```
conversationId?: string
messageId?: string
recommendationId?: string
eventId?: string
```

**Response**: §4's envelope, `records: GlassmindMemoryRecord[]` when `found`.

### 2.2 `GET /glassmind/memory/by-scope`

Maps onto `GlassmindStore.retrieveByScope`.

**Query parameters** (both required):
```
entityKind: EntityKind
entityId: string
```

**Response**: §4's envelope, `records: GlassmindMemoryRecord[]` when `found`.

### 2.3 `GET /glassmind/memory/trace`

Same query parameters as §2.2. Returns every record kind touching the given scope, ordered chronologically, each annotated with its kind and (where resolved/updated) lifecycle status — the data shape `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §5's "future memory trace panel" needs.

**Response**: §4's envelope, `records` typed as:
```ts
type TraceEntry = {
  kind: GlassmindMemoryRecord["kind"];
  occurredAt: string;
  lifecycleStatus?: string;
  lifecycleAt?: string;
  record: GlassmindMemoryRecord;
};
```
sorted by `occurredAt` ascending.

### 2.4 `GET /glassmind/health/readiness`

No query parameters. Reports whether the configured read dependency (§5) is reachable — distinct from §4's envelope, since "the backend couldn't be asked" must never be reported as "asked and found nothing."

**Response**:
```ts
type ReadinessResponse = { ready: true } | { ready: false; reason: string };
```

## 3. Request Validation

- §2.1: invalid if none of the four `sourceReference` fields is provided.
- §2.2/§2.3: invalid if `entityKind` or `entityId` is missing or empty.
- An invalid request never reaches the underlying `GlassmindStore` call — it short-circuits to `invalid_request` (§5) before any retrieval is attempted, mirroring `DurableGlassmindStore`'s own "validate before touching storage" pattern.

## 4. Response Envelope

One shared envelope shape for §2.1-§2.3:

```ts
type GlassmindReadApiResponse<TRecord> =
  | { status: "not_queried" }
  | { status: "no_memory_found" }
  | { status: "found"; recordCount: number; records: TRecord[] }
  | { status: "error"; error: GlassmindReadApiError };

type GlassmindReadApiError = {
  code: "invalid_request" | "permission_denied" | "backend_unavailable";
  message: string;
};
```

### 4.1 `MemoryRetrievalStatus` Values

Reused from `apps/jarvis-engine/src/types.ts`'s existing vocabulary, not reinvented, per `Nexus-Glassmind-Read-Api-Plan.md` §5's explicit requirement that Nexus and Jarvis present memory honesty consistently:

- **`not_queried`** — primarily meaningful to the caller before a request completes, or when a Nexus surface deliberately doesn't call this API at all for the current view. None of §2.1-§2.3's handlers return this themselves under normal operation — they always run their query when called — but the envelope reserves the value for symmetry with Jarvis's identical three-state vocabulary, and so a caller can represent all three retrieval states (including "haven't asked") using one shared type.
- **`no_memory_found`** — the underlying `GlassmindStore` call returned `[]`. Always a successful response (HTTP `200`, once a real transport exists) — never conflated with `error`.
- **`found`** — `recordCount` and `records` populated exactly as `apps/glassmind/src/types.ts` already shapes each kind (§2.3's `trace` endpoint wraps each in a `TraceEntry`, per §2.3).

## 5. Backend Error States

| Code | When | Notes |
| --- | --- | --- |
| `invalid_request` | §3's validation fails | Never reaches `GlassmindStore`; same validation rule for every endpoint that takes input. |
| `permission_denied` | Reserved for when an auth model exists (none does yet, per `docs/engineering/Sprint-12-Remaining-Gaps.md`) | No handler returns this today — the shape exists now so adding real auth later is a handler-logic change, not a contract/response-shape migration. |
| `backend_unavailable` | The configured `GlassmindStore`-compatible read dependency throws or is unreachable | Distinct from `no_memory_found` — a caller must not treat "couldn't ask" as "asked and got nothing." |

`/glassmind/health/readiness` never returns this envelope at all (§2.4) — it has its own minimal response shape specifically so readiness can be checked independently of any memory query.

## 6. Evidence Item Shape

Each `GlassmindMemoryRecord` returned carries its `evidence` field exactly as `apps/glassmind/src/types.ts` already defines it — this contract introduces no new evidence shape:

```ts
type EvidenceLink = {
  label: string;
  page: string;
  selection?: Record<string, string | undefined>;
};
```

`ConversationTurnRecord.evidence` is `EvidenceLink[]`; the other three kinds carry `EvidenceLink | undefined`. The API never synthesizes an evidence item for a record that didn't carry one — restating the same "never fabricate evidence" rule already enforced at the `GlassmindReadOnlyMemoryAdapter`/`DeterministicJarvisConversationEngine` layer (`apps/jarvis-engine/src/engine.ts`'s `retrieveMemory`) and now extended to this API layer identically.

## 7. No-Write Guarantee

This contract defines **only** the four `GET`-shaped operations in §2. No endpoint, parameter, or response shape in this document creates, mutates, resolves, updates, or ingests anything. Concretely, this contract:

- Has no equivalent of `GlassmindStore.recordConversationTurn`/`recordFollowUp`/`recordDeferredDecision`/`recordApprovalWaitingState`.
- Has no equivalent of `GlassmindStore.resolveFollowUp`/`resolveDeferredDecision`/`updateApprovalWaitingState`.
- Has no relationship to `SafeIngestionPath`/`EventStoreIngestionAdapter`/`DefaultCommandCoreEventBridge` — ingestion remains entirely backend-internal, never reachable through this contract.
- Has no approval/follow-up/decision authority — returning an `approval_waiting_state` record through §2.2/§2.3 does not grant or imply any authority over the real approval process; it is Glassmind's memory of that process, exactly as `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4 and §8 already establish.

Whatever implements this contract (the Sprint 14C in-process stub, or a real future HTTP service) must expose a surface containing **only** what §2 lists — a mechanical, testable property (§8), not merely a documented intention.

## 8. Required Tests Before Nexus Frontend Wiring

- **Per-endpoint contract tests**: each of §2.1-§2.4 produces the exact response shape §3-§6 specify, for both the success and `no_memory_found` cases.
- **Validation tests**: each of §3's invalid-input cases returns `invalid_request`, never reaching the underlying store.
- **Backend-unavailable test**: a `GlassmindStore`-compatible dependency that throws produces `backend_unavailable`, never `no_memory_found`.
- **Readiness test**: `/glassmind/health/readiness` reports `ready: true` for a working dependency and `ready: false` (with a reason) for a broken one, and never returns §4's envelope shape.
- **No-write-surface test**: mechanical enumeration of whatever implements this contract (the stub's exported functions, or a real future route table), asserting nothing beyond §2's four read operations is reachable.
- **No-fabricated-evidence test**: a record ingested/seeded with no evidence produces `found` with an empty evidence list for that record, never an invented one, per §6.
- **Trace-ordering test**: §2.3 returns entries across multiple record kinds in correct chronological order.

Only once all of the above pass against the Sprint 14C stub does any `apps/nexus-console` consumption code become appropriate to write — and that wiring remains explicitly out of scope for this sprint regardless.

## 9. Cross-References

- `docs/architecture/Glassmind-Backend-Read-Api-Runtime-Decision.md` — where this contract's implementation lives.
- `docs/architecture/Nexus-Glassmind-Backend-Read-Api-Stub-Design.md`, `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` — the design documents this contract formalizes into an implementation-ready specification.
- `apps/glassmind/src/store.ts`, `apps/glassmind/src/types.ts` — the methods and record shapes §2 and §6 map directly onto.
- `apps/jarvis-engine/src/types.ts` (`MemoryRetrievalStatus`) — the vocabulary §4.1 reuses.
- `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, §8 — the no-authority rule §7 restates.
