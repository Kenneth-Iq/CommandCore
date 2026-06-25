# CommandCore Engineering Bible

## 1. CommandCore Identity

CommandCore is an AI Operating System, not an assistant.

Jarvis, Hermes-Claw, Odysseus, MindX, companies, workspaces, projects, missions, agents, tools, and knowledge all plug into the same governed kernel.

CommandCore is built as one composable operating core where governance, execution, memory, and observability are first-class concerns.

## 2. Current Architecture Rules

- In-memory first.
- Event-driven.
- Kernel-first.
- Tests-first.
- Pydantic/domain model consistency.
- No UI unless milestone explicitly requests UI.
- No external services unless explicitly requested.
- No AI/model calls unless explicitly requested.
- No Jarvis behavior changes unless explicitly requested.

Additional enforcement guidance:

- Prefer small wiring refactors over redesigns.
- Extend existing patterns before inventing new ones.
- Keep service boundaries explicit and readable.
- Preserve current contracts unless a milestone makes contract change unavoidable.

## 3. Standard Milestone Definition of Done

Every implementation milestone must:

- create all required source files
- create all required tests
- wire kernel bootstrap if needed
- update dashboard if needed
- update health/readiness if needed
- publish events where relevant
- preserve existing behavior
- run focused tests
- list changed files
- list test command/result
- list assumptions
- not claim complete unless files exist

Completion reporting is mandatory. A milestone is not done because code was discussed, partially drafted, or planned. It is done only when the required files exist and the required wiring and tests are present.

## 4. Event Rules

- All major lifecycle actions publish events.
- EventBus is live dispatch.
- EventStore is canonical event history.
- AuditTrail is human/operational audit history.
- Do not confuse EventStore and AuditTrail.

Interpretation rules:

- EventBus is the real-time in-memory transport for subscribers and local runtime reactions.
- EventStore is the append-only historical record of what happened.
- AuditTrail is a readable operational trace for humans and system review.
- A feature may write to both EventStore and AuditTrail through shared event flow, but they are not interchangeable concepts.

## 5. Kernel Wiring Rules

When a new runtime/service is added:

- expose it on CommandCoreKernel
- create it in create_in_memory_kernel()
- share event_bus
- use event_store through event_bus
- update readiness and health snapshot
- update dashboard kernel summary where relevant

Practical expectation:

- New kernel components should be visible, bootstrapped, observable, and test-covered in the same milestone.
- Kernel wiring should stay simple and explicit.
- Hidden singleton wiring or side-channel runtime creation is discouraged.

## 6. Dashboard Rules

Dashboard services are read-only.

They must not mutate state.

They summarise existing kernel services only.

Additional rules:

- Dashboards report current kernel state, counts, recent activity, and summaries.
- Dashboards are not orchestration layers.
- Dashboards must depend on existing services rather than duplicating business logic.

## 7. Testing Rules

- Add focused tests for each new service.
- Add bootstrap tests if kernel wiring changes.
- Add dashboard tests if dashboard changes.
- Add readiness/health tests if health changes.
- Do not weaken old tests.
- Prefer small focused test run first, then full suite at checkpoint.

Testing discipline:

- Tests should prove behavior, wiring, and non-regression.
- If a new service emits events, tests should verify event flow where relevant.
- If a new kernel-exposed service appears in dashboard or readiness layers, tests should cover that visibility.

## 8. Bulk Development Rules

Bulk is allowed when components are related.

Good bundles:

- runtime + dashboard + bootstrap + health + tests
- registry + runtime + tests
- API routes + schemas + tests

Bad bundles:

- backend + UI + persistence + auth + AI model calls all together

Decision rule:

- Bulk milestones should preserve a coherent architectural slice.
- If a bundle crosses too many unrelated layers at once, split it.

## 9. Commit Rules

Before commit:

- remove __pycache__ and .pyc
- run tests
- git status
- commit with architectural message
- push
- confirm clean tree

Commit messages should describe the architectural effect, not just the surface code motion.

## 10. Current Completed Roadmap Snapshot

Completed:

- contracts
- registries
- event bus
- event store
- knowledge engine
- mission engine
- kernel bootstrap
- executive runtime
- executive orchestrator
- state store
- policy engine
- policy gate
- reporting
- audit trail
- health/readiness
- dashboard layer
- persistence interfaces
- conversation engine
- conversation knowledge/context linking
- agent runtime
- agent mission integration

This snapshot reflects the current CommandCore foundation and should be updated only when implementation truly exists in the repository.

## 11. Remaining Roadmap

Remaining:

- tool runtime
- capability execution
- SQLite persistence
- API foundation
- Nexus Console UI
- Jarvis runtime shell
- Hermes-Claw integration
- Odysseus multi-agent layer

These items remain future work unless and until they are actually implemented and wired.

## 12. Standard Codex Completion Checklist

At the end of every milestone response, Codex must provide:

- files created
- files modified
- tests added
- tests run
- result
- assumptions
- next recommended step

This checklist is mandatory for milestone closeout communication.

## Operating Principles

These principles apply across all future work:

- Prefer explicit composition over hidden magic.
- Prefer focused additions over broad redesign.
- Prefer evidence from files and tests over assumptions.
- Prefer preserving behavior over refactoring for style.
- Prefer governed extensibility over ad hoc feature growth.

## Permanent Contributor Guidance

Anyone changing CommandCore should treat this document as the baseline engineering contract.

That means:

- do not present aspirational architecture as implemented reality
- do not mark milestones complete when required files or tests are missing
- do not add external dependencies casually
- do not bypass kernel wiring for convenience
- do not merge state mutation into dashboard services
- do not blur the distinctions between runtime flow, event history, and audit history

CommandCore should evolve as one governed kernel-centered system, with each milestone leaving the repository more explicit, more testable, and more operationally visible than before.
