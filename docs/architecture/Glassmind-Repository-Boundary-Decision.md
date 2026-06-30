# Glassmind Repository Boundary Decision

## 1. Purpose

Decides where persistent Glassmind backend implementation code should live in this repository, before any durable adapter (`docs/architecture/Glassmind-Durable-Adapter-Design.md`) is built. This is a placement decision, not an implementation — no code changes accompany this document.

## 2. Existing Package Layout

- **`app/`** — a separate Electron desktop application (plain JavaScript, `main`/`preload`/`renderer` structure). Not a TypeScript domain package; unrelated to Glassmind.
- **`apps/nexus-console/`** — the Nexus frontend (React + TypeScript + Vite). The visual evidence layer. Has its own `node_modules`, `package.json`, test suite (53 tests).
- **`apps/glassmind/`** — the Glassmind Phase 1 type contracts and `InMemoryGlassmindStore`, established in Sprint 10E and tightened with lifecycle methods in Sprint 10J/K. Standalone TypeScript package, zero dependency on `apps/nexus-console` or `core/`. 25 passing tests.
- **`core/`** — CommandCore's Python kernel (`commandcore`, `jarvis_core` packages). The governed source of truth for missions, agents, tools, conversations, and (eventually) approvals.
- **`services/`** — gitignored runtime sandboxes for other deployed services (`core-data`, `odysseus`), not tracked source. Established in `apps/glassmind/README.md` as the reason that package isn't placed there.

## 3. Why `apps/glassmind` Currently Makes Sense As A Standalone TypeScript Domain Package

This was already decided in `apps/glassmind/README.md` and is restated here as settled, not reopened: `services/` holds gitignored data, not tracked source; `core/` is Python with no TypeScript runtime to import a TS package into; `apps/nexus-console` is the only other buildable TypeScript package, and coupling Glassmind to it would violate "not connected to the Nexus frontend yet." `apps/glassmind` sitting as a sibling app — backend-safe domain code, no UI, no framework — remains correct for the type contracts and in-memory implementation that exist today.

## 4. Where Durable Adapter Code Should Live

Three options were considered:

- **(a) Inside `apps/glassmind` directly** — a new `src/adapters/` (or similar) directory alongside `inMemoryStore.ts`, implementing the same `GlassmindStore` interface with a real database client as a dependency.
- **(b) In a future backend service package** — a new, separate package (e.g., `services/glassmind-backend` or similar, once `services/` either changes convention or a new top-level location is established) that depends on `apps/glassmind` for its types/interface and adds the database-specific implementation.
- **(c) Behind an interface in `apps/glassmind`, with the implementation elsewhere** — `apps/glassmind` ships only the `GlassmindStore` interface and `InMemoryGlassmindStore`; any durable implementation is a plugin built and maintained outside this package entirely, imported by whatever backend process needs it.

## 5. Recommended Decision

**Option (a), with the boundary enforced by dependency direction rather than by physical separation:** durable adapter code lives inside `apps/glassmind`, behind the same `GlassmindStore` interface, as an additional implementation alongside `InMemoryGlassmindStore` — not a replacement for it (per `Glassmind-Durable-Adapter-Design.md` §15, the in-memory implementation stays for fast unit tests indefinitely).

Concretely:

- **Keep domain contracts and the in-memory implementation in `apps/glassmind`** — `types.ts`, `store.ts`, `errors.ts`, `inMemoryStore.ts` stay exactly where they are. This is already true today and does not change.
- **Add the durable adapter behind the same `GlassmindStore` interface, in the same package** — e.g. `apps/glassmind/src/adapters/<technology>Store.ts`, exporting a class implementing `GlassmindStore` the same way `InMemoryGlassmindStore` does. Database-specific dependencies (a driver, an ORM) become new `dependencies` (not `devDependencies`) of `apps/glassmind`'s own `package.json` — this package remains the single place `GlassmindStore`'s contract and every implementation of it live.
- **Do not couple `apps/glassmind` to Nexus.** This was already true and stays true; the durable adapter changes nothing about this boundary. No new dependency from `apps/nexus-console` toward `apps/glassmind` is introduced by adding a durable adapter.
- **Do not couple `apps/glassmind` directly to the Python CommandCore kernel unless an explicit bridge/service boundary is defined.** A durable adapter talking to a database is not the same thing as `apps/glassmind` importing or being imported by `core/`'s Python code — those remain two different languages with no shared runtime. If CommandCore's Python kernel ever needs to call into Glassmind (for example, an EventStore ingestion adapter living in `core/`), that requires its own explicit bridge (an HTTP/RPC boundary, a message queue, or similar) — not a direct import, which is not even possible across the language boundary, and not implicitly authorized by this document.

This keeps the package's existing identity ("the place `GlassmindStore` and its implementations live") simple and avoids inventing a second, parallel package (option b) before there is a concrete reason to split — for example, if a durable adapter ever needs a runtime/deployment footprint meaningfully different from `apps/glassmind`'s current "library, not a service" shape (its own process, its own scaling characteristics), splitting it out at that point is a reasonable, deferred decision, not one this document needs to make now.

## 6. What May Import `apps/glassmind` Later

Once the durable adapter exists and the integration sequencing in `Glassmind-Package-Integration-Map.md` §3 is followed:

