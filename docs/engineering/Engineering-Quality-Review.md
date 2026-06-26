# Engineering Quality Review

## 1. Purpose

A point-in-time quality pass over the Nexus Console frontend and CommandCore backend, covering component/CSS duplication, shared hooks/models, dead code, naming consistency, accessibility, performance, and test coverage. This is a review document — it identifies issues and recommends follow-up; it does not implement fixes.

## 2. Method

Findings below are based on direct inspection of the codebase (`apps/nexus-console/src`, `core/commandcore`) at the time of writing: file counts, grep-based pattern searches, and direct reading of representative files. Where a finding is based on a sampling method rather than exhaustive verification, this is stated explicitly so confidence level is clear.

## 3. Component Duplication

**Finding (medium confidence):** The codebase has 72 frontend components. The large majority are genuinely distinct (one per domain centre, one per panel type). However, the "entity card" rendering pattern — a `mission-card-header` with a title, a `DependencyBadge`, and a `StatusBadge`, followed by a chip row — is copy-pasted with minor variation across `MissionSectionList`, `AgentProfilePanel`, and `ToolRegistryPanel` rather than extracted into one shared `EntityCard` component.

**Recommendation:** Extract a shared `EntityCard` (title, status badge, dependency badge, chip row, optional favourite/pin toggle, optional summary text) and refactor these three call sites onto it. Low risk, since all three already render visually identical markup — this would be a pure consolidation, not a behavior change.

## 4. CSS Duplication

**Finding (medium confidence):** `styles.css` has grown to roughly 3,480 lines through purely additive appends across many build sessions — every wave of work appended new rules at the end of the file rather than ever consolidating. A grep for selectors defined more than once shows several legitimate tone-variant families (e.g., `.metric-card.tone-ready`, `.metric-card.tone-warning` — expected, not duplication) alongside a smaller number of base rules (`.empty-state`, `.event-rail`, `.data-row`) that are referenced from multiple sections of the file and would benefit from being visually grouped together rather than scattered by when they were added.

**Recommendation:** A consolidation pass that groups rules by component/concern (already loosely true) and removes any genuinely redundant base-rule re-declarations would reduce the file's cognitive load for future edits. This is not urgent — the cascade currently works correctly — but the file's append-only growth pattern should not continue indefinitely without a cleanup checkpoint.

## 5. Shared Hooks

**Finding (low risk — well-handled):** `operatorPrefs.ts` consolidates all `localStorage`-backed operator preference hooks (favourites, recently-viewed, saved filters, watchlist, favourite dashboards, boardroom layout) into one file with shared `readLocalStorage`/`writeLocalStorage` helpers. This is the right pattern and should remain the single home for any future operator-preference hook — no action needed, called out here so it stays the precedent.

## 6. Shared Models

**Finding (high confidence — concrete duplication):** `executiveAssistant.ts` defines `EvidenceLink = { label, page, selection? }` and `worldModel.ts` independently defines `RelationshipLink = { label, page, selection }` — structurally identical types with different names, created in different work sessions without either referencing the other.

**Recommendation:** Unify these into a single shared type (e.g., a small `routeLinks.ts` module, or co-located with `RouteSelection` in `routing.ts`), and have both `worldModel.ts` and `executiveAssistant.ts` import it. This is exactly the kind of drift the `Conversation-Evidence.md` architecture document warns about under "the single biggest risk to this model" — it has already started, in a small and easily fixable way, and should be corrected before more code depends on either name independently.

## 7. Dead Code

**Finding (low confidence — not exhaustively verified):** A targeted search for stray `console.log`/`console.debug` calls found none. A full unused-export audit (e.g., via a dedicated dead-code tool) was not performed as part of this review; this should be treated as "no obvious dead code found by spot-check," not "verified dead-code-free."

## 8. Naming Consistency

