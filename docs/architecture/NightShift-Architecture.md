# NightShift Architecture

## 1. Mission

NightShift is CommandCore's continuous validation system: the part of the platform whose job is to keep checking that everything else is still correct, safe, and ready to release, without waiting for a human to remember to ask. The name reflects how it operates — running continuously and autonomously, the way a night shift keeps watch while the rest of the organization is not actively looking. NightShift does not build features or make product decisions; it verifies the work other systems and people have already done, and it is the system that should eventually replace the manual, point-in-time verification described in `docs/runbooks/Nexus-Beta-1-RC-Checklist.md` and the gaps identified in `docs/engineering/Engineering-Quality-Review.md`.

NightShift was listed as an unscoped Version 1.0 tracking category in `docs/roadmap/Version-1.0-Master-Checklist.md`; this document is its first defining architecture.

## 2. Responsibilities

- **Regression testing** — run the full automated test suite (backend `pytest`, and whatever frontend suite `docs/testing/Nexus-Frontend-Testing-Strategy.md` establishes) on a continuous basis, not just when a human triggers it, and flag the moment a previously-passing test starts failing.
- **Architecture validation** — check that real code stays consistent with the architecture documents that describe it: that dashboard services stay read-only, that write commands stay gated behind the documented Approval Engine, that EventBus/EventStore/AuditTrail stay properly distinguished. This is mechanical pattern-checking, not judgment — NightShift flags drift for a human to evaluate, it does not decide whether drift is acceptable.
- **Release approval** — gate whether a given build is allowed to move toward release, based on the combined result of every other responsibility in this list. NightShift's approval is necessary but not sufficient for release — it confirms nothing is *known* to be broken, not that a human sign-off is unnecessary.
- **Security review** — run the mechanical half of security review continuously: dependency vulnerability scanning, secrets-in-code detection, and conformance checks against `docs/architecture/Security-Architecture.md` once that document exists. Threat modeling and judgment-based review remain human responsibilities NightShift supports, not replaces.
- **Performance review** — track build size, render performance, and backend response-time budgets over time, flagging regressions rather than only checking against a fixed bar once.
- **Deployment readiness** — confirm the conditions `docs/architecture/Deployment-Architecture.md` requires before a deployment can proceed (configuration present, secrets resolvable, health checks passing) are actually met, not just documented as required.
- **Risk analysis** — aggregate everything above into a single risk posture for a given build or release candidate: what changed, what's unverified, what's degraded — feeding the same kind of structured conclusion the Recommendation Engine produces for operational signals, but scoped to engineering risk rather than business risk.
- **Continuous validation** — the umbrella property tying all of the above together: NightShift's checks run on a schedule and on every relevant change, not only when invoked, so that drift is caught within hours, not at the next manual audit.

## 3. What NightShift Is Not

NightShift does not write code, does not fix the issues it finds, and does not have authority to block a human-approved release — it produces evidence and risk assessments that humans and the release process consult, mirroring the same "evidence, not authority" posture Jarvis maintains over business decisions (`Jarvis-Nexus-Experience-Vision.md`'s guardrail against AI bypassing policy). NightShift recommending against release is strong signal, not a veto.

## 4. Validation Pipeline

1. **Trigger** — a change lands (commit, merge, scheduled interval) or a release candidate is proposed.
2. **Suite execution** — regression tests, architecture conformance checks, security scans, and performance budgets run, each producing a pass/fail/degraded result with supporting detail, not just a binary signal.
3. **Aggregation** — results are combined into a single risk posture per §2's "Risk analysis" responsibility, weighted by how severe and how confirmed each finding is — the same severity-versus-confidence distinction `Risk-Detection.md` draws for operational signals applies here for engineering signals.
4. **Reporting** — the aggregated posture is recorded against the specific build/commit it evaluated, with enough detail that a human reviewing a release candidate can see not just "pass" or "fail" but exactly what was checked and what, if anything, degraded.
5. **Gate** — release approval (§2) consults the latest validation result for the candidate build; an unvalidated or stale result blocks automatic approval and requires a human override with a recorded reason, never a silent bypass.

## 5. Interaction With Other Systems

- **CommandCore** — the primary subject of validation. NightShift exercises CommandCore's own test suite and checks its registries/runtimes for architecture conformance, but never modifies CommandCore state itself — even validation runs that execute commands must do so in an isolated test environment, never against live data.
- **Jarvis** — NightShift validates that Jarvis's conversation and reasoning surfaces still satisfy `Conversation-Evidence.md`'s evidence requirement (e.g., via the same kind of regression test this document's own validation responsibility implies) rather than trusting that requirement stays true by convention alone.
- **Nexus** — frontend build validation, accessibility checks, and the example test suite from `docs/testing/Nexus-Frontend-Testing-Strategy.md` are run and tracked by NightShift the same way backend tests are.
- **Glassmind** — once Glassmind is real, NightShift validates that memory writes carry the provenance `Glassmind-Architecture.md` §8 requires, and that retrieval results remain traceable — testing the "glass" half of Glassmind's promise mechanically rather than trusting it.
- **Hermes** — tool execution paths are exactly the kind of surface that needs continuous security and regression validation before any real external-system execution is trusted; NightShift's security review responsibility is the gating mechanism for Hermes ever being allowed to execute against anything real.
- **Odysseus** — multi-agent plans NightShift would need to validate for resource and safety bounds before allowing autonomous execution, once Odysseus exists.

## 6. Future Implementation Phases

- **Phase 1 (Beta-2)** — NightShift exists as a scheduled CI job: run the existing backend test suite and the frontend testing foundation established in `docs/testing/Nexus-Frontend-Testing-Strategy.md`, report pass/fail, no aggregation or risk scoring yet. This phase formalizes what is currently a manual `pytest`/`tsc`/`vite build` sequence into something that runs without a human remembering to trigger it.
- **Phase 2 (post-Beta-2)** — Architecture conformance checks and security scanning come online; results aggregate into a single risk posture per build rather than separate disconnected reports.
- **Phase 3 (V1)** — Release approval gating becomes real: a release candidate cannot proceed without a current, passing NightShift validation, with an explicit, recorded human override path for exceptions.

## 7. Non-Negotiable Properties

- NightShift never has unilateral authority to deploy, roll back, or modify production state — it informs the humans and systems that do.
- A stale or missing validation result is treated as a failure, not as "no news is good news" — silence from NightShift should never be read as approval.
- Every finding NightShift reports must point at the specific check, commit, and evidence that produced it, for the same reason every Jarvis statement must — an unexplainable "something might be wrong" is not useful signal.
