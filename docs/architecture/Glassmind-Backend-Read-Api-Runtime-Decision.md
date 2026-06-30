# Glassmind Backend Read API Runtime Decision

## 1. Purpose

Decides where the backend Glassmind read API stub — specified at a design level by `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` and `docs/architecture/Nexus-Glassmind-Backend-Read-Api-Stub-Design.md` — actually lives as code, per `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 9's "stub" framing. This decision is scoped to the dev/test stub only; it does not select where a future production-grade API service runs.

## 2. Repository Tooling Check

Before evaluating candidate locations, this decision checked whether the repo has workspace tooling that would make a new package lightweight:

- No root `package.json` exists anywhere in this repo.
- No `pnpm-workspace.yaml`, `lerna.json`, or npm `workspaces` field exists anywhere.
- Each existing `apps/*` package (`glassmind`, `jarvis-engine`, `nexus-console`) is fully independent — its own `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, and `README.md`, none of it shared or generated from a workspace root.

A new package in this repo is not a lightweight workspace member — it is a full, independent npm package requiring its own complete boilerplate, exactly as much setup as `apps/jarvis-engine` itself required when it was created. This fact is the single most load-bearing input to the recommendation in §4.

## 3. Candidate Locations

- **`apps/glassmind`** — the existing domain package. Already owns every Glassmind-side component this stub would call (`GlassmindStore`, `DurableGlassmindStore`, `SqliteGlassmindPersistenceDriver`).
- **`apps/nexus-console`** — ruled out categorically, not just deprioritized: per the architecture rule restated in this sprint's task and `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4/§9, Nexus must consume this API, never host it — hosting it in the same package Nexus ships from would make the "Nexus doesn't import Glassmind directly" rule trivially circumventable from within the same package boundary.
- **`apps/jarvis-engine`** — ruled out for a different reason: Jarvis is a conversational engine, not an evidence-serving backend; per `Jarvis-Conversation-Engine-Boundary.md`, it has its own narrow, already-settled relationship to Glassmind (`GlassmindReadOnlyMemoryAdapter`) that is conceptually unrelated to serving Nexus's evidence queries. Conflating the two would blur two different consumers' boundaries into one package for no architectural reason.
- **A new `apps/glassmind-read-api` or `services/glassmind-read-api`** — per §2, this means a full, independent package: its own `package.json`, lockfile, `tsconfig.json`, `vitest.config.ts`, README, and — critically — its own relationship to `apps/glassmind` (either a real npm dependency, which this repo has never used between any two `apps/*` packages, or the same "declare structurally independent" pattern used everywhere else, which would mean *reimplementing* `GlassmindStore`/`SqliteGlassmindPersistenceDriver`'s shape rather than calling the real one — defeating the purpose of a backend API that's supposed to serve real Glassmind data).
- **A future CommandCore backend bridge** — per `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` §4 item 4 and `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` §4, a not-yet-decided future service that may eventually host both the EventStore bridge's production counterpart and Glassmind's production persistence runtime. If that service is ever built, it is the natural eventual home for a *production* read API — but it does not exist today, and nothing about a dev/test stub should be built assuming its shape in advance.

## 4. Recommendation

1. **Do not place the API in Nexus frontend.** Categorical, not conditional — restated from §3.
2. **Do not place the API in Jarvis engine.** Restated from §3.
3. **Keep `apps/glassmind` as the domain package.** Unchanged from every prior Glassmind placement decision in this repo (`docs/architecture/Glassmind-Repository-Boundary-Decision.md` §5, `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` §6) — this decision does not reopen that question.
4. **Do not create a new package for this stub.** Per §2, this repo has no workspace tooling to make a new package cheap, and the stub itself is explicitly dev/test-only and "not necessarily an HTTP server yet" (per this sprint's own task framing) — there is no concrete operational reason (a real deployment target, a different language/runtime, a genuinely separate release cadence) to justify the boilerplate cost today. This mirrors the exact reasoning `Glassmind-Persistence-Runtime-Decision.md` §6 item 2 already applied to `DatabaseGlassmindPersistenceDriver`: "there is no concrete reason to split yet."
5. **Implement the stub inside `apps/glassmind` as a dev-only contract module.** A new file (or small set of files) within the existing package, calling the real `GlassmindStore` interface directly — no structural reimplementation needed, since the stub and `GlassmindStore` already live in the same package and the same compilation unit. This is the only option from §3 that lets the stub call real Glassmind code without either a new cross-package dependency this repo has never used, or a structural mirror that would defeat the point of a *backend* API meant to serve real data.
6. **Defer runtime package creation, not the contract.** Per the task's own fallback framing: the contract (`docs/architecture/Glassmind-Read-Api-Contract.md`) is fully specified now, regardless of where the code lives. If a real deployment need emerges later (a real HTTP server, a real process boundary serving real Nexus traffic), extracting the contract module into its own package at that point is a mechanical, low-risk move — the module's only dependency is `apps/glassmind`'s own exports, already a clean public surface via `src/index.ts`.

## 5. Risks And Mitigations

- **Risk: keeping the stub inside `apps/glassmind` blurs "domain package" and "API surface" into one package indefinitely.** Mitigation: the stub module is read-only, handler-function-shaped (no HTTP server, no process of its own), and is documented (§6 below, and the module's own file header) as a contract stub specifically meant to be extracted later — not as a permanent architectural merger of the two concerns.
- **Risk: a future contributor assumes this stub is already a deployed, network-reachable API just because handler functions with "API contract" naming exist.** Mitigation: per requirement 10 of this sprint's task, the stub starts no server of any kind — calling a handler function only ever happens in-process, within a test or another in-process caller, exactly like every other dev/test harness this repo has built (`SafeIngestionPath`, `jarvisSqliteReadHarness.test.ts`). The module's own documentation and this decision both state this explicitly.
- **Risk: Nexus ends up importing this stub module directly anyway, since it now lives in the same monorepo and "it's right there."** Mitigation: this remains exactly as forbidden as importing any other part of `apps/glassmind` — the architecture rule is about Nexus's relationship to `apps/glassmind` as a whole, not specifically about a network boundary that happens to not exist yet for the dev stub. `Nexus-Glassmind-Read-Only-Evidence-Plan.md`'s existing rules and the no-write-surface testing pattern apply unchanged.

## 6. Cross-References

- `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md`, `docs/architecture/Nexus-Glassmind-Backend-Read-Api-Stub-Design.md` — the design documents this decision turns into a concrete code location.
- `docs/architecture/Glassmind-Read-Api-Contract.md` — the companion document defining the contract this stub implements.
- `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §5, `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` §6 — the prior placement decisions this one is consistent with.
- `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` §4 — the future-backend-service option this decision declines to build toward prematurely.
- `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 9, carried into Sprint 14 — the backlog item this document and its companions deliver.
