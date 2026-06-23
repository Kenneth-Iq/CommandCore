# CommandCore Canonical Service Architecture

**Status:** Canonical service-boundary definition for Sprint 1 and future implementation  
**Authority:** Derived from the locked Constitution, Master Blueprint, MVP PRD, and Canonical Domain Model

## Scope

This document defines conceptual service boundaries for CommandCore.

It does not define implementation code, APIs, transport protocols, or database schemas.

Its purpose is to establish stable service responsibilities, dependency rules, and communication principles so Sprint 1 can remain practical while preserving the long-term AI Enterprise Operating System architecture.

---

## 1. Core Services

### 1.1 Nexus

**Purpose**

The Nexus is the executive headquarters of CommandCore and the top-level operating surface for cross-company awareness, executive visibility, and operational navigation.

**Responsibilities**

- Present the first operational form of executive headquarters.
- Aggregate executive, company, project, capability, knowledge, and infrastructure views.
- Surface attention areas such as blockers, missing next actions, capability candidates, and infrastructure health.
- Act as the composition surface for Morning Brief and Company Universe Map concepts.

**Ownership**

Owned by CommandCore architecture as the headquarters layer above company and project operations.

**Dependencies**

- Executive Layer
- Company Service
- Project Service
- Capability Service
- Knowledge Service
- Integration Service
- Infrastructure Service

**Public Interfaces (conceptual only)**

- Executive briefing request
- Company universe view request
- Operational attention query
- Capability landscape view
- Infrastructure health view

**Internal Responsibilities**

- Compose cross-service read models
- Route executive-facing commands to owning services
- Maintain headquarters-level navigation and summarization boundaries
- Avoid owning underlying company, project, or capability logic

**Events Published**

- `NexusBriefRequested`
- `NexusViewOpened`
- `NexusAttentionRequested`

**Events Consumed**

- Executive summary and escalation events
- Company health and activity events
- Project status and blocker events
- Capability review and lifecycle events
- Knowledge indexing and retrieval events
- Infrastructure health events

**Security Boundaries**

- May expose broad read access to executive-approved information.
- Must not bypass underlying service ownership rules.
- Must not expose secrets or raw secret-bearing integrations.

**Scaling Considerations**

- Read-heavy composition surface
- Should tolerate asynchronous updates from lower services
- Future need for cached summary projections and briefing materialization

**Future Evolution**

- First-class Morning Brief
- Executive Board views
- Universe map projections
- Cross-company comparative analytics

### 1.2 Executive Layer

**Purpose**

The Executive Layer is the senior intelligence and coordination service boundary for Jarvis and the executive roles.

**Responsibilities**

- Govern executive reasoning, review, delegation, and escalation.
- Coordinate Jarvis, Hermes, Odysseus, Athena, and future reserved executive roles.
- Turn structured memory into executive recommendations.
- Route work to Mission Engine, humans, or future agents.

**Ownership**

Owned by CommandCore architecture as the command and governance layer for executive intelligence.

**Dependencies**

- Knowledge Service
- Company Service
- Project Service
- Capability Service
- Mission Engine
- Infrastructure Service

**Public Interfaces (conceptual only)**

- Executive briefing request
- Executive recommendation request
- Risk escalation request
- Executive mission creation request
- Executive review request

**Internal Responsibilities**

- Apply executive policies and decision rules
- Coordinate role-specific reasoning responsibilities
- Enforce source-cited output expectations
- Distinguish recommendation from execution

**Events Published**

- `ExecutiveBriefPrepared`
- `ExecutiveRiskEscalated`
- `ExecutiveMissionRequested`
- `ExecutiveRecommendationIssued`
- `ExecutiveAttentionAssigned`

**Events Consumed**

- Company state and health events
- Project blocker and next-action events
- Capability review events
- Knowledge retrieval completion events
- Infrastructure alert events
- Mission outcome events

**Security Boundaries**

- Holds broad executive visibility but not unrestricted write authority over all domains.
- Must operate only on safe memory and source-cited records.
- Must preserve the no-secret rule for executive intelligence.

**Scaling Considerations**

- Coordination-heavy rather than record-heavy
- Future need for multiple executive roles operating concurrently
- Summary generation may require asynchronous processing and materialized executive views

**Future Evolution**

