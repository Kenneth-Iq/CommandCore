# Jarvis / Nexus Experience Vision

## Purpose

This document defines the intended user experience for Jarvis, Nexus, CommandCore, the planets, and the executive operating model. It exists to prevent architecture drift: every future build decision across Beta-1, Beta-2, and beyond should be checked against this document before it ships.

This is not an implementation plan. It does not specify files, schemas, endpoints, or milestones. It is the north-star experience document — the thing every roadmap, backlog, and architecture spec should ultimately serve.

## 1. Core Vision

- **Jarvis** is the main conversational intelligence. Jarvis is who the user talks to.
- **Nexus** is the headquarters / operating environment. Nexus is where the user works, and where Jarvis shows its work.
- **CommandCore** is the governed kernel. CommandCore is what actually runs the organization underneath both of them.

The user experiences the system through **conversation first, visual command centre second**. A user should be able to run their entire operation by talking to Jarvis. Nexus exists to make that conversation richer, more evidenced, and more reviewable — not to replace it.

If a user ever feels like they are "using a dashboard" rather than "running an organization with the help of an intelligent chief of staff," the experience has drifted from this vision.

## 2. Conversational Principle

Jarvis must be conversational by default.

- The user can talk to Jarvis naturally, in plain language, without needing to know command syntax, page names, or where something lives in Nexus.
- Jarvis responds naturally, in the voice of a capable chief of staff — informative, concise, and oriented toward what the user should know or decide next.
- Jarvis can also **initiate** conversations with the user when something important happens across the platform. Jarvis is not a search box that waits to be queried. Jarvis is a presence that watches the organization and speaks up when it matters.

Examples of Jarvis-initiated conversation:

- "You have three missions that need attention."
- "MindX has new learner activity worth reviewing."
- "A tool execution failed and I've prepared the summary."
- "Your server health dropped below normal."
- "I found a possible opportunity in the Education planet."

Every one of these examples shares a shape: a plain-language observation, scoped to what the user actually needs to know, with an implicit or explicit next step. Jarvis should never say "Event `ToolInvocationFailed` was published" — Jarvis says "A tool execution failed and I've prepared the summary," because that is what a chief of staff would say to their executive.

## 3. User-Initiated Conversations

The user talks to Jarvis the way they would talk to a sharp, well-informed chief of staff who has read everything and forgotten nothing. This includes, at minimum:

- **Ask questions** — "How is the Alpha-5 mission going?" "Why did that tool fail?"
- **Request status** — "What needs my attention today?" "Is anything blocked?"
- **Open dashboards** — "Show me the Mission Centre." "Pull up the Education planet."
- **Create missions** (later, once write capability exists) — "Start a mission to review the connector recovery."
- **Review companies** — "How is MindX doing this quarter?"
- **Investigate issues** — "What's going on with the Knowledge Search tool?"
- **Search knowledge** — "Do we have anything on the launch runbook?"
- **Ask for summaries** — "Summarize what changed since yesterday."
- **Ask for recommendations** — "What should I focus on this week?"

The user should never need to know which centre, which agent, or which entity a question maps to. Resolving "what the user actually means" onto the right CommandCore entities and Nexus surfaces is Jarvis's job, not the user's.

## 4. Jarvis-Initiated Conversations

Jarvis starts conversations when something is worth a chief of staff walking into the room unprompted. Categories include:

- **Alerts** — something is wrong and needs attention now.
- **Daily briefings** — a structured "here's where things stand" at the start of a working day.
- **Mission updates** — meaningful progress, completion, or stalling on something the user cares about.
- **Risk warnings** — a policy concern, a governance flag, a trend heading the wrong way.
- **Opportunity detection** — something favorable that the user would want to act on if they knew about it.
- **Project delays** — a project or initiative falling behind its expected pace.
- **Agent/tool failures** — runtime problems in the operating layer.
- **Knowledge discoveries** — a new or newly-linked piece of knowledge relevant to something in progress.
- **Platform health changes** — kernel, readiness, or infrastructure shifts.
- **Business metrics** — a number that moved enough to matter.

