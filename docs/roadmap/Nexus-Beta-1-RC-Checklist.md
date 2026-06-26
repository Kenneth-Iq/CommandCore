# Nexus Beta-1 Release Candidate Checklist

## 1. Purpose

This is the gate Beta-1 must pass before it is declared a stable, demo-ready release candidate (Master Plan Wave 10: "Beta-1 Lock"). It follows the CommandCore Engineering Bible's milestone discipline and the Nexus Beta-1 Demo Walkthrough. This is a checklist, not a narrative — every item should be checked explicitly, not assumed.

## 2. Required Build Checks

- [ ] `cd apps/nexus-console && npm run build` passes with zero errors (`tsc -b` clean, `vite build` succeeds).
- [ ] Build output (`dist/`) is not committed as part of the source diff — generated files are never hand-edited or checked in as a deliverable.
- [ ] No `console.error` or unhandled promise rejection appears in the browser console during a full click-through of every page listed in §5 (UI Review Checklist), in both Live API and Mock Data modes.
- [ ] The build succeeds from a clean `node_modules` install (`npm install` followed by `npm run build`), not only from a previously-working local environment — this catches dependency drift that a stale `node_modules` can hide.

## 3. Focused Backend Tests

Run focused tests for every backend file touched since the last lock point:

- [ ] `core/tests/test_dashboard_missions.py`
- [ ] `core/tests/test_dashboard_agents.py`
- [ ] `core/tests/test_dashboard_tools.py`
- [ ] `core/tests/test_dashboard_conversations.py`
- [ ] `core/tests/test_dashboard_workspaces.py`
- [ ] `core/tests/test_dashboard_kernel.py`
- [ ] `core/tests/test_dashboard_executive.py`
- [ ] `core/tests/test_commandcore_api.py` (specifically `test_commandcore_api_is_read_only_for_defined_routes` — this must still pass; if it doesn't, Beta-1's read-only boundary has been violated and the RC is blocked outright)

Each focused test run's pass/fail result should be recorded in the RC sign-off notes, not just run silently.

## 4. Full Backend Test Policy

- [ ] Run the full backend suite (`pytest` from `core/`) at least once before RC sign-off, not only the focused tests above.
- [ ] Any failure outside `tests/test_fleet.py` blocks the RC. `test_fleet.py` failures are a known pre-existing timing-flakiness issue in the unrelated `jarvis_core` fleet module and do not block Beta-1 sign-off — but this exemption must be re-verified at RC time, not assumed from a prior session, in case the underlying flakiness has been fixed or has gotten worse.
- [ ] If any other test outside that exemption fails, the RC is blocked until it is fixed or the exemption is explicitly and separately justified in writing.

## 5. UI Review Checklist

