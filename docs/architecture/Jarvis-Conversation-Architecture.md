# Jarvis Conversation Architecture (Beta-2)

## 1. Purpose

Defines the architecture behind Jarvis as a conversational layer, following `docs/vision/Jarvis-Nexus-Experience-Vision.md`. This document specifies how conversation works end to end — initiation, memory, evidence, approval, escalation, and lifecycle — without implementing any of it. It extends the Write Capability Architecture's Command/Approval model and the Stream D command architectures (Mission/Agent/Tool Commands) into the conversational surface introduced visually in Beta-1 Stream A (the simulated Jarvis Conversation Panel on Executive Home).

## 2. User-Initiated Conversations

Per the Experience Vision §3, the user talks to Jarvis the way they would talk to a chief of staff: questions, status requests, dashboard requests, mission creation (once write capability exists), company review, investigation, knowledge search, summaries, and recommendations.

Architecturally, a user-initiated conversation is a sequence of **turns**, where each user turn is resolved into one of three outcomes:

- **A query** — answered directly from existing read-only dashboard data (no different from what Nexus already displays, just phrased conversationally).
- **A navigation intent** — resolved into a `(page, selection)` pair and surfaced as evidence, exactly like the existing route-chip pattern already used throughout Nexus.
- **A command intent** — resolved into a draft Command (per the Write Capability Architecture's Command model), which Jarvis prepares but never executes unilaterally (see §6 Approvals).

Resolution of a user turn into one of these three outcomes is the core interpretation problem this architecture must solve. In Beta-1, this resolution is simulated via simple keyword matching (see §10). In V1, this is where real natural-language intelligence is introduced — but the three-outcome shape does not change; only the quality of resolution does.

## 3. Jarvis-Initiated Conversations

Per the Experience Vision §4, Jarvis initiates conversation for: alerts, daily briefings, mission updates, risk warnings, opportunity detection, project delays, agent/tool failures, knowledge discoveries, platform health changes, and business metrics.

Architecturally, a Jarvis-initiated conversation is triggered by a **signal**, not by a fixed schedule (except daily briefings, which are explicitly time-triggered). A signal is anything that would already appear in CommandCore's event stream or audit trail: a mission status change, a policy warning, a tool failure, a readiness degradation. The Jarvis-initiated conversation layer subscribes to the same EventBus already used throughout CommandCore — it does not introduce a parallel notification system.

Not every signal becomes a conversation. A **significance filter** sits between "an event happened" and "Jarvis says something," evaluating whether a signal is worth interrupting the user for for (see §8 Notification Rules). This filter is what separates a useful Jarvis from a noisy one, and is one of the most important pieces of this architecture to get right before any of it ships broadly.

## 4. Conversation Memory

Conversation memory has two layers, mirroring the existing Conversation/Thread/Message/Context model already in CommandCore (`docs/domain/09-Conversation.md`, already implemented read-only in the Conversation Centre):

- **Short-term (session) memory** — the current conversation's turns, held for as long as the conversation is open. This is what lets the user say "show me the second one" or "what about agent assignment" without repeating full context.
- **Long-term (persistent) memory** — every Jarvis conversation is itself a `Conversation` entity in CommandCore, with `Thread`/`Message`/`Context` records exactly like any human-to-human conversation already modeled. Jarvis does not get a separate memory store; it uses the same conversation infrastructure that already exists, which is also why the Conversation Centre is the natural place evidence and history surface (see §5).

This means a Jarvis conversation about a mission can be linked to that mission via the same `ConversationKnowledgeLink`/scope mechanisms already used for human conversations, and is just as auditable, searchable, and reviewable as any other conversation in the system. Jarvis does not get a privileged, opaque memory; it gets the same governed memory everyone else's conversations get.

## 5. Evidence Links To Nexus

Every Jarvis statement that references operational state must carry an **evidence link** — a `(page, selection)` pair the user can follow to see the underlying data in Nexus, exactly like the route-chip pattern already used throughout the product (Relationship Cards, Dependency Graph, Enterprise Explorer, the simulated Jarvis panel's briefing cards).

This is a hard requirement, not a nice-to-have: per the Experience Vision §5, Nexus is "the command centre Jarvis opens, updates, and uses to show evidence." A Jarvis statement with no evidence link is a claim with no way to verify it, which directly undermines the trust the entire conversational model depends on. If Jarvis cannot resolve a statement to a concrete evidence link, the architecture should prefer Jarvis saying less, not saying something unverifiable.

## 6. Approvals

Per the Experience Vision's Beta-2 guidance: "Jarvis can prepare commands. User approves actions." This conversation architecture does not introduce a separate approval model — it is a conversational front end onto the Approval Engine Architecture already specified.

- When a user-initiated conversation resolves to a command intent (§2), Jarvis drafts the Command and presents it in the same UI confirmation pattern already specified in the Write Capability Architecture (Initiate → Validate → Preview → Confirm → Track) — the conversational surface is simply how the user got there, not a shortcut around it.
- Jarvis never auto-confirms a command on the user's behalf, even within a fluid conversation. "Yes, do it" from the user inside a chat-like surface must still pass through the same explicit confirmation step a button-driven flow would require, because conversational tone must never be mistaken for reduced governance.
- Approval-gated commands (per the Approval Engine Architecture's tiering) surface their pending state conversationally — Jarvis can say "that's submitted for approval" — but the actual approval action is performed by an Approver role through the same Approval Engine UI, not through casual conversational confirmation.

## 7. Policy Gate

Every command intent a conversation produces passes through the Policy Gate exactly as specified in the Write Capability Architecture §6 and the Mission/Agent/Tool Command architectures. Conversation does not get a parallel or relaxed policy path.

This is explicitly called out in the Experience Vision's guardrails (§11: "Do not allow AI to bypass policy"). The risk this architecture is most directly designed against is a future version of Jarvis being fluent enough that policy evaluation feels like friction worth skipping — it is not. Conversational fluency is a UX improvement on top of governance, never a substitute for it.

## 8. Escalation

Some signals or user requests exceed what Jarvis should resolve on its own:

- A command intent that the Policy Gate evaluates as `block` is never silently dropped from the conversation — Jarvis explains why, in plain language, and where relevant routes the user to the evidence behind the policy decision.
- A signal whose significance is ambiguous (see §3) and exceeds a configurable threshold escalates to a human-reviewable queue rather than either being suppressed or auto-surfaced as a conversation — this is the same shape as the Approval Engine's escalation/expiry model, reused here for conversational significance rather than command approval.
- Repeated user frustration signals (e.g., the user rephrasing the same question multiple times, or explicitly asking for a human/administrator) should escalate the conversation out of pure Jarvis interaction and toward a more direct Nexus investigation path — Jarvis recognizing the limits of its own resolution is part of this architecture, not a failure of it.

## 9. Notification Rules

Per the Experience Vision §11 ("Do not overwhelm the user with notifications"), Jarvis-initiated conversations are governed by explicit rules, not "notify on every event":

- **Significance threshold** — a signal must cross a minimum bar (severity, blast radius via the existing Impact Analysis model, or direct relevance to something the user is currently working on) before it becomes a conversation starter.
- **Deduplication** — the same underlying issue does not generate a new conversation each time it is re-observed; it updates the existing one.
- **Batching** — multiple low-urgency signals in a short window are batched into a single briefing-style message rather than arriving as separate interruptions.
- **Quiet defaults, explicit opt-in for more** — the default notification posture is conservative; a user can ask Jarvis to be more verbose, but verbosity is never the default, because trust in Jarvis's voice depends on it being used sparingly (Experience Vision §4: "the right Jarvis speaks rarely, but every time it does, the user is glad it did").

## 10. Conversation Lifecycle

A Jarvis conversation moves through the same lifecycle states as any other CommandCore-modeled entity, kept consistent with the Recovery Architecture's framing of state as event-derived:

1. **Initiated** — either by the user (a new message) or by Jarvis (a signal crossing the notification threshold).
2. **Active** — turns are being exchanged; short-term memory (§4) is live.
3. **Awaiting input** — Jarvis has asked a clarifying question or presented a command draft and is waiting on the user.
4. **Resolved** — the conversation reached a concrete outcome: an answer was given, a command was submitted (and is now tracked through its own Command lifecycle, not the conversation's), or the user simply moved on.
5. **Archived** — the conversation persists as a `Conversation`/`Thread`/`Message` record (per §4), reviewable later exactly like any other conversation in the Conversation Centre.

A conversation does not need to reach a "decision" to be archived — most conversations (status checks, questions) resolve by simply answering the user, and that is a complete, successful lifecycle, not an incomplete one.

## 11. Beta-1 Simulation vs. Beta-2 Execution vs. V1 Real Intelligence

This is the most important section for preventing scope drift, and it should be re-read before any work on this surface begins.

### Beta-1 — Simulation

- The Jarvis Conversation Panel (Stream A) is real UI with simulated content. Briefing cards and replies are derived from real operational data (mission/agent/tool/knowledge state), but the "intelligence" resolving a typed message to a reply is simple keyword matching, clearly labeled "Conversation Simulation Mode / AI Disabled."
- No command intents are produced. There is nothing to approve, because Beta-1 has no write capability at all.
- This is intentionally a UX rehearsal: it proves the conversational shape (briefing, evidence links, suggested questions, composer) without any of the governance machinery this document specifies, because that machinery does not need to exist yet for the shape to be validated.

### Beta-2 — Execution Begins, Governed

- User-initiated conversations can now produce real command intents (§2), governed by the full Policy Gate / Approval Engine pipeline (§§6–7).
- Jarvis-initiated conversations begin operating on real signals from EventBus (§3), with real notification rules (§9) rather than a simulated significance heuristic.
- The "intelligence" resolving a user's natural-language turn into a query/navigation/command outcome may still be rule-based or lightly assisted — this document does not require full natural-language understanding to exist for Beta-2's conversational write capability to be real and governed. What matters in Beta-2 is that the governance is real, not that the language understanding is sophisticated.

### V1 — Real Intelligence

- Real natural-language understanding replaces Beta-2's rule-based resolution, but the architecture in this document — the three-outcome turn resolution (§2), the signal-and-significance model (§3, §9), the shared conversation memory (§4), mandatory evidence links (§5), and the unchanged approval/policy pipeline (§§6–7) — does not change shape. V1 makes Jarvis smarter; it does not make Jarvis ungoverned.
- Per the Experience Vision §12, this is the point where "Jarvis becomes the primary interface" — conversation is no longer a rehearsal layered over Nexus, it is how the user actually runs the organization, with Nexus as the evidence and control layer beneath it.

## 12. Risks

- Building real natural-language resolution before the governance pipeline (Policy Gate, Approval Engine) is solid risks shipping a fluent Jarvis that can talk its way around its own guardrails — this document's ordering (governance before intelligence) exists specifically to prevent that.
- A significance filter (§3, §9) that is too aggressive makes Jarvis feel passive, violating Experience Vision §11; one that is too permissive makes Jarvis noisy, violating the same guardrail from the other direction. This will need real tuning against real usage, not a one-time default.
- If conversation memory (§4) is implemented as a separate store from the existing Conversation/Thread/Message model instead of reusing it, Jarvis conversations become a second, parallel memory system — exactly the kind of fragmentation the Permissions Architecture warns against for roles, and equally risky here.
