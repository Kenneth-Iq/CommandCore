# CommandCore Canonical Knowledge Engine

**Status:** Canonical Knowledge Engine architecture for Sprint 1 and future implementation  
**Authority:** Derived from the locked Constitution, Master Blueprint, Knowledge Domain, Canonical Service Architecture, and Canonical Domain Events

## Scope

This document defines the canonical Knowledge Engine architecture for CommandCore.

It does not define implementation code, APIs, database schemas, queue topologies, vendor contracts, UI behavior, or runtime-specific retrieval pipelines.

Its purpose is to establish one architectural source of truth for how CommandCore captures, governs, classifies, retrieves, secures, and evolves memory across workspace, project, company, executive, capability, mission, and future agent contexts.

---

## 1. Purpose

The Knowledge Engine exists to:

- Turn operational records into safe, retrievable memory.
- Power source-cited reasoning for Jarvis, executive roles, and future agents.
- Preserve business context across workspace, project, company, capability, mission, and infrastructure boundaries.
- Support multiple retrieval modes without redefining knowledge ownership.
- Keep Sprint 1 local-first while preserving the path to richer future memory systems.

The Knowledge Engine is not a single storage product.

It is the architectural memory system of CommandCore, including:

- knowledge capture
- indexing direction
- retrieval policy
- source identity preservation
- lineage and auditability
- future document, vector, event, and graph memory

---

## 2. Principles

The Knowledge Engine must follow these canonical principles:

### 2.1 Source-Cited by Default

Knowledge should remain tied to real source records, events, documents, or approved summaries.

### 2.2 Local-First Foundation

Sprint 1 memory must remain useful in a local-first environment before distributed infrastructure exists.

### 2.3 Safe-to-Query Before Easy-to-Query

Knowledge must be classified and governed before it becomes widely retrievable.

### 2.4 Ownership Before Aggregation

The Knowledge Engine may compose memory across domains, but it must not erase which domain owns the underlying fact.

### 2.5 Retrieval-Neutral Architecture

Search, semantic retrieval, graph traversal, and future hybrid retrieval must share one knowledge architecture rather than create competing memory models.

### 2.6 Event-Aware Memory

Meaningful domain events are part of system memory and should contribute to lineage, auditability, and context assembly.

### 2.7 Human-Readable Core

CommandCore memory must remain inspectable and understandable by humans, not only optimized for machines.

### 2.8 No Secret Storage

The Knowledge Engine must not become a secret store, credential cache, or unsafe memory dump.

---

## 3. Knowledge Ownership

Knowledge ownership exists at multiple levels.

### 3.1 Architectural Ownership

CommandCore architecture owns the Knowledge Engine as a platform boundary.

This includes:

- memory policies
- retrieval principles
- classification rules
- lineage expectations
- auditability expectations
- future provider neutrality

### 3.2 Domain Ownership

Underlying facts remain owned by their source domains.

Examples:

- Company facts are owned by the Company domain.
- Project facts are owned by the Project domain.
- Capability facts are owned by the Capability domain.
- Mission facts are owned by the Mission Engine.
- Integration facts are owned by the Integration domain.
- Conversation facts are owned by the Conversation domain when that boundary exists.

### 3.3 Knowledge Service Ownership

The Knowledge Service owns:

- retrieval policy
- indexing direction
- knowledge composition
- source identity preservation
- safe-query boundaries
- future retrieval-mode orchestration

The Knowledge Service does not own the truth of Company, Project, Capability, Integration, or Mission state.

---

## 4. Knowledge Boundaries

The Knowledge Engine must respect clear memory boundaries.

### 4.1 Boundary Rules

- Memory may be assembled across domains without collapsing domain ownership.
- Query scope must be explicit where the boundary matters.
- Executive visibility is broad but not boundaryless.
- Agent memory must remain scoped and permission-aware.
- Workspace memory is the Sprint 1 baseline boundary.
- Cross-company knowledge is allowed architecturally, but must remain governed.

### 4.2 Boundary Axes

Knowledge may be bounded by:

- workspace
- company
- project
- capability
- mission
- conversation thread
- executive role
- agent assignment
- safe-query classification

### 4.3 Retrieval Boundary Principle

A query should return only memory that is both:

1. relevant to the retrieval goal
2. permitted by the knowledge boundary in effect

---

## 5. Knowledge Layers

The Knowledge Engine is organized into the following canonical knowledge layers.

## 5.1 Global Knowledge

Global Knowledge spans the CommandCore universe.

It includes:

- architecture memory
- executive rules
- cross-company reusable capability context
- global operating principles
- cross-company knowledge core material

