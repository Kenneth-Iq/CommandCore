# Glassmind Database Adapter Decision

## 1. Purpose

Decides whether to begin real database adapter implementation for Glassmind now (within Sprint 11's remaining scope) or defer it to Sprint 12. This is a decision document, not an implementation — no database connectivity is added by it.

## 2. Current Glassmind Durable Adapter State

`apps/glassmind/src/durableStore.ts` already has:

- `GlassmindPersistenceDriver` — a narrow interface (`insertRecord`, `updateRecord`, `findById`, `findBySourceReference`, `findByScope`), deliberately synchronous to match `GlassmindStore`'s own synchronous interface exactly.
- `DurableGlassmindStore` — a complete implementation of `GlassmindStore` that delegates to an injected driver, with provenance enforcement and not-found rejection living in this class, before the driver is ever called.
- `InMemoryGlassmindPersistenceDriver` — the first concrete, fully-working driver implementation, proven via `glassmindStoreParity.test.ts` (18 tests) to make `DurableGlassmindStore` behave identically to `InMemoryGlassmindStore`.

What does not exist: any driver implementation backed by an actual database. `InMemoryGlassmindPersistenceDriver` is real code, not a mock, but it is still process-memory-only — it differs from `InMemoryGlassmindStore` only in being split across the rules/storage boundary, not in being durable.

## 3. Why An Injected Driver Exists

Per `docs/architecture/Glassmind-Durable-Adapter-Design.md` §3 and `docs/roadmap/Sprint-10-Implementation-Plan.md` §4: the storage technology was deliberately left unselected so that choice could be made deliberately, by whoever owns it, rather than being implicitly locked in by whichever package got added first. The injected-driver pattern is what makes that deferral possible without blocking everything else — `DurableGlassmindStore`'s business rules (provenance, lifecycle semantics, not-found handling) could be built, tested, and proven correct (via contract parity against `InMemoryGlassmindStore`) entirely independently of which database eventually backs it. This decision document is the moment that deferral's clock runs out for the *decision*, even though the *implementation* may still wait (§7).

## 4. What A Real DB Adapter Would Require

- **Database technology decision.** Not made anywhere in this repo yet. Candidates were never even shortlisted in any Sprint 10/11 document — `Glassmind-Durable-Adapter-Design.md` §10 deliberately stayed technology-agnostic (one table/collection per record kind, indexed per §11) precisely so this decision could come later without invalidating the design.
- **Schema/migration location.** Wherever the chosen technology's schema/migration files live needs a home — likely inside `apps/glassmind` itself per `Glassmind-Repository-Boundary-Decision.md` §5 (durable adapter code lives inside `apps/glassmind`, behind `GlassmindStore`), but the specific convention (a `migrations/` directory, an ORM's schema file, a raw SQL directory) is unselected.
- **Deployment/runtime owner.** Who runs this database, in what environment, and who is responsible for its uptime is an operational question this repo's architecture documents have not addressed for *any* backend service yet — `apps/glassmind` has been a library/skeleton throughout Sprint 10-11, never a deployed, running thing with its own infrastructure footprint.
- **Auth/permissions assumptions.** Per `Sprint-11-Implementation-Review.md` §5, no auth/permissions model exists anywhere in this repo's TypeScript packages. A real database needs at minimum a connection-credential story, and likely needs to know whether Glassmind data is ever scoped per-user (per `Glassmind-Workspace-Knowledge.md` §6's still-open multi-user question) before its schema is finalized — getting this wrong now risks a costly schema migration later.
- **EventStore bridge location.** `Glassmind-Repository-Boundary-Decision.md` §5 already flags that CommandCore (Python) ↔ Glassmind (TypeScript) coupling requires an explicit bridge design, not a same-process shortcut. A real database adapter doesn't strictly require this bridge to exist first, but the two are related: if the bridge ends up living inside `core/` and writing through an HTTP/RPC call into a Glassmind-hosting service, that service's existence is itself part of "deployment/runtime owner" above.
- **Test database strategy.** Contract-parity testing (`glassmindStoreParity.test.ts`'s pattern) needs a real, isolated, fast-resetting database instance to run against in CI/local development — an in-memory or containerized test instance, transaction-per-test rollback strategy, or similar. Undecided, and meaningfully different per database technology.

## 5. Risks Of Starting DB Work Now

- **Technology selection under schedule pressure, without the other five items in §4 resolved first**, would likely produce a choice optimized for "what's familiar" rather than what fits Glassmind's actual access patterns (per `Glassmind-Durable-Adapter-Design.md` §10-11's already-specified shape) or this repo's eventual deployment model — a model that doesn't exist yet for *any* service in this repo.
- **Schema decisions made before the auth/multi-user question is resolved** risk a real migration later, which is more expensive than waiting. `Glassmind-Workspace-Knowledge.md` §6 already flagged this exact risk for company memory; it applies equally to Phase 1 records being persisted for the first time.
- **Building a real adapter before the EventStore bridge location is decided** risks designing the driver's write path around an assumed caller (e.g., assuming a Python-side bridge calling a local TypeScript process) that turns out wrong once the bridge decision is actually made, per `Glassmind-Repository-Boundary-Decision.md` §9's "mixing Python kernel concerns with TypeScript package concerns" risk.
- **No deployment/runtime owner exists for any backend service in this repo yet.** Building a database-backed Glassmind adapter without first knowing where it would run, who operates it, and how it reaches production is building infrastructure with no home — a different and larger problem than anything Sprint 10-11's skeleton work has tackled so far.

