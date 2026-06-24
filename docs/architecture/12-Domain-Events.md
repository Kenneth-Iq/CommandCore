# CommandCore Canonical Domain Events

**Status:** Canonical domain event catalogue for Sprint 1 and future implementation  
**Authority:** Derived from the locked Constitution, Master Blueprint, Canonical Domain Model, Canonical Service Architecture, and Capability Framework

## Scope

This document defines the canonical domain event catalogue for CommandCore.

It does not define implementation code, APIs, transport protocols, broker topology, database schemas, or UI behavior.

Its purpose is to provide one stable source of truth for future event publishing across the CommandCore kernel, executive layer, company worlds, mission coordination, knowledge systems, and future agent execution.

---

## 1. Purpose

The domain event catalogue exists to:

- Provide one canonical event language across CommandCore.
- Ensure producers and consumers describe domain changes consistently.
- Preserve business meaning independently from transport or storage choices.
- Support future projections, audits, summaries, workflows, and integrations without redesigning domain vocabulary.
- Keep Sprint 1 implementation simple while preserving the long-term AI Enterprise Operating System architecture.

A domain event represents a meaningful business or operational fact that already happened inside CommandCore.

A domain event is not:

- an API request name
- a UI action label
- a low-level database change signal
- an implementation-specific callback
- a transport-specific message shape

---

## 2. Event Naming Rules

Canonical event names must follow these rules:

- Use `PascalCase`.
- Start with the singular domain noun: `Executive`, `Company`, `Project`, `Task`, `Agent`, `Capability`, `Workspace`, `Knowledge`, `Conversation`, `Integration`, `Mission`, `ModelProvider`.
- End with a business-meaningful past-tense or completed-state phrase such as `Created`, `Assigned`, `Completed`, `Escalated`, `Promoted`, `Attached`, or `Verified`.
- Prefer business meaning over technical language. Use `CapabilityPromoted`, not `CapabilityRowInserted`.
- Keep the event name stable across transports and runtimes.
- Do not encode version numbers in the event name unless a breaking rename is explicitly approved.
- Use `Attached` and `Detached` for cross-entity membership or relationship changes.
- Use `Requested`, `Prepared`, `Assigned`, `Approved`, `Completed`, `Failed`, and `Blocked` for workflow transitions.

### Naming Formula

```text
<Domain><MeaningfulPastTenseOutcome>
```

Examples:

- `ProjectCreated`
- `CapabilityPromoted`
- `ExecutiveRiskEscalated`
- `MissionCompleted`
- `WorkspaceCapabilityAttached`

---

## 3. Event Categories

CommandCore domain events fall into the following canonical categories:

### 3.1 Lifecycle Events

These describe the creation, promotion, activation, pausing, retirement, archival, or completion of an entity.

Examples:

- `CompanyCreated`
- `CapabilityPromoted`
- `MissionCompleted`

### 3.2 State Change Events

These describe a meaningful change in operating state, runtime state, certification state, or health-relevant status.

Examples:

- `ProjectStatusChanged`
- `AgentRuntimeStatusChanged`
- `ModelProviderStatusChanged`

### 3.3 Relationship Events

These describe an entity being linked to or detached from another entity.

Examples:

- `CompanyCapabilityAttached`
- `WorkspaceProjectAttached`
- `ProjectAgentAttached`

### 3.4 Governance Events

These describe approval, escalation, certification, review, or executive attention decisions.

Examples:

- `ExecutiveRiskEscalated`
- `CapabilityCertified`
- `MissionApproved`

### 3.5 Knowledge and Memory Events

These describe the capture, linking, promotion, and safe-query status of memory-bearing records.

Examples:

- `KnowledgeAssetCaptured`
- `ConversationPromotedToRecord`
- `KnowledgeAssetSafeToQueryChanged`

### 3.6 Coordination and Execution Events

These describe scoped work moving through mission, task, executive, or agent coordination boundaries.

Examples:

- `ExecutiveMissionRequested`
- `TaskAssigned`
- `MissionBlocked`

---

## 4. Event Versioning Strategy

CommandCore event versioning must preserve business stability while allowing the payload to evolve.

### 4.1 Canonical Versioning Principles