Global Knowledge supports Nexus, executive coordination, architecture continuity, and reusable learning.

## 5.2 Executive Knowledge

Executive Knowledge is memory assembled for Jarvis and executive roles.

It includes:

- briefing material
- cross-company summaries
- risks
- escalations
- executive recommendations
- attention areas
- cited operational context

Executive Knowledge is a composed view, not a replacement for underlying company or project records.

## 5.3 Company Knowledge

Company Knowledge is memory local to a company world.

It includes:

- mission context
- operating state
- capability usage
- integration dependencies
- risks
- decisions
- active priorities
- health-relevant history

## 5.4 Project Knowledge

Project Knowledge is memory attached to a concrete work container.

It includes:

- runbooks
- notes
- decisions
- next actions
- commands
- links
- capability relationships
- agent coordination context

## 5.5 Workspace Knowledge

Workspace Knowledge is the Sprint 1 top-level practical memory boundary.

It includes:

- all workspace-scoped operational records
- local search substrate
- activity context
- local-first operating memory

Workspace Knowledge is the initial container from which richer company and executive layers are later assembled.

## 5.6 Conversation Knowledge

Conversation Knowledge is memory arising from bounded human, executive, or agent exchanges.

It includes:

- thread context
- turns
- citations
- clarifications
- promoted outcomes

Conversation Knowledge is subordinate to source records and must not replace durable operational memory.

## 5.7 Agent Memory

Agent Memory is the approved context made available to a specific agent execution flow.

It includes:

- scoped mission context
- approved knowledge excerpts
- capability references
- project or company context
- prior relevant outputs when permitted

Agent Memory must remain scoped, auditable, and permission-aware.

## 5.8 Capability Knowledge

Capability Knowledge is memory about reusable enterprise skills.

It includes:

- origin and discovery context
- documentation
- dependencies
- inputs and outputs
- tests and certification state
- adoption and retirement lineage

## 5.9 Document Knowledge

Document Knowledge is knowledge stored in human-readable documents.

It includes:

- runbooks
- briefs
- notes
- reviews
- attached documents
- future enriched document bodies

## 5.10 Integration Knowledge

Integration Knowledge is the safe operational memory of external systems and providers.

It includes:

- provider identity
- access references
- dependency roles
- verification context
- replacement or retirement notes

Integration Knowledge must preserve the no-secret rule.

---

## 6. Memory Types

The Knowledge Engine must support multiple memory types under one architectural model.

## 6.1 Structured Memory

Structured Memory is stored in explicit fields, statuses, typed records, links, and timestamps.

It is the Sprint 1 foundation and the most inspectable memory type.

## 6.2 Document Memory

Document Memory is knowledge captured in human-readable text artifacts.

It supports explanation, operational continuity, and richer retrieval from natural-language context.

## 6.3 Vector Memory

Vector Memory is semantic retrieval memory backed by embeddings and vector-capable stores.

Its purpose is semantic similarity and recall improvement, not replacement of source identity.

## 6.4 Event Memory

Event Memory is the memory of meaningful domain facts expressed as immutable events.

It supports:

- historical replay
- workflow lineage
- mission tracing
- executive auditing
- state explanation

## 6.5 Relationship Memory

Relationship Memory is the explicit memory of how entities connect.

It includes:

- project-to-capability links
- company-to-project links
- capability-to-consumer links
- workspace-to-record links
- mission-to-output lineage

## 6.6 Graph Memory

Graph Memory is the relationship-centric retrieval layer used when connected context matters more than isolated records.

It is the future expression of Relationship Memory when graph traversal becomes necessary.

## 6.7 Operational Memory

Operational Memory is the working memory of active operations.

It includes:

- current status
- blockers
- next actions
- current runbooks
- recent activity
- execution context

Operational Memory is the memory most directly used by Jarvis, Athena, mission coordination, and future agents.

---

## 7. Knowledge Lifecycle

Knowledge follows a canonical lifecycle.

### 7.1 Capture

Knowledge originates from:

- structured operational records
- documents
- activity and events
- decisions and next actions
- mission outcomes
- agent outputs
- conversation promotions
- integration verification
- capability review artifacts

### 7.2 Classification

Captured knowledge must be classified for scope, sensitivity, and safe-query status.

### 7.3 Linking

Knowledge is linked to its relevant workspace, project, company, mission, capability, agent, or conversation context.

### 7.4 Indexing

Indexing prepares knowledge for one or more retrieval modes while preserving source identity.

### 7.5 Retrieval

Knowledge is retrieved in response to operational, executive, mission, or future agent needs.

