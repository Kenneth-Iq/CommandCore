# Engineering Review — Sprint 9 (Version 0.4)

## 1. Purpose

A quality pass over the Nexus Console frontend after the Living Jarvis, Executive Workspace, Operational Awareness, and Hermes Preview streams landed. This follows the same review discipline as `docs/engineering/Engineering-Quality-Review.md` from the prior sprint: real measurements, not estimates, and explicit confidence levels on every finding. This is a review document — it identifies issues and recommends follow-up; it does not implement fixes, per this stream's "no feature work" scope.

## 2. Headline Numbers

| Metric | Previous Review | Now |
| --- | --- | --- |
| Components | 72 | 91 |
| `styles.css` lines | ~3,480 | 4,565 |
| Frontend test files | 0 | 14 |
| Frontend test cases | 0 | 51 |
| Files using `aria-label` | 8 | 15 |
| `operatorPrefs.ts` hooks | 6 | 9 |
| Independent `useExecutiveSimulation()` call sites | 8 (flagged as the top architectural debt) | 1 |
| Production build modules | 120 | 145 |
| Production bundle (JS, gzipped) | ~95 kB | ~110 kB |

## 3. Resolved Since Last Review

**Simulation/registry duplication (high confidence — fixed):** The prior review's top concern — `useExecutiveSimulation` and the recommendation/decision/follow-up/approval/evidence-registry builders being independently recomputed across `ExecutiveHome`, `ExecutiveBoardroom`, and all 6 entity pages — is resolved. `src/runtimeContext.tsx`'s `RuntimeProvider` now owns this computation exactly once; every consumer reads from `useRuntimeContext()`. Verified directly: `grep -rn "useExecutiveSimulation("` across `pages/` and `components/` returns exactly one match, inside `runtimeContext.tsx` itself.

**Test coverage (high confidence — substantially improved):** Zero frontend tests to 51, across pure-logic modules (`conversationOrchestrator`, `evidenceRegistry`, `hermesBridge`) and 9 component/page tests, using the established `testUtils.tsx` fixtures throughout. This is real progress against the single largest gap flagged last time, though it is a foundation, not full coverage — see §7.

## 4. New Findings

**`EvidenceLink`/`RelationshipLink` duplication (high confidence — unresolved across three sprints):** `executiveAssistant.ts`'s `EvidenceLink` and `worldModel.ts`'s `RelationshipLink` remain two structurally identical types under different names. This was flagged in the original Engineering Quality Review and has not been addressed despite three sprints of further development on both files. It should be unified the next time either file is touched for an unrelated reason — it is cheap to fix and has now had three opportunities to compound further (more code could depend on either name independently the longer this goes unfixed).

**`OperationalPulse` / `OperationalHealthRibbon` overlap (medium confidence — new, mild):** Sprint 9 added `OperationalPulse` (tick + health score, compact) and this sprint added `OperationalHealthRibbon` (health score + five per-entity pulses). Both are mounted simultaneously in `App.tsx`, directly adjacent to each other, and both render `simulation.healthScore`. `OperationalHealthRibbon`'s score chip is effectively a superset of what `OperationalPulse` shows. Recommend folding `OperationalPulse`'s tick display into the ribbon and retiring the standalone component, rather than maintaining two health-score displays side by side.

**Two independent context providers on Executive Home (low confidence — awareness only):** `RuntimeProvider` (app-wide) and `WorkspaceProvider` (Executive-Home-scoped) are both active wherever the workspace is rendered. This is intentional and correctly scoped — `RuntimeProvider` owns simulation/data, `WorkspaceProvider` owns layout/visibility — but is worth documenting explicitly so a future contributor doesn't assume a single "app context" exists. No action needed beyond this note.

**Flat top-level `src/` folder structure (low confidence — stylistic, growing):** `src/` now holds 13 non-component, non-page modules directly at its root (`executiveAssistant.ts`, `evidenceRegistry.ts`, `hermesBridge.ts`, `conversationOrchestrator.ts`, `worldModel.ts`, `simulation.ts`, `runtimeContext.tsx`, `workspaceContext.tsx`, `operatorPrefs.ts`, `filtering.ts`, `routing.ts`, plus `App.tsx`/`main.tsx`). This was a manageable flat list at 5-6 files; at 13 it is starting to ask a reader to know the codebase to find anything. A `src/domain/` (executiveAssistant, evidenceRegistry, hermesBridge, conversationOrchestrator, worldModel, simulation) versus `src/app/` (runtimeContext, workspaceContext, routing, operatorPrefs, filtering) split would make the domain-versus-app-plumbing distinction visible in the folder tree. Not urgent — purely a readability recommendation, no behavior risk either way.

