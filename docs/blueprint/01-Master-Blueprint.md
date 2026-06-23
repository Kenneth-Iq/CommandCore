# CommandCore Master Blueprint

**Status:** Locked architectural source of truth for Sprint 1  
**Version:** 1.0  
**Created:** 2026-06-23  
**Authority:** Reconciles `docs/product/CommandCore_MVP_PRD.md` and `docs/blueprint/00-CommandCore-Constitution.md`

---

## 1. Purpose

This document is the primary architectural handbook for CommandCore Sprint 1.

It does not replace the original MVP PRD. It repositions that PRD inside the newly locked CommandCore architecture.

The original PRD defines the first practical product wedge: a local-first Productivity & Operations foundation for projects, clients, runbooks, account maps, research, ideas, decisions, links, tags, notes, search, and next actions.

The constitution defines the destination: CommandCore is an AI Enterprise Operating System for an AI company universe.

This blueprint reconciles both.

Every future implementation decision should be measured against this document.

---

## 2. Locked Identity

CommandCore is an AI Enterprise Operating System.

It is not simply:

- A productivity application
- A task manager
- A wiki
- A CRM
- A chatbot
- Jarvis alone
- An AI dashboard
- A password manager

CommandCore is the operating layer for companies, capabilities, agents, infrastructure, knowledge, decisions, and executive intelligence.

The first build remains local-first and practical. The long-term architecture must be enterprise-ready.

### 2.1 Reclassified MVP

The MVP PRD remains valid as the Productivity & Operations foundation.

Its modules become the operational substrate of the larger system:

- Dashboard becomes the first form of the Nexus.
- Projects become operating units within company worlds.
- Clients become external organization contexts.
- Accounts Map and Vault References become safe access memory.
- Runbooks and Local Commands become operational knowledge.
- GitHub Review Lab, Tools Lab, Hardware Scratchpad, and Ideas Lab become the first Innovation Lab surface.
- Decisions and Next Actions become executive memory and action substrate.
- Universal Search becomes the first knowledge retrieval layer for Jarvis and future agents.

### 2.2 Product North Star

CommandCore must help the user understand:

- What exists
- Where it lives
- Who or what owns it
- How it runs
- How it is accessed safely
- Which capabilities it uses
- Which decisions shaped it
- What should happen next
- Which company world it belongs to
- Which agents or humans may act on it

---

## 3. Core Hierarchy

The locked navigation and operating hierarchy is:

```text
Universe
  The Nexus
    Company
      Division
        Department
          Project
            Team
              Agent
                Task
```

The constitution also defines an Executive Layer inside the Nexus. In practice, the Executive Layer governs across the entire universe and can inspect or coordinate any company, division, department, project, team, agent, or task.

### 3.1 Hierarchy Rules

- The Universe is the top-level operating context.
- The Nexus is the executive headquarters.
- Companies are first-class objects.
- Companies are represented as living worlds, not folders.
- Divisions and Departments organize company operations.
- Projects are work containers inside companies.
- Teams combine humans, agents, systems, and responsibilities.
- Agents operate through CommandCore interfaces and permissions.
- Tasks are execution units, never the central product model.

Sprint 1 does not need to fully implement every level. It must not create architecture that prevents these levels from becoming first-class later.

---

## 4. Executive Layer

The Executive Layer is the senior intelligence and coordination layer of CommandCore.

It is not a collection of mascots. It is the operating model for executive reasoning, review, delegation, briefings, security, research, operations, infrastructure, communications, memory, and capability management.

### 4.1 Locked Executive Roles

The following roles are locked:

- **Jarvis:** Chief Executive Intelligence
- **Hermes:** Chief Technology Officer
- **Odysseus:** Chief Research Officer
- **Athena:** Chief Operations Officer

Additional executive roles may exist in the future. The constitution currently reserves:

- **Sentinel:** Security Director
- **Forge:** Infrastructure Director
- **Oracle:** Knowledge and Memory Director
- **Mercury:** Communications Director

### 4.2 Jarvis

Jarvis is Chief Executive Intelligence.

Jarvis is the command layer and executive reasoning surface. Jarvis should eventually:

- Produce briefings
- Summarize company worlds
- Identify blockers
- Recommend next actions
- Coordinate executive roles
- Query the knowledge core
- Cite source records
- Escalate risks
- Detect missing information
- Route work to appropriate agents or humans

Jarvis is not merely a chat interface. Chat may be one interface to Jarvis, but Jarvis is the executive intelligence layer.