## 6. Benefits Of Deferring To Sprint 12

- **Sprint 12 can open with the technology/runtime decision as its own first, explicit step** (per `docs/roadmap/Sprint-12-Implementation-Plan.md` §3 item 1), rather than that decision being made implicitly by whoever happens to write the first line of adapter code under sprint-close time pressure.
- **The contract-parity test suite already exists and already passes against the in-memory driver.** Nothing about deferring loses progress — `glassmindStoreParity.test.ts` is written once and reused unchanged against whichever real driver Sprint 12 builds, per `Glassmind-Durable-Adapter-Design.md` §14's original recommendation.
- **The five other §4 requirements (schema location, runtime owner, auth assumptions, bridge location, test strategy) can be resolved deliberately, with their own review, rather than retrofitted after code already exists** that assumed answers to them.
- **Sprint 11 closes cleanly** (per `Sprint-11-Implementation-Review.md` §6) with every skeleton fully built and tested, rather than closing mid-way through a real implementation that then spans two sprints awkwardly.

## 7. Recommendation

**Defer real database adapter implementation to Sprint 12. Keep Sprint 11 closed after its review (`Sprint-11-Implementation-Review.md`). Start Sprint 12 with the database technology/runtime decision before any adapter code is written.**

Concretely: Sprint 12's first sequenced item (`Sprint-12-Implementation-Plan.md` §3 item 1) is the technology/runtime-owner decision itself, treated as a deliverable with its own review, not a prerequisite assumed away. Only once that decision exists does schema design, driver implementation, and contract-parity testing against the real driver begin.

## 8. Cross-References

- `docs/architecture/Glassmind-Durable-Adapter-Design.md` — the storage design this decision's §4 requirements are layered on top of.
- `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §5, §9 — the bridge-location requirement and the Python/TypeScript coupling risk this document's §5 restates.
- `docs/engineering/Sprint-11-Implementation-Review.md` §5, §6 — the gap this decision resolves and the close recommendation it depends on.
- `docs/roadmap/Sprint-12-Implementation-Plan.md` — where this decision's recommendation becomes Sprint 12's first sequenced item.
- `docs/architecture/Glassmind-Workspace-Knowledge.md` §6 — the multi-user/auth question this decision's §4-§5 flag as schema-relevant.
