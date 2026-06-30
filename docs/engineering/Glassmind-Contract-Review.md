# Glassmind Contract Review

## 1. Purpose

A direct review of the committed `apps/glassmind` package (`src/types.ts`, `src/store.ts`, `src/errors.ts`, `src/inMemoryStore.ts`, `src/inMemoryStore.test.ts`) against four architecture documents: `Glassmind-Phase-1-Storage-Design.md`, `Jarvis-Conversation-Engine-Boundary.md`, `Glassmind-Retrieval.md`, and `Glassmind-Memory-Model.md`. This review is based on reading the actual committed source, not the intent behind it — every finding below cites the specific file and, where relevant, the specific missing or present line.

## 2. Required Phase 1 Records — Present

All four record types from `Glassmind-Phase-1-Storage-Design.md` §4-7 exist in `src/types.ts`, each with a `kind` discriminant and composed from the shared `RetrievalMetadata` (`scope`, `occurredAt`, `confidence`):

| Required record | Present in code | Notes |
| --- | --- | --- |
| `ConversationTurnRecord` (§4) | Yes | Carries `evidence: EvidenceLink[]`, `approvalStatus`, `intentKind`/`intentConfidence` — matches §4's schema field-for-field. |
| `FollowUpMemoryRecord` (§5) | Yes | `followUpKind`/`status` match the existing frontend `FollowUpKind`/`FollowUpStatus` values exactly. |
| `DeferredDecisionMemoryRecord` (§6) | Yes | `status` matches the existing `DecisionStatus` four values. |
| `ApprovalWaitingStateMemoryRecord` (§7) | Yes | Code comment explicitly states the §7 read-through framing ("explicitly not the Approval Engine's live state"). |

`SourceReference` and `RetrievalMetadata` are also present and match `Glassmind-Phase-1-Storage-Design.md` §8-9 and `Glassmind-Memory-Model.md` §2 directly.

## 3. Required GlassmindStore Methods — Present, With A Naming And Coverage Gap

The four write methods and two read methods named in this sprint's own implementation task are all present in `src/store.ts`:

```text
recordConversationTurn, recordFollowUp, recordDeferredDecision, recordApprovalWaitingState
retrieveBySourceReference, retrieveByScope
```

**Gap — naming drift against the storage design document.** `Glassmind-Phase-1-Storage-Design.md` §12 specifies a different contract shape: `writeConversationTurn`/`writeFollowUp`/`writeDeferredDecision`/`writeApprovalWaitingState`, `getByExactReference`/`getWorkingMemory`, and three status-mutation methods (`resolveFollowUp`, `resolveDeferredDecision`, `updateApprovalWaitingState`). The implemented interface uses different write/read method names (`record*`/`retrieve*` instead of `write*`/`get*`) and, more importantly, **has no status-mutation methods at all**. This is not a cosmetic naming mismatch — it is a real functional gap (§6 below) on top of the naming one.

## 4. Provenance Enforced As A Hard Gate — Confirmed

`src/errors.ts`'s `assertValidSourceReference` is called as the first line of all four `record*` methods in `src/inMemoryStore.ts`, and throws `InvalidSourceReferenceError` before any push to internal storage if every `SourceReference` field is empty. Verified directly in the test suite (`"rejects a follow-up record with an entirely empty sourceReference"`, `"rejects a deferred decision record with an entirely empty sourceReference"`, `"does not store a rejected record"`) and matches `Glassmind-Phase-1-Storage-Design.md` §8's requirement that this be enforced at the storage layer, not left to convention. **No issue found here — this is the part of the implementation most faithfully aligned with the architecture.**

## 5. Empty Retrieval Returns `[]`, Never Throws — Confirmed

Both `retrieveBySourceReference` and `retrieveByScope` are implemented as `Array.prototype.filter` over an internal list, which structurally cannot throw on a no-match query — it returns `[]`. Two tests assert this explicitly for both methods. Matches `Glassmind-Retrieval.md` §3 step 5 and the architecture rule that empty retrieval is a valid, honest result. **No issue found.**

## 6. Missing Before Real Integration — Status Mutation

Per `Glassmind-Phase-1-Storage-Design.md` §11's migration plan, `useConversationLog`/`buildFollowUps`/`buildDecisionQueue`/`buildApprovalCards`'s eventual replacement requires a way to change a record's status after it is created — most concretely, `PendingFollowUpsPanel`'s "Mark Resolved" action becoming real requires something equivalent to `resolveFollowUp(id, status)`. **No such method exists anywhere in the current `GlassmindStore` interface or its in-memory implementation.** Every record, once written, is permanently `open`/`waiting`/`awaiting` as far as the store is concerned — there is no way to mark a follow-up resolved, a decision completed, or an approval approved/rejected after the fact. This is the single largest functional gap between the committed code and the storage design document, and it blocks any real integration of the follow-up/decision/approval categories (conversation turns are less affected, since turns are typically write-once).

## 7. No Frontend Dependency — Confirmed

`apps/glassmind/package.json`'s `devDependencies` are exactly `typescript` and `vitest` — no React, no `@testing-library/*`, no jsdom, and no import anywhere in `src/` referencing `apps/nexus-console`. `EvidenceLink` is independently declared in `src/types.ts` rather than imported, exactly as documented. **No issue found — this boundary is enforced structurally (there is no dependency edge to violate), not just by convention.**

## 8. No CommandCore Write-Back — Confirmed