### 4.3 Hermes

Hermes is Chief Technology Officer.

Hermes governs technical architecture, repository understanding, implementation plans, code review workflows, engineering standards, integration strategy, and technology capability evaluation.

Hermes may use pluggable agent engines such as OpenHands, Aider, Codex, Claude Code, or future engines. Hermes is a CommandCore role, not a runtime.

### 4.4 Odysseus

Odysseus is Chief Research Officer.

Odysseus governs research, discovery, capability scouting, GitHub review workflows, technology radar, market opportunities, hardware investigation, and monetisation candidates.

Odysseus feeds the Innovation Lab and Living Capability Library.

### 4.5 Athena

Athena is Chief Operations Officer.

Athena governs operations, next actions, runbook hygiene, project status, client systems, process discipline, missing operational knowledge, and execution readiness.

Athena turns memory into operational clarity.

---

## 5. Company Model

Companies are first-class objects.

Companies are living worlds, not folders, labels, or project groups. A company world may contain divisions, departments, projects, teams, agents, tasks, systems, knowledge, runbooks, infrastructure, capabilities, decisions, risks, and opportunities.

### 5.1 Company World Requirements

A future Company object should support:

- Identity
- Mission
- Status
- Portfolio category
- Divisions
- Departments
- Projects
- Teams
- Assigned executive attention
- Capability usage
- Infrastructure dependencies
- Knowledge records
- Decisions
- Risks
- Next actions
- Agents
- Health signals
- Activity history

Sprint 1 may represent these companies as seed projects, tags, or placeholder company records depending on implementation readiness. The architecture must leave room for Companies to become first-class without migration pain.

### 5.2 Current Product Portfolio

The current CommandCore portfolio is:

- MindX
- CliniX
- BillingForge
- Hiker
- Loki Labs
- SherqIT
- Legal Dispute System
- Hatchling Heroes
- Horror Investigation Game
- Robotics
- Home AI
- Tirra
- EBA
- Future Ventures

Where the constitution refers to "Hiker Safety Platform", Sprint 1 may label the portfolio item as "Hiker" while preserving the safety-platform context in description or notes.

### 5.3 Relationship to MVP Projects

The MVP PRD uses Projects as the spine of the first build. That is still correct for local productivity.

However, Projects must not be treated as the permanent top of the hierarchy.

The long-term relationship is:

```text
Company
  Division
    Department
      Project
```

Sprint 1 data and navigation should therefore avoid assumptions such as:

- Every important object belongs only to a project.
- A workspace is just a project list.
- Research exists only as a project accessory.
- Capabilities are project-specific.
- Agents are project-specific by default.

---

## 6. Innovation Platform

CommandCore includes a permanent Innovation Platform.

The Innovation Platform is not a side area. It is how CommandCore discovers, reviews, adapts, and promotes reusable capabilities.

The Innovation Platform contains:

- Innovation Lab
- Living Capability Library
- Capability Reviews
- Technology Radar
- Project Incubator

### 6.1 Innovation Lab

The Innovation Lab is the intake and experimentation environment.

It absorbs:

- Ideas
- GitHub repositories
- Tools
- Hardware research
- AI frameworks
- Infrastructure services
- Product experiments
- Monetisation candidates
- Reusable patterns
- Technical discoveries

The PRD modules become Innovation Lab surfaces:

- GitHub Review Lab
- Tools Lab
- Hardware Scratchpad
- Ideas Lab

Each Innovation Lab item should answer:

- What is being reviewed?
- Why does it matter?
- Which company could use it?
- Which capability might it become?
- What is the status?
- What is the risk?
- What is the decision?
- What is the next action?

### 6.2 Living Capability Library

The Living Capability Library is the permanent registry of reusable CommandCore capabilities.

Capabilities are reusable building blocks that companies consume. They may come from internal projects, external repositories, tools, research, runbooks, patterns, workflows, or agent skills.

Examples:

- Local project runbook template
- Access map pattern
- JSON backup/export
- Universal search index
- Client handover pack
- PDF splitting
- HEIC to JPG conversion
- Long-context knowledge retrieval
- Agent task interface
- Hardware supplier evaluation
- GitHub review workflow
- Company-world health summary

Capability records should eventually include:

- Name
- Description
- Source
- Status
- Review score
- Owning executive role
- Used by companies
- Used by projects
- Required infrastructure
- Security notes
- Legal notes
- Commercial potential
- Implementation status
- Related runbooks
- Related decisions
- Related agents