- Event names should remain stable when the same business fact still exists.
- Version is metadata, not identity.
- Additive payload changes should keep the same event name and increment the event schema version when necessary.
- Breaking payload changes require an explicit version change and architecture review.
- Renaming an event should be rare and treated as a platform-level compatibility decision.

### 4.2 Recommended Version Shape

Each published event should carry:

- `event_name`
- `event_version`
- `occurred_at`
- `source`
- `payload`

### 4.3 Breaking Change Rules

A change is breaking if it:

- removes a previously documented payload field
- changes the meaning of an existing field
- changes a field type incompatibly
- changes who the event refers to without renaming the event

Breaking changes should normally result in:

1. A new event version.
2. Temporary dual-consumption support where needed.
3. An architecture note if compatibility implications are material.

---

## 5. Event Metadata Standards

Every canonical CommandCore domain event should carry the following metadata envelope.

### 5.1 Required Metadata

- `id`: globally unique event identifier
- `name`: canonical event name
- `version`: event schema version
- `type`: broad event category or classification
- `source`: publishing service, domain boundary, or subsystem
- `occurred_at`: UTC timestamp of when the business fact occurred
- `payload`: business data describing the fact

### 5.2 Recommended Metadata

- `correlation_id`: groups related events inside one mission, thread, workflow, or executive review path
- `causation_id`: points to the event that directly caused this event
- `entity_id`: primary domain object identifier, when one primary object exists
- `entity_type`: primary domain object type
- `workspace_id`: when the fact is workspace-scoped
- `company_id`: when the fact is company-scoped
- `project_id`: when the fact is project-scoped
- `actor_reference`: human, executive role, system, or agent responsible for the action

### 5.3 Payload Design Rules

- Payloads must describe business meaning, not storage details.
- Payloads should use canonical domain terms from `docs/domain/13-Ubiquitous-Language.md`.
- Payloads should prefer explicit identifiers over implied lookup assumptions.
- Payloads must not contain secrets.
- Payloads should be citation-friendly and audit-friendly.
- Payloads should be safe for future replay and projection.

---

## 6. Correlation IDs

A correlation ID groups related events that belong to one larger flow.

Examples of one correlation scope:

- one mission lifecycle
- one executive briefing request
- one conversation thread
- one capability review cycle
- one project promotion flow

### Correlation Rules

- A correlation ID should remain stable across the entire workflow it represents.
- Multiple event types may share one correlation ID.
- Correlation IDs enable audit trails, replay, summary generation, and debugging without changing event meaning.
- A correlation ID does not imply causation by itself.

Example:

- `ExecutiveMissionRequested`
- `MissionRequested`
- `MissionAssigned`
- `MissionCompleted`

All may share one `correlation_id` for the same mission flow.

---

## 7. Causation IDs

A causation ID points to the specific prior event that directly caused a new event.

### Causation Rules

- Use causation IDs when one event is the direct consequence of another event.
- Do not use causation IDs for unrelated events that merely share context.
- One event may have both a `correlation_id` and a `causation_id`.
- Causation chains should remain acyclic and traceable.

Example:

- `ExecutiveMissionRequested` causes `MissionRequested`
- `MissionRequested` causes `MissionAssigned`
- `MissionAssigned` causes `TaskAssigned`

In that chain, correlation stays shared, while causation points one step backward each time.

---

## 8. Event Lifecycle

CommandCore domain events follow this lifecycle:

1. A meaningful business fact occurs.
2. The owning domain boundary publishes the canonical event.
3. Downstream consumers react, project, summarize, or audit.
4. The event becomes part of operational history.
5. If business state changes again, a new event is published rather than mutating the old event.

### Lifecycle Rules

- Events are immutable facts.
- Corrections should be expressed through new events, not silent mutation.
- Publishers own semantic correctness.
- Consumers must tolerate out-of-band arrival or delayed processing in future asynchronous architectures.
- Event publication should happen at the domain boundary that owns the fact.

---

## 9. Event Retention Principles

CommandCore should retain domain events according to business value, audit value, and replay value.

### Retention Rules

- Lifecycle, governance, approval, escalation, mission, and certification events should be retained the longest.
- Relationship events should be retained when they explain historical state or reusable-asset lineage.
- Knowledge and conversation promotion events should be retained when they justify durable records.
- Retention policy must favor replayability, traceability, and executive review before convenience deletion.
- Retention implementation may evolve later, but the semantic importance of events must remain stable.

