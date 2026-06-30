# CommandCore EventStore Bridge Runtime Decision

## 1. Purpose

Decides where the CommandCore EventStore bridge should actually run, building on `docs/architecture/Glassmind-Persistence-Runtime-Decision.md`'s deferral of this exact question (§4, §6 item 3) and `docs/roadmap/Sprint-12-Implementation-Plan.md` §3 item 6. This document names a runtime location for the *structural* bridge's eventual production counterpart — it does not implement a subscription, does not import `core/`, and does not change `DefaultCommandCoreEventBridge`'s code.

## 2. Current State

- `DefaultCommandCoreEventBridge` (`apps/glassmind/src/commandCoreEventBridge.ts`) exists structurally inside `apps/glassmind` — a pure function (`convert`) mapping a structurally-typed `CommandCoreEventEnvelope` (not imported from CommandCore) onto the existing `GlassmindIngestionEvent` shape `EventStoreIngestionAdapter` consumes.
- No production subscription exists. Nothing calls `convert` in a loop, on a timer, or in response to a real event stream — it is invoked only by its own test suite.
- No `core/` import exists anywhere in `apps/glassmind`, verified by a dedicated structural test in `commandCoreEventBridge.test.ts` that reads the file's own source and asserts against it.

## 3. Candidate Runtime Locations

- **`apps/glassmind`** — the bridge's structural types and conversion function already live here. The question is whether the *subscription* (the thing that calls `convert` against a real, live event feed) should also live here.
- **`core/`** — CommandCore's Python kernel, the actual owner of the EventStore. A Python-side component could call out to a Glassmind-facing endpoint whenever a relevant event occurs.
- **A future backend service/bridge package** — a new, not-yet-existing process whose sole job is bridging CommandCore's EventStore to Glassmind, independent of both `core/`'s Python runtime and `apps/glassmind`'s own package boundary.
- **Nexus frontend (`apps/nexus-console`)** — included only to be explicitly ruled out (§4).

## 4. Recommendation

1. **Do not run the EventStore bridge inside Nexus.** `apps/nexus-console` is a browser application — it has no persistent process to hold a subscription, no access to CommandCore's EventStore, and per `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, no path to writing into Glassmind at all (real event ingestion is a write). This option is not viable, not merely deprioritized.
2. **Do not couple `apps/glassmind` directly to Python `core/` yet.** A same-process or direct-import coupling between a TypeScript package and CommandCore's Python kernel would repeat exactly the "mixing Python kernel concerns with TypeScript package concerns" failure `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §9 already named as a risk to avoid. The structural types in `commandCoreEventBridge.ts` exist specifically so this coupling is unnecessary at the type level — that reasoning extends to the runtime level too.
3. **Keep the structural bridge types in `apps/glassmind`.** `CommandCoreEventReference`, `CommandCoreEventEnvelope`, `CommandCoreEventBridge`, `DefaultCommandCoreEventBridge` do not move. Whatever runtime eventually calls `convert` does so by importing `apps/glassmind` (a TypeScript dependency, not a Python/TypeScript coupling), exactly as `Glassmind-Persistence-Runtime-Decision.md` §6 item 1 already established for the persistence driver interface.
4. **Implement the production bridge in a future backend service/bridge layer**, once CommandCore's backend runtime is selected. This is the same "future backend service" option `Glassmind-Persistence-Runtime-Decision.md` §5 already named for persistence ownership — the two questions (who owns the database connection, who owns the EventStore subscription) are likely answered by the same future service, since both require a long-lived TypeScript-capable process with a defined relationship to CommandCore. This document does not assume they must be the same service, only that neither belongs inside `apps/glassmind`, `core/` directly, or Nexus.

## 5. First Safe Runtime Path For Sprint 12/13

No subscription is implemented in Sprint 12 or assumed for Sprint 13 by this document. The "first safe" path, when a runtime is eventually built, is:

1. The future backend service (§4 item 4) receives or polls for CommandCore events through whatever mechanism `core/`'s own architecture exposes (a webhook, a message queue, a polling endpoint — undecided, and out of this document's scope).
2. That service constructs a `CommandCoreEventEnvelope` from whatever it receives and calls `DefaultCommandCoreEventBridge.convert`, imported from `apps/glassmind` as a normal TypeScript dependency.
3. A `converted` result is then written through `EventStoreIngestionAdapter` into a now-durable `GlassmindStore` (per `docs/architecture/Glassmind-Phase-1-Persistence-Path.md`), still with an explicit, narrow eligibility allowlist — not broad mirroring — exactly as `Sprint-12-Implementation-Plan.md` §3 item 7 already specifies for "the first safe ingestion path."