Jarvis-initiated conversation is the clearest signal of whether this vision is being honored. A Jarvis that only answers when spoken to is a search box wearing a costume. A Jarvis that interrupts constantly is noise. The right Jarvis speaks rarely, but every time it does, the user is glad it did (see §11 Guardrails on notification overload).

## 5. Nexus Role

Nexus is not the main character.

Nexus is the command centre Jarvis opens, updates, and uses to show evidence. When Jarvis says "you have three missions that need attention," the natural next step is Jarvis surfacing the Mission Centre, already filtered to those three missions, with the relevant relationship cards and context already in view. Nexus is the *proof* behind what Jarvis says, and the *workspace* the user drops into when they want to go deeper than conversation alone.

Nexus should feel like headquarters — a real operating environment for a real organization — not an admin dashboard bolted onto a database. Every panel, every page, every piece of navigation in Nexus exists to answer an operating question a chief of staff's evidence would need to answer, not because the underlying data happened to be queryable.

## 6. CommandCore Role

CommandCore owns the governed runtime substrate beneath both Jarvis and Nexus:

- events
- missions
- policies
- audit
- tools
- agents
- conversations
- knowledge links
- runtime state

CommandCore is invisible to the user unless they are debugging or reviewing architecture. A user running their organization through Jarvis and Nexus should never need to know CommandCore exists, the same way a CEO doesn't need to know their company's accounting system's internal table schema. CommandCore earns its place by being the thing that makes Jarvis trustworthy and Nexus accurate — governed, auditable, replayable — not by being something the user interacts with directly.

If a feature requires the user to understand CommandCore's internals to use Nexus or talk to Jarvis, that feature has leaked the wrong layer to the user.

## 7. Planets and Worlds

The platform's structure, from largest to smallest:

- **Galaxy** — the full platform ecosystem. Everything the organization runs, across every domain.
- **Planet** — a strategic domain or business world (e.g., Enterprise, Education, Safety). A planet is a coherent area of the organization's life, not a folder.
- **Company** — an operating, legal, or business entity inside a planet.
- **Workspace** — an operational area within a company.
- **Project** — an initiative within a workspace.
- **Mission** — an executable objective within a project.
- **Agent** — an actor that does work.
- **Tool** — a capability or action an agent can use.
- **Knowledge** — memory and context, linked across missions, conversations, and projects.
- **Conversation** — a human/Jarvis dialogue, the connective tissue that ties intent to execution.

Example planets:

- Enterprise
- Education
- Safety
- Adventure
- Commerce
- Health
- Infrastructure

This hierarchy is the same shape already implemented as the Enterprise World Model in Nexus (Portfolio → Company → Workspace → Project → {Mission, Conversation, Knowledge, Agent, Tool}), with "Galaxy" and "Planet" sitting above today's "Portfolio" as the next layers of scale. Planets are not a skin on top of the existing portfolio explorer — they are what the portfolio explorer becomes once an organization runs more than one strategic domain.

## 8. Executive Cabinet

The executive model surrounding Jarvis:

- **Jarvis** — Chief Executive Intelligence / executive chief of staff. The primary conversational layer and the user's main point of contact.
- **CTO** — technology and architecture.
- **COO** — operations and execution.
- **CKO** — knowledge and memory.
- **CPO** — planning and strategy.
- **CRO** — risk, validation, governance.
- **CFO** — finance.
- **CMO** — marketing and growth.
- **CLO** — legal and compliance.

These roles can become agents, dashboards, or future personas — a CRO persona might one day be the voice behind risk warnings, a CFO persona behind business-metric conversations. But none of them should distract from Jarvis as the primary conversation layer. The user has one chief of staff, not a committee. If the cabinet ever becomes eight personas the user has to remember to talk to individually, the model has failed; the cabinet exists to give Jarvis depth and specialized judgment, not to fragment the user's attention.

## 9. Daily Experience

