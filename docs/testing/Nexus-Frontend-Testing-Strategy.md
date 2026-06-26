# Nexus Frontend Testing Strategy

## 1. Purpose

`docs/engineering/Engineering-Quality-Review.md` §11 flagged zero automated frontend tests as the single largest quality gap in the Nexus Console codebase. This document establishes the testing foundation that closes that gap: the chosen framework, what each layer of testing covers, and the example tests and shared utilities now present in the codebase as a starting point. It deliberately does not attempt a large test suite yet — per the Sprint 8 brief, the goal is a foundation a future stream can build on, not full coverage in one pass.

## 2. Framework Choice

**Vitest** (`vitest@^4`), paired with **React Testing Library** (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`) and **jsdom** as the DOM environment.

Why Vitest over Jest: the project already runs on Vite, and Vitest reuses Vite's own transform pipeline (esbuild, the same TypeScript/JSX handling already configured for the app) rather than requiring a parallel Babel/ts-jest configuration. This means test files get the same module resolution, path handling, and TypeScript behavior as the actual app build, with no second config to keep in sync.

Why React Testing Library: it tests components the way a user interacts with them (queries by visible text, role, and label rather than internal implementation detail), which fits this codebase's heavy use of semantic, accessible markup (`StatusBadge`, `route-chip` buttons, `aria-label`s) and naturally pushes toward catching the accessibility gaps `Engineering-Quality-Review.md` §9 already flagged.

## 3. Configuration Note: Two Config Files

Vitest and Vite share a version of the `vite` package internally; when the project's own `vite.config.ts` is extended with `defineConfig` from `vitest/config`, TypeScript sees two structurally similar but distinct `Plugin`/`PluginOption` types (the app's top-level `vite` versus Vitest's bundled `vite`) and `tsc -b` fails with a confusing overload-mismatch error. The fix used here: **`vite.config.ts` is untouched** (still imports `defineConfig` from `"vite"`, used only by the dev server and production build), and a **separate `vitest.config.ts`** (importing `defineConfig` from `"vitest/config"`) carries the `test` block. Vitest automatically prefers `vitest.config.ts` over `vite.config.ts` when both exist, so no `vite.config.ts` changes were needed. Keep this split — re-merging the two configs will reintroduce the type conflict.

## 4. Layers Of Testing

- **Component testing** — the default layer for this codebase. Render a single component (e.g., `StatusBadge`) with React Testing Library and assert on rendered output, classes, and behavior. Example: [`src/components/StatusBadge.test.tsx`](../../apps/nexus-console/src/components/StatusBadge.test.tsx).
- **Page testing** — render a full page component (e.g., `SettingsPlaceholder`) with realistic fixture data (reusing the existing `mockKernel`/`mockMissionCentre`/etc. fixtures already used for the app's own seeded mode — no separate test-only fixtures needed) and assert that the page assembles its panels correctly. Example: [`src/pages/SettingsPlaceholder.test.tsx`](../../apps/nexus-console/src/pages/SettingsPlaceholder.test.tsx).
- **API mocking** — most pages in this codebase render from already-resolved `WorldData`/`PageData` props rather than fetching directly, so most component and page tests need no network mocking at all (as the two example tests demonstrate). For the handful of cases that do exercise `src/api/commandcoreApi.ts`'s live-fetch path, prefer **MSW** (Mock Service Worker) when that need arises — it intercepts at the network layer rather than mocking `fetch` directly, so the same mock handlers work whether the code uses `fetch`, a future HTTP client, or runs in the browser during manual testing. MSW is not installed yet; add it only when a real test needs it, per this document's "foundation, not full coverage" scope.
- **Build validation** — already covered by the existing `tsc -b && vite build` pipeline (`npm run build`), unchanged by this work. Test files are written in `.test.tsx` files that the production build does not include (confirmed: the build's module count is unaffected by the new test files' presence).
- **Snapshot testing** — deliberately not used for this codebase's first tests. Snapshot tests on a UI this information-dense tend to produce large, low-signal diffs that get rubber-stamped rather than reviewed. Prefer explicit assertions (`getByText`, `toHaveClass`) as the two example tests do. If snapshot testing is wanted later for a specific high-churn-risk area (e.g., guarding against accidental markup regressions in a complex component), scope it narrowly rather than snapshotting whole pages.
- **Accessibility testing** — not yet automated (no `vitest-axe`/`jest-axe` installed). Given `Engineering-Quality-Review.md` §9 already identified concrete accessibility gaps, the recommended next step is adding `vitest-axe` and running it against the highest-traffic panels first (Executive Home's surfaces) rather than every component at once. Until then, accessibility is verified through React Testing Library's query priorities, which already favor role/label-based queries — tests that can only find an element via `getByText` on inaccessible markup are themselves a signal worth noticing during review.
- **CI strategy** — not yet wired into a CI pipeline (Beta-1/Beta-2 has no CI/CD per `docs/roadmap/Version-1.0-Master-Checklist.md`'s Deployment row). The natural home for `npm test` once CI exists is as a required check alongside `npm run build`, and eventually as a NightShift-orchestrated continuous validation step per `docs/architecture/NightShift-Architecture.md` §2 and §6's Phase 1. Until CI exists, `npm test` must be run manually before any frontend change is considered complete, the same discipline already applied to `npm run build`.

## 5. What Exists Today

- `vitest.config.ts` — Vitest configuration (jsdom environment, global test APIs disabled in favor of explicit imports — see §6 — and a setup file).
- `src/test/setup.ts` — registers `@testing-library/jest-dom`'s matchers (`toBeInTheDocument`, `toHaveClass`, etc.) globally for every test file.
- `src/test/testUtils.tsx` — shared test utilities: `renderWithDefaults` (a thin wrapper around React Testing Library's `render`, kept as the single place to add providers later if the app ever introduces React Context), `createMockOnNavigate` (a typed `vi.fn()` matching the `onNavigate` callback signature used everywhere), and `buildMockWorld` (assembles a full `WorldData` object from the app's own existing mock fixtures, so tests exercise the same data shape the seeded UI does rather than inventing parallel fixtures).
- `src/components/StatusBadge.test.tsx` — example component test.
- `src/pages/SettingsPlaceholder.test.tsx` — example page test.
- `package.json` — `npm test` (single run) and `npm run test:watch` (watch mode) scripts.

## 6. Conventions For Future Tests

- Co-locate test files next to the component/page they test (`Foo.tsx` next to `Foo.test.tsx`), matching the convention already established by the two example files.
- Import test APIs explicitly from `"vitest"` (`describe`, `it`, `expect`, `vi`) rather than relying on global injection — this keeps test files type-correct without needing `"types": ["vitest/globals"]` added to `tsconfig.json`, avoiding any risk of that global type set leaking into application code.
- Prefer `buildMockWorld()` and the app's existing mock fixtures over hand-rolled test fixtures, for the same reason `Engineering-Quality-Review.md` warns against duplicated models elsewhere: one fixture set, reused, stays consistent with what the app actually renders in seeded mode.
- A bug fix or new component is not required to ship with a test under this initial foundation, but new pure-logic modules (in the spirit of `worldModel.ts`, `executiveAssistant.ts`, `evidenceRegistry.ts`, `filtering.ts`) are the highest-value, lowest-cost place to start adding real coverage next, exactly as `Engineering-Quality-Review.md` §11 recommended.

## 7. Cross-References

- `docs/engineering/Engineering-Quality-Review.md` §11 — the gap this document closes the foundation for.
- `docs/architecture/NightShift-Architecture.md` §2, §6 — where `npm test` eventually plugs into continuous, automated validation.
- `docs/roadmap/Version-1.0-Master-Checklist.md` — Testing row, to be updated once this foundation lands.
