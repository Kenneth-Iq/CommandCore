# Glassmind Migration Location Decision

## 1. Purpose

Defines where Glassmind's database migration files live, per `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 2 and `docs/architecture/Glassmind-Schema-Migration-Plan.md` §8's proposed (not yet created) convention.

## 2. Decision

**`apps/glassmind/migrations/`**, numbered, plain SQL files: `001_glassmind_phase_1.sql`, and so on for any future migration.

## 3. Reasoning

- **Consistent with the existing "driver code stays in `apps/glassmind`" decision.** Per `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` §6 item 2, the database driver implementation lives inside `apps/glassmind`, not a separate package. A migration directory outside that package would split schema definition from the code that depends on it for no architectural reason.
- **Plain numbered SQL files, not an ORM-managed migration format.** `apps/glassmind` has no ORM today and this decision does not introduce one — `docs/architecture/Glassmind-Schema-Migration-Plan.md` §9 already left "migration tooling" as unresolved/technology-dependent. Plain `.sql` files are the simplest format that works identically whether the eventual driver is `sql.js` (the dev/test choice, per `docs/architecture/Glassmind-DB-Technology-Decision.md`) or a different production technology later — a numbered SQL file is portable in a way a tool-specific migration format is not.
- **Sequential numeric prefixes (`001_`, `002_`, ...), not timestamps.** Matches the simplest possible convention given this package's current single-contributor-at-a-time development pattern (this whole project, evidenced by the sequential sprint-by-sprint history) — a timestamp-based scheme exists to avoid numbering collisions across many concurrent contributors, which is not this package's situation today. If that changes, renumbering to a timestamp scheme is a cheap, mechanical, separately-reviewable follow-up, not a reason to over-engineer this decision now.
- **One file per logical schema change, not one file per record kind.** `001_glassmind_phase_1.sql` contains all four Phase 1 tables (`glassmind_conversation_turns`, `glassmind_follow_ups`, `glassmind_deferred_decisions`, `glassmind_approval_waiting_states`) in a single migration, since they were designed and are being introduced together as one coherent schema (`Glassmind-Schema-Migration-Plan.md` §3-§4) — splitting them into four separate migration files would imply an ordering dependency between them that does not exist.

## 4. What This Migration File Contains (And Does Not)

`001_glassmind_phase_1.sql` implements `Glassmind-Schema-Migration-Plan.md` §3-§6 directly:

- All four tables, with the field sets specified in that document's §4.
- The required indexes from §5 (source reference fields, scope, status, `occurred_at`, the lifecycle timestamp).
- A `CHECK` constraint per table enforcing §6's provenance rule at the schema level — at least one of the four `source_*` columns must be non-null — satisfying `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 5's storage-layer provenance requirement for the primary `sourceReference`. The lifecycle-level source reference (`resolution_source_reference`/`update_source_reference`) remains enforced only at the `DurableGlassmindStore` application layer for this migration, since it is nested, conditionally-present JSON rather than a flat column — a documented, deliberate scope limit, not an oversight (see `apps/glassmind/src/sqliteDriver.ts`'s own documentation of this).
- No `payload`/`event_data`-shaped column anywhere, per §7's restated rule against raw EventStore payload duplication.
- No embedding, vector, or similarity-search-shaped column anywhere, per this sprint's explicit non-goals.

## 5. SQLite-Specific Note

This migration is written in SQLite's SQL dialect (per `docs/architecture/Glassmind-DB-Technology-Decision.md`'s dev/test technology choice) — `TEXT`/`INTEGER` column types, SQLite's `CHECK` constraint syntax. `Glassmind-Schema-Migration-Plan.md` §9 already flagged exact column types and constraint implementation as technology-dependent and unresolved until a technology was chosen; this migration is that resolution for the dev/test driver specifically. A future production migration, once a production database technology is separately decided (per `Glassmind-DB-Technology-Decision.md` §4's explicit boundary), would likely need its own dialect-specific migration file in this same directory, numbered sequentially after this one — not a rewrite of this one, since this migration remains valid for the dev/test driver regardless of what production eventually chooses.

## 6. Cross-References

- `docs/architecture/Glassmind-Schema-Migration-Plan.md` §3-§9 — the schema this migration file implements.
- `docs/architecture/Glassmind-DB-Technology-Decision.md` — the technology choice this migration's SQL dialect matches.
- `apps/glassmind/migrations/001_glassmind_phase_1.sql` — the migration file this decision places.
- `apps/glassmind/src/sqliteDriver.ts` — the driver that applies this migration against a real (dev/test) SQLite instance.
- `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 2 — the backlog item this document delivers.
