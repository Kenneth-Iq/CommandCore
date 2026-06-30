# Glassmind Persistence Runtime Decision

## 1. Purpose

Operationalizes `docs/architecture/Glassmind-Database-Adapter-Decision.md` §7's recommendation and `docs/roadmap/Sprint-12-Implementation-Plan.md` §3 item 1: names who/what owns Glassmind's persistence at runtime, separate from (and building on) the already-settled question of where the *driver code* lives (`docs/architecture/Glassmind-Repository-Boundary-Decision.md` §5). This document does not select a database technology and does not stand up any infrastructure — it decides ownership and placement, which must exist before a real database driver is built.

## 2. Current Package Layout

- **`app/`** — a separate Electron desktop application (plain JavaScript). Unrelated to Glassmind persistence.
- **`apps/nexus-console/`** — the Nexus frontend (React + TypeScript + Vite). A browser application with no server-side runtime of its own; cannot own a database connection.
- **`apps/glassmind/`** — the Glassmind Phase 1 domain package: type contracts, `InMemoryGlassmindStore`, `DurableGlassmindStore`, `GlassmindPersistenceDriver` interface, `InMemoryGlassmindPersistenceDriver`, `EventStoreIngestionAdapter`, `DefaultCommandCoreEventBridge`. Standalone, zero dependency on `apps/nexus-console` or `core/`.
- **`apps/jarvis-engine/`** — the Jarvis conversation engine skeleton, read-only toward Glassmind via a structurally-typed adapter, no npm dependency on `apps/glassmind`.
- **`core/`** — CommandCore's Python kernel. The governed source of truth. No TypeScript runtime to import into, and no path the other direction either.
- **`services/`** — gitignored runtime sandboxes for other deployed services (`core-data`, `odysseus`), not tracked source.

None of these is, today, a deployed, running backend service with its own database connection. `apps/glassmind` and `apps/jarvis-engine` are both libraries — they get imported and instantiated by *something*, but that something does not exist yet anywhere in this repo.

## 3. Why `apps/glassmind` Remains The Domain Package

Unchanged from `Glassmind-Repository-Boundary-Decision.md` §3, restated because this decision builds directly on it: `services/` holds gitignored data, not tracked source; `core/` has no TypeScript runtime; `apps/nexus-console` must stay decoupled per every Glassmind integration document. `apps/glassmind` remains the single place `GlassmindStore`'s contract and every implementation of it — in-memory, durable-skeleton, and (per this document) a real database-backed driver — live. This decision does not reopen that question; it answers the next one: who runs the database this package's driver eventually talks to.

## 4. Recommended Runtime Owner For Actual Persistence

**No production runtime owner is named yet, by design.** `apps/glassmind` remains a library with no deployment of its own. The actual database — wherever it ends up running — needs a *process* that holds the connection, applies migrations, and is operationally responsible for it. That process does not exist in this repo today, and per §7's recommendation, naming one prematurely (or building toward an assumed one) is exactly the risk `Glassmind-Database-Adapter-Decision.md` §5 already flagged.

What this document does establish: whatever that future runtime is, it is **not** `apps/nexus-console` (a browser application — structurally incapable of holding a server-side database connection) and **not** `core/` directly (a different language runtime — `Glassmind-Repository-Boundary-Decision.md` §5 already requires an explicit bridge before any CommandCore↔Glassmind coupling, and persistence ownership is exactly the kind of coupling that bridge decision needs to resolve first).

## 5. Whether Persistence Lives Inside `apps/glassmind`, A Future Backend Service, Or A Later Adapter Package

Three options, evaluated:

- **(a) Inside `apps/glassmind` directly** — the driver *code* (already true per `Glassmind-Repository-Boundary-Decision.md` §5) and, by extension, the *connection logic* a real driver needs. This does not require `apps/glassmind` itself to become a deployed service — a future backend process can still `import` this package and instantiate the driver within its own runtime.
- **(b) A future backend service** — a new, not-yet-existing process (its shape and location undecided) that hosts `apps/glassmind`'s `DurableGlassmindStore` + real driver, exposes whatever read API `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §9 eventually needs, and owns the actual database connection at runtime.
- **(c) A later, separate adapter package** — splitting the real database driver into its own package (e.g., `apps/glassmind-postgres` or similar), imported by `apps/glassmind` or by the future backend service directly.