- **The Jarvis conversation engine** — the primary intended consumer, calling `GlassmindStore`'s record/retrieve/lifecycle methods.
- **A future EventStore ingestion adapter** — whether it lives in `core/` (Python, calling out across a bridge per §5) or as a new TypeScript module that itself imports `apps/glassmind` directly (if it ends up living in the Node/TypeScript world instead) — either is consistent with this boundary, since `apps/glassmind` itself stays unaware of which side initiates the call.
- **A future backend service that exposes Glassmind-backed data to Nexus through a read API** — this service imports `apps/glassmind`; Nexus imports nothing from `apps/glassmind` directly (§7).

## 7. What Must Not Import `apps/glassmind` Yet

- **`apps/nexus-console` must not import `apps/glassmind`**, today or after the durable adapter lands, until a real backend-hosted read API exists and a deliberate integration decision authorizes it (per `Glassmind-Package-Integration-Map.md` §4). The durable adapter existing is not, by itself, that authorization.
- **`core/` must not import `apps/glassmind`** directly — there is no shared runtime to import across; any future coupling goes through an explicit bridge, never a same-process import, per §5.
- **No other package in this repo** (`app/`, `services/*`) has a reason to import `apps/glassmind` under this decision; if one arises, it should be evaluated against this document's reasoning, not assumed compatible by default.

## 8. How This Boundary Supports Jarvis, Nexus, CommandCore, And Future EventStore Ingestion

- **Jarvis** gets a single, stable `GlassmindStore` contract to code against regardless of which implementation (in-memory for tests, durable for production) is wired in at runtime — the conversation engine never needs to know or care which.
- **Nexus** stays the visual evidence layer with no direct dependency on Glassmind's storage technology, consistent with `Glassmind-Package-Integration-Map.md` §6's "Nexus may display, never write" framing — whatever read API eventually exposes Glassmind-backed evidence to Nexus is a separate, thin layer, not `apps/glassmind` itself.
- **CommandCore** stays untouched by this decision — no write path into CommandCore exists today, and nothing here creates one. The bridge requirement in §5 specifically exists to keep Python-kernel concerns and TypeScript-package concerns from blurring into each other.
- **Future EventStore ingestion** has a single, well-defined integration point (`GlassmindStore`'s `record*` methods) to write into, regardless of which language or process the ingestion adapter itself runs in — this decision doesn't presuppose Python or TypeScript for that adapter, only that whichever it is, it talks to Glassmind through the same interface everything else does.

## 9. Risks

- **Coupling Glassmind to the frontend.** The single highest-risk failure mode this decision guards against — §7's explicit prohibition exists because `apps/glassmind` and `apps/nexus-console` are physical siblings under `apps/`, and a future contributor reaching for the "obvious" import across that sibling boundary is the most likely way this gets violated by accident rather than by deliberate bad decision.
- **Turning Glassmind into a source of truth.** Already guarded against architecturally (`Glassmind-Durable-Adapter-Design.md` §13) and reaffirmed here: placing the durable adapter inside `apps/glassmind` must not be read as Glassmind "becoming the backend" in some larger sense — it remains memory/retrieval only, however durable its storage becomes.
- **Mixing Python kernel concerns with TypeScript package concerns.** §5's bridge requirement is the direct mitigation. The risk specifically is someone reaching for a quick, same-process shortcut (e.g., shelling out, embedding a Python interpreter, or similar) to avoid designing a real bridge — any such shortcut should be treated as a violation of this boundary, not a pragmatic exception.
- **Creating a second approval/follow-up/decision authority.** Restated from `Glassmind-Durable-Adapter-Design.md` §13 and `Glassmind-Phase-1-Storage-Design.md` §7: a durable, persistent `ApprovalWaitingStateMemoryRecord` is more convincing-looking than an in-memory one, which raises (not lowers) the risk that some future caller treats it as authoritative. The read-through framing must be enforced in whatever process calls `updateApprovalWaitingState`, not assumed to be self-evident from the data being durable now.

## 10. Final Recommendation For Sprint 10 Implementation Sequence

1. Implement the durable adapter inside `apps/glassmind` per `Glassmind-Durable-Adapter-Design.md`, behind the existing `GlassmindStore` interface, with no interface changes.
2. Do not introduce any new package, service, or directory for this work — `apps/glassmind` is sufficient per §5's reasoning.
3. Do not begin any bridge design for `core/` ↔ Glassmind communication as part of this sequence — that remains separately scoped, gated on an EventStore ingestion adapter actually being prioritized (per `Sprint-10-Backend-Implementation-Backlog.md`'s "Blocked Until Integration Decision" grouping).
4. Do not begin any Nexus-facing read API work as part of this sequence — per §7, that remains gated on its own deliberate integration decision, independent of whether the durable adapter exists.

## 11. Cross-References

- `docs/architecture/Glassmind-Durable-Adapter-Design.md` — the adapter this decision places.
- `docs/architecture/Glassmind-Package-Integration-Map.md` — the integration sequencing §6-§8 restate for placement purposes.
- `docs/engineering/Glassmind-Contract-Review.md` — the prior review confirming `apps/glassmind`'s existing boundary enforcement is structurally sound.
- `apps/glassmind/README.md` — the original placement rationale §3 restates as settled.
- `docs/roadmap/Sprint-10-Backend-Implementation-Backlog.md` — where §10's sequencing recommendation slots into the broader backlog.
