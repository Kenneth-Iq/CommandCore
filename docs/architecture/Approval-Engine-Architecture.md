# Approval Engine Architecture (Beta-2)

## 1. Purpose

Expands the Approval Model section of the Write Capability Architecture into a standalone engine specification: how approval requirements are determined, how approval state is tracked, and how approvers interact with pending commands.

## 2. Current State (Beta-1)

Executive Dashboard already surfaces `policy_warnings` and `policy_blocks` as read-only signals from the existing Policy Engine/Policy Gate. There is no approve/deny interaction anywhere — these are observed outcomes only, never acted upon inside Nexus.

## 3. Proposed Architecture

- **Approval requirement resolution**: for a given command, the Policy Gate's evaluation (`allow` / `warn` / `block`) plus the command kind's own static approval policy (e.g., privileged tool invocations always require approval regardless of policy warnings) jointly determine whether a command needs approval. `block` always wins outright; `warn` always forces approval; static per-kind rules can force approval even when the Policy Gate would otherwise `allow`.
- **Approval as state, not action history alone**: a command sits in a `pending_approval` state with a defined approver pool (derived from the Permissions Architecture's Approver role, optionally scoped to the command's workspace/company/project). The engine tracks this as current state, queryable, not just as past events.
- **Approval actions are themselves audited commands**: `ApprovalGranted` and `ApprovalDenied` are submitted the same way other commands are (through the Write API), each producing their own audit entry recording the approver's identity and the policy context evaluated.
- **Escalation and expiry**: a `pending_approval` command should support an optional expiry (auto-deny or auto-escalate after a defined window) so approval queues do not silently accumulate indefinitely — the specific policy (deny vs. escalate vs. never-expire) is configurable per command kind, not hardcoded globally.

## 4. UI Surface

- A dedicated "Pending Approvals" view (likely a new Nexus surface, not bolted onto an existing centre) lists every command awaiting the current actor's approval, scoped by their Approver role and any workspace/company/project restriction.
- Each pending approval renders using the same preview pattern from the Write Capability Architecture's UI Confirmation Pattern (§9) — an approver sees the same structured preview the original submitter saw, not a raw payload dump.
- Approval/denial requires the same explicit-confirmation pattern as any other write action; it is not a single inline button with no confirmation step, given its consequence.

## 5. Key Decisions / Open Questions

- Whether a single approval is sufficient or some command kinds need multi-approver sign-off — start with single-approver and revisit only if a real governance requirement demands more.
- Whether approval pool resolution is role-only or also scope-restricted from day one — likely role-only first, scope restriction added once real multi-team usage exists (mirrors the same open question in the Permissions Architecture).

## 6. Dependencies

- Depends on: Authentication Architecture, Permissions Architecture, Write API Architecture.
- Depended on by: Mission Commands, Tool Commands (both reference approval requirements directly), Workflow Engine Architecture (workflow steps pause on pending approvals).

## 7. Risks

- An approval queue with no expiry/escalation policy becomes a silent bottleneck that operators learn to route around informally, undermining the entire governance purpose of having approvals.
- If the approval UI does not reuse the same preview pattern as submission, approvers may approve based on an incomplete understanding of what they are authorizing.