- Role-specialized executive workflows
- Executive policy packs
- Structured approval routing
- Executive memory management with Oracle-aligned functions

### 1.3 Mission Engine

**Purpose**

The Mission Engine is the coordination boundary that turns executive or operational intent into scoped work for humans and future agents.

**Responsibilities**

- Represent mission-level work coordination.
- Translate approved intent into scoped tasks or execution contracts.
- Coordinate approval gates, scope boundaries, and required context.
- Track mission state from request through outcome.

**Ownership**

Owned by CommandCore architecture as the work-orchestration boundary between executive intent and execution actors.

**Dependencies**

- Executive Layer
- Company Service
- Project Service
- Capability Service
- Knowledge Service
- Agent Runtime

**Public Interfaces (conceptual only)**

- Mission creation request
- Mission assignment request
- Mission status query
- Mission approval request
- Mission completion report

**Internal Responsibilities**

- Maintain mission scope and allowed-context boundaries
- Package work for human or agent execution
- Enforce forbidden-action and approval rules
- Track mission lifecycle and outcomes

**Events Published**

- `MissionRequested`
- `MissionApproved`
- `MissionAssigned`
- `MissionBlocked`
- `MissionCompleted`
- `MissionFailed`

**Events Consumed**

- Executive mission requests
- Project work requests
- Capability execution requests
- Agent outcome events
- Approval decisions

**Security Boundaries**

- Must enforce scope, permissions, and forbidden actions before delegation.
- Must not delegate secret access outside approved vault-reference flows.
- Must preserve auditability for every mission transition.

**Scaling Considerations**

- Naturally asynchronous coordination boundary
- Future need for queueing, retries, and long-running mission tracking
- Should remain runtime-neutral as agent volume grows

**Future Evolution**

- First-class work contracts
- Multi-agent mission decomposition
- Human-agent hybrid execution
- Structured rollback and recovery handling

### 1.4 Company Service

**Purpose**

The Company Service owns company worlds as first-class operational entities.

**Responsibilities**

- Maintain company identity, mission, structure, and operating state.
- Represent divisions, departments, teams, and company-level health in future architecture.
- Track company capability usage, risks, decisions, and activity context.
- Provide the authoritative company-world boundary below Nexus and Executive Layer.

**Ownership**

Owned by the Company domain.

**Dependencies**

- Knowledge Service
- Capability Service
- Integration Service

**Public Interfaces (conceptual only)**

- Company registration or update request
- Company state query
- Company capability usage query
- Company health view request
- Company structure query

**Internal Responsibilities**

- Own company identity and world boundaries
- Maintain company-level relationships to projects, teams, and capabilities
- Track company operating state, risks, and executive attention context
- Emit company lifecycle and health facts

**Events Published**

- `CompanyRegistered`
- `CompanyUpdated`
- `CompanyStateChanged`
- `CompanyHealthChanged`
- `CompanyCapabilityLinked`
- `CompanyRiskRecorded`

**Events Consumed**

- Capability lifecycle events
- Project outcome and blocker events
- Integration verification events
- Knowledge enrichment events

**Security Boundaries**

- Owns company-level visibility and relationship rules.
- Must not expose secret values from integrations or vault references.
- Must not take over project or capability ownership semantics.

**Scaling Considerations**

- Moderate write activity, broad read activity
- Future need for portfolio summaries and cross-company projections
- Should support eventual decomposition of divisions and departments without boundary breakage

**Future Evolution**

- First-class divisions, departments, teams, and health signals
- Company portfolio analytics
- Executive attention tracking
- Cross-company dependency views

### 1.5 Project Service

**Purpose**

The Project Service owns the operational work container that forms the Sprint 1 spine and the long-term project boundary inside company worlds.

**Responsibilities**

- Maintain project identity, status, ownership, and operational context.
- Own the project-centered relationships to runbooks, commands, notes, decisions, next actions, and related work-memory records.
- Represent the resumable state of active work.
- Emit project lifecycle, blocker, and readiness facts.

**Ownership**

Owned by the Project domain.

**Dependencies**

- Knowledge Service
- Capability Service
- Integration Service
- Company Service

**Public Interfaces (conceptual only)**

- Project registration or update request
- Project status query
- Project resume-context request
- Project related-work query
- Project readiness or blocker query

