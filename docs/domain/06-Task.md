# Task Domain

## Purpose

This document defines Tasks as future execution units inside CommandCore.

The locked blueprint states that tasks are execution units and never the central product model.

## Responsibilities

- Represent a bounded unit of work.
- Carry objective, scope, constraints, and expected output.
- Attach execution to a project, company, capability, agent, or human workflow.
- Return completion state and outcome into operational memory.

## Ownership

Tasks are owned by the domain architecture of CommandCore and executed by humans or future agents under project and executive governance.

In Sprint 1, `NextAction` is the primary implemented work-memory record closest to the Task concept.

## Lifecycle

Future lifecycle:
1. A task objective is defined.
2. Scope, context, permissions, and forbidden actions are attached.
3. The task is assigned to a human or agent.
4. Approval gates are checked where needed.
5. Work is executed and reported.
6. Output, status, and audit events are stored.

Sprint 1 analogue:
1. A Next Action captures the immediate unit of work.
2. Decisions and notes provide context.
3. Completion or status change updates project memory.

## Relationships

- A Task sits below an Agent in the future hierarchy.
- A Task may belong to a Project and indirectly to a Company.
- A Task may consume one or more Capabilities.
- A Task may be executed by an Agent or a human user.
- A Task contributes activity, decisions, and knowledge back into CommandCore.

## Future Extensions

- Formal task contracts
- Task approval routing
- Task rollback and recovery notes
- Multi-step task orchestration
- Task-to-capability execution templates

## Examples

Example 1:
- Review a GitHub repository for reuse potential and record Adopt, Adapt, Watch, or Reject.

Example 2:
- Produce a runbook for a project missing operational launch instructions.

Example 3:
- Summarize company blockers for the Nexus briefing using cited source records.

## Rules

- Tasks are execution units, not the central identity of the platform.
- Tasks must be scoped, auditable, and safe.
- Tasks must honor approval gates and forbidden actions.
- Tasks must not bypass vault and secret-handling rules.
- Sprint 1 should use Next Actions without pretending the full Task model already exists.

## Canonical Task Facets

### Scope

Scope defines the records, systems, or business context the task is allowed to affect.

### Objective

Objective defines what successful execution should achieve.

### Constraints

Constraints define forbidden actions, approvals, and operating boundaries.

### Assignment

Assignment identifies the human or agent responsible for execution.

### Output

Output is the result returned by task execution.

### Audit

Audit is the trace of what was done, why, by whom, and with what result.
