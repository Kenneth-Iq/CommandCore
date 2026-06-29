# Hermes Scope Decision

## 1. Purpose

Sprint 10 planning (`docs/roadmap/Sprint-10-Implementation-Plan.md` §7) surfaced that two unrelated things in this repository are both called "Hermes" and risk being conflated. This document resolves that ambiguity with an explicit naming and scope decision so future work — and future readers — don't have to re-derive it.

## 2. What Hermes-Claw Means In CommandCore

**Hermes-Claw is CommandCore's tool-execution and action gateway layer.** It is the future real execution backend behind Nexus's `InvokeTool` command surface, referenced today in `docs/architecture/Tool-Commands-Architecture.md` and `docs/architecture/Write-Capability-Architecture.md` as explicitly out of scope for those documents ("a separate, later milestone"). It is in-product, CommandCore-native, and governed by the same Approval Engine, Policy Gate, and audit trail as every other write path in CommandCore.

In the frontend, Hermes-Claw is what `apps/nexus-console/src/hermesBridge.ts` and the `HermesPreview` page simulate today: Mission, Execution, Tool, Policy, and Approval queues, an "Execution Preview" detail view, and a permanent "Execution Disabled / Preview Mode" label. No execution path exists anywhere in the code. This is correct and does not change as a result of this document.

## 3. What docs/architecture/hermes/ Represents