### 7.6 Promotion

Some transient or derived context may be promoted into durable memory, such as a decision, note, task proposal, knowledge asset, or capability candidate.

### 7.7 Evolution

Knowledge may be enriched, reclassified, re-linked, summarized, or retired as context changes.

### 7.8 Retirement

Knowledge may be retired from active retrieval while still preserving lineage and audit value when required.

---

## 8. Knowledge Retention

Retention must favor traceability and operational continuity.

### 8.1 Retention Priorities

Retain longest:

- executive brief and escalation inputs with citation value
- mission lifecycle and outcome knowledge
- decisions and rationale memory
- capability certification and retirement context
- integration verification and replacement context
- knowledge promotion lineage
- audit-relevant event memory

### 8.2 Retention Rules

- Durable business memory should outlive transient retrieval indexes.
- Derived retrieval artifacts may be recomputed if source memory is preserved.
- Retention policy must distinguish source memory from index representations.
- Retirement from active retrieval does not necessarily mean deletion.
- Historical explainability should be preserved where business meaning depends on it.

---

## 9. Knowledge Governance

Knowledge governance defines who may create, classify, expose, promote, and rely on memory.

### 9.1 Governance Responsibilities

Governance must define:

- safe-query rules
- citation requirements
- promotion rules
- retention expectations
- classification boundaries
- correction and correction-lineage expectations

### 9.2 Governance Rules

- No knowledge should become broadly retrievable without scope and safety review principles.
- Promoted memory must preserve source lineage.
- Executive summaries must remain downstream from owned source records.
- Agent-usable memory must pass both safety and scope boundaries.
- Knowledge corrections should produce explicit lineage rather than silent replacement where the history matters.

### 9.3 Governance Direction

The Knowledge Engine is architecturally aligned with future Oracle-directed memory functions, even though Sprint 1 does not implement that role as a runtime.

---

## 10. Knowledge Security

Knowledge security protects memory without turning the Knowledge Engine into a secrets platform.

### 10.1 Security Rules

- The Knowledge Engine must not store raw secrets.
- Secret-like content must be rejected, warned on, quarantined, or kept non-queryable according to future implementation policy.
- Retrieval must honor scope and permission boundaries.
- Executive visibility does not eliminate source ownership rules.
- Agent retrieval must remain mission-scoped and approval-aware.
- Safe access references are allowed; secret values are not.

### 10.2 Security Boundaries

Security must consider:

- workspace-local access
- company visibility
- executive visibility
- mission and task scope
- conversation safety
- agent permission level
- integration no-secret discipline

---

## 11. Knowledge Classification

Knowledge classification is the canonical way to decide how memory may be used.

### 11.1 Classification Axes

Knowledge may be classified by:

- domain type
- ownership domain
- scope boundary
- sensitivity level
- safe-query status
- retention class
- retrieval mode readiness
- operational relevance

### 11.2 Minimum Classification Questions

Every significant knowledge item should eventually answer:

- What kind of knowledge is this?
- Who owns the underlying fact?
- Which scope does it belong to?
- Is it safe to query?
- Which retrieval modes may use it?
- What is its source lineage?
- How long should it be retained?

---

## 12. Knowledge Discovery

Knowledge Discovery is the process of finding useful memory from the total available substrate.

### 12.1 Discovery Inputs

Discovery may start from:

- search terms
- semantic similarity
- graph relationships
- event chains
- mission context
- executive questions
- project state
- capability exploration
- agent execution needs

### 12.2 Discovery Goals

Discovery should help answer:

- what exists
- what matters now
- what is missing
- what is related
- what changed
- what should happen next

### 12.3 Discovery Rules

- Discovery should preserve source identity.
- Discovery should prefer explicit gaps over invented certainty.
- Discovery should rank by relevance and trust, not only by raw text overlap.
- Discovery should remain explainable enough for human review.

---

## 13. Knowledge Lineage

Lineage is the trace of where memory came from and how it evolved.

### 13.1 Lineage Sources

Lineage may include:

- source records
- source documents
- source events
- conversation promotions
- mission outputs
- capability review decisions
- integration verification steps
- executive summaries derived from lower-level memory

### 13.2 Lineage Rules

- Derived memory must point back to source memory when possible.
- Summaries must remain attributable to their inputs.
- Promotions from transient context to durable records must preserve origin references.
- Event memory should support causation and correlation where relevant.
- Knowledge lineage must survive provider or retrieval-mode changes.

---

## 14. Knowledge Auditing

Auditing is the ability to explain what memory was used, why it was returned, and how it changed over time.

### 14.1 Auditing Goals

