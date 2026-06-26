# Write Capability Architecture (Beta-2)

## 1. Purpose

This document defines the architecture for introducing safe write actions to Nexus and CommandCore. It is a design specification only. It does not implement any write behavior and does not change Beta-1's read-only posture.

It follows the CommandCore Engineering Bible and expands on `docs/roadmap/Nexus-Beta-2-Backlog.md`, particularly backlog items 3.1 (write actions from the UI), 3.2 (auth and role permissions), 3.7 (approval workflows), and 3.11 (audit/replay/recovery UX).

## 2. Why Beta-1 Is Read-Only

Beta-1's read-only boundary was not a temporary limitation of convenience — it was a deliberate sequencing decision:

- Nexus needed to first prove it could make governed runtime state **visible, structured, and trustworthy** before it could safely make that state **mutable**.
- No authentication or role model existed; exposing writes without either would mean any viewer of the console could mutate kernel state.
- CommandCore's kernel is in-memory first; writes without a persistence and replay story would be silently lossy on restart, which is worse than no writes at all.
- The Nexus UX Review explicitly called out "avoid premature control surfaces" as a risk, noting that visibility, structure, routing, and trust must come before writes.

Beta-2 write capability work must not begin by relaxing this boundary casually. It must begin by satisfying the prerequisites this document defines.

## 3. Beta-2 Write Principles

These principles govern every write action added in Beta-2, not just the first one shipped:

1. **No write without a corresponding read.** Every entity that becomes writable must already have a stable, well-understood read-only representation in Nexus before its write path is built.
2. **No write without audit.** Every write action publishes a domain event through the existing EventBus/EventStore/AuditTrail pipeline. A write that does not produce an auditable event did not happen, by policy.
3. **No write without policy evaluation.** Every write action passes through the Policy Gate before it takes effect, even if the policy currently evaluates to "allow." There is no direct-to-kernel write path that bypasses policy.
4. **No write without explicit confirmation.** The UI never performs a write as a side effect of navigation, filtering, or selection. Writes require a deliberate, separately rendered confirmation step.
5. **No silent state divergence.** If persistence is introduced before or alongside write actions, the database is never allowed to become a second source of truth that can drift from EventStore/AuditTrail.
6. **Reversibility is evaluated per action, not assumed globally.** Some actions (e.g., creating a conversation) are cheap to reverse or simply inert if abandoned; others (e.g., invoking a privileged tool) may not be reversible at all. The UI confirmation pattern must reflect this per action, not use one generic warning for everything.

## 4. Command / Action Model

Each write action is modeled as an explicit **Command**, distinct from the read-only **Query** model Nexus already uses via the dashboard services.

```text
Command
  id            (generated, used for idempotency and audit correlation)
  kind          (e.g. "CreateMission", "AssignAgent", "InvokeTool")
  actor         (resolved identity — see §5, not optional)
  payload       (kind-specific structured input, validated against a schema)
  requested_at  (timestamp)
  policy_result (attached after Policy Gate evaluation, before execution)
```

Properties of the command model:

- Commands are submitted, not executed directly. Submission is a kernel-level operation distinct from "the write happened."
- Every command kind maps to exactly one kernel service method, mirroring how each existing dashboard service maps to one read-only aggregation. No command should fan out into multiple unrelated kernel mutations.
- Commands are rejected outright (not silently dropped) if the actor, payload schema, or policy result is missing or invalid. A rejected command still produces an audit entry recording the rejection and reason.
- Command kinds are additive to the existing contract types (Mission, Agent, Tool, Conversation, KnowledgeAsset) rather than replacing them — a `CreateMission` command payload should be a strict subset/builder for the existing `Mission` contract, not a parallel shape.

## 5. Approval Model

Approval is distinct from policy evaluation (§6): policy answers "is this allowed in principle," approval answers "has an authorized human or role explicitly authorized this specific instance."