### 6.3 Capability Reviews

Capability Reviews are the evaluation process for reusable abilities.

Review outcomes are locked:

- Adopt
- Adapt
- Watch
- Reject

Capability Reviews should consider:

- Reuse potential
- Strategic value
- Implementation effort
- Maintenance burden
- Security risk
- Legal risk
- Vendor lock-in
- Infrastructure dependency
- Monetisation potential
- Fit with current company worlds

### 6.4 Technology Radar

Technology Radar tracks technologies, frameworks, tools, runtimes, models, services, databases, infrastructure patterns, and agent engines.

Radar states may include:

- Trial
- Adopt
- Assess
- Hold
- Retire

The Technology Radar helps CommandCore avoid reactive tool sprawl. It should feed Capability Reviews and executive decisions.

### 6.5 Project Incubator

The Project Incubator turns validated ideas and capabilities into company projects.

Incubator candidates may originate from:

- Ideas Lab
- GitHub reviews
- Tools Lab
- Hardware research
- Client needs
- Company strategy
- Executive briefings
- Capability gaps

An incubated project should have:

- Problem statement
- Target company world
- Capability dependencies
- Technical approach
- Risks
- Decision record
- Next action
- Owner
- Exit criteria

---

## 7. Agent Architecture

Jarvis remains the command layer.

Agent engines are pluggable.

CommandCore owns the architecture, data model, permissions, memory, capability library, company model, task contracts, and audit trail. External or internal agent engines execute work through interfaces.

### 7.1 Runtime Independence

CommandCore must not be coupled to a single agent runtime.

Potential engines include:

- Hermes
- OpenHands
- Aider
- Codex
- Claude Code
- Future engines

An engine is not the architecture. An engine is a replaceable executor.

### 7.2 Agent Interface Principles

Future agent interfaces should be:

- Runtime neutral
- Permission aware
- Auditable
- Scoped to a company, project, capability, or task
- Able to cite source records
- Able to report changes
- Able to fail safely
- Forbidden from accessing secrets stored outside approved vault flows
- Compatible with local-first and cloud-enhanced deployments

### 7.3 Agent Work Contract

A future agent work contract should define:

- Task objective
- Scope
- Allowed repositories or records
- Required context
- Forbidden actions
- Required output
- Approval gates
- Audit events
- Human reviewer
- Rollback or recovery notes

Sprint 1 should not implement autonomous agents. It should prepare the records, relationships, and activity history that agents will later require.

---

## 8. Infrastructure Architecture

CommandCore is local-first, offline capable, cloud enhanced, and enterprise ready.

The current X10 architecture is the infrastructure reference environment for local and self-hosted CommandCore services.

### 8.1 Current X10 Architecture

The current X10 architecture includes:

- Docker
- Portainer
- Traefik
- Cloudflare Tunnel
- LiteLLM
- Open WebUI
- Ollama
- Qdrant

These services establish the first self-hosted AI and operations substrate.

### 8.2 Component Responsibilities

**Docker** provides containerization for local and self-hosted services.

**Portainer** provides operational visibility and management for container workloads.

**Traefik** provides reverse proxy, routing, service discovery, TLS termination where appropriate, and clean service exposure.

**Cloudflare Tunnel** provides secure external access without directly exposing local services through open inbound ports.

**LiteLLM** provides an abstraction layer over model providers and model runtimes. It supports the no vendor lock-in principle for language model access.

**Open WebUI** provides a user-facing AI interface for local or routed models. It is an interface, not the CommandCore executive layer.

**Ollama** provides local model runtime capability for offline and private inference scenarios.

**Qdrant** provides vector storage for embeddings, semantic retrieval, and future knowledge search.

### 8.3 Future Infrastructure Services

Future services fit into the architecture as modular capabilities:

**PostgreSQL** becomes the preferred relational database for team, cloud, and enterprise deployments. SQLite remains appropriate for local-first Sprint 1.

**Redis** provides queues, caching, ephemeral coordination, rate limits, job state, and real-time coordination where needed.

**MinIO** provides S3-compatible object storage for local or self-hosted attachments, exports, artifacts, and generated files.

**Neo4j** provides graph storage for company worlds, relationships, capability dependencies, agent networks, infrastructure maps, and knowledge graphs if relational links become insufficient.

These services must remain optional infrastructure layers until the product requires them. Sprint 1 should not take unnecessary hard dependencies on them.

### 8.4 Infrastructure Rules

