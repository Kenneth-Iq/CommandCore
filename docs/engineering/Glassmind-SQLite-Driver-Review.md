# Glassmind SQLite Driver Review

## 1. Purpose

Reviews contract-parity coverage against `SqliteGlassmindPersistenceDriver` and storage-level provenance enforcement, confirming what was already covered, what was tightened this sprint, and why SQLite/`sql.js` remains a dev/test-only choice. Per Sprint 13D/E.

## 2. Parity Coverage Confirmed

`apps/glassmind/src/glassmindStoreParity.test.ts`'s `implementations` array already included `DurableGlassmindStore` + `SqliteGlassmindPersistenceDriver` as a full fourth entry (added in Sprint 13C alongside the driver itself) — every scenario in the suite already ran against it via `describe.each`. Inspection confirmed all required categories are present, each as a dedicated scenario (not merely inferred from another):

| Requirement | Covered by |
| --- | --- |
| Conversation turn write | "accepts a conversation turn record with valid provenance and retrieves it by scope" |
| Follow-up write | "accepts a follow-up record with valid provenance and retrieves it by scope" |
| Deferred decision write | "accepts a deferred decision record with valid provenance and retrieves it by scope" |
| Approval waiting-state write | "accepts an approval waiting-state record with valid provenance and retrieves it by scope" |
| `retrieveBySourceReference` | "retrieves a record by its exact sourceReference" |
| `retrieveByScope` | exercised by every write-scenario above, plus the empty-retrieval scenario |
| `resolveFollowUp` | "resolves a follow-up and preserves the original sourceReference" |
| `resolveDeferredDecision` | "resolves a deferred decision and preserves the original sourceReference" |
| `updateApprovalWaitingState` | "updates an approval waiting-state record and preserves the original sourceReference" |
| Empty retrieval returns `[]` | "returns [] for retrieval with no matches — empty retrieval is honest, not an error" |

No gap existed in the parity suite itself — 12 scenarios × 4 implementations = 48 contract-parity tests, all passing against SQLite identically to the other three implementations.

## 3. Storage-Level Provenance Coverage Confirmed And Tightened

`apps/glassmind/migrations/001_glassmind_phase_1.sql` already had a `CHECK` constraint on all four tables (`glassmind_conversation_turns`, `glassmind_follow_ups`, `glassmind_deferred_decisions`, `glassmind_approval_waiting_states`), enforcing the primary `sourceReference` provenance rule at the schema level. `sqliteDriver.test.ts` already had a dedicated test ("rejects, at the schema level, each of the four record kinds with an entirely empty sourceReference") proving direct `insertRecord` calls — bypassing `DurableGlassmindStore` entirely — are still rejected by SQLite's own constraint, not just by the application-level check.

**One real gap found and closed this sprint:** lifecycle source-reference round-trip tests existed for `FollowUpMemoryRecord.resolution.resolutionSourceReference` and `ApprovalWaitingStateMemoryRecord.update.updateSourceReference`, but not for `DeferredDecisionMemoryRecord.resolution.resolutionSourceReference` — the third record kind that carries a lifecycle source reference. Added "round-trips a lifecycle resolutionSourceReference exactly for deferred decision records" to close this asymmetry, mirroring the existing follow-up test exactly.

## 4. What Remains Deferred

- **Lifecycle-level source reference is not schema-enforced.** Per `docs/architecture/Glassmind-Migration-Location-Decision.md` §4, the `CHECK` constraints cover only the primary `sourceReference` (flat columns); `resolution_source_reference`/`update_source_reference` are nested inside the JSON `data` column and are conditionally present, so enforcing them at the schema level would require a trigger — a deliberate, documented scope limit, not an oversight. Enforcement of this remains application-level only (`DurableGlassmindStore`'s `assertValidSourceReference` calls on `input.resolutionSourceReference`/`input.updateSourceReference`).
- **Concurrent lifecycle updates.** Per `docs/architecture/Glassmind-Durable-Adapter-Design.md` §14, a test for two concurrent `resolveFollowUp` calls against the same id remains meaningless against `sql.js`'s single-threaded, single-process in-memory model — deferred to whichever future production database driver has real concurrency semantics to test against.
- **No real test database file/server.** `createSqliteDriver()` defaults to in-memory only; a file-backed or server-backed SQLite/production-technology test environment remains future work, per `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 items 3-4's broader production-path sequencing.

## 5. Why SQLite/`sql.js` Is Dev/Test Only

Restated from `docs/architecture/Glassmind-DB-Technology-Decision.md` §4 and §6, since this is the boundary most likely to be misread once a "real, working" driver exists:

- This decision was explicitly scoped as a dev/test technology choice, not a production database decision — `docs/architecture/Glassmind-Persistence-Runtime-Decision.md`'s deferral of production runtime ownership is unaffected.
- `sql.js`'s in-memory default means every test run starts from zero and loses all data on process exit — appropriate for test isolation, inappropriate for anything anyone would depend on persisting.
- No production runtime owner has been selected for Glassmind persistence; `SqliteGlassmindPersistenceDriver` has no deployment, no connection to real CommandCore data, and is reachable only from this package's own test suite.

## 6. Cross-References

- `apps/glassmind/src/glassmindStoreParity.test.ts` — the suite this review's §2 covers.
- `apps/glassmind/src/sqliteDriver.test.ts` — the suite this review's §3 covers and extends.
- `apps/glassmind/migrations/001_glassmind_phase_1.sql` — the schema this review's §3 inspects.
- `docs/architecture/Glassmind-DB-Technology-Decision.md`, `docs/architecture/Glassmind-Migration-Location-Decision.md` — the decisions this review's §4-§5 restate and confirm still hold.
- `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 items 3-5 — the backlog items this review confirms as covered.
