# Sprint 15 Implementation Plan

## 1. Purpose

Defines Sprint 15 as the sprint where a Nexus-side read client for the Glassmind read API is actually built, following `docs/engineering/Sprint-14-Implementation-Review.md`'s recommendation to close Sprint 14 and `docs/architecture/Nexus-Glassmind-Read-Client-Boundary.md`'s shape specification. Where Sprint 14 specified the client's required functions and boundary, Sprint 15 writes the module — still without touching any visible UI.

## 2. Sprint 15 Primary Goal

**Implement a Nexus-side read client stub without wiring it into visible UI yet.** Every item in §3 serves this one goal — none of them is "make a panel show real data" as an end in itself. The client module must exist, be fully tested against mocked responses, and produce data shaped exactly like what `EvidenceCard` and `ConversationContextBar` already expect — while no panel actually calls it yet.

## 3. Recommended Sequence

1. **Create the Nexus read-client module.** `apps/nexus-console/src/glassmindReadClient.ts`, per `docs/architecture/Nexus-Glassmind-Read-Client-Boundary.md` §3 — the four required functions (`fetchMemoryBySourceReference`, `fetchMemoryByScope`, `fetchMemoryTrace`, `fetchGlassmindReadiness`), each mapping to one read API contract operation (§4.1 of that document) and returning the Nexus-safe view models §4.2 specifies. No `apps/glassmind` import — query/response types declared independently, per the established structural-typing precedent.
2. **Add tests proving it has no write methods.** Mirroring `apps/glassmind/src/readApiStub.test.ts`'s own hardened pattern (Sprint 14D): enumerate the module's exports and assert none is write/ingest/update/resolve/delete-shaped, plus a structural test confirming no `apps/glassmind` import exists anywhere in the file.
3. **Map backend response states to Nexus-safe view models.** Implement and test the `not_queried`/`no_memory_found`/`found`/error-collapsed-to-`unavailable` mapping `Nexus-Glassmind-Read-Client-Boundary.md` §4.2 and §6 specify — every one of the four API states (`not_queried`, `no_memory_found`, `found`, `error` with its three codes) must map to exactly the right `NexusMemoryViewModel`/`NexusTraceViewModel`/`NexusReadinessViewModel` state.
4. **Add mocked client tests for `EvidenceCard`-compatible data.** Confirm a `found` response's `NexusMemoryRecordView[]` shape is exactly what `EvidenceCard`'s existing props already expect — proving compatibility without modifying or wiring `EvidenceCard` itself.
5. **Add mocked client tests for `ConversationContextBar`-compatible data.** Same requirement, for that component's expected shape.
6. **Keep panels unwired until next sprint.** No `apps/nexus-console` component (`EvidenceCard`, `ConversationContextBar`, `DecisionQueuePanel`, `PendingFollowUpsPanel`, `ApprovalCardsPanel`, or any other) imports or calls `glassmindReadClient.ts` by the end of this sprint — verified the same way every prior sprint's "Nexus remains unwired" boundary has been verified, via `git diff`/`git status` showing zero changes to any existing component file.

## 4. Explicit Non-Goals

Repeated because every Glassmind/Nexus-adjacent document in this repo repeats its own non-goals for the same reason — this is the sprint where "the client module is right there, why not just wire one panel" becomes concretely tempting for the first time:

- **No frontend writes.** The client module is read-only by construction (§3 items 1-2); nothing in this sprint adds or implies a mutating call.
- **No direct `apps/glassmind` import.** Restated as the single most load-bearing rule this sprint's own client module exists to make unnecessary — §3 item 2's structural test exists specifically to catch a regression here.
- **No production backend server.** `glassmindReadClient.ts` calls against mocked responses only this sprint (§3 items 2-5) — it does not call a real, running `GlassmindReadApiStub` instance over a network, since no such network-reachable instance exists yet (`Glassmind-Backend-Read-Api-Runtime-Decision.md` §4 item 4 remains undecided).
- **No EventStore ingestion.** Unrelated to this sprint's scope; restated because it is unrelated to *every* sprint's scope and worth saying so explicitly each time regardless.
- **No vector/semantic memory, no embeddings.** Unchanged from every prior sprint.