- Local-first remains the default.
- Offline capability remains a design requirement.
- Cloud services enhance, not replace, the local foundation.
- Self-hosted deployment must remain possible.
- Model providers must be abstracted where practical.
- Storage layers must be replaceable where practical.
- Infrastructure must support auditability.
- Secrets must not be stored in CommandCore records.
- Services should be modular and independently replaceable.

---

## 9. Development Philosophy

The following principles are locked:

- Architecture before implementation.
- Capabilities before products.
- Products consume reusable capabilities.
- No vendor lock-in.
- Modular by default.
- Local-first.
- Offline capable.
- Cloud enhanced.
- Enterprise ready.
- Search-first.
- Security-aware.
- No secret storage.
- Human-readable records.
- Source-cited intelligence.
- Pluggable agents.
- Practical first, magical later.

### 9.1 Architecture Before Implementation

Implementation must follow the operating model, not accidentally define it.

Sprint 1 may build simple versions of concepts, but it must name and structure them in ways that can scale into the locked architecture.

### 9.2 Capabilities Before Products

CommandCore does not merely collect products. It collects capabilities.

Products and companies consume capabilities. Projects may produce capabilities. The Innovation Lab discovers them. The Living Capability Library preserves them.

### 9.3 No Vendor Lock-in

CommandCore may integrate with vendors, models, runtimes, databases, and services. It must not become architecturally dependent on one provider unless explicitly approved by a later architecture decision.

### 9.4 Modular, Local-First, Cloud Enhanced

The first user value comes from local usefulness:

- Local database
- Local auth
- Local search
- Local backup/export
- Offline operation

Cloud and enterprise features should layer on top:

- Sync
- Encrypted backup
- Hosted services
- Team collaboration
- Advanced AI
- Shared capability libraries
- Enterprise audit and permissions

---

## 10. Sprint 1 Architectural Scope

Sprint 1 must establish the foundation without overbuilding the future.

The Sprint 1 product should be usable every day while clearly pointing toward the AI Enterprise Operating System architecture.

### 10.1 Foundation

Sprint 1 Foundation includes:

- Next.js application shell
- TypeScript
- Local authentication
- Workspace model
- SQLite through Prisma or equivalent ORM
- Basic settings
- Seed data
- Local backup/export path
- No mandatory cloud dependency

### 10.2 Architecture

Sprint 1 Architecture includes:

- Clear domain boundaries
- Workspace-scoped records
- Future-friendly company model
- Flexible record linking
- Activity log direction
- Search index direction
- No-secret validation strategy
- Capability-first vocabulary
- Agent-interface preparation

### 10.3 Repository Layout

Repository layout should remain practical and predictable.

The PRD suggested structure remains directionally valid:

```text
app/
  dashboard/
  projects/
  clients/
  accounts/
  runbooks/
  github-lab/
  tools-lab/
  hardware/
  ideas/
  search/
  settings/
components/
  layout/
  forms/
  tables/
  detail/
  shared/
lib/
  db.ts
  auth.ts
  search.ts
  validation.ts
  security.ts
prisma/
  schema.prisma
  seed.ts
data/
  uploads/
  backups/
docs/
  product/
  blueprint/
```

Future layout should allow:

- `companies`
- `nexus`
- `executive`
- `capabilities`
- `innovation`
- `agents`
- `infrastructure`

Do not rename existing code or move files for Sprint 1 unless a separate implementation task explicitly authorizes it.

### 10.4 Agent Interface

Sprint 1 should define the conceptual shape of the agent interface, even if it does not implement autonomous agents.

Minimum Sprint 1 preparation:

- Records have stable IDs.
- Records have workspace scope.
- Important records can be linked.
- Decisions are explicit.
- Next actions are explicit.
- Search can return source records.
- Activity logging is planned or minimally present.
- Commands are stored as copy-only records, not executed.

### 10.5 Executive Layer

Sprint 1 should establish the Executive Layer in naming and architecture.

Minimum Sprint 1 expression:

- Nexus v1 as dashboard or dashboard-equivalent route.
- Jarvis placeholder or documentation-ready route if useful.
- Executive role language in seed data, docs, or navigation.
- No fake AI behavior.
- No autonomous executive decisions.

### 10.6 Capability Library

Sprint 1 should establish the Living Capability Library as a first-class direction.

Minimum Sprint 1 expression:

- Capability-oriented fields or tags on Innovation Lab items.
- Review outcome vocabulary: Adopt, Adapt, Watch, Reject.
- Ability to link reusable components to projects or ideas.
- Documentation of future `Capability` entity.