`docs/architecture/hermes/01-System-Overview.md` through `10-Recommendations.md` is an architecture review of a **separate, external codebase** — a mature, self-improving AI agent runtime and multi-interface execution engine, reviewed from a source repository at `agent-engines/hermes` (outside this repo's `apps/`/`core/` tree). The review evaluates this external runtime as a *candidate* `AgentEngine` implementation that could sit underneath CommandCore's future agent interface, providing reusable execution, tool, session, gateway, memory, and skill capabilities.

This review's own recommendations are explicit and already correct: CommandCore remains the system architecture; the external runtime is a candidate engine, not a replacement; no integration should happen until CommandCore defines its own `AgentEngine` contract; and a `HermesEngineAdapter` should be added "only after the contract is defined." Nothing in this decision document changes those recommendations — it only names the thing precisely so it stops sharing a name with Hermes-Claw.

**Going forward, this external candidate is called the Hermes Agent Runtime Candidate.** The directory `docs/architecture/hermes/` is not renamed by this decision (see §6) but should be understood as describing the Hermes Agent Runtime Candidate, not Hermes-Claw.

## 4. Relationship Between The Two

**Decision: keep them separate for now.**

This is a deliberate "separate now, not yet evaluated for merging" position, not a claim that they are permanently unrelated:

- **Not the same initiative today.** Hermes-Claw is a CommandCore-native architectural concept with no implementation and no chosen execution backend. The Hermes Agent Runtime Candidate is a specific external codebase under evaluation as one possible engine. Treating them as already-identical would either overstate how settled Hermes-Claw's design is, or overstate how adopted the external runtime is — neither is true.
- **Not necessarily separate forever.** It is plausible that the Hermes Agent Runtime Candidate, once reviewed and adapted behind a `HermesEngineAdapter`, becomes part of what eventually executes Hermes-Claw's tool/action requests. That would make them nested, not identical: Hermes-Claw is the CommandCore-facing governance and gateway layer; the Agent Runtime Candidate would be (if adopted) one possible engine running underneath it, alongside whatever `AgentEngine` contract CommandCore defines.
- **No premature merge.** Until CommandCore's `AgentEngine` contract exists and an explicit adoption decision is made (§6), these stay two separate concerns in conversation, in documentation, and in code. A future decision may formally connect them; this document does not make that connection now.

## 5. Naming Going Forward

| Term | Meaning |
| --- | --- |
| **Hermes-Claw** | CommandCore's tool-execution and action gateway layer — governed, in-kernel, audited. The thing `HermesPreview` previews. |
| **Hermes Agent Runtime Candidate** | The external agent-runtime architecture reviewed under `docs/architecture/hermes/`. A candidate engine, not yet adopted. |

No existing files are renamed by this decision. `docs/architecture/hermes/` keeps its current path and filenames; this document is the cross-reference that disambiguates it going forward, per the explicit instruction not to rename yet. Any new document, code comment, or conversation referencing either concept should use the full disambiguated name ("Hermes-Claw" or "Hermes Agent Runtime Candidate") rather than the bare word "Hermes."

## 6. How Nexus HermesPreview Should Refer To Hermes Going Forward

`HermesPreview` previews **Hermes-Claw only**. Its copy, labels, and code comments should say "Hermes-Claw" (or simply describe the tool-execution/action-gateway preview) rather than the unqualified "Hermes" — the current page title ("Hermes Mission Centre Preview") and panel labels are close enough that no functional change is required, but any future copy edit should make the Hermes-Claw scoping explicit rather than implicit.

`HermesPreview` must not be read, demoed, or documented as evidence that the Hermes Agent Runtime Candidate has been adopted. Sprint 10 continues treating `HermesPreview` strictly as a preview of Hermes-Claw — a CommandCore-native concept with no chosen execution engine — not as proof that the external runtime sits behind anything yet, because it doesn't.

## 7. How Jarvis Should Treat Hermes In Conversation And Evidence

- When Jarvis's conversation pipeline (`conversationOrchestrator.ts`) or any future real conversation engine references tool execution, it should resolve to **Hermes-Claw**, never to the Hermes Agent Runtime Candidate — Jarvis has no awareness of, and no evidence to point at, an engine that has not been adopted.
- Any Jarvis statement implying a tool action would execute (per `Jarvis-Conversation-Architecture.md` §6-§7's Approval/Policy Gate model, and this repo's `ApprovalPlaceholder` simulation) should describe that action as going through Hermes-Claw's governed gateway, not name a specific backing engine. The backing engine is an implementation detail Jarvis should never need to surface, exactly as CommandCore's kernel is already invisible to the user per the Experience Vision.
- Evidence links (`Conversation-Evidence.md`) tied to Hermes-Claw previews should continue resolving to real Nexus records (the tool, the mission, the queue item) — never to the Hermes Agent Runtime Candidate's review documents. Those documents are architecture planning material, not operational evidence.

## 8. What Should Not Be Built Yet

- No `AgentEngine` interface, no `HermesEngineAdapter`, and no integration code connecting CommandCore to the Hermes Agent Runtime Candidate's internals. The Candidate's own review (`10-Recommendations.md`, "Sprint 1 Fit" module) already recommends deferring this until CommandCore's own contracts are written; this document reaffirms that, it does not accelerate it.
- No real Hermes-Claw execution. `HermesPreview`'s "Execute (Disabled)" stays disabled; no partial-execution mode, no "preview that actually calls something," regardless of which engine concept is under discussion.
- No renaming of `docs/architecture/hermes/` or any file inside it, per the explicit instruction for this sprint. A rename, if ever warranted, is a separate, deliberate follow-up — not a side effect of this clarification.
- No adoption decision for the Hermes Agent Runtime Candidate. Adoption requires its own explicit decision (a future document, analogous to this one, that says so directly) — silence, reuse in a diagram, or casual reference is not adoption.

## 9. Recommendation For Sprint 10

Keep Hermes-Claw and the Hermes Agent Runtime Candidate separate, per §4. Concretely for the remainder of Sprint 10:

1. Treat this document as the disambiguating cross-reference requested by Sprint 10 planning — no further naming work is needed this sprint.
2. Continue all `HermesPreview`/`hermesBridge.ts` work strictly as a Hermes-Claw preview (§6); do not let the existence of the Agent Runtime Candidate review change anything about how that preview is built, labeled, or demoed.
3. Do not begin `AgentEngine` contract design or any Hermes Agent Runtime Candidate evaluation work as part of Sprint 10 — that remains future, separately-scoped work per §8.
4. When `docs/roadmap/Version-1.0-Master-Checklist.md`'s Hermes row is next updated, reference both concepts by their disambiguated names from §5, so the checklist itself doesn't reintroduce the ambiguity this document just resolved.

## 10. Architecture Rules Reaffirmed

- Jarvis remains the conversational primary interface; Hermes (either concept) is never something the user addresses directly.
- Nexus remains the visual evidence layer; `HermesPreview` is evidence/preview, not a write path, and does not become one as a side effect of this decision.
- CommandCore remains the governed kernel; Hermes-Claw is a layer underneath that governance, not a way around it.
- Hermes-Claw must not bypass governance, approval, audit, or evidence rules — any future real implementation goes through the same Approval Engine and Policy Gate as every other CommandCore write path, with no special-cased shortcut for tool execution.
- The Hermes Agent Runtime Candidate must not be treated as adopted until an explicit adoption decision exists, per §8. This document is not that decision.

## 11. Cross-References

- `docs/roadmap/Sprint-10-Implementation-Plan.md` §7 — where this ambiguity was first surfaced.
- `docs/architecture/hermes/01-System-Overview.md` through `10-Recommendations.md` — the Hermes Agent Runtime Candidate review.
- `docs/architecture/Tool-Commands-Architecture.md`, `docs/architecture/Write-Capability-Architecture.md` — the existing Hermes-Claw references this document disambiguates against.
- `docs/architecture/Jarvis-Conversation-Architecture.md` §6-§7 — the Approval/Policy Gate model Hermes-Claw must stay inside of.
- `docs/architecture/Conversation-Evidence.md` — the evidence rules §7 applies.
- `docs/roadmap/Version-1.0-Master-Checklist.md` — the Hermes row this decision's naming should propagate into.