### Practical Principle

If an event would materially help explain:

- why a company changed state
- why a mission failed
- why a capability became trusted or retired
- why a record was promoted into durable memory
- why executive attention was assigned

then that event should be treated as retention-worthy.

---

## 10. Canonical Domain Event Catalogue

The following catalogue defines the canonical minimum event set for future event publishing.

## 10.1 Executive Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `ExecutiveBriefPrepared` | Announces that an executive summary or briefing has been prepared from structured memory. | Executive Layer | Nexus, Conversation Service, Mission Engine, audit views | Executive role, briefing scope, referenced entities, summary reference, citation count | `{ "executive_id": "jarvis", "scope": "company:mindx", "citation_count": 6 }` |
| `ExecutiveRecommendationIssued` | Captures a source-cited recommendation issued by an executive role. | Executive Layer | Nexus, Company Service, Project Service, Mission Engine, Conversation Service | Executive role, recommendation type, target entity, rationale summary, citation references | `{ "executive_id": "athena", "target_project_id": "proj-jarvis", "recommendation": "create_next_action" }` |
| `ExecutiveRiskEscalated` | Records a meaningful escalation of risk requiring executive visibility or downstream action. | Executive Layer | Nexus, Company Service, Project Service, Mission Engine | Executive role, risk level, affected entity, escalation reason, requested follow-up | `{ "executive_id": "jarvis", "entity_type": "project", "entity_id": "proj-jarvis", "risk_level": "high" }` |
| `ExecutiveMissionRequested` | Signals that executive intent has been translated into a mission request. | Executive Layer | Mission Engine, Nexus, audit views | Executive role, mission title, requested scope, target company/project, approval expectation | `{ "executive_id": "jarvis", "mission_title": "Summarize blockers", "project_id": "proj-jarvis" }` |

## 10.2 Company Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `CompanyCreated` | Announces creation or first-class recognition of a company world. | Company Service | Nexus, Executive Layer, Project Service, Knowledge Service | Company ID, name, mission, ownership, initial status | `{ "company_id": "mindx", "name": "MindX", "status": "active" }` |
| `CompanyOperatingStateChanged` | Records a meaningful change in the company’s operating condition. | Company Service | Nexus, Executive Layer, Mission Engine, Knowledge Service | Company ID, previous state, new state, reason summary, related risk or blocker refs | `{ "company_id": "mindx", "from": "steady", "to": "blocked", "reason": "payment_launch_blocker" }` |
| `CompanyCapabilityAttached` | Records that a company began consuming or formally linking to a capability. | Company Service | Capability Service, Executive Layer, Nexus, audit views | Company ID, capability ID, attachment reason, actor reference | `{ "company_id": "mindx", "capability_id": "cap-search", "reason": "operational_reuse" }` |

## 10.3 Project Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `ProjectCreated` | Announces creation of a project work container. | Project Service | Workspace Service, Company Service, Executive Layer, Knowledge Service | Project ID, name, workspace ID, optional company ID, status | `{ "project_id": "proj-jarvis", "workspace_id": "ws-local", "company_id": "mindx" }` |
| `ProjectStatusChanged` | Records a meaningful change in project status. | Project Service | Executive Layer, Nexus, Mission Engine, Knowledge Service | Project ID, prior status, new status, reason summary, actor reference | `{ "project_id": "proj-jarvis", "from": "active", "to": "blocked" }` |
| `ProjectCapabilityAttached` | Records that a project has begun consuming or referencing a capability. | Project Service | Capability Service, Executive Layer, Company Service | Project ID, capability ID, attachment reason | `{ "project_id": "proj-jarvis", "capability_id": "cap-agent-task-interface" }` |
| `ProjectAgentAttached` | Records that an agent has been coordinated into project scope. | Project Service | Agent Runtime, Mission Engine, Executive Layer | Project ID, agent ID, assignment context | `{ "project_id": "proj-jarvis", "agent_id": "agent-hermes", "context": "engineering_support" }` |