### 10.7 Innovation Workflow

Sprint 1 should preserve the PRD research modules while grouping them under Innovation Lab.

Minimum Sprint 1 workflow:

1. Capture idea, repo, tool, or hardware item.
2. Link it to a project, company candidate, or client context.
3. Record why it matters.
4. Track status.
5. Record risk.
6. Record decision.
7. Record next action.
8. Promote useful outputs toward capability review.

### 10.8 Local Productivity MVP

Sprint 1 must still deliver the practical MVP foundation:

- Projects
- Clients
- Accounts Map
- Vault References
- Runbooks
- Local Commands
- Notes
- Decisions
- Next Actions
- Links
- Tags
- Universal Search
- Backup/export

This is the wedge that makes CommandCore useful before the executive layer becomes intelligent.

### 10.9 Nexus Foundation

The Nexus foundation should answer:

- What needs attention today?
- Which projects or company efforts changed recently?
- What is blocked?
- What lacks a next action?
- What lacks a runbook?
- What needs a decision?
- Which Innovation Lab items are active?
- Which capability candidates are emerging?

Sprint 1 may implement this as dashboard cards and lists. The architecture should treat it as the first version of the Nexus.

---

## 11. Sprint 1 Deliverables

Sprint 1 should accomplish the following.

### 11.1 Foundation Deliverables

- Local application runs without mandatory cloud services.
- Owner account can be created.
- Partner or member account can be created if included in the sprint.
- Workspace can be created or seeded.
- SQLite database exists.
- Backup/export exists at least as JSON export.
- Seed data can be loaded.

### 11.2 Architecture Deliverables

- Domain model supports workspace-scoped records.
- Records can link to projects and future company contexts.
- Notes, decisions, links, tags, and next actions support flexible related-object linking.
- Secret prevention exists in UI and server-side validation.
- Search index strategy is present.
- Activity log strategy is present.
- Future entities are documented: Company, Division, Department, Capability, Agent, Task, ExecutiveRole.

### 11.3 Repository Layout Deliverables

- Repository organization is documented and followed for new documentation.
- Production code is not moved or renamed as part of this documentation task.
- Future module areas are named consistently.

### 11.4 Agent Interface Deliverables

- Agent runtime independence is documented.
- Agent work contract is defined conceptually.
- Jarvis command layer is distinguished from pluggable engines.
- No implementation couples CommandCore to one runtime.

### 11.5 Executive Layer Deliverables

- Nexus is defined as Executive Headquarters.
- Jarvis, Hermes, Odysseus, and Athena roles are documented.
- Additional executive roles are reserved.
- Sprint 1 avoids fake executive automation.

### 11.6 Capability Library Deliverables

- Living Capability Library is defined.
- Capability Review outcomes are defined.
- Innovation Lab outputs can become capability candidates.
- Products consume capabilities.

### 11.7 Innovation Workflow Deliverables

- GitHub Review Lab, Tools Lab, Hardware Scratchpad, and Ideas Lab are unified under Innovation Lab.
- Technology Radar is defined.
- Project Incubator is defined.
- Innovation items track decision and next action.

### 11.8 Local Productivity MVP Deliverables

- Projects can be created, edited, archived, linked, and searched.
- Clients can be created, edited, archived, linked, and searched.
- Account map items store vault references only.
- Runbooks can be created and searched.
- Local commands can be stored and copied, not executed.
- Notes, decisions, next actions, links, and tags exist.
- Search finds core records.

### 11.9 Nexus Foundation Deliverables

- Dashboard or Nexus v1 shows operational attention areas.
- Next actions are visible.
- Recently updated work is visible.
- Blocked items are visible.
- Missing runbooks or missing next actions can be surfaced.
- Items needing decision can be surfaced.

---

## 12. Core Data Model Direction

The PRD data model remains the Sprint 1 baseline:

- Workspace
- User
- Project
- Client
- AccountMapItem
- VaultReference
- Runbook
- LocalCommand
- GitHubReview
- ToolItem
- HardwareItem
- Idea
- Note
- Decision
- NextAction
- Link
- Tag
- TagAssignment
- Attachment
- ActivityLog
- SearchIndex

Future architecture must support:

- Universe
- Nexus
- ExecutiveRole
- Company
- Division
- Department
- Team
- Agent
- Task
- Capability
- CapabilityReview
- TechnologyRadarItem
- IncubatorProject
- InfrastructureService
- KnowledgeRecord
- MorningBrief
- HealthSignal