- Not every command requires approval. The approval requirement is a property of the command kind and, where relevant, its payload (e.g., a tool invocation against a "safe" tool may not require approval; the same command against a "privileged" tool does).
- Approval is itself an auditable event (`ApprovalGranted` / `ApprovalDenied`), recording the approver's identity, the command it applies to, and the policy context it was evaluated under.
- A command that requires approval is held in a `pending_approval` state. It does not execute until approval is recorded, and it can be explicitly denied (terminal) or left pending (still actionable).
- Approval and execution are separate steps even for a single approver acting on their own request, to preserve a consistent two-step audit trail regardless of who is involved.
- This model directly extends the existing `policy_warnings` / `policy_blocks` concepts already surfaced read-only on the Executive Dashboard — approval is what an operator does in response to a warning, not a new parallel concept.

## 6. Policy Gate Integration

CommandCore already has a Policy Engine and Policy Gate (Engineering Bible §10, "Completed" roadmap snapshot). Write capability must integrate with it, not duplicate it:

- Every command is evaluated by the existing Policy Gate before execution, producing the same `allow` / `warn` / `block` outcomes already modeled for objectives and mission requests.
- A `block` outcome terminates the command with an audit entry; it never reaches the approval stage.
- A `warn` outcome routes the command into the approval flow (§5) rather than executing immediately, regardless of whether the command kind would otherwise be auto-approved.
- Policy rules for write commands should be additive to the existing rule set the Policy Engine evaluates, keyed by command kind, rather than introduced as a separate write-specific policy system.

## 7. Audit Trail Requirements

Per the Engineering Bible's event rules, AuditTrail is the human/operational read of what happened, distinct from EventStore.

For write capability:

- Every command (submitted, approved, denied, executed, failed) produces at least one AuditTrail entry, human-readable enough to show directly in a Nexus audit viewer without translation.
- Audit entries for write actions must record actor identity, command kind, target entity id, policy result, and approval state at time of execution — not just "what changed."
- AuditTrail entries are append-only, exactly as they are today; there is no "edit" or "delete" operation on audit history, including for write actions that are later reversed (a reversal is its own new audited command, not a retroactive edit).
- Beta-2's audit/replay UX (backlog item 3.11) is a hard prerequisite for shipping any write action to real users — operators must be able to see what happened before they are asked to trust a system that can make things happen.

## 8. Event Store Requirements

EventStore remains the canonical, replayable history of domain events, distinct from AuditTrail's human-facing role.

For write capability:

- Every successful command execution publishes a domain event to EventBus, which is appended to EventStore exactly as existing lifecycle events (mission created, agent assigned, etc.) already are.
- Command rejection, policy blocks, and approval denials are also published as events, not just logged — so EventStore remains a complete record of attempted, not just successful, state changes.
- If persistence (database) lands before or alongside write capability, EventStore must remain the source of truth for rebuilding state; the database is a derived/queryable projection, never the originating record.
- Replay semantics (rebuilding in-memory kernel state from EventStore) must be defined and tested before any write action that cannot be trivially re-derived from seed data ships to a persistent environment.

## 9. UI Confirmation Pattern

Nexus's write UI must use one consistent confirmation pattern across all command kinds, with severity-appropriate variation:

1. **Initiate** — an explicit affordance (never a side effect of clicking into a record or filtering a list) opens a command form pre-populated with context already visible on the page (selected mission, agent, workspace, etc.).
2. **Validate** — the form validates payload against the command's schema client-side, mirroring the same validation the kernel will perform; no command is submitted that the UI already knows will fail validation.
3. **Preview** — before submission, the UI shows a read-only preview of the command's effect (what will change, what policy outcome is expected if determinable client-side) — this reuses the existing `RecordDetailPanel`/`RelationshipCard` visual language rather than inventing a new preview component.
4. **Confirm** — a distinct, explicit confirmation action (not the same button as "preview") submits the command. Destructive or irreversible actions require a stronger confirmation (e.g., typing the entity name) than low-risk ones.
5. **Track** — after submission, the UI shows the command's live state (`pending_policy`, `pending_approval`, `executing`, `completed`, `failed`, `rejected`) rather than assuming immediate success; this state is sourced from the same audit/event data described in §7–§8, not a UI-local optimistic flag.

