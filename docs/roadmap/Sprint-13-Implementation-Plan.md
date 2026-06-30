# Sprint 13 Implementation Plan

## 1. Purpose

Defines Sprint 13 as the first sprint where a real database technology is chosen and a real, connected (dev-environment) persistence path is built — following `docs/engineering/Sprint-12-Implementation-Review.md`'s recommendation to close Sprint 12 and `docs/engineering/Sprint-12-Remaining-Gaps.md`'s consolidated list of what remains. Where Sprint 12 built skeletons, decisions, and contract-parity proofs against fakes, Sprint 13 builds the first thing that is actually connected to a real, running database in a controlled development environment.

## 2. Sprint 13 Primary Goal

**Choose and implement the first real durable persistence path for Glassmind in a controlled dev/runtime environment.** This is deliberately narrower than "go to production" — every item in §3 targets a development environment, not a live deployment serving real CommandCore traffic. Production readiness (auth, real EventStore subscription, real Nexus wiring) remains explicitly out of scope, per §4.

## 3. Recommended Sequence

1. **Choose DB technology/runtime owner.** Per `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` §7 and `docs/architecture/Glassmind-Database-Adapter-Decision.md` §7, this is Sprint 13's first deliverable, not an assumed prerequisite — a real decision document naming the database technology and the process that will run it in dev. No driver code is written before this exists.
2. **Define migration location.** Per `docs/architecture/Glassmind-Schema-Migration-Plan.md` §8's proposed convention (`apps/glassmind/migrations/`), create the actual directory and adopt a concrete migration tool/format matching item 1's technology choice.
3. **Implement a DB-backed driver with a real test database.** A real implementation of `DatabaseClient` (`apps/glassmind/src/databaseDriver.ts`'s existing interface, unchanged) against the technology chosen in item 1, connected to a real but dev/test-scoped database instance — not production data, not a shared environment other developers depend on.
4. **Add parity tests against the real DB driver.** Extend `glassmindStoreParity.test.ts`'s existing `implementations` array with a fourth entry for the real driver, per `docs/engineering/Glassmind-Database-Driver-Review.md`'s own recommendation — the suite itself does not need to be rewritten.
5. **Enforce provenance at the storage/schema boundary.** Per `Glassmind-Schema-Migration-Plan.md` §6 and the still-open requirement from `docs/roadmap/Sprint-12-Implementation-Plan.md` §3 item 5: a real, native constraint (a `CHECK` constraint or equivalent for the chosen technology) proving a write that bypasses `DurableGlassmindStore`'s application-level check is still rejected by the database itself, with a dedicated test proving it.
6. **Define the CommandCore EventStore bridge runtime.** Per `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` §4 item 4 and §7: name the actual future backend service (or confirm it is the same service as item 1's persistence runtime) that will host `DefaultCommandCoreEventBridge`'s production counterpart, satisfying that document's acceptance criteria before any subscription code is written.
7. **Implement the first safe event ingestion path in dev.** Once item 6 is decided, wire `SafeIngestionPath` to a real (even if narrow, dev-only) event source — a small, explicit eligibility allowlist, not broad mirroring, consistent with `EventStoreIngestionAdapter`'s existing no-default-eligibility design.
8. **Connect Jarvis engine to read-only Glassmind memory in dev.** Replace `devGlassmindHarness.ts`'s fake `DevFakeGlassmindStore` with the now-real, now-connected `GlassmindStore` (item 3) behind a real (even if dev-only) process boundary — proving the read-only integration works against real persistence, not just fakes. Still no write path from Jarvis.
9. **Define a Nexus backend read API stub.** Per `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` §3-§4: implement the three endpoint shapes as a real, runnable stub (even returning canned or dev-database-backed responses) — still no `apps/nexus-console` consumption code, still no write endpoint of any kind.

## 4. Explicit Non-Goals

Repeated because every Glassmind-adjacent document in this repo repeats its own non-goals for the same reason — they are what schedule pressure erodes first, and Sprint 13 is the sprint where real, connected infrastructure existing for the first time makes that pressure most concrete:

- **No direct Nexus writes.** Item 9's read API stub has no mutating endpoint, structurally — restating `Nexus-Glassmind-Read-Api-Plan.md` §8 and §10's no-write-surface testing requirement, now against a real, runnable stub rather than a plan.
- **No vector memory.** Still Phase 3 (`docs/architecture/Glassmind-Version-Roadmap.md`); a real, connected database does not change that phase boundary or invite a "since we're touching the schema anyway" addition.
- **No semantic memory.** Still Phase 3; company memory (Phase 2) hasn't started either.
- **No embeddings**, including as an unused/placeholder schema column — item 2's real migration must not quietly add one.
- **No external Hermes runtime adoption unless separately approved.** `docs/architecture/Hermes-Scope-Decision.md`'s separation is unaffected by anything in this sprint.
- **No governance bypass.** `ApprovalWaitingStateMemoryRecord` becoming connected to a real database (item 3) does not make it authoritative — the read-through framing from `docs/architecture/Glassmind-Durable-Adapter-Design.md` §13 holds exactly as strictly against a real, connected database as it did against every prior skeleton.

## 5. Acceptance Criteria

- **The real DB driver has contract parity with `InMemoryGlassmindStore`.** The extended `glassmindStoreParity.test.ts` (item 4) passes identically across all four implementations.
- **Provenance rejection is enforced at the storage layer**, proven by item 5's dedicated test against a real constraint, not only inferred from `DurableGlassmindStore`'s existing application-level check still being present.
- **Empty retrieval remains valid.** The real driver's `findBySourceReference`/`findByScope` return `[]` for no match against the real, connected database, never throw — covered by the same contract-parity suite.
- **No raw EventStore payload duplication**, confirmed against whatever real (even if dev-scoped) event shape item 7's ingestion path actually consumes.
- **No frontend write path.** `apps/nexus-console` gains no new dependency on `apps/glassmind`, `apps/jarvis-engine`, or item 9's read API stub as a result of Sprint 13 — the stub exists and is tested, but nothing in `apps/nexus-console` calls it yet.
- **The dev database is isolated from any data CommandCore or any other service depends on.** Item 3's real database instance is dev/test-scoped only — no Sprint 13 work touches a shared or production data store.
- **All three packages test and build cleanly**, verified via a full run immediately before any Sprint 13 item is considered done, not assumed from a prior session — restating the identical requirement every prior sprint plan in this repo has carried.

## 6. Risks And Sequencing

**Sequencing**, restating §3 with dependencies explicit:

- Item 1 blocks items 2-5 entirely — no migration, driver, or test work should start before it.
- Items 2-5 form one contiguous block ("the real adapter exists, is connected, and is proven") and should be treated as a single unit of done, not closed piecemeal.
- Item 6 can proceed in parallel with items 2-5 — no dependency either direction — but item 7 is blocked on both item 6 and the adapter block (2-5), since there is nothing durable and no decided runtime to ingest into/through otherwise.
- Item 8 depends on the adapter block (2-5) but not on items 6-7 — read-only integration against real persistence doesn't need ingestion to exist yet, only a real, connected store.
- Item 9 has no hard dependency on items 1-8 and could be drafted/stubbed in parallel, mirroring `docs/roadmap/Sprint-12-Implementation-Plan.md` §6's identical reasoning for its own equivalent item.

**Risks:**

- **Item 1's decision being made by default** under schedule pressure once "just start" becomes tempting with a real database now genuinely in reach — the single most-repeated risk across every database-adjacent document in this repo (`Glassmind-Database-Adapter-Decision.md` §5, `Glassmind-Persistence-Runtime-Decision.md` §7), and the risk most likely to materialize in the sprint where it finally becomes possible to act on.
- **The dev database instance drifting into accidental shared/production use** — once something is "actually connected and working," the temptation to point other developers or services at the same instance for convenience is real. Mitigation: item 3 and the acceptance criteria in §5 both name isolation explicitly as a requirement, not an assumption.
- **Item 6's bridge-location decision being skipped in favor of a same-process shortcut**, exactly as `CommandCore-EventStore-Bridge-Runtime-Decision.md` §6 already warned, now with real ingestion work as the proximate temptation rather than a hypothetical one.
- **Item 8's dev integration drifting into accidental production wiring** without any auth model existing yet (per `Sprint-12-Remaining-Gaps.md`) or item 9's read API being more than a stub — this connection must remain dev-only and explicitly not reachable from `apps/nexus-console` or any public-facing surface.
- **Provenance enforcement (item 5) being treated as optional once a real, connected database exists** — repeating, one more time, the single requirement every Glassmind document in this repo has never skipped restating, because Sprint 13 is the sprint where it first has real, connected infrastructure to quietly erode against.
- **X10 workflow risk carried forward unresolved**, per `Sprint-12-Remaining-Gaps.md`'s final item — `.git/index` corruption, build-artifact churn, and now intermittent `npm install` EPERM failures on the X: mount remain live, recurring costs. Sprint 13, involving real database tooling for the first time (a client library, possibly a local dev database process), should budget for this friction explicitly.

## 7. Cross-References

- `docs/engineering/Sprint-12-Implementation-Review.md`, `docs/engineering/Sprint-12-Remaining-Gaps.md` — the review and gap list this plan follows from.
- `docs/architecture/Glassmind-Persistence-Runtime-Decision.md`, `docs/architecture/Glassmind-Database-Adapter-Decision.md` — the decisions §3 item 1 operationalizes.
- `docs/architecture/Glassmind-Schema-Migration-Plan.md` — the schema §3 items 2 and 5 implement.
- `docs/engineering/Glassmind-Database-Driver-Review.md` — the contract-parity recommendation §3 item 4 follows.
- `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` — the decision and acceptance criteria §3 items 6-7 implement.
- `apps/jarvis-engine/src/devGlassmindHarness.ts` — the harness §3 item 8 evolves from a fake to a real connection.
- `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` — the plan §3 item 9 makes into a real stub.
- `docs/architecture/Hermes-Scope-Decision.md` — the separation §4's external-Hermes non-goal restates.