Sprint 1 does not need to implement all future entities. It must preserve a clean migration path.

---

## 13. Security and Secret Handling

The no-secret rule from the PRD is locked.

CommandCore must not store:

- Passwords
- API keys
- Private keys
- Secret tokens
- Database passwords
- Recovery codes
- 2FA backup codes

CommandCore may store:

- Vault item names
- Vault provider names
- Non-secret account references
- URLs
- Usernames or emails where safe
- Runbook instructions that do not contain secrets
- Decision history
- Operational notes

Fields or content that appear to contain secrets must be rejected or warned against.

This rule is critical because future Jarvis and agent layers will read CommandCore memory. CommandCore memory must be safe to query.

---

## 14. Search and Knowledge Architecture

Universal Search is a core platform capability.

Sprint 1 search must find:

- Projects
- Clients
- Account map items
- Vault references
- Runbooks
- Local commands
- GitHub reviews
- Tools
- Hardware items
- Ideas
- Notes
- Decisions
- Next actions
- Links
- Tags

Future search becomes the retrieval layer for:

- Jarvis
- Executive briefings
- Agent context
- Cross-company knowledge
- Capability discovery
- Infrastructure awareness

Search results should preserve source identity so future AI answers can cite records instead of inventing context.

---

## 15. Navigation Direction

Sprint 1 may begin with the PRD navigation:

```text
Dashboard
Projects
Clients
Accounts Map
Runbooks
GitHub Lab
Tools Lab
Hardware
Ideas
Search
Settings
```

The architectural navigation direction is:

```text
Nexus
Companies
Projects
Operations
Innovation Lab
Capability Library
Agents
Infrastructure
Search
Settings
```

Sprint 1 does not need to expose every future section. It should avoid language that traps the product as a simple productivity app.

---

## 16. Decision Rules for Future Contributors

When making product or implementation decisions, use these rules:

1. If a decision conflicts with the constitution, follow the constitution.
2. If a decision weakens local-first usefulness, reconsider it.
3. If a decision stores secrets in CommandCore, reject it.
4. If a decision couples CommandCore to one agent runtime, reject it.
5. If a decision turns capabilities into project-only details, reconsider it.
6. If a decision makes companies second-class, reconsider it.
7. If a decision makes search or source citation harder, reconsider it.
8. If a decision helps Sprint 1 usefulness and preserves the future architecture, prefer it.
9. If a feature is impressive but not grounded in structured memory, defer it.
10. If a placeholder delays practical daily use, defer the placeholder.

---

## 17. Explicit Non-Goals for Sprint 1

Do not build these in Sprint 1 unless a later document explicitly changes scope:

- Autonomous agents
- Full Jarvis chat
- Executive Board automation
- Cloud sync
- Billing
- Public SaaS accounts
- Complex team permissions
- Browser extension
- Native mobile app
- Slack integration
- ClickUp integration
- Monday.com integration
- Google Drive integration
- GitHub OAuth
- Automatic domain scanning
- Real password manager
- Secret storage
- Client-facing portal
- Advanced analytics
- Complex notification system
- Calendar integration
- Production agent execution

---

## 18. Acceptance Standard

Sprint 1 is architecturally acceptable when:

- CommandCore is clearly positioned as an AI Enterprise Operating System.
- The MVP PRD is preserved as the Productivity & Operations foundation.
- Nexus is established as the Executive Headquarters.
- Jarvis is established as Chief Executive Intelligence.
- Hermes, Odysseus, and Athena are established executive roles.
- Companies are treated as future first-class living worlds.
- The current product portfolio is represented or reserved.
- Innovation Lab is established as a permanent platform capability.
- Living Capability Library is established as a permanent platform capability.
- Capability Reviews are defined.
- Technology Radar is defined.
- Project Incubator is defined.
- Agent engines are treated as pluggable.
- X10 infrastructure is documented.
- Future infrastructure services have a clear place.
- Local-first productivity remains usable.
- No production code was modified for this documentation task.

---

## 19. Final Architectural Statement

CommandCore must work now as a local-first Productivity & Operations foundation.

CommandCore must grow into an AI Enterprise Operating System.

The bridge between those two truths is Sprint 1.

The product should be useful before it is intelligent, structured before it is automated, and modular before it is expanded.

Capabilities are the reusable asset.

Companies consume capabilities.

Jarvis commands the executive layer.

Agent engines are replaceable.

The Nexus is headquarters.

The local-first MVP is the wedge.

The AI company universe is the destination.