## 10.4 Task Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `TaskRequested` | Announces that a bounded execution unit has been formally requested. | Task Service or Mission Engine | Agent Runtime, Executive Layer, Project Service | Task ID, objective, project ID, capability ID, scope summary | `{ "task_id": "task-review", "objective": "Review repo", "project_id": "proj-jarvis" }` |
| `TaskAssigned` | Records assignment of a task to a human or agent. | Task Service or Mission Engine | Agent Runtime, Executive Layer, audit views | Task ID, assignee reference, assignment scope, approval status | `{ "task_id": "task-review", "assignee": "agent:odysseus", "approval_required": true }` |
| `TaskCompleted` | Records successful completion of a task with an auditable outcome. | Task Service or Agent Runtime | Project Service, Knowledge Service, Mission Engine, Executive Layer | Task ID, assignee, output summary, citation refs, completion status | `{ "task_id": "task-review", "assignee": "agent:odysseus", "output_summary": "Capability review complete" }` |
| `TaskFailed` | Records bounded task failure without hiding the failure path. | Task Service or Agent Runtime | Mission Engine, Project Service, Executive Layer, audit views | Task ID, assignee, failure reason, retryability, blocker notes | `{ "task_id": "task-review", "reason": "missing_context", "retryable": true }` |

## 10.5 Agent Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `AgentRegistered` | Announces that an agent identity has been defined inside CommandCore. | Agent Runtime or Agent Service | Executive Layer, Project Service, Capability Service | Agent ID, name, role, runtime status, permission level | `{ "agent_id": "agent-hermes", "role": "engineering", "runtime_status": "available" }` |
| `AgentRuntimeStatusChanged` | Records a meaningful change in agent availability or runtime condition. | Agent Runtime | Mission Engine, Executive Layer, Project Service | Agent ID, prior runtime status, new runtime status, reason summary | `{ "agent_id": "agent-hermes", "from": "available", "to": "busy" }` |
| `AgentCapabilityAttached` | Records that an agent can use or has been linked to a capability. | Agent Service or Capability Service | Mission Engine, Project Service, Executive Layer | Agent ID, capability ID, attachment basis | `{ "agent_id": "agent-hermes", "capability_id": "cap-search" }` |
| `AgentOutputReported` | Records that an agent produced an auditable work result. | Agent Runtime | Knowledge Service, Mission Engine, Project Service, Executive Layer | Agent ID, mission or task reference, output summary, citation refs | `{ "agent_id": "agent-hermes", "mission_id": "mission-42", "output_summary": "Implementation plan drafted" }` |

## 10.6 Capability Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `CapabilityCandidateIdentified` | Announces that a reusable skill candidate has been recognized. | Capability Service, Innovation Lab, Project Service, or Research boundary | Executive Layer, Project Service, Company Service, Knowledge Service | Candidate ID or capability ID, origin, problem solved, likely consumers | `{ "capability_id": "cap-pdf-split", "origin": "github_review", "likely_consumers": ["project", "company"] }` |
| `CapabilityPromoted` | Records that a capability candidate has been promoted into the Living Capability Library. | Capability Service | Company Service, Project Service, Agent Service, Executive Layer, Nexus | Capability ID, version, ownership, promotion basis, certification state | `{ "capability_id": "cap-search", "version": "1.0.0", "certification_status": "certified" }` |
| `CapabilityCertified` | Records a trust-state or certification milestone for a capability. | Capability Service or Capability Review boundary | Company Service, Project Service, Agent Runtime, Executive Layer | Capability ID, version, certification status, review outcome, reviewer reference | `{ "capability_id": "cap-search", "version": "1.0.0", "certification_status": "certified" }` |
| `CapabilityRetired` | Records retirement of a capability while preserving historical traceability. | Capability Service | Company Service, Project Service, Agent Runtime, Executive Layer, audit views | Capability ID, retired version, retirement reason, replacement capability if any | `{ "capability_id": "cap-legacy-export", "reason": "superseded", "replacement": "cap-json-backup" }` |

