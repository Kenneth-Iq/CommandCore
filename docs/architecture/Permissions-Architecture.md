# Permissions Architecture (Beta-2)

## 1. Purpose

Defines how authenticated actors (Authentication Architecture) are authorized to view and, eventually, act on CommandCore entities. This extends the existing `PermissionLevel` concept already present in agent and capability contracts rather than inventing a parallel system, per the Beta-2 Backlog's explicit warning against permission model fragmentation.

## 2. Current State (Beta-1)

CommandCore already models `PermissionLevel` (safe / restricted / privileged) on tools and capabilities, and a `permission_level` field on agents. None of this is enforced against a human actor today — it is descriptive metadata surfaced read-only in the Tool Centre and Agent Centre.

## 3. Proposed Architecture

- **Role model**: A small, fixed set of operator roles (e.g., Viewer, Operator, Approver, Administrator) rather than a fully custom permission-bit system. Roles are assigned to actors, not to individual entities.
- **Permission resolution**: A role grants a ceiling permission level (mirroring the existing safe/restricted/privileged scale). An actor's effective permission for a given command is the minimum of their role's ceiling and the target entity's own permission level — an Operator role does not bypass a tool's `privileged` tier.
- **Read vs. write separation**: Every role that can read a centre does not automatically gain write access to it. Read access (Viewer) is the default for all authenticated actors; write access requires Operator or above, and approval-granting requires Approver or above.
- **Scope boundaries**: Permissions can optionally be scoped to a company/workspace/project subtree (using the same scope model already used by missions, conversations, and knowledge assets), so an Operator can be restricted to one workspace rather than the whole portfolio.

## 4. Key Decisions / Open Questions

- Whether roles are static (fixed set, simple) or composable (multiple roles per actor) — static is preferred for Beta-2's first cut, to avoid combinatorial policy complexity before real usage patterns exist.
- Whether scope-restricted permissions are in the first Beta-2 increment or deferred — likely deferred until at least one company/workspace exists with a real need for it.
- How permission checks interact with the Policy Gate (see Write API and Workflow/Approval Engine docs) — permissions answer "can this actor attempt this kind of action at all," policy answers "is this specific action allowed given current state." Both must pass independently.

## 5. Dependencies

- Depends on: Authentication Architecture.
- Blocks: all three Command architectures, Write API, Approval Engine.

## 6. Risks

- Designing this independently from the existing `PermissionLevel`/capability certification concepts produces two incompatible permission systems — this is called out explicitly as a top risk in the Beta-2 Backlog.
- Overly granular scope-based permissions before there is real multi-team usage adds complexity with no validated need.