No write action in Beta-2 should collapse steps 1–4 into a single click, even for low-risk commands, to keep the interaction pattern predictable across the whole product.

## 10. Rollback / Recovery Considerations

- Rollback is modeled as a new, explicitly audited compensating command (e.g., `CancelMission`, `UnassignAgent`), never as deleting or rewriting prior audit/event history.
- Not all command kinds have a defined compensating action at launch (e.g., a completed tool invocation with external side effects may not be cleanly reversible) — each proposed write action in §11 must state its rollback story explicitly, including "no rollback possible" where true, rather than leaving it implicit.
- Recovery UX (backlog item 3.11) — "replay this mission's events to reconstruct state," "show what changed since this incident" — depends on the audit/event foundations in §7–§8 and should be scoped as a feature in its own right once those foundations exist, not bundled into the first write-action milestone.
- Idempotency keys (the command `id` from §4) are required so that a retried or duplicated submission (e.g., a double-click or a network retry) does not produce a duplicate state change.

## 11. Proposed Write Actions

Each of the following is a candidate Beta-2 command kind. None are scoped as implementation-ready; each needs its own milestone definition (files affected, schema, test plan) before work begins, per the Engineering Bible's milestone discipline.

### 11.1 Create Mission

- Maps to the existing `Mission` contract (title, scope, capability_ids, required_output, approval_required).
- Likely requires approval by default, since `approval_required` already exists as a field on the contract today.
- Rollback: `CancelMission` if not yet assigned/started; no rollback once execution has begun.

### 11.2 Assign Agent

- Targets a mission/task pairing with a specific agent, respecting the agent's `runtime_status` and capability match already modeled in the read-only Agent Centre.
- Needs explicit conflict handling for an agent already assigned elsewhere or a mission already assigned to a different agent.
- Rollback: `UnassignAgent`, returning the agent to available status and the mission to unassigned.

### 11.3 Invoke Tool

- Targets a registered tool, with input validated against the tool's existing `input_schema`.
- Permission tier (safe/restricted/privileged) directly determines approval requirement, per §5.
- Rollback story depends entirely on the tool; default assumption is "not reversible" unless the specific tool defines a compensating action — this must be stated per tool, not assumed generically safe.

### 11.4 Create Conversation

- Maps to the existing `Conversation` contract (workspace/company/project/objective/mission linkage, participant_ids).
- Low risk, likely auto-approved by default policy, but still passes through the Policy Gate per §6's "always evaluate" principle.
- Rollback: conversations can likely be archived/closed rather than deleted, preserving message history; deletion is out of scope as a rollback mechanism.

### 11.5 Link Knowledge

- Creates a `ConversationKnowledgeLink` (or equivalent) between an existing knowledge asset and a conversation, thread, or message.
- Low risk; primary safeguard is validating both sides of the link already exist and are in scope for the actor.
- Rollback: `UnlinkKnowledge`, a straightforward inverse with no side effects beyond the link itself.

### 11.6 Update Project / Workspace Metadata

- Scoped narrowly to metadata fields already modeled read-only today (status, lifecycle state, knowledge boundary summary, next-action summary) — not a general-purpose entity editor.
- Should not be used as a way to introduce new fields ad hoc; new fields belong in a contract change, not a metadata-update command payload.
- Rollback: requires capturing prior field values in the audit entry so a compensating "restore previous metadata" command is possible without needing a separate version history feature.

## 12. Risks