## 6. Recommendation

1. **Keep the driver interface in `apps/glassmind`.** `GlassmindPersistenceDriver` (already defined in `src/durableStore.ts`) does not move. No change from the existing, settled decision.
2. **Keep the DB-backed driver skeleton in `apps/glassmind` for now.** Per option (a) above — `DatabaseGlassmindPersistenceDriver` (this sprint's deliverable, §12C) lives alongside `InMemoryGlassmindPersistenceDriver` in the same package, consistent with "one package, every implementation of the contract" from `Glassmind-Repository-Boundary-Decision.md` §5. Splitting into a separate adapter package (option c) is deferred — there is no concrete reason to split yet, mirroring that document's own reasoning for not creating a new package prematurely.
3. **Defer production runtime ownership until the CommandCore backend bridge is selected.** Per §4 and `Sprint-12-Implementation-Plan.md` §3 item 6's still-open bridge-location decision: which process actually deploys, connects to, and operates the real database is not decided here, and should not be decided as a side effect of writing driver code. That decision belongs to whoever designs the CommandCore↔Glassmind bridge, since the bridge's own runtime location (`core/`-adjacent versus a standalone TypeScript service) materially affects where persistence ownership should sit too — deciding one without the other risks the same "mixing Python kernel concerns with TypeScript package concerns" failure `Glassmind-Repository-Boundary-Decision.md` §9 already named.
4. **Nexus does not own runtime persistence, ever.** Restated as a permanent rule, not a temporary deferral: `apps/nexus-console` is a browser application with no path to holding a database connection, and per `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4 and §9, it reaches Glassmind-backed data (if at all) only through a read API hosted by whatever process does own persistence — never directly.

## 7. Risks And Mitigations

- **Risk: building `DatabaseGlassmindPersistenceDriver` (§12C) creates implicit pressure to also decide runtime ownership, just to have somewhere to "run" it for testing.** Mitigation: §12C's driver is explicitly required to stay safe-by-default and non-production-connected (per the task's own requirement 1) — its tests use a fake database client, not a real connection, so no runtime decision is forced by writing or testing it.
- **Risk: deferring runtime ownership indefinitely becomes "we never decided," not "we decided to wait."** Mitigation: this document explicitly ties the deferral to a named trigger (the CommandCore backend bridge decision, `Sprint-12-Implementation-Plan.md` §3 item 6) rather than leaving it open-ended — once that decision exists, this document's §4 should be revisited and updated, not left stale.
- **Risk: a future contributor assumes `apps/glassmind` becoming a "real" package (with a real driver) means it's ready to be deployed as-is.** Mitigation: `apps/glassmind/README.md`'s existing "what this is not (yet)" section, updated per §12C's requirement to document the new driver's boundary, should make explicit that a working driver skeleton with a fake client is not the same as a deployed, connected service.
- **Risk: splitting persistence into a separate adapter package (option c) happening prematurely**, before there's a concrete reason (e.g., a real deployment-shape difference) — mirrors the exact risk already named in `Glassmind-Repository-Boundary-Decision.md` §5 for the original "where does driver code live" decision. Mitigation: §6 item 2 explicitly keeps the skeleton in `apps/glassmind`; revisiting the split is appropriate only once a real backend service exists and a concrete reason to separate emerges.

## 8. Cross-References

- `docs/architecture/Glassmind-Repository-Boundary-Decision.md` — the code-placement decision this document builds on without reopening.
- `docs/architecture/Glassmind-Database-Adapter-Decision.md` — the decision to defer real DB work to Sprint 12, which this document's runtime-ownership deferral extends.
- `docs/architecture/Glassmind-Schema-Migration-Plan.md` — the companion document defining schema/migration location, consistent with this document's "stays in `apps/glassmind` for now" recommendation.
- `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, §9 — the rule that Nexus never owns persistence, restated in §6 item 4.
- `docs/roadmap/Sprint-12-Implementation-Plan.md` §3 — items 1 and 6, which this document and the still-open bridge decision respectively address.