**Internal Responsibilities**

- Own project status and identity
- Maintain operational metadata and relationship boundaries
- Preserve project continuity through decisions, next actions, and runbooks
- Identify project outputs that may mature into capabilities

**Events Published**

- `ProjectRegistered`
- `ProjectUpdated`
- `ProjectStatusChanged`
- `ProjectBlocked`
- `ProjectNextActionMissing`
- `ProjectRunbookMissing`
- `ProjectCapabilityCandidateIdentified`

**Events Consumed**

- Company relationship events
- Capability linkage events
- Integration verification events
- Knowledge indexing events

**Security Boundaries**

- Must preserve no-secret rules across project operational memory.
- Owns project state but not company-wide policy.
- Must not directly control agent execution.

**Scaling Considerations**

- High read and moderate write volume in Sprint 1
- Central dependency for operational queries
- Future need for broad linking and activity projections without becoming a monolith

**Future Evolution**

- Stronger project-to-company attachment
- Team and agent participation views
- Capability dependency mapping
- Project health signals and portfolio rollups

### 1.6 Capability Service

**Purpose**

The Capability Service owns reusable enterprise skills and the Living Capability Library boundary.

**Responsibilities**

- Maintain canonical capability records and lifecycle state.
- Govern capability reviews and review outcomes.
- Track dependencies, owning roles, usage, and reuse context.
- Separate reusable enterprise value from one-off project detail.

**Ownership**

Owned by the Capability domain and aligned with the capability-first principle.

**Dependencies**

- Knowledge Service
- Project Service
- Integration Service

**Public Interfaces (conceptual only)**

- Capability registration request
- Capability review request
- Capability usage query
- Capability dependency query
- Capability readiness query

**Internal Responsibilities**

- Own capability identity and status
- Track review outcomes: Adopt, Adapt, Watch, Reject
- Record where capabilities came from and who consumes them
- Preserve the distinction between innovation intake and durable capability assets

**Events Published**

- `CapabilityCandidateRegistered`
- `CapabilityReviewed`
- `CapabilityAdopted`
- `CapabilityAdapted`
- `CapabilityWatched`
- `CapabilityRejected`
- `CapabilityLinkedToCompany`
- `CapabilityLinkedToProject`

**Events Consumed**

- Project candidate-identification events
- Knowledge enrichment events
- Integration dependency events
- Mission outcome events when work yields reusable capability value

**Security Boundaries**

- Owns reusable capability metadata, not secret-bearing operational content.
- Must not collapse company or project ownership into the capability boundary.
- Must preserve source traceability for all capability claims.

**Scaling Considerations**

- Lower transaction volume than Project Service but higher cross-domain influence
- Future need for dependency graphing and usage projections
- Candidate-to-capability promotion may become asynchronous

**Future Evolution**

- Capability maturity levels
- Certification and readiness scoring
- Marketplace readiness tracking
- Cross-company shared capability portfolios

### 1.7 Knowledge Service

**Purpose**

The Knowledge Service owns structured memory, retrieval, indexing direction, and the knowledge boundary that powers Jarvis and future agents.

**Responsibilities**

- Maintain the safe retrieval layer over operational records.
- Provide search, indexing direction, and source identity preservation.
- Aggregate structured knowledge from projects, companies, capabilities, integrations, and activity.
- Support future document, vector, and graph memory without changing service ownership logic.

**Ownership**

Owned by the Knowledge domain and aligned with the cross-company knowledge core direction.

**Dependencies**

- Company Service
- Project Service
- Capability Service
- Integration Service
- Infrastructure Service

**Public Interfaces (conceptual only)**

- Search query
- Knowledge retrieval request
- Source citation request
- Knowledge indexing request
- Cross-company knowledge query

**Internal Responsibilities**

- Own retrieval policy and knowledge composition
- Preserve source identity for every retrieved fact
- Maintain search/indexing boundaries over safe records
- Prepare future document, vector, and graph retrieval extensions

**Events Published**

- `KnowledgeIndexed`
- `KnowledgeIndexFailed`
- `KnowledgeRetrieved`
- `KnowledgeGapDetected`
- `SourceCitationPrepared`

**Events Consumed**

