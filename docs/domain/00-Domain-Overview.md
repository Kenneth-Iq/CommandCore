# CommandCore Canonical Domain Overview

## Purpose

This document defines the canonical domain shape of CommandCore as derived from the locked Constitution, Master Blueprint, and MVP PRD.

Its purpose is to provide a shared language for Sprint 1 and future development without redesigning the platform or inventing implementation.

## Responsibilities

- Establish the domain boundaries of CommandCore as an AI Enterprise Operating System.
- Distinguish the Sprint 1 operational baseline from future reserved entities.
- Define how executive, company, capability, project, agent, task, knowledge, workspace, conversation, integration, and model concepts relate.
- Anchor all downstream domain documents to the same vocabulary.

## Ownership

The domain model is owned by CommandCore architecture.

The Constitution and Master Blueprint remain the immutable source of truth. This overview is a formal interpretation of those locked documents, not a replacement for them.

## Lifecycle

Current state:
- Sprint 1 baseline is the local-first Productivity & Operations foundation.
- Future state is the full AI Enterprise Operating System with first-class companies, capabilities, agents, and executive intelligence.

Lifecycle progression:
1. Structured operational memory is created in a workspace.
2. Projects, clients, runbooks, decisions, and next actions form the initial operating substrate.
3. Innovation items are reviewed for reusable capability value.
4. Capabilities become reusable enterprise assets.
5. Companies consume capabilities through projects, teams, agents, and tasks.
6. Nexus and Jarvis use search, knowledge, and source records for executive coordination.

## Relationships

Locked hierarchy:

```text
Universe
  Nexus
    Executive Layer
      Company
        Division
          Department
            Project
              Team
                Agent
                  Task
```

Sprint 1 baseline entities:
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

Future reserved entities:
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

## Future Extensions

- First-class Company worlds
- Living Capability Library
- Capability Reviews
- Technology Radar
- Project Incubator
- Agent work contracts
- Executive briefings
- Knowledge graph and vector retrieval
- Model-provider abstraction and routing

## Examples

Example 1:
- A `Runbook` and `LocalCommand` help operate Teachfolk locally.
- Their records remain workspace-scoped.
- Their information becomes part of the memory layer Jarvis may later query.

Example 2:
- A GitHub review identifies a reusable PDF utility.
- The review becomes an Innovation Lab item.
- The useful output is promoted into a future Capability candidate.

Example 3:
- A future Company such as MindX consumes several Capabilities through Projects and Agents while remaining visible to the Nexus.

## Rules

- The Constitution and Master Blueprint are authoritative.
- CommandCore is an AI Enterprise Operating System, not a simple project app.
- Sprint 1 preserves the MVP as the Productivity & Operations foundation.
- Companies are future first-class living worlds, not folders.
- Capabilities are reusable assets; projects may produce them and companies consume them.
- Agent engines are plugins; CommandCore owns the architecture.
- Tasks are execution units, never the central product model.
- Search and source citation are core domain requirements.
- CommandCore must not store secrets.
