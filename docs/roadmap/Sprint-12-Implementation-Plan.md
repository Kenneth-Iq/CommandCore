# Sprint 12 Implementation Plan

## 1. Purpose

Defines Sprint 12 as the first real persistence/integration sprint, following `docs/engineering/Sprint-11-Implementation-Review.md`'s recommendation to close Sprint 11 and `docs/architecture/Glassmind-Database-Adapter-Decision.md`'s recommendation to defer real database work to this sprint. Where Sprint 10-11 built skeletons, contracts, and plans, Sprint 12 builds the first thing that is actually durable and the first thing that actually connects two previously-isolated packages in a controlled environment.

## 2. Sprint 12 Primary Goal

**Make Glassmind durable without breaking any architecture boundary established across Sprint 10-11.** Every item in §3 exists to serve this one goal — none of them is "make Glassmind smarter," "make Jarvis real," or "wire up Nexus" as an end in itself; each is in service of Glassmind becoming a real, persistent, provenance-respecting memory layer while staying exactly what it has always been documented to be: memory and retrieval only.

## 3. Recommended Sequence

1. **Choose the DB/runtime owner for Glassmind persistence.** Per `Glassmind-Database-Adapter-Decision.md` §7, this is the sprint's first deliverable, not an assumed prerequisite — a real decision document (or a clearly-scoped addendum to this plan) naming the database technology and who/what operates it in which environment. No adapter code is written before this exists.
2. **Define schema/migration location.** Once item 1 is decided, where the schema/migration artifacts live (inside `apps/glassmind`, per `Glassmind-Repository-Boundary-Decision.md` §5's existing recommendation that durable adapter code — and by extension its schema — lives in that package) and what convention they follow.
3. **Implement a DB-backed `GlassmindPersistenceDriver`.** A real implementation of the existing, unchanged interface, against the technology chosen in item 1, mapped onto the logical shape `Glassmind-Durable-Adapter-Design.md` §10-11 already specifies (one table/collection per record kind, the five named indexes).
4. **Add contract-parity tests against the DB driver.** Extend `glassmindStoreParity.test.ts`'s existing `implementations` array with a third entry for the real driver — the suite itself does not need to be rewritten, per `Glassmind-Durable-Adapter-Design.md` §14's original design intent.
5. **Add storage-layer provenance rejection tests.** Per `Glassmind-Durable-Adapter-Design.md` §8: a test proving a write that bypasses `DurableGlassmindStore`'s application-level check (a lower-level direct insert against the database) is still rejected by the storage layer itself — using whatever native constraint mechanism the chosen technology offers (§1's decision should consider this capability explicitly).
6. **Define the CommandCore EventStore bridge runtime location.** Per `Glassmind-Repository-Boundary-Decision.md` §5: does `DefaultCommandCoreEventBridge`'s real-world counterpart run inside `core/` (Python, calling out across an explicit bridge) or as a TypeScript module consuming a CommandCore-exposed event feed? A decision, recorded, before item 7 implements anything.
7. **Implement the first safe ingestion path.** Once item 6 is decided, wire a real (even if narrow/limited-event-type) path from CommandCore's EventStore through `DefaultCommandCoreEventBridge` and `EventStoreIngestionAdapter` into the now-durable `GlassmindStore` (item 3). "First safe" means a small, explicit eligibility allowlist — not broad mirroring — consistent with `eventStoreIngestion.ts`'s existing no-default-eligibility design.
8. **Connect Jarvis engine to read-only Glassmind memory in a controlled backend/dev environment.** Wire `GlassmindReadOnlyMemoryAdapter` to the now-durable `GlassmindStore` behind a real (even if dev-only) process boundary — proving the read-only integration works against real persistence, not just the in-memory fakes `glassmindReadAdapter.test.ts` already covers. Still no write path from Jarvis, per `Jarvis-Conversation-Engine-Boundary.md`.
9. **Define the Nexus read API.** Per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §9: specify the API's shape (even if not fully implemented this sprint) — still no direct frontend writes, and still no `apps/nexus-console` import of `apps/glassmind`.

## 4. Explicit Non-Goals

Repeated because every Glassmind-adjacent document in this repo repeats its own non-goals for the same reason — they are what schedule pressure erodes first, and Sprint 12 is the sprint where real infrastructure existing for the first time makes that pressure most concrete:

- **No vector memory.** Still Phase 3 (`Glassmind-Version-Roadmap.md` v0.9); a real database existing does not change that phase boundary.
- **No semantic memory.** Still Phase 3 (v0.10); company memory (Phase 2) hasn't started either.
- **No embeddings**, including as an unused/placeholder schema column — item 2's schema design must not quietly add one "since the database is being designed anyway."
- **No direct Nexus writes.** Item 9 defines a read API only. No "while we're at it" write endpoint, no admin panel, no exception.
- **No bypassing CommandCore approval/governance.** `ApprovalWaitingStateMemoryRecord` becoming durable (item 3) does not make it authoritative — the read-through framing from `Glassmind-Durable-Adapter-Design.md` §13 holds exactly as strictly against a real database as it did against the in-memory skeleton.
- **No external Hermes runtime adoption unless separately approved.** `Hermes-Scope-Decision.md`'s separation is unaffected by anything in this sprint; nothing here touches Hermes-Claw or the Hermes Agent Runtime Candidate.

## 5. Acceptance Criteria