The package has no dependency on `core/` (CommandCore's Python kernel) at all — there is no possible import path, HTTP client, or file-system access to any CommandCore-owned store anywhere in `src/`. `GlassmindStore`'s six methods only ever read or write the `InMemoryGlassmindStore`'s own four private arrays. **No issue found — same structural enforcement as §7.**

## 9. Naming/Schema Gaps

- **§3's naming drift** (storage design's `write*`/`get*` vs. implemented `record*`/`retrieve*`) should be reconciled in one direction or the other — see Recommendation (§13). Until reconciled, any future contributor reading the storage design document and then the code will reasonably wonder which is authoritative.
- **§9's `occurredAt`/`createdAt`/`requestedAt` flexibility was simplified to a single `occurredAt` field** across all four record types via the shared `RetrievalMetadata` type. This is a reasonable, deliberate simplification (one consistent field name is easier to query against than three synonyms) and is flagged here as a positive deviation worth keeping, not a gap to fix.
- **No `working memory` retrieval stage.** `Glassmind-Retrieval.md` §3 step 1 names the working-memory check as the cheapest, first-checked retrieval stage; `Glassmind-Phase-1-Storage-Design.md` §12 names `getWorkingMemory(turnId)` as part of the Phase 1 contract. Neither concept exists in the implemented `GlassmindStore` — only the second stage (exact-reference lookup, via `retrieveBySourceReference`/`retrieveByScope`) is implemented. This may be an acceptable Phase 1 scope reduction (working memory is, by definition, ephemeral and arguably belongs to the conversation engine's own turn state rather than the store), but it is undocumented as a deliberate cut anywhere in the code or its tests, and should be either implemented or explicitly noted as descoped.

## 10. Tests Missing Before Real Integration

The committed test suite has 10 tests across 5 categories, and the provenance-rejection and empty-retrieval categories are well covered. Two concrete gaps:

- **`ConversationTurnRecord`/`recordConversationTurn` has zero test coverage of any kind** — not a successful write, not a rejected write. Given conversation turns are flagged in `Jarvis-Conversation-Engine-Boundary.md` §5 as the category requiring the most provenance discipline (because they are highest-volume), this is the most important of the two gaps to close.
- **`DeferredDecisionMemoryRecord`/`recordDeferredDecision` has only rejection-path coverage** — there is no test confirming a deferred decision can be successfully recorded and retrieved.

Neither gap is a correctness bug today (the implementation code path for both is structurally identical to the already-tested `FollowUpMemoryRecord`/`ApprovalWaitingStateMemoryRecord` paths), but per `Glassmind-Phase-1-Storage-Design.md` §13's "schema field completeness" requirement — each record type should round-trip through a write/read cycle with all required fields intact — these two categories currently rely on that requirement being true by inspection rather than by test.

## 11. What Was Not In Scope For This Review

This review does not evaluate code style, performance, or the standalone-package placement decision (`apps/glassmind` vs. an alternative location) — placement was already decided and documented in `apps/glassmind/README.md` in the prior sprint and is not revisited here.

## 12. Summary Of Findings

| Area | Status |
| --- | --- |
| Required Phase 1 records present | Pass |
| Required `GlassmindStore` write/read methods present | Pass, with naming drift against the storage design doc |
| Status-mutation methods (`resolveFollowUp` etc.) | **Missing** |
| Provenance enforced as a hard gate | Pass |
| Empty retrieval returns `[]`, not an error | Pass |
| No frontend dependency | Pass |
| No CommandCore write-back | Pass |
| Working-memory retrieval stage | Missing / undocumented as a cut |
| Test coverage — `ConversationTurnRecord` | **Missing entirely** |
| Test coverage — `DeferredDecisionMemoryRecord` success path | **Missing** |

## 13. Recommendation

**Accept as the Phase 1 skeleton, with follow-up fixes required before real integration begins.**

This is not a block — every architecture-rule-level requirement (provenance gate, empty-retrieval honesty, no frontend dependency, no CommandCore write-back) is correctly implemented and tested. The gaps found (§6, §9, §10) are all additive: closing them does not require redesigning anything already committed, only extending it. Concretely, before `apps/glassmind` is wired into anything real:

1. Add status-mutation methods to `GlassmindStore` (§6) — this blocks the follow-up/decision/approval migration path entirely until resolved.
2. Reconcile the `record*`/`retrieve*` vs. `write*`/`get*` naming between code and `Glassmind-Phase-1-Storage-Design.md` §12 (§3, §9) — either update the doc to match the shipped code (the simpler fix, since the code is now the source of truth for what was actually built) or rename the code to match the doc.
3. Add the two missing test cases (§10) — `recordConversationTurn` success/rejection, `recordDeferredDecision` success.
4. Decide and document whether working-memory retrieval (§9) is in or out of Phase 1's actual scope, rather than leaving it silently absent.

None of these four items require touching the architecture rules themselves — they are implementation-completeness fixes within the boundary already correctly drawn.

## 14. Cross-References

- `docs/architecture/Glassmind-Phase-1-Storage-Design.md` — the primary specification this review checks the code against.
- `docs/architecture/Jarvis-Conversation-Engine-Boundary.md` — the conversation-turn provenance priority cited in §10.
- `docs/architecture/Glassmind-Retrieval.md` — the working-memory retrieval stage cited in §9.
- `docs/architecture/Glassmind-Memory-Model.md` — the shared-fields convention cited in §2.
- `apps/glassmind/README.md` — the package's own scope and placement notes, not re-litigated here per §11.
- `docs/architecture/Glassmind-Package-Integration-Map.md` — where this review's findings inform what is and isn't safe to connect yet.
- `docs/roadmap/Sprint-10-Backend-Implementation-Backlog.md` — where §13's four follow-up items are tracked as concrete backlog entries.