## 5. Acceptance Criteria

- **The client module exists at the recommended location** (`apps/nexus-console/src/glassmindReadClient.ts`) and exports exactly the four functions §3 item 1 specifies — no more, no fewer.
- **No write-shaped method exists**, proven by §3 item 2's structural test, passing.
- **All four API states map correctly** to their Nexus-safe view model equivalents, proven by §3 item 3's tests.
- **`EvidenceCard`- and `ConversationContextBar`-compatible data is proven correct via mocked tests** (§3 items 4-5), without either component being modified.
- **No `apps/nexus-console` component file changes.** `git diff`/`git status` confirm zero changes to any file under `apps/nexus-console/src/components/` or `apps/nexus-console/src/pages/`.
- **`apps/glassmind` and `apps/jarvis-engine` test/build status are unaffected.** This sprint's scope is entirely within `apps/nexus-console`; both other packages' test counts should remain identical to Sprint 14's closing numbers (161 and 32 respectively) unless a genuinely necessary, separately-justified change is made.
- **All three packages test and build cleanly**, verified via a full run immediately before this sprint is considered done.

## 6. Risks And Sequencing

**Sequencing:**

- Item 1 blocks everything else — no test can be written against a module that doesn't exist yet.
- Items 2-3 form one contiguous block (the client's own correctness: no writes, correct state mapping) and should be done together before items 4-5, since component-compatibility tests are meaningless if the underlying mapping is still wrong.
- Items 4-5 have no dependency on each other and can proceed in parallel once items 1-3 are done.
- Item 6 is not a sequenced step so much as a constraint that must hold true throughout — it should be checked continuously (after every item), not only at the end.

**Risks:**

- **"It's just a test, so it's fine to also peek at how `EvidenceCard` consumes it" turning into actual component wiring mid-sprint.** Mitigation: §3 items 4-5 are explicit about testing *compatibility*, not wiring — the acceptance criteria in §5 make "zero component file changes" a mechanically checkable gate, not a trust-based one.
- **The client module's mocked tests becoming a de facto integration test against the real `GlassmindReadApiStub`**, blurring "Sprint 15 tests the client in isolation" into "Sprint 15 quietly builds the first real cross-package connection." Mitigation: mocks must be hand-built fixtures matching the contract's documented shapes (`Glassmind-Read-Api-Contract.md` §4-§6), not a live call into `apps/glassmind`'s actual stub — this is itself worth a dedicated test (no `apps/glassmind` import, §3 item 2) precisely because it's the boundary most likely to erode under "just for testing" pressure.
- **X10 workflow risk carried forward unresolved**, per `docs/engineering/Sprint-14-Implementation-Review.md` §5's now-five-consecutive-sprints observation — Sprint 15, working in `apps/nexus-console` for the first time in several sprints, may surface this differently (Vite/React-specific build artifacts) than the `tsconfig.app.tsbuildinfo` churn seen so far; worth watching for, not assuming away.

## 7. Cross-References

- `docs/engineering/Sprint-14-Implementation-Review.md` — the review this plan follows from.
- `docs/architecture/Nexus-Glassmind-Read-Client-Boundary.md` — the shape specification this plan sequences into implementation steps.
- `docs/architecture/Glassmind-Read-Api-Contract.md` — the contract the client module maps against.
- `apps/glassmind/src/readApiStub.test.ts` — the hardened test pattern §3 item 2 mirrors.
- `apps/nexus-console/src/components/EvidenceCard.tsx`, `ConversationContextBar.tsx` — the components §3 items 4-5 prove compatibility with, without modifying.