**`HermesQueueBoard` and `ApprovalCardsPanel` near-identical column-grid pattern (low confidence — minor):** Both render a 4-or-5-column status grid with per-column counts and item lists (`decision-queue-grid`/`approval-cards-grid`/`hermes-queue-board-grid` are three separately-defined but visually near-identical CSS grids). A shared `StatusColumnGrid` component could consolidate `DecisionQueuePanel`, `ApprovalCardsPanel`, and `HermesQueueBoard`'s column rendering. Flagged as low priority — the three current implementations are short and not yet causing real maintenance pain, but a fourth near-duplicate should not be added without consolidating first.

## 5. Performance

No regressions identified. The production JS bundle grew from ~95 kB to ~110 kB gzipped across this sprint's six streams, which is proportionate to the amount of real functionality added (Jarvis presence, workspace layout system, Hermes preview page, Glassmind-adjacent registry logic) — not a red flag on its own. `simulation.ts`'s `useExecutiveSimulation` tick interval (4 seconds, app-wide via `RuntimeProvider`) is now the only live timer in the app; this is an improvement over the previous review's noted risk of duplicate timers if multiple pages ever mounted simultaneously.

## 6. Accessibility

`aria-label` coverage grew from 8 to 15 files, including new labels on `JarvisPresence`'s avatar/close/pin controls and `WorkspacePanelFrame`'s size/fullscreen buttons. Not audited this pass: color-only status communication (the operational pulse dots and ribbon chips rely on color plus a text label, which is correct, but should be spot-checked with a contrast tool before V1) and keyboard navigation through the Jarvis dock's tabs (currently mouse-click-only `<button>` elements, which are keyboard-focusable by default, but tab order through the dock has not been manually walked).

## 7. Testing

51 tests across 14 files is a real foundation, not full coverage. Notably untested: `App.tsx`'s routing/switch logic, `runtimeContext.tsx`/`workspaceContext.tsx` directly (only exercised indirectly via `OperationalHealthRibbon`'s test), and every page component except the pre-existing `SettingsPlaceholder` test. The next testing pass should prioritize a `runtimeContext.test.tsx` that exercises the provider directly (recommendation/decision/evidence-registry derivation), since that module is now the single most load-bearing piece of shared state in the app.

## 8. Naming And CSS Organization

Naming remains broadly consistent (`build*`/`use*` prefixes, `*Panel`/`*Centre`/`*Explorer`/`*Wall`/`*Board` suffixes for containers — the suffix-convention gap flagged in the prior review is still open but not worse). `styles.css` continues to grow by pure append (4,565 lines now, up from 3,480) — every sprint in this project has added a CSS block at the end of the file rather than consolidating. This was flagged as a "not urgent" item twice already; at this size it is closer to due. Recommend a dedicated CSS consolidation pass before the next major UI stream, splitting `styles.css` into a small number of per-concern files (e.g., `styles/jarvis.css`, `styles/workspace.css`, `styles/evidence.css`) rather than one ever-growing file.

## 9. Summary Priority Order

1. **`EvidenceLink`/`RelationshipLink` duplication** — cheap fix, now three sprints overdue.
2. **`runtimeContext.tsx` direct test coverage** — the highest-leverage testing gap, given how central this module now is.
3. **CSS file consolidation** — flagged twice before; size has nearly grown 30% since the last review with no consolidation.
4. **`OperationalPulse`/`OperationalHealthRibbon` overlap** — small, concrete, easy to fold together.
5. **Folder structure split** and **shared status-column-grid component** — both real but low urgency, awareness-level recommendations.

## 10. Cross-References

- `docs/engineering/Engineering-Quality-Review.md` — the prior review this one follows and updates against.
- `docs/testing/Nexus-Frontend-Testing-Strategy.md` — the testing foundation this sprint's 51 tests build on.
- `docs/roadmap/Version-1.0-Master-Checklist.md` — Testing row, to be updated with the new test count.
