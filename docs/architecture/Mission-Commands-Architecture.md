# Mission Commands Architecture (Beta-2)

## 1. Purpose

Defines the command surface for mutating mission state from Nexus: creating missions, and the lifecycle actions that follow (cancel, reassign-trigger). This specializes the general Command model defined in the Write Capability Architecture document for the Mission entity specifically.

## 2. Current State (Beta-1)

Missions are fully read-only in Nexus: Mission Centre shows status breakdown, timeline, active/completed/failed sections, agent assignment history, and outcomes, all sourced from the existing `/dashboard/missions` payload. There is no creation, cancellation, or editing path anywhere in the product.

## 3. Proposed Command Set

- **CreateMission** — payload mirrors the existing `Mission` contract: `title`, `scope`, `capability_ids`, `required_output`, `approval_required`. Does not introduce new fields; if a field is missing from the contract, the contract changes first, the command payload follows.
- **CancelMission** — valid only while a mission is in a non-terminal state (`requested` / `approved` / `assigned` / `blocked`); has no effect on `completed` or `failed` missions. This is the rollback/compensating action for `CreateMission` referenced in the Write Capability Architecture.
- **RequestMissionReview** — a lighter-weight command that flags a mission for human review without changing its status, useful for blocked missions that need attention before a heavier action is taken.

`AssignAgent` is intentionally specified in the separate Agent Commands Architecture document, since it is symmetric between Mission and Agent and conceptually belongs to both — that document is the source of truth for its schema.

## 4. Validation and Policy

- `CreateMission` passes through the Policy Gate exactly as `submit_objective`-derived mission requests already do today in the Executive Orchestrator — this command surface should reuse that existing policy evaluation path, not create a second one.
- `capability_ids` on the payload must reference capabilities that exist in the Capability Registry; unknown capability ids are a validation failure, not a policy warning.
- `approval_required` on the payload defaults to `true` unless the actor's role and the Policy Gate's evaluation both agree it can be `false`.

## 5. UI Surface

- A "Create Mission" affordance appears on Mission Centre, following the five-step UI confirmation pattern (Initiate → Validate → Preview → Confirm → Track) from the Write Capability Architecture.
- The preview step reuses `RecordDetailPanel`'s visual language to show what the mission will look like before submission, including resolved capability names and scope chips.
- `CancelMission` appears as a contextual action only on non-terminal mission detail views, not as a global action.

## 6. Dependencies

- Depends on: Authentication Architecture, Permissions Architecture, Write API Architecture, Approval Engine Architecture (for `approval_required` missions).
- Related: Agent Commands Architecture (for assignment), Workflow Engine Architecture (if mission task graphs/orchestration land in the same era).

## 7. Risks

- If `CreateMission` ships before the Workflow Engine, missions created this way will look identical to seeded/live missions but have no task graph behind them — this gap must be visible in the UI, not hidden.
- Cancellation semantics must be unambiguous about what happens to in-flight agent executions tied to a cancelled mission; this needs to be defined jointly with Agent Commands, not assumed.