The Knowledge Engine should support future answers to:

- what source records were used
- which retrieval mode returned them
- why a summary or recommendation cited them
- how a decision or mission outcome entered durable memory
- whether a memory item was safe to query at the time of retrieval

### 14.2 Auditing Rules

- Retrieval should be traceable to sources.
- Promotions should be traceable to origin context.
- Event-derived memory should preserve event IDs where practical.
- Auditability should survive indexing and projection layers.
- Human review should remain possible for important executive or mission-critical memory flows.

---

## 15. Retrieval Model

The Knowledge Engine must support multiple retrieval modes under one architecture.

## 15.1 Search

Search is the baseline retrieval mode for Sprint 1.

It should support direct lookup over structured and document-like operational records.

## 15.2 Semantic Search

Semantic Search retrieves memory based on meaning similarity rather than exact text overlap.

Its purpose is recall improvement and concept matching across larger memory sets.

## 15.3 Hybrid Search

Hybrid Search combines explicit search signals with semantic retrieval and future ranking signals.

It is the preferred long-term retrieval direction when both precision and recall matter.

## 15.4 Graph Traversal

Graph Traversal retrieves memory by following meaningful relationships.

It is most useful when the question is about connected context, lineage, dependencies, or adjacency.

## 15.5 Context Assembly

Context Assembly is the process of turning raw retrieval results into a usable context package for executives, missions, conversations, or agents.

Context Assembly should:

- preserve citations
- preserve scope boundaries
- combine multiple memory types when appropriate
- exclude irrelevant or unsafe memory
- remain explainable and auditable

## 15.6 Memory Ranking

Memory Ranking is the prioritization of candidate memories for final use.

Ranking may consider:

- relevance
- source trust
- scope match
- recency
- operational importance
- certification or verification state
- lineage strength
- safe-query eligibility

Ranking must not hide the existence of uncertainty when context is incomplete.

---

## 16. Future Providers

The Knowledge Engine must remain provider-neutral while acknowledging likely future substrates.

## 16.1 SQLite

SQLite is the local-first baseline provider for structured memory and simple event or retrieval metadata in Sprint 1 style environments.

Its architectural role is practical local inspectability, not long-term exclusivity.

## 16.2 Postgres

Postgres is a future provider for richer structured memory, indexing support, and broader operational scale.

Its role is relational strength and operational maturity, not domain ownership.

## 16.3 pgvector

`pgvector` is a future provider option for vector-capable retrieval inside a Postgres-centered environment.

Its role is semantic retrieval support when a unified relational-plus-vector deployment is desirable.

## 16.4 Neo4j

Neo4j is a future provider option for graph-oriented memory and relationship traversal.

Its role is relationship-centric retrieval when relational links become insufficiently expressive.

## 16.5 Object Storage

Object Storage is a future provider option for durable document bodies, attachments, enriched artifacts, and larger knowledge assets.

Its role is document persistence and artifact retention rather than primary business meaning.

## 16.6 Future Distributed Providers

Future distributed providers may supply:

- larger-scale structured storage
- distributed vector retrieval
- graph distribution
- object-scale artifact retention
- cross-environment replication

Provider changes must not redefine the canonical memory model, ownership rules, or retrieval principles.

---

## 17. Provider Neutrality Rules

- Providers are infrastructure choices, not domain identities.
- The Knowledge Engine must preserve memory meaning across provider changes.
- Index structures may vary by provider, but source lineage and safe-query rules must remain stable.
- Retrieval architecture must remain compatible with local-first and future distributed deployment models.

---

## 18. Relationship to Domain Events

The Domain Event Catalogue is part of the Knowledge Engine foundation.

Domain events contribute to:

- Event Memory
- operational history
- lineage
- causation chains
- correlation chains
- auditability
- future replay and projection

The Knowledge Engine should treat event memory as a first-class retrieval and explanation input where it adds business meaning.

---

## 19. Sprint 1 Interpretation

Sprint 1 does not need to implement every knowledge layer or provider.

Sprint 1 should interpret this blueprint as:

- preserve structured operational memory well
- keep records searchable
- preserve source identity
- avoid secret storage
- maintain local-first usefulness
- leave a clean path to semantic, event, graph, and distributed memory later

---

## 20. Final Rules

- This document is the source of truth for future CommandCore memory systems.
- Knowledge architecture must remain source-cited, boundary-aware, and provider-neutral.
- Retrieval convenience must not outrun knowledge safety or lineage.
- Derived memory must not erase domain ownership of underlying facts.
- No provider choice should redefine the Knowledge Engine as something narrower than CommandCore memory architecture.