- Company update events
- Project update events
- Capability lifecycle events
- Integration verification events
- Activity and attachment events
- Infrastructure availability events affecting retrieval layers

**Security Boundaries**

- Must reject or warn on secret-like content.
- Must only expose safe queryable memory.
- Must preserve source-citation guarantees for executive and agent consumers.

**Scaling Considerations**

- Read-heavy and retrieval-heavy
- Future need for multiple retrieval modes: structured, full text, vector, graph
- Indexing and retrieval should scale independently from operational write services

**Future Evolution**

- First-class KnowledgeRecord
- Cross-company knowledge core projections
- Vector memory backed by Qdrant or equivalent
- Knowledge graph expansion if needed

### 1.8 Agent Runtime

**Purpose**

The Agent Runtime is the execution boundary for pluggable agent engines.

**Responsibilities**

- Execute approved missions through runtime-neutral agent adapters.
- Translate CommandCore work contracts into runtime-specific execution forms.
- Return outputs, audit facts, and failure states.
- Preserve runtime independence from the rest of the architecture.

**Ownership**

Owned by the agent-execution boundary, while CommandCore retains ownership of architecture, permissions, memory, and task contracts.

**Dependencies**

- Mission Engine
- Knowledge Service
- Capability Service
- Integration Service
- Infrastructure Service

**Public Interfaces (conceptual only)**

- Agent execution request
- Agent capability query
- Agent status query
- Agent output submission
- Agent failure report

**Internal Responsibilities**

- Adapt CommandCore missions to pluggable runtimes
- Enforce runtime-neutral execution contracts
- Capture execution status, outputs, and audit context
- Fail safely and return explicit missing-context or refusal states

**Events Published**

- `AgentExecutionStarted`
- `AgentExecutionProgressed`
- `AgentExecutionCompleted`
- `AgentExecutionFailed`
- `AgentExecutionRefused`
- `AgentOutputProduced`

**Events Consumed**

- Mission assignment events
- Approval events
- Knowledge retrieval completion events
- Infrastructure availability events

**Security Boundaries**

- Must be permission aware and scope aware.
- Must not execute outside approved mission boundaries.
- Must not access secrets outside approved vault-reference flows.
- Must preserve auditable output and failure reporting.

**Scaling Considerations**

- Execution-heavy, bursty, and future queue-driven
- Multiple runtime backends may operate concurrently
- Execution capacity should scale independently of domain ownership services

**Future Evolution**

- Multi-runtime scheduling
- Long-running mission support
- Multi-agent collaboration
- Runtime policy selection by mission type

### 1.9 Integration Service

**Purpose**

The Integration Service owns CommandCore's conceptual boundary with external systems, providers, and operational references.

**Responsibilities**

- Maintain safe references to external systems and providers.
- Normalize integration context for projects, companies, capabilities, and operations.
- Track non-secret provider metadata, verification state, and dependency context.
- Protect CommandCore from accidental vendor lock-in at the service-boundary level.

**Ownership**

Owned by the Integration domain.

**Dependencies**

- Infrastructure Service

**Public Interfaces (conceptual only)**

- Integration reference registration
- Integration verification request
- Integration dependency query
- Provider-context query
- Safe access-reference lookup

**Internal Responsibilities**

- Own provider and system reference boundaries
- Preserve vault-reference-only access patterns
- Maintain verification and dependency state
- Emit integration lifecycle and health facts

**Events Published**

- `IntegrationRegistered`
- `IntegrationVerified`
- `IntegrationVerificationFailed`
- `IntegrationDependencyChanged`
- `IntegrationAvailabilityChanged`

**Events Consumed**

- Company attachment events
- Project attachment events
- Capability dependency events
- Infrastructure availability events

**Security Boundaries**

- Must never become a secret store.
- May expose only safe references such as URLs, usernames where safe, provider names, and vault item names.
- Must not let external-provider semantics leak into core domain ownership.

**Scaling Considerations**

- Moderate activity in Sprint 1
- Future increase as provider inventory and operational environments grow
- Verification workflows may become asynchronous and scheduled

**Future Evolution**

- Richer integration catalogs
- Provider compatibility and policy views
- Cross-company provider analysis
- Service-health and dependency mapping

### 1.10 Infrastructure Service

**Purpose**

The Infrastructure Service owns the internal operational substrate awareness of CommandCore.

