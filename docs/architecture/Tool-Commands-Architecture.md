# Tool Commands Architecture (Beta-2)

## 1. Purpose

Defines the command surface for invoking registered tools from Nexus. Specializes the general Command model from the Write Capability Architecture for the Tool entity, and is the Nexus-facing half of what eventually connects to real Hermes-Claw execution (out of scope here — see Non-Goals).

## 2. Current State (Beta-1)

Tool Centre is read-only: tool registry, permission/status breakdown, and active/completed/failed invocation sections all come from `/dashboard/tools`. No invocation can be triggered from the UI; invocation records currently visible are seeded/simulated, not operator-initiated.

## 3. Proposed Command Set

- **InvokeTool** — the only command in this surface. Payload is `tool_id` plus an `input_payload` validated against that tool's existing `input_schema`. There is no separate "queue" vs. "execute now" command; queuing, if needed, is an execution-engine concern (see Workflow Engine Architecture), not a Nexus command concept.
- **CancelInvocation** — valid only while an invocation is `pending` or `running`; this is the compensating action, but it is explicitly not guaranteed to be effective for tools whose execution backend cannot be interrupted once started. The command always attempts cancellation and records the outcome; it never silently no-ops.

## 4. Validation and Policy

- Permission tier (safe / restricted / privileged) directly drives approval requirement, per the Approval Engine Architecture: safe tools may auto-approve under default policy; restricted and privileged tools require explicit approval before execution begins, not after.
- `input_payload` must validate against the tool's `input_schema` client-side and server-side identically — Nexus must not accept a payload the kernel would reject, and the kernel must not trust Nexus's client-side validation as sufficient.
- A tool with `status` other than `registered` (e.g., deprecated) should reject `InvokeTool` at validation time, not at execution time.

## 5. UI Surface

- "Invoke Tool" is a contextual action on a tool's detail view, opening a form generated from the tool's `input_schema` rather than a hand-rolled form per tool.
- The preview step shows the resolved input payload, the tool's permission tier, and whether approval will be required, before the operator confirms.
- Invocation tracking reuses the existing active/completed/failed invocation sections in Tool Centre — an operator-initiated invocation should appear there identically to a seeded one, distinguished only by an "initiated by" field in its detail view.

## 6. Dependencies

- Depends on: Authentication Architecture, Permissions Architecture, Write API Architecture, Approval Engine Architecture.
- Related: Workflow Engine Architecture (for any tool invocation that is part of a larger orchestrated plan rather than a single ad hoc action).

## 7. Non-Goals

- This document does not specify real Hermes-Claw execution against external systems. `InvokeTool` as specified here defines the in-kernel command and audit surface only; what actually happens when a privileged tool executes against a live external system is a separate, later architecture decision.

## 8. Risks

- Tools with no realistic cancellation or rollback story (most external-system tools) must say so explicitly in their own registry metadata, or operators will assume reversibility that does not exist.
- A generic input-schema-driven form may produce a poor experience for tools with complex nested schemas; this is an acceptable starting tradeoff, not a long-term plan, and should be revisited once real tool schemas exist.