## 10.7 Workspace Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceCreated` | Announces creation or seeding of a workspace boundary. | Workspace Service | Project Service, Knowledge Service, Executive Layer, backup/export flows | Workspace ID, name, locality flags, ownership | `{ "workspace_id": "ws-local", "name": "CommandCore Local Workspace", "local_first": true }` |
| `WorkspaceProjectAttached` | Records that a project belongs to the workspace scope. | Workspace Service | Project Service, Knowledge Service, Executive Layer | Workspace ID, project ID, attachment context | `{ "workspace_id": "ws-local", "project_id": "proj-jarvis" }` |
| `WorkspaceCapabilityAttached` | Records that a capability is explicitly linked into workspace scope. | Workspace Service | Capability Service, Project Service, Executive Layer | Workspace ID, capability ID, reason summary | `{ "workspace_id": "ws-local", "capability_id": "cap-search" }` |
| `WorkspaceAgentAttached` | Records that an agent is recognized within workspace operational scope. | Workspace Service | Agent Runtime, Project Service, Executive Layer | Workspace ID, agent ID, attachment context | `{ "workspace_id": "ws-local", "agent_id": "agent-hermes" }` |

## 10.8 Knowledge Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `KnowledgeAssetCaptured` | Announces that a durable knowledge asset has been recorded or ingested. | Knowledge Service | Executive Layer, Project Service, Company Service, Conversation Service | Knowledge asset ID, title, asset type, scope refs, safe-to-query flag | `{ "knowledge_id": "know-runbook-api", "asset_type": "runbook", "project_id": "proj-jarvis" }` |
| `KnowledgeAssetLinked` | Records a meaningful relationship between a knowledge asset and another domain object. | Knowledge Service | Executive Layer, Project Service, Company Service, Capability Service | Knowledge asset ID, linked entity type, linked entity ID, link purpose | `{ "knowledge_id": "know-runbook-api", "entity_type": "capability", "entity_id": "cap-search" }` |
| `KnowledgeAssetSafeToQueryChanged` | Records a change in whether a knowledge asset is approved for retrieval by executive or agent systems. | Knowledge Service | Executive Layer, Conversation Service, Agent Runtime, audit views | Knowledge asset ID, prior safe state, new safe state, decision reason | `{ "knowledge_id": "know-legal-note", "from": false, "to": true }` |

## 10.9 Conversation Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `ConversationStarted` | Announces initiation of a bounded conversation thread. | Conversation Service | Executive Layer, Knowledge Service, Mission Engine | Conversation ID, initiator, thread purpose, optional mission or project refs | `{ "conversation_id": "conv-1", "purpose": "briefing_request", "project_id": "proj-jarvis" }` |
| `ConversationTurnRecorded` | Records a meaningful turn that should remain part of recoverable conversation context. | Conversation Service | Knowledge Service, Executive Layer, audit views | Conversation ID, turn ID, actor reference, turn type, citation count | `{ "conversation_id": "conv-1", "turn_id": "turn-2", "actor": "user", "citation_count": 0 }` |
| `ConversationPromotedToRecord` | Records that a conversational result became durable operational memory. | Conversation Service | Knowledge Service, Project Service, Task Service, Executive Layer | Conversation ID, promoted record type, promoted record ID, promotion reason | `{ "conversation_id": "conv-1", "record_type": "decision", "record_id": "dec-42" }` |

## 10.10 Integration Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `IntegrationRegistered` | Announces that an external system relationship has been defined in safe reference form. | Integration Service | Company Service, Project Service, Capability Service, Knowledge Service | Integration ID, provider type, dependency role, related scope refs | `{ "integration_id": "int-github", "provider_type": "github", "project_id": "proj-jarvis" }` |
| `IntegrationVerified` | Records that an integration reference and its operating assumptions were confirmed. | Integration Service | Company Service, Project Service, Executive Layer, audit views | Integration ID, verification summary, verifier reference, verified-at context | `{ "integration_id": "int-github", "verification_summary": "repo access confirmed" }` |
| `IntegrationRetired` | Records that an integration relationship is no longer active or trusted for use. | Integration Service | Company Service, Project Service, Capability Service, Executive Layer | Integration ID, retirement reason, replacement reference if any | `{ "integration_id": "int-legacy-mail", "reason": "provider_replaced", "replacement": "int-mailgun" }` |