A normal day, end to end:

1. Jarvis greets the user with a briefing — what changed overnight, what needs attention, what's on track.
2. The user asks follow-up questions in plain language.
3. Jarvis opens the relevant Nexus panels as evidence, already scoped to what's being discussed.
4. Jarvis highlights missions, risks, and opportunities the user should know about, even ones not asked about.
5. The user approves or defers decisions (once write capability exists in Beta-2+) directly through the conversation.
6. Jarvis keeps watching in the background after the conversation ends.
7. Jarvis initiates new conversations only when something meaningful happens — not on a fixed schedule, not for every event, only when a chief of staff would actually walk over and say something.

This loop — briefing, conversation, evidence, decision, ongoing watch, selective interruption — is the experience every feature should be evaluated against.

## 10. Interaction Modes

- **Conversation Mode** — the default. The user is talking to Jarvis; Nexus is in the background or providing supporting evidence.
- **Command Mode** — the user is directing a specific, deterministic action or routing request (today's Jarvis Command Bar: routing and search, not AI interpretation).
- **Briefing Mode** — Jarvis is presenting a structured summary of state (daily briefing, status report) rather than responding to a specific question.
- **Investigation Mode** — the user is digging into a specific problem, following relationship chains, dependencies, and evidence across Nexus, with Jarvis assisting.
- **Mission Mode** — focus narrows to a specific mission's lifecycle: progress, blockers, outcomes, related agents and tools.
- **Planet Mode** — focus widens to a strategic domain: cross-company, cross-workspace view of one world.
- **Review Mode** — the user is examining what happened (audit, replay, outcomes) rather than what is happening now.

Every Nexus page and every Jarvis interaction should be legible as one of these modes. A feature that doesn't clearly belong to a mode is a sign of drift.

## 11. Guardrails

- Do not build dashboards for their own sake. Every panel must answer an operating question, not just display data because it exists.
- Do not let CommandCore become the main character. If a feature surfaces kernel internals to the user as a primary interaction, it has gone wrong.
- Do not add planets as decorative navigation only. A planet must be a real, navigable business world with real depth underneath it, not a label.
- Do not make Jarvis passive. A Jarvis that never initiates conversation has failed §2 and §4 of this document.
- Do not allow AI to bypass policy. Every write action, every command, every approval — governed exactly as specified in the Write Capability Architecture and its companion Stream D documents. Conversational fluency is never a reason to skip the Policy Gate.
- Do not overwhelm the user with notifications. Jarvis-initiated conversation is precious specifically because it is rare and earned; flooding the user with alerts destroys the trust that makes Jarvis worth listening to.
- Every feature must strengthen the feeling of running an intelligent organization. If a proposed feature doesn't make the user feel more in command, more informed, or more confident, it does not belong in this product, regardless of how technically interesting it is.

## 12. Version Guidance

**Beta-1**

- Nexus is mostly read-only.
- The Jarvis Command Bar is routing/search only — deterministic, not conversational.
- Conversation is conceptual: the Conversation Centre exists as a read-only surface, and the Jarvis Future Integration placeholder explicitly reserves this space without simulating it.

**Beta-2**

- Safe write actions begin, governed by the Command/Approval architecture already specified.
- Jarvis can prepare commands — drafting what it would do — but does not execute unilaterally.
- The user approves actions before they take effect. This is the bridge between today's read-only console and tomorrow's conversational chief of staff: Jarvis starts proposing, the user stays the decision-maker.

**Version 1**

- Jarvis becomes the primary interface. Conversation is no longer conceptual — it is how the user runs the organization day to day.
- Nexus becomes the visual evidence and control layer beneath that conversation, exactly as described in §5.
- Planets become navigable business worlds, with real companies, workspaces, projects, and missions underneath them, fulfilling §7's full hierarchy rather than the current single-portfolio implementation.

Every milestone between now and Version 1 should be measured against whether it moves the product toward this experience, or merely adds a feature in isolation. When in doubt, re-read §1.
