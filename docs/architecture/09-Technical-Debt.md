# 09 - Technical Debt

## Debt Register

This document records existing weaknesses without recommending removal of functionality.

## Module: Naming and Identity

### Purpose

Track legacy Jarvis naming in a codebase now becoming CommandCore.

### Responsibilities

- Preserve understanding of current package/API/UI names.

### Dependencies

- `jarvis_core`, `window.jarvis`, Jarvis UI text, Jarvis docs, Jarvis sandbox paths.

### Strengths

- Legacy naming is consistent inside old implementation.

### Weaknesses

- New contributors may confuse Jarvis product, Jarvis executive role, and CommandCore platform.

### Should Keep

- Legacy compatibility until migration is planned.

### Should Improve

- Create naming map and compatibility policy.

### Should Replace

- Replace user-facing legacy naming gradually with CommandCore/Jarvis role naming when implementation scope allows.

## Module: Duplicate Execution Paths

### Purpose

Document Core-first and desktop fallback agent loops.

### Responsibilities

- Core handles primary missions.
- Desktop fallback handles local LLM/tool execution when Core is offline.

### Dependencies

- Core engine protocol, desktop tool registry, desktop LLM client.

### Strengths

- Offline resilience.

### Weaknesses

- Duplicated approvals, audit, tools, memory, and response semantics.

### Should Keep

- Offline fallback.

### Should Improve

- Document when each path is active.

### Should Replace

- Replace divergent contracts with shared abstractions while keeping fallback behavior.

## Module: Persistence and Migrations

### Purpose

Track database and local data risks.

### Responsibilities

- Core SQLite ledger.
- Desktop sql.js action log.
- YAML memory.
- Service runtime data under `services/`.

### Dependencies

- SQLite, sql.js, YAML, Docker-mounted volumes.

### Strengths

- Local-first and inspectable.

### Weaknesses

- Migrations are ad hoc.
- Multiple persistence formats and locations.
- Runtime data appears in repo tree.

### Should Keep

- Local persistence.

### Should Improve

- Define data ownership and backup policy.

### Should Replace

- Replace ad hoc migrations with explicit versioned migrations.

## Module: Security Boundaries

### Purpose

Record current trust assumptions.

### Responsibilities

- Sandbox writes.
- Credential storage.
- Approval gates.
- API exposure.

### Dependencies

- Electron safeStorage, Core tiers, desktop tools, local paths.

### Strengths

- Credential vault uses OS encryption when available.
- Outward/destructive actions require confirmation.
- Docker binds services to localhost.

### Weaknesses

- Core API has no authentication in code.
- Desktop sandbox path containment is Windows-specific.
- Plaintext credential fallback exists for unavailable safeStorage.

### Should Keep

- Tiered approvals.
- Credential vault abstraction.

### Should Improve

- Document localhost trust boundary.
- Harden path containment across platforms.

### Should Replace

- Replace plaintext credential fallback for production builds with a blocked state or explicit insecure-mode warning.

## Module: External Dependencies

### Purpose

Track fragile external assumptions.

### Responsibilities

- Hermes package import.
- Odysseus sibling checkout.
- Public APIs.
- Piper/openWakeWord resources.

### Dependencies

- External repos, binaries, APIs, environment variables.

### Strengths

- Optional integrations fail gracefully in many places.

### Weaknesses

- Some required setup is not encoded in manifests.
- Public APIs and sibling checkouts are not pinned uniformly.

### Should Keep

- Graceful degradation.

### Should Improve

- Document exact setup requirements.

### Should Replace

- Replace implicit external assumptions with explicit dependency manifests or setup checks.

## Module: Test Coverage Gaps

### Purpose

Document where tests exist and where they are missing.

### Responsibilities

- Core tests cover mission lifecycle, fleet, memory, schedules, research, Odysseus tools, Telegram, cancellation.

### Dependencies

- pytest, MockEngine, fakes.

### Strengths

- Core is well covered for current phase behavior.

### Weaknesses

- Desktop app has no visible automated tests in repository.
- Integrations mostly lack tests.
- Renderer behavior is untested.

### Should Keep

- Core test style with fakes and mock engine.

### Should Improve

- Add desktop/integration tests later.

### Should Replace

- Replace manual-only desktop verification with automated smoke tests when UI stabilizes.