**Responsibilities**

- Represent infrastructure availability, health, and service topology relevant to CommandCore.
- Provide the architecture boundary for local-first and self-hosted runtime context.
- Track model-layer, vector-layer, runtime-layer, and service-layer availability.
- Support auditability and replaceability of infrastructure components.

**Ownership**

Owned by the Infrastructure domain and aligned with the X10 reference environment and future modular infrastructure layers.

**Dependencies**

- None at the core domain level

**Public Interfaces (conceptual only)**

- Infrastructure health query
- Service availability query
- Runtime capability query
- Storage or retrieval capability query
- Infrastructure alert report

**Internal Responsibilities**

- Own infrastructure-state awareness
- Represent service availability and optional substrate capabilities
- Preserve modular replaceability for infrastructure choices
- Expose health facts without taking over domain logic

**Events Published**

- `InfrastructureHealthChanged`
- `InfrastructureServiceAvailable`
- `InfrastructureServiceUnavailable`
- `ModelRuntimeAvailable`
- `VectorStoreAvailable`

**Events Consumed**

- None required from higher-level domain services for core ownership

**Security Boundaries**

- Must not leak secrets or unsafe infrastructure credentials into CommandCore memory.
- Must expose health and capability facts, not raw privileged control surfaces by default.
- Must remain subordinate to architecture policy, not vice versa.

**Scaling Considerations**

- Read-heavy health and capability service
- May later ingest frequent health telemetry
- Should scale independently from mission, executive, and retrieval workloads

**Future Evolution**

- Richer topology and dependency projections
- Infra-health rollups into Nexus
- Optional queue, cache, and object-storage awareness
- Multi-environment health modeling

---

## 2. Service Dependency Rules

### 2.1 Layering Model

CommandCore service boundaries follow this conceptual layering:

1. Headquarters Layer
   - Nexus

2. Executive Coordination Layer
   - Executive Layer
   - Mission Engine

3. Core Domain Ownership Layer
   - Company Service
   - Project Service
   - Capability Service
   - Knowledge Service
   - Integration Service
   - Infrastructure Service

4. Execution Layer
   - Agent Runtime

The Execution Layer is below executive coordination for work assignment, but it may query approved support services in the Core Domain Ownership Layer during execution.

### 2.2 Direct Communication Rules

Allowed direct dependencies:

- Nexus may depend on Executive Layer and core ownership services for composition.
- Executive Layer may depend on Mission Engine and core ownership services for reasoning and routing.
- Mission Engine may depend on Company, Project, Capability, Knowledge, and Agent Runtime for scoped execution.
- Company Service may depend on Capability, Knowledge, and Integration.
- Project Service may depend on Company, Capability, Knowledge, and Integration.
- Capability Service may depend on Project, Knowledge, and Integration.
- Knowledge Service may depend on Company, Project, Capability, Integration, and Infrastructure.
- Agent Runtime may depend on Mission Engine plus approved support services: Knowledge, Capability, Integration, and Infrastructure.
- Integration Service may depend on Infrastructure Service.

Preferred communication style:

- Commands travel to the owning service.
- Events propagate facts across services.
- Queries are directed to the service that owns the answer or to an approved composed read boundary such as Nexus.

### 2.3 Prohibited Dependencies

The following dependencies are prohibited:

- Company Service -> Nexus
- Project Service -> Nexus
- Capability Service -> Nexus
- Knowledge Service -> Nexus
- Integration Service -> Nexus
- Infrastructure Service -> Nexus

- Company Service -> Executive Layer
- Project Service -> Executive Layer
- Capability Service -> Executive Layer
- Knowledge Service -> Executive Layer
- Integration Service -> Executive Layer
- Infrastructure Service -> Executive Layer

- Company Service -> Agent Runtime
- Project Service -> Agent Runtime
- Capability Service -> Agent Runtime
- Integration Service -> Agent Runtime

- Agent Runtime -> Nexus
- Agent Runtime -> Executive Layer directly

- Infrastructure Service -> Company Service
- Infrastructure Service -> Project Service
- Infrastructure Service -> Capability Service
- Infrastructure Service -> Knowledge Service
- Infrastructure Service -> Integration Service

- Capability Service -> Company Service for ownership control
  - Capability usage may be linked to companies, but Company remains the owner of company-world state.