Walk every page listed below in both Live API and Mock Data modes (see the Demo Walkthrough's server-IP/localhost note for how to exercise Live API mode):

- [ ] Executive Home — Jarvis Conversation Panel, Enterprise Explorer, Recently Viewed, Executive Focus Panel, Executive Health Board, Executive Simulation Panel, Dependency Graph, Executive Alerts, Operational Timeline all render without errors and visually read as one cohesive system, per the Operational Intelligence Polish task.
- [ ] Mission Centre — status breakdown, timeline, active/completed/failed sections, filters, sorting, favourites, bulk selection, Relationship Card, Impact Analysis, Relationship Explorer.
- [ ] Agent Centre — status sections, profile grid, filters, sorting, favourites, Relationship Card, Impact Analysis, Relationship Explorer.
- [ ] Tool Centre — permission/status breakdown, invocation sections, registry filters, Hermes-Claw Preparation panel (confirm it remains visibly read-only), Relationship Card, Impact Analysis, Relationship Explorer.
- [ ] Conversation Centre — thread list, message preview, linked knowledge, context view, filters, Jarvis Future Integration placeholder (confirm it remains visibly a reserved surface, not a working feature).
- [ ] Knowledge Centre — asset summary, asset list, linked knowledge panel, filters, Relationship Card, Impact Analysis, Relationship Explorer.
- [ ] Workspaces / Portfolio — portfolio summary, company/project/capability lists, filters, Relationship Card, Impact Analysis, Relationship Explorer.
- [ ] Health / Readiness and Settings placeholder — confirm they still load without error (lower scrutiny than primary centres, but must not be broken).
- [ ] Command Bar — visible on every page, search and route suggestions work, keyboard shortcuts (`/` to focus, arrow keys to navigate results, `g` + letter to jump pages) work.
- [ ] Context Breadcrumb — visible on every page, reflects current selection's Company → Workspace → Project → Mission chain correctly.
- [ ] Selected Record Routing — clicking any relationship chip, dependency graph node, or relationship explorer node lands on the correct destination record, never just the page's default list view.
- [ ] Responsive behavior — spot-check at least one primary centre (Mission Centre recommended, given its feature density) at a narrow viewport width and confirm no horizontal overflow or unusable layout.

## 6. Demo Walkthrough Checklist

Run the full sequence in `docs/runbooks/Nexus-Beta-1-Demo-Walkthrough.md` §7 (Demo Flow, steps 7.1–7.10) start to finish without skipping a step:

- [ ] 7.1 Executive Home
- [ ] 7.2 Enterprise Explorer
- [ ] 7.3 Mission Centre
- [ ] 7.4 Agent Centre
- [ ] 7.5 Tool Centre
- [ ] 7.6 Conversation Centre
- [ ] 7.7 Knowledge Centre
- [ ] 7.8 Workspaces / Portfolio
- [ ] 7.9 Command Bar Routing
- [ ] 7.10 Selected Record Routing
- [ ] The walkthrough document itself is re-read against the current build and updated if any step's described behavior has drifted (e.g., new panels added since the walkthrough was last written, such as the Jarvis Conversation Panel — confirm the walkthrough document is updated to include it before RC sign-off).

## 7. Known Limitations (Must Be Documented, Not Hidden)

Confirm these are still accurately described in the Demo Walkthrough's "Known Limitations" section, and add any new ones introduced since:

- [ ] Settings remains a placeholder.
- [ ] Jarvis Command Bar performs local search and deterministic routing only.
- [ ] The Jarvis Conversation Panel is explicitly simulated (per its "Conversation Simulation Mode / AI Disabled" label) — no AI calls occur.
- [ ] Hermes-Claw Preparation panel and Jarvis Future Integration placeholder remain inert.
- [ ] Page-local filters reset on navigation; only Enterprise Explorer's expanded-node state and operator favourites/saved-filters persist across sessions (via local storage).
- [ ] The Enterprise World Model tree is derived entirely from existing relationship fields, not a separate graph store.
- [ ] No backend writes exist; nothing demonstrated changes persisted state, and restarting the API resets it to seeded state.
- [ ] Executive Simulation Layer values (mission progress, agent activity, tool health, etc.) are client-side simulated overlays, not real telemetry — confirm this is clear in the UI (tick counter, panel framing) and in documentation.

## 8. Docs Required

Confirm all of the following exist, are current, and are internally consistent with each other and with the actual shipped build:

- [ ] `docs/roadmap/Nexus-Beta-1-Master-Plan.md`
- [ ] `docs/roadmap/Nexus-Beta-2-Backlog.md`
- [ ] `docs/runbooks/Nexus-Beta-1-Demo-Walkthrough.md` (updated per §6's last checklist item)
- [ ] `docs/architecture/Write-Capability-Architecture.md`
- [ ] `docs/architecture/Authentication-Architecture.md`, `Permissions-Architecture.md`, `Mission-Commands-Architecture.md`, `Agent-Commands-Architecture.md`, `Tool-Commands-Architecture.md`, `Write-API-Architecture.md`, `Workflow-Engine-Architecture.md`, `Approval-Engine-Architecture.md`, `Recovery-Architecture.md`, `Persistence-Architecture.md`, `Deployment-Architecture.md`
- [ ] `docs/architecture/Jarvis-Conversation-Architecture.md`
- [ ] `docs/architecture/Planetary-Operating-Model.md`
- [ ] `docs/vision/Jarvis-Nexus-Experience-Vision.md`
- [ ] This document (`docs/roadmap/Nexus-Beta-1-RC-Checklist.md`) itself, reviewed and signed off.

## 9. Release Criteria

Beta-1 may be declared a release candidate only when:

- [ ] All items in §2 (Build Checks) pass.
- [ ] All items in §3 (Focused Backend Tests) pass, with results recorded.
- [ ] §4 (Full Backend Test Policy) is satisfied, with the `test_fleet.py` exemption re-verified, not assumed.
- [ ] Every item in §5 (UI Review) and §6 (Demo Walkthrough) is checked off by an actual reviewer pass, not inferred from prior development sessions.
- [ ] §7 (Known Limitations) accurately reflects the shipped build with no silent omissions.
- [ ] §8 (Docs Required) are all present and current.
- [ ] No open item exists that contradicts a Locked Decision in `docs/design/Nexus-UX-Review-1.md` or a guardrail in the Experience Vision document.

## 10. Rollback Criteria

If, after RC sign-off but before or during a demo/review, any of the following is discovered, Beta-1 is rolled back to the last known-good commit and the RC is revoked:

- A write occurs anywhere in the system that was not explicitly authorized as part of a later, separately-approved Beta-2 milestone (i.e., Beta-1's read-only boundary was silently violated).
- `test_commandcore_api_is_read_only_for_defined_routes` (or an equivalent guarantee) fails.
- The build does not pass from a clean install, contradicting §2.
- A panel or page presents simulated data as if it were real live telemetry without the required simulation labeling (per §7) — this is treated as a trust violation, not a cosmetic bug, given how central honesty about data provenance is to the product's "Live API / Mock Data" identity.
- Any AI call is discovered to have occurred anywhere in Nexus or CommandCore — Beta-1's "no AI calls" boundary is absolute, and any violation is an automatic rollback trigger regardless of severity.

## 11. Post-RC Freeze Rules

Once Beta-1 is declared a release candidate:

- No new features are merged. Only fixes for issues discovered during RC review (§5–§6) are allowed, and each such fix re-triggers the relevant subset of this checklist (at minimum §2 Build Checks and the specific UI/demo steps affected).
- No backend write surface, auth, or persistence work begins against the Beta-1 branch — that work belongs to Beta-2 and should happen on its own branch/timeline, per the Beta-2 Backlog's explicit scope boundary.
- Documentation typo fixes and clarifications are allowed without re-running the full checklist, but any change to documented behavior (not just wording) requires re-verifying the corresponding checklist section.
- The freeze ends only when Beta-1 is formally released or formally rolled back (§10) — there is no quiet, undeclared exit from the freeze state.