This sequencing keeps every step inside code that already exists and is already tested (`convert`, `EventStoreIngestionAdapter`) — the only new component is the future service's own subscription/polling mechanism, which is explicitly out of scope for Sprint 12.

## 6. Risks

- **Broad event mirroring.** A subscription built under the assumption that "more events ingested is more useful" would violate `EventStoreIngestionAdapter`'s existing no-default-eligibility design. Any real subscription must construct a deliberately narrow eligibility predicate, reviewed on its own terms, not default to "ingest everything CommandCore emits."
- **Raw payload duplication.** Per `docs/architecture/Glassmind-Schema-Migration-Plan.md` §7, no Glassmind record has ever had a payload field, and `DefaultCommandCoreEventBridge.convert` already deliberately never reads `envelope.payload`. The risk is a future subscription implementation reaching past the bridge — constructing a record directly from a raw event payload instead of through `convert` and `EventStoreIngestionAdapter`'s `IngestionRecordBuilder` — and reintroducing duplication the bridge itself was built to prevent.
- **Source-of-truth drift.** An ingestion path that runs too eagerly, or that treats Glassmind's copy as queryable instead of CommandCore's live state, would blur exactly the boundary `Glassmind-Phase-1-Persistence-Path.md` §5 draws. The mitigation is structural, not just procedural: Glassmind's `GlassmindStore` interface has no method that could serve as a "current state" query — only `retrieveBySourceReference`/`retrieveByScope`, both explicitly memory/retrieval-shaped.
- **Frontend write path.** A future backend service exposing both a Glassmind read API (`Nexus-Glassmind-Read-Only-Evidence-Plan.md` §9) and the EventStore bridge's ingestion path risks one shared service accidentally exposing both surfaces to the same callers. The mitigation: the read API's surface must be checked (per that document's §10 "no-write-surface tests") to confirm it has no reachable ingestion endpoint, regardless of which process hosts both.
- **Python/TypeScript boundary confusion.** Anyone unfamiliar with `Glassmind-Repository-Boundary-Decision.md`'s reasoning might assume a "bridge" implies a same-process Python↔TypeScript call. It does not, and should not — the bridge is a conversion function plus a future network/process boundary, never a language-runtime boundary crossed in-process.

## 7. Acceptance Criteria Before Any Production Bridge Is Allowed

1. **A concrete runtime/technology decision exists for the future backend service** (§4 item 4) — analogous to `Glassmind-Persistence-Runtime-Decision.md`'s own deferral, this document does not authorize building toward an assumed service shape.
2. **The eligibility predicate for any real subscription is reviewed and documented before code is written**, not inferred from "whatever events happen to be easy to wire up first."
3. **A test proves the production ingestion path never reads `envelope.payload` or any raw event field beyond what `CommandCoreEventEnvelope`'s structural type already exposes** — extending `commandCoreEventBridge.test.ts`'s existing "never copies raw payloads" pattern to the real subscription code, not just the conversion function.
4. **No `core/` import exists in `apps/glassmind` at that point either** — the structural "no CommandCore import" test in `commandCoreEventBridge.test.ts` must still pass; a production bridge does not change this package's boundary.
5. **Nexus has no path to the ingestion endpoint**, verified the same way `Nexus-Glassmind-Read-Only-Evidence-Plan.md` §10 requires for the read API's write-surface absence.
6. **A Sprint-closing review confirms all of the above**, in the same shape as every other Glassmind capability's closing review in this repo — not assumed from this document alone.

## 8. Cross-References

- `apps/glassmind/src/commandCoreEventBridge.ts`, `commandCoreEventBridge.test.ts` — the structural bridge this decision builds on without modifying.
- `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` — the parallel runtime-ownership deferral for persistence, whose reasoning and "future backend service" option this document extends to the EventStore bridge.
- `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §9 — the Python/TypeScript coupling risk §4 item 2 and §6 restate.
- `docs/architecture/Glassmind-Phase-1-Persistence-Path.md` — the ingestion-to-storage path §5 sequences against.
- `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` §4, §9, §10 — the Nexus exclusion and no-write-surface testing pattern §4 item 1 and §7 item 5 apply.
- `docs/roadmap/Sprint-12-Implementation-Plan.md` §3 items 6-7 — the items this document resolves and sequences.
