# Glassmind DB Technology Decision

## 1. Purpose

Chooses the database technology for the first real, dev/test-scoped `GlassmindPersistenceDriver` implementation, per `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 1 and the deferral `docs/architecture/Glassmind-Database-Adapter-Decision.md` §7 and `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` §4 both left open. This is a dev/test technology decision, not a production deployment decision — §6 makes that boundary explicit.

## 2. Search For An Existing Database Runtime Pattern

Before recommending a new technology, this decision checked whether the repo already has an obvious, established database pattern it should align with instead:

- **`core/commandcore/persistence/`** (CommandCore's own Python persistence module) defines only an abstract `StorageProvider` interface (`storage.py`) — no concrete database technology is committed to anywhere in CommandCore's kernel itself.
- **`docker/docker-compose.yml`** defines `jarvis-core` (CommandCore) with no database service of its own — it mounts a `services/core-data` volume but runs no SQL/NoSQL server. The sibling `odysseus` service does declare `DATABASE_URL=${DATABASE_URL:-sqlite:///./data/app.db}` as its default — the only concrete database technology named anywhere in this repo's infrastructure, and it is SQLite.
- **`app/package.json`** (the Electron desktop app) already depends on `sql.js` (`^1.12.0`), used for real, in `app/src/main/log.js`, which documents it inline as "pure WASM SQLite — no native compilation required."

No Postgres, MySQL, MongoDB, or other database technology is referenced anywhere in this repo's tracked source. The closest thing to an existing, established pattern is SQLite, appearing twice independently (Odysseus's default `DATABASE_URL`, and `app/`'s real, working `sql.js` usage).

## 3. Recommendation

**SQLite, via the `sql.js` package, matching `app/`'s existing dependency exactly.**

Reasons, in order of weight:

1. **No existing pattern contradicts it; the only existing pattern (twice) confirms it.** Per §2, this is not a novel choice introduced against the grain of the repo — it is the one technology already present, even if in adjacent, non-Glassmind code.
2. **`sql.js` specifically (not `better-sqlite3` or another native SQLite binding) avoids native compilation entirely.** This repo has hit native-binding breakage repeatedly on the X: network-mounted development environment (documented across multiple prior sprint turns — `node_modules` copied cross-platform breaking `tsc`/`vitest`/`rollup` native binaries). A WASM-based SQLite driver sidesteps that entire category of failure for `apps/glassmind`'s own dependencies, and `app/`'s working precedent confirms it functions correctly in this repo's actual environment.
3. **Lightweight and local.** No server process, no connection string, no separate service to run alongside `npm test` — consistent with `docs/architecture/Glassmind-Schema-Migration-Plan.md` §10's test-database requirements (isolated, fast, reset-capable, CI-compatible).
4. **Deterministic tests.** An in-memory `sql.js` database (`new SQL.Database()`, no file) is created fresh per test, trivially satisfying isolation without any cleanup/teardown step.
5. **Good for proving schema, migrations, provenance, and parity before production DB selection.** SQLite supports real `CHECK` constraints, real indexes, and real SQL — sufficient to prove `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 5's storage-layer provenance enforcement requirement meaningfully, not just simulate it.

## 4. What This Decision Does Not Claim

- **This is not the production database decision.** `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` §4's deferral of production runtime ownership is unaffected — choosing SQLite for a dev/test driver does not commit CommandCore's eventual production Glassmind backend to SQLite. A production database technology decision remains a separate, future, explicitly-reviewed choice, made once the production runtime owner (the still-undecided future backend service) is selected.
- **This does not imply CommandCore's kernel adopts SQLite.** `core/commandcore/persistence/`'s `StorageProvider` abstraction is untouched by this decision; nothing here couples Python `core/` to this choice in any way, consistent with `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §9's Python/TypeScript boundary.
- **This is not a recommendation that Odysseus or `app/` change anything.** Their existing SQLite usage is cited as supporting precedent, not modified, imported from, or depended upon by `apps/glassmind` in any way.

## 5. Runtime Owner For The Dev/Test Driver

Per `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` §6's existing recommendation: the driver code lives in `apps/glassmind` (§6 of that document, unchanged). For the dev/test SQLite driver specifically, the "runtime owner" is simply whatever process runs `apps/glassmind`'s own test suite (`npm test`, i.e., `vitest`) — no separate service, no deployment, no connection beyond an in-memory or test-scoped local file SQLite instance created and torn down within the test process itself.

## 6. Production Boundary

This decision explicitly does not authorize:

- Connecting any SQLite instance to real CommandCore data.
- Running this driver against a database any other developer or service depends on.
- Treating this driver as production-ready persistence — it remains a dev/test-scoped implementation, per `docs/roadmap/Sprint-13-Implementation-Plan.md` §5's acceptance criteria requiring the dev database be isolated from any data CommandCore or any other service depends on.

## 7. Cross-References

- `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` — the runtime-ownership deferral this decision operates within.
- `docs/architecture/Glassmind-Database-Adapter-Decision.md` — the original deferral of real DB work this decision now begins to close.
- `docs/architecture/Glassmind-Schema-Migration-Plan.md` §10 — the test-database requirements this technology choice satisfies.
- `docs/architecture/Glassmind-Migration-Location-Decision.md` — the companion document defining where this technology's migration files live.
- `app/package.json`, `app/src/main/log.js` — the existing `sql.js` precedent this decision follows.
- `docker/docker-compose.yml` — the existing `DATABASE_URL=sqlite:...` precedent this decision follows.
- `docs/roadmap/Sprint-13-Implementation-Plan.md` §3 item 1 — the backlog item this document delivers.