- **DB/durable adapter has contract parity with `InMemoryGlassmindStore`.** The extended `glassmindStoreParity.test.ts` (item 4) passes identically across all three implementations (`InMemoryGlassmindStore`, `DurableGlassmindStore`+`InMemoryGlassmindPersistenceDriver`, `DurableGlassmindStore`+the real DB driver).
- **Provenance rejection is enforced at the storage layer**, proven by item 5's dedicated test, not only inferred from `DurableGlassmindStore`'s existing application-level check still being present.
- **Empty retrieval remains valid.** The real DB driver's `findBySourceReference`/`findByScope` return `[]` for no match, never throw — covered by the same contract-parity suite.
- **No raw EventStore payload duplication**, confirmed against whatever real event shape item 7's first safe ingestion path actually consumes — not just the structurally-typed skeleton's existing test.
- **No frontend write path.** `apps/nexus-console` gains no new dependency on `apps/glassmind` or `apps/jarvis-engine` as a result of Sprint 12 — item 9 is a specification, and even if a read API is implemented, no Nexus component calls it yet.
- **All three packages (`apps/glassmind`, `apps/jarvis-engine`, `apps/nexus-console`) test and build cleanly**, verified via a full run immediately before any Sprint 12 item is considered done, not assumed from a prior session — restating `Sprint-11-Implementation-Plan.md` §5's identical requirement, since it remains exactly as necessary this sprint.

## 6. Risks And Sequencing

**Sequencing**, restating §3 with dependencies explicit:

- Item 1 blocks everything else in this plan — no schema, driver, or test work should start before it.
- Items 2-5 form one contiguous block (schema → driver → parity tests → storage-layer provenance test) and should be treated as a single unit of "the real adapter exists and is proven," not closed piecemeal.
- Item 6 (bridge location decision) can proceed in parallel with items 2-5 — no dependency either direction — but item 7 (ingestion implementation) is blocked on both item 6 and the adapter block (2-5) being done, since there's nothing durable and no decided runtime to ingest into/through otherwise.
- Item 8 depends on the adapter block (2-5) but not on item 6/7 — read-only integration testing against durable storage doesn't need ingestion to exist yet, only persistence.
- Item 9 has no hard dependency on items 1-8 and could be drafted in parallel, but is more concrete once item 8 exists, mirroring the same reasoning `Sprint-11-Implementation-Plan.md` §6 already applied to its own equivalent item.

**Risks:**

- **Item 1's decision being made by default** (whoever starts coding first picks something) rather than deliberately, if Sprint 12 opens under any pressure to "just start." `Glassmind-Database-Adapter-Decision.md` §5 already names this exact failure mode; Sprint 12 is precisely where it becomes possible for the first time.
- **Schema decisions (item 2) locking in before the auth/multi-user question is resolved**, per `Glassmind-Database-Adapter-Decision.md` §4-§5 — if that question still isn't resolved when Sprint 12 reaches item 2, this plan should explicitly flag the schema as provisional rather than silently treating it as final.
- **Item 6's bridge-location decision being skipped in favor of a same-process shortcut**, exactly as `Glassmind-Repository-Boundary-Decision.md` §9 already warned would become tempting once there's finally something durable worth ingesting into.
- **Item 8's "controlled backend/dev environment" drifting into an accidental production wiring** without item 9's read API or any auth model existing yet — this connection must remain dev-only and explicitly not reachable from `apps/nexus-console` or any public-facing surface.
- **Provenance enforcement (item 5) being treated as optional once a real database exists**, repeating the exact risk every prior Glassmind document in this repo has flagged about this specific rule — restated here one more time because Sprint 12 is the sprint where it first has real infrastructure to quietly erode against.
- **X10 workflow risk carried forward unresolved.** Per `Sprint-11-Implementation-Review.md` §5-§6, `.git/index` corruption and `tsbuildinfo` churn remain live, recurring costs of this environment. Sprint 12, being the first sprint with real infrastructure work (potentially including new tooling, a database client, possibly a docker-compose addition for local dev), should budget for this friction explicitly rather than be surprised by it again.

## 7. Suggested Close Condition For Sprint 12

Sprint 12 is ready to close when:

1. All nine items in §3 are either complete or have an explicit, documented reason for being carried into Sprint 13 (not silently dropped).
2. All six acceptance criteria in §5 are verified true, via a fresh test/build run across all three packages immediately before closing — not assumed from earlier in the sprint.
3. A Sprint 12 implementation review document exists, in the same shape as `Sprint-10-Final-Review.md` and `Sprint-11-Implementation-Review.md`, confirming every architecture boundary named in §4 of this plan held throughout real database and ingestion work — this is the sprint where those boundaries are tested against real infrastructure for the first time, and the closing review should say so explicitly rather than simply repeating the same boundary list from prior sprints unchanged.

## 8. Cross-References

- `docs/engineering/Sprint-11-Implementation-Review.md` — the review this plan follows from.
- `docs/architecture/Glassmind-Database-Adapter-Decision.md` — the decision §3 item 1 operationalizes.
- `docs/architecture/Glassmind-Durable-Adapter-Design.md`, `docs/architecture/Glassmind-Repository-Boundary-Decision.md` — the design and placement §3 items 2-6 implement.
- `docs/architecture/Glassmind-Phase-1-Persistence-Path.md` — the per-record-kind paths §3 items 7-8 make real.
- `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` — the plan §3 item 9 specifies against.
- `docs/architecture/Hermes-Scope-Decision.md` — the separation §4's external-Hermes non-goal restates.
- `docs/engineering/Package-Test-Build-Guide.md` — the workflow guidance §6's X10 risk references.
