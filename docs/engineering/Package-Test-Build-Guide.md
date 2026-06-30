# Package Test/Build Guide

## 1. Purpose

A short operations note for running tests and builds in this repo. It exists because this repo has no root-level `package.json` — `npm test`/`npm run build` only work from inside an individual package directory — and because a real, repeatable Rollup optional-dependency failure has been observed in `apps/glassmind` with a known safe fix. This document is the reference for both, so neither has to be rediscovered each session.

## 2. The Repo Root Has No package.json

`/data/commandcore/development/commandcore` (the repo root) is not an npm package itself. There is no root `package.json`, no root `node_modules`, and no root-level `npm` script. Running `npm test`, `npm install`, or `npm run build` from the repo root will fail or do nothing useful — it is not a workspace root either, just a plain directory containing multiple independent packages.

**Always `cd` into the specific package directory before running any `npm` command.**

## 3. Nexus Console Commands

```bash
cd apps/nexus-console
npm test
npm run build
```

`apps/nexus-console` is the Nexus frontend (React + TypeScript + Vite, tested with Vitest). `npm test` runs the Vitest suite; `npm run build` runs `tsc -b && vite build`.

## 4. Glassmind Commands

```bash
cd apps/glassmind
npm test
npm run build
```

`apps/glassmind` is the Glassmind Phase 1 type-contracts and in-memory store package — standalone, no dependency on `apps/nexus-console` or on `core/`. `npm test` runs its Vitest suite; `npm run build` runs `tsc -b`.

## 5. Rollup Optional Dependency Issue (Observed In Glassmind)

A known, repeatable failure: `npm install` in `apps/glassmind` (and, less frequently, in `apps/nexus-console`) can resolve an npm optional-dependency platform binding incorrectly, producing an error referencing a missing native binding (for example `@rolldown/binding-win32-x64-msvc` or a similar Rollup/Vite native module) even though `npm install` itself reported success. This is the documented npm optional-dependencies bug (npm/cli#4828), not a problem with either package's source.

**Safe fix:**

```bash
cd apps/glassmind   # or apps/nexus-console, whichever is affected
rm -rf node_modules
npm install
```

If the same missing-native-binding error persists after a clean reinstall, install the specific missing platform package directly (for example `npm install @rolldown/binding-win32-x64-msvc --no-save`) rather than repeating `rm -rf node_modules && npm install` indefinitely — repeating the full reinstall rarely changes the outcome once it has already failed once with the same error.

## 6. Standard Cleanup After Nexus Builds

`apps/nexus-console`'s build writes `dist/` and TypeScript build-info files that should not be committed. After building, restore/remove generated artifacts before checking git status:

```bash
cd apps/nexus-console
git restore apps/nexus-console/dist apps/nexus-console/*.tsbuildinfo 2>/dev/null || true
rm -f main
```

The `rm -f main` step removes a stray file literally named `main` that has been observed appearing in this working tree during builds — it is not a meaningful artifact and must never be committed under that name.

## 7. Git Safety Note

This repo's git history has shown repeated `.git/index` corruption (`error: index uses ... extension, which we do not understand` / `fatal: index file corrupt`) across multiple recent sessions, consistent with the X10/network-mounted working-tree workflow this repo runs under. The recovery is non-destructive and has been used successfully each time it has occurred:

```bash
rm .git/index
git reset
```

This rebuilds the index from `HEAD` with no effect on commit history or the working tree's file contents.

**To avoid triggering this corruption in the first place: only one agent or terminal session should run `git add`, `git reset`, `git commit`, or `git push` against this repo at any given time.** Concurrent git index writes from multiple sessions are the most likely cause of the corruption observed so far. If you are about to run any of those four commands, confirm no other session is doing the same against this repo first.

## 8. What This Guide Does Not Cover

This is an operations note, not a build-system redesign. It does not modify any package's source code, `package.json`, or `package-lock.json` — package-lock files in particular should be left exactly as committed; if a lockfile needs refreshing, that is a deliberate, separate change, not a side effect of following this guide.

## 9. Cross-References

- `apps/nexus-console/README.md` (if present) and `docs/testing/Nexus-Frontend-Testing-Strategy.md` — Nexus-specific testing conventions beyond the commands in §3.
- `apps/glassmind/README.md` — package-specific scope and placement rationale beyond the commands in §4.
- `docs/architecture/Glassmind-Phase-1-Storage-Design.md` — what `apps/glassmind` implements.