## 10.11 Mission Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `MissionRequested` | Announces that scoped mission work has been formally requested. | Mission Engine | Executive Layer, Agent Runtime, Knowledge Service, audit views | Mission ID, title, requested-by, scope summary, approval requirement | `{ "mission_id": "mission-42", "title": "Summarize blockers", "approval_required": true }` |
| `MissionApproved` | Records that mission work has passed its approval boundary. | Mission Engine or Approval boundary | Executive Layer, Agent Runtime, audit views | Mission ID, approver reference, approval scope, approved-at summary | `{ "mission_id": "mission-42", "approver": "user:kenneth" }` |
| `MissionAssigned` | Records delegation of mission responsibility to a specific agent or execution actor. | Mission Engine | Agent Runtime, Executive Layer, Project Service | Mission ID, assigned actor, scope summary, assignment basis | `{ "mission_id": "mission-42", "assigned_agent_id": "agent-hermes" }` |
| `MissionBlocked` | Records that mission progress is blocked by missing context, approval, runtime state, or dependency. | Mission Engine | Executive Layer, Project Service, Company Service, audit views | Mission ID, blocker type, blocker summary, next required action | `{ "mission_id": "mission-42", "blocker_type": "missing_context", "next_action": "attach_runbook" }` |
| `MissionCompleted` | Records successful mission completion and outcome availability. | Mission Engine | Executive Layer, Knowledge Service, Project Service, Company Service | Mission ID, outcome summary, completion actor, output refs | `{ "mission_id": "mission-42", "outcome_summary": "Blocker summary delivered" }` |
| `MissionFailed` | Records unsuccessful mission termination with explicit failure reason. | Mission Engine | Executive Layer, Project Service, Company Service, audit views | Mission ID, failure reason, retryability, final status notes | `{ "mission_id": "mission-42", "reason": "provider_unavailable", "retryable": true }` |

## 10.12 Model Provider Events

| Name | Purpose | Producer | Consumers | Payload Summary | Example |
| --- | --- | --- | --- | --- | --- |
| `ModelProviderRegistered` | Announces that a model provider or runtime has been made available through the abstraction layer. | Model Service or Infrastructure boundary | Agent Runtime, Executive Layer, Capability Service | Model provider ID, name, provider class, local-first compatibility | `{ "model_provider_id": "model-ollama", "provider_class": "local_runtime", "local_first_compatible": true }` |
| `ModelProviderStatusChanged` | Records a meaningful change in model provider availability or trust for routing. | Model Service or Infrastructure boundary | Agent Runtime, Executive Layer, Mission Engine | Model provider ID, prior status, new status, reason summary | `{ "model_provider_id": "model-remote-a", "from": "active", "to": "blocked" }` |
| `ModelProviderCapabilitiesDeclared` | Records the set of capabilities or workloads a model provider can support. | Model Service | Agent Runtime, Capability Service, Executive Layer | Model provider ID, supported capabilities, routing notes, fallback flag | `{ "model_provider_id": "model-ollama", "capabilities_supported": ["summarization", "drafting"] }` |

---

## 11. Producer Ownership Rules

The following ownership rules apply across the catalogue:

- The domain boundary that owns the business fact should publish the event.
- Read-model or projection layers should not publish replacement versions of the same fact.
- Executive-facing composition layers such as Nexus may publish their own executive-surface events, but not counterfeit lower-domain ownership events.
- When one workflow crosses multiple domains, each domain should publish its own fact at its own boundary.

Example:

- Executive Layer publishes `ExecutiveMissionRequested`.
- Mission Engine publishes `MissionRequested`.
- Agent Runtime publishes `AgentOutputReported`.
- Knowledge Service publishes `KnowledgeAssetCaptured` if the output becomes durable memory.

---

## 12. Consumer Expectations

Consumers of canonical domain events should follow these rules:

- Treat events as immutable facts.
- Do not assume in-process delivery forever.
- Do not depend on undocumented payload fields.
- Preserve event IDs, correlation IDs, and causation IDs when relaying or projecting.
- Prefer graceful tolerance of additional fields in future versions.
- Keep derived summaries and projections clearly downstream from the canonical event stream.

---

## 13. Final Rules

- This document is the source of truth for future CommandCore event publishing.
- New event names should be added here before broad adoption.
- Event payload changes with compatibility implications should be reviewed architecturally.
- Domain events must stay implementation-neutral and business-meaningful.
- No event definition in this catalogue implies that the corresponding transport, broker, API, or automation already exists in Sprint 1.