- **Confirmation fatigue.** If every command, regardless of risk, uses the same heavyweight confirmation flow, operators will habituate to clicking through it, defeating its purpose. Severity-appropriate variation (§9) must be a real design constraint, not a footnote.
- **Policy Gate becoming a bottleneck or a rubber stamp.** If most commands default to `allow` with no real rules behind them, the Policy Gate integration (§6) provides false assurance. Policy rules for write commands need genuine review, not just wiring.
- **Audit/event growth without query tooling.** Every write action increases AuditTrail/EventStore volume; without the audit/replay viewer (backlog 3.11) shipping first, this volume becomes noise rather than insight.
- **Partial rollback coverage creating false confidence.** If some commands have rollback and others don't, and the UI doesn't clearly distinguish them, operators may assume reversibility that doesn't exist. §10 requires this to be explicit per action.
- **Persistence landing out of step with write actions.** If write actions ship before a persistence/replay decision (Beta-2 Backlog 3.3) is made, every write is lost on restart, which is misleading for any non-trivial demo or pilot use.
- **Identity/role model arriving late.** Every principle in this document assumes a resolved `actor` on every command (§4). If auth (Beta-2 Backlog 3.2) is not ready first, this entire architecture has no actor to attach to commands and cannot be implemented as specified.

## 13. Non-Goals

This document and the Beta-2 write capability work it describes explicitly do not include:

- Real Hermes-Claw tool execution against external systems — only the in-kernel `Invoke Tool` command surface is in scope here; actual execution backends remain a separate, later milestone per the Beta-2 Backlog.
- Odysseus multi-agent planning or orchestration — `Assign Agent` here is a single-agent-to-single-mission action, not a multi-agent plan executor.
- Any AI-assisted or natural-language command interpretation — Jarvis command execution (Beta-2 Backlog 3.4) is routing/execution of explicit commands, not AI-generated ones, and is out of scope for this document.
- A general-purpose entity editor or admin CRUD UI — every write action above is a narrow, purpose-built command, not a generic "edit any field" surface.
- Authentication/role implementation itself — this document assumes an actor and role model exist (Beta-2 Backlog 3.2) and only specifies how commands consume that identity, not how it is established.
- Database/persistence implementation itself — this document assumes EventStore-as-source-of-truth semantics and only specifies how writes must relate to persistence if/when it lands, not the persistence layer's own design.
- Production deployment topology — out of scope here entirely; see Beta-2 Backlog 3.12.

## 14. Implementation Phases

These phases are sequenced; later phases assume earlier ones are complete and stable. Each phase should be its own milestone with its own tests, per the Engineering Bible's standard milestone definition of done.

### Phase 0 — Prerequisites (blocking, not part of this spec's scope)

- Auth and role/permission model (Beta-2 Backlog 3.2).
- Persistence and replay decision (Beta-2 Backlog 3.3).
- Audit/replay viewer, read-only half (Beta-2 Backlog 3.11).

### Phase 1 — Command Infrastructure

- Command submission API (read-only-equivalent endpoint shape, but accepting a command payload), Policy Gate integration, and audit/event emission for submit/reject — with zero command kinds actually wired to a kernel mutation yet. This phase proves the pipeline using a no-op command kind.

### Phase 2 — Lowest-Risk Write Actions

- Create Conversation (§11.4) and Link Knowledge (§11.5), as the two lowest-risk, most reversible candidates, to validate the full command → policy → audit → UI confirmation loop end to end.

### Phase 3 — Approval-Gated Write Actions

- Create Mission (§11.1) and Assign Agent (§11.2), introducing the approval model (§5) in practice, including the `pending_approval` UI state.

### Phase 4 — Permission-Tiered Write Actions

- Invoke Tool (§11.3), exercising the full permission-tier-to-approval-requirement mapping, and the per-tool rollback-story requirement.

### Phase 5 — Metadata and Rollback Maturity

- Update Project / Workspace Metadata (§11.6), plus retrofitting rollback/compensating commands for any earlier phase that shipped without one, once real usage patterns clarify what rollback actually needs to cover.

### Phase 6 — Recovery UX

- Replay-based recovery tooling (Beta-2 Backlog 3.11, recovery half), once enough real write history exists across Phases 1–5 to make recovery scenarios concrete rather than speculative.