- Knowledge Service -> direct ownership mutation of Company, Project, or Capability
  - Knowledge may index and retrieve; it must not become the write owner of other domains.

### 2.4 Boundary Rules

- Each service owns its own canonical business meaning.
- No service should reach into another service's private model and redefine it.
- Cross-service state alignment should prefer events and explicit queries over hidden coupling.
- Nexus composes visibility; it does not absorb domain ownership.
- Executive Layer recommends and governs; it does not erase domain ownership.
- Mission Engine coordinates work; it does not own companies, projects, capabilities, or knowledge.
- Agent Runtime executes approved work; it does not define architecture or domain policy.
- Infrastructure supports the platform; it does not control business meaning.

---

## 3. Event Architecture

CommandCore should use four conceptual message shapes.

These are architectural concepts only. They are not implementation protocols.

### 3.1 Commands

Commands express intent to change state or initiate bounded work.

Characteristics:

- Directed to one owning service
- Imperative in meaning
- Validated against permissions, scope, and policy
- May succeed, be rejected, or produce follow-up events

Examples:

- Request a mission
- Register a company
- Review a capability
- Verify an integration
- Prepare an executive brief

### 3.2 Events

Events express facts that something has already happened.

Characteristics:

- Published by the service that owns the fact
- Immutable in meaning once emitted
- Used to inform other services, projections, and summaries
- Suitable for asynchronous coordination

Examples:

- A project became blocked
- A capability was adopted
- Knowledge was indexed
- An agent execution completed
- Infrastructure became unavailable

### 3.3 Queries

Queries request information without changing the authoritative state of the target service.

Characteristics:

- Read-only in intent
- Answered by the owning service or an approved composition boundary
- May return current state, filtered views, or source-cited retrieval results
- Must not hide side effects behind a read contract

Examples:

- Show company state
- Retrieve project resume context
- Search knowledge
- View infrastructure health
- Show capability usage

### 3.4 Notifications

Notifications express attention-worthy signals for humans or executive surfaces.

Characteristics:

- Usually derived from events
- Focused on awareness, urgency, or review
- May be routed to Nexus, executive roles, or operational owners
- Must not be treated as canonical state ownership

Examples:

- A project has no next action
- A company risk needs executive attention
- A mission is blocked awaiting approval
- An integration verification failed

---

## 4. Communication Principles

### 4.1 Ownership Before Convenience

Each important concept has an owning service boundary.

Convenience must not justify bypassing the owner of company state, project state, capability state, or knowledge retrieval policy.

### 4.2 Compose Upward, Do Not Reach Sideways Blindly

Higher layers may compose lower-layer information.

Peer services should not create hidden coupling by reaching into each other's internal logic without explicit ownership-based queries or events.

### 4.3 Commands Down, Facts Across

Intent should move through commands directed at owners.

Knowledge about what happened should move through published events.

### 4.4 Queries Must Preserve Source Identity

When CommandCore retrieves information for Nexus, Jarvis, or agents, the system should preserve the identity of the source records.

This protects against invented context and supports source-cited intelligence.

### 4.5 Asynchronous by Default for Cross-Boundary Coordination

Cross-service coordination should assume eventual consistency where practical.

This is especially important for mission handling, capability promotion, indexing, infrastructure health, and future agent execution.

### 4.6 No Secret Propagation

No service boundary should normalize, transport, or retain secrets as domain memory.

Only safe references such as vault item names, provider names, and non-secret operational metadata may move across the architecture.

### 4.7 Runtime Independence

Agent runtimes and model providers must remain replaceable.

The service architecture must express CommandCore policy and domain meaning without coupling to a single executor or model vendor.

### 4.8 Local-first Foundation, Cloud-enhanced Future

Service boundaries should work for a local-first Sprint 1 deployment and still remain valid when cloud, sync, shared libraries, or enterprise operations are added later.

### 4.9 Headquarters Is Not the Whole System

Nexus and Executive Layer are top-level coordination boundaries, not substitutes for the core domain services beneath them.

### 4.10 Practical First, Magical Later

Sprint 1 should establish these service boundaries in language and architecture before trying to automate everything.

The service model should support future intelligence and automation without pretending those capabilities are already fully implemented.