**Finding (low confidence — stylistic, not functional):** Container components use several different suffixes somewhat interchangeably — `ExecutiveHealthBoard`, `StatusWall`/`MissionWall`/`AgentWall`/`HealthWall`, `RecommendationCentre`, `DecisionQueuePanel`, `EnterpriseExplorer`. None of these are wrong individually, but there is no documented convention for when something is a "Wall" versus a "Panel" versus a "Centre" versus a "Board." This is a minor readability concern, not a bug.

**Recommendation:** If the component vocabulary keeps growing, a short naming-convention note (even a few lines in an existing architecture doc) would help future contributors choose consistently rather than by feel.

## 9. Accessibility

**Finding (medium-high confidence — real gap):** Only 8 of 72 component files use `aria-label` anywhere. Several icon-only or glyph-only controls — `FavouriteToggle`'s `★`/`☆` star button, `BoardroomWidget`'s single-letter size buttons (`C`/`S`/`E`) — rely on a `title` attribute (hover tooltip, not reliably exposed to screen readers in all contexts) rather than a proper `aria-label` in every instance. `FavouriteToggle` does set `aria-label` correctly; `BoardroomWidget`'s size buttons do not.

**Recommendation:** Add `aria-label` to every icon-only/glyph-only interactive element, not just the ones already covered. This is a small, mechanical fix per element and should be treated as a real pre-Version-1 requirement, not a nice-to-have, given how central "operator console" usability is to this product's identity.

## 10. Performance

**Finding (low risk, noted for awareness):** `useExecutiveSimulation` is called independently from both `ExecutiveHome` and `ExecutiveBoardroom`, each maintaining its own `setInterval` tick. Because this is a single-page-at-a-time SPA, only one of these is ever mounted simultaneously today, so there is no current performance problem. This would become a real issue if a future layout ever mounted both surfaces at once (e.g., a split-pane or multi-panel view) — at that point the simulation tick should be lifted to a shared provider rather than duplicated per consumer.

## 11. Test Coverage

**Finding (high confidence — the most significant gap in this review):** The CommandCore backend has substantial focused test coverage (dashboard services, registries, engines, the event/audit pipeline) verified throughout Beta-1 development, run via `pytest`. The Nexus Console frontend has **zero** automated tests: no test files exist anywhere under `apps/nexus-console/src`, and `package.json` defines no `test` script. Frontend correctness today is verified entirely by `tsc -b`, `vite build`, and manual UI review per the RC Checklist — there is no automated regression protection for component logic, filtering, sorting, simulation derivation, or world-model relationship resolution.

**Recommendation:** This is the highest-priority follow-up from this entire review. At minimum, the pure-logic modules with no DOM dependency — `worldModel.ts`, `executiveAssistant.ts`, `simulation.ts`, `filtering.ts`, `routing.ts` — are the cheapest, highest-value place to start, since they can be unit tested without introducing a component-testing framework at all. Component-level testing (requiring a framework like Vitest + Testing Library) is a larger decision and should be scoped as its own milestone rather than retrofitted incidentally.

## 12. Summary Priority Order

1. **Test coverage (§11)** — zero frontend tests is the largest real risk in the codebase today.
2. **Accessibility (§9)** — concrete, mechanical gaps on icon-only controls.
3. **Shared model duplication (§6)** — small, concrete, easy to fix (`EvidenceLink`/`RelationshipLink`).
4. **Component duplication (§3)** and **CSS consolidation (§4)** — real but lower urgency; the current code works correctly, this is about long-term maintainability.
5. **Naming consistency (§8)** and **performance (§10)** — minor, awareness-level only.

## 13. Cross-References

- `docs/roadmap/Nexus-Beta-1-RC-Checklist.md` — the existing manual verification process this review's test-coverage finding (§11) argues should eventually be supplemented, not replaced, by automated tests.
- `docs/architecture/Conversation-Evidence.md` §6 — the duplication risk this review found a live instance of (§6).
