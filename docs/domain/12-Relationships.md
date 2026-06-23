# Domain Relationships

## Purpose

This document formalizes the key domain relationships across CommandCore and provides canonical diagrams for Sprint 1 and future architecture.

## Responsibilities

- Show how the primary domain entities connect.
- Distinguish current operational substrate from future enterprise structure.
- Provide a diagrammatic reference for shared architectural understanding.

## Ownership

This relationship model is owned by CommandCore architecture and derived from the locked Constitution, Master Blueprint, and MVP PRD.

## Lifecycle

1. Sprint 1 relationships are centered on workspace-scoped operational records.
2. Future relationships expand upward into companies, capabilities, agents, tasks, and executive coordination.
3. Knowledge, search, and activity remain connective tissue across both stages.

## Relationships

### Mermaid ER Diagram

```mermaid
erDiagram
    WORKSPACE ||--o{ USER : contains
    WORKSPACE ||--o{ PROJECT : contains
    WORKSPACE ||--o{ CLIENT : contains
    WORKSPACE ||--o{ RUNBOOK : contains
    WORKSPACE ||--o{ LOCAL_COMMAND : contains
    WORKSPACE ||--o{ NOTE : contains
    WORKSPACE ||--o{ DECISION : contains
    WORKSPACE ||--o{ NEXT_ACTION : contains
    WORKSPACE ||--o{ LINK : contains
    WORKSPACE ||--o{ TAG : contains
    WORKSPACE ||--o{ ACTIVITY_LOG : contains
    WORKSPACE ||--o{ SEARCH_INDEX : contains

    CLIENT ||--o{ PROJECT : contextualizes
    PROJECT ||--o{ RUNBOOK : uses
    PROJECT ||--o{ LOCAL_COMMAND : uses
    PROJECT ||--o{ NOTE : informs
    PROJECT ||--o{ DECISION : records
    PROJECT ||--o{ NEXT_ACTION : drives
    PROJECT ||--o{ LINK : references

    COMPANY ||--o{ DIVISION : contains
    DIVISION ||--o{ DEPARTMENT : contains
    DEPARTMENT ||--o{ PROJECT : contains
    PROJECT }o--o{ CAPABILITY : consumes
    COMPANY }o--o{ CAPABILITY : consumes
    TEAM ||--o{ AGENT : coordinates
    AGENT ||--o{ TASK : executes
    TASK }o--|| PROJECT : supports
    AGENT }o--o{ CAPABILITY : uses
```

### Mermaid Architecture Diagram

```mermaid
flowchart TD
    U[Universe] --> N[Nexus]
    N --> EL[Executive Layer]
    EL --> J[Jarvis]
    EL --> ER[Executive Roles]

    N --> CW[Company Worlds]
    CW --> C[Company]
    C --> D1[Division]
    D1 --> D2[Department]
    D2 --> P[Project]
    P --> T[Team]
    T --> A[Agent]
    A --> TK[Task]

    P --> K[Knowledge]
    P --> I[Integrations]
    P --> CAP[Capabilities]

    J --> S[Search and Retrieval]
    S --> K
    A --> M[Model Abstraction]
    J --> M
    M --> L[LiteLLM]
    M --> O[Ollama]
    M --> R[Remote APIs]
```

### Mermaid Flow Diagram

```mermaid
flowchart LR
    Idea[Idea or Review Intake] --> Lab[Innovation Lab]
    Lab --> Review[Capability Review]
    Review -->|Adopt or Adapt| Capability[Capability]
    Review -->|Watch| Radar[Technology Radar]
    Review -->|Reject| Archive[Archived Learning]

    Capability --> Project[Project]
    Project --> Company[Company World]
    Project --> Search[Universal Search]
    Search --> Jarvis[Jarvis]
    Jarvis --> Recommendation[Decision or Next Action Recommendation]
    Recommendation --> Approval[Approval Layer]
    Approval --> Human[Human or Agent Execution]
    Human --> Memory[Knowledge and Activity Memory]
    Memory --> Search
```

## Future Extensions

- More detailed company-world decomposition
- Capability dependency networks
- Agent collaboration diagrams
- Knowledge graph-specific relationship views
- Infrastructure service topology diagrams

## Examples

Example 1:
- A project links runbooks, decisions, and next actions inside a workspace today, while remaining future-compatible with company attachment.

Example 2:
- A capability discovered in Innovation Lab is reviewed, promoted, then consumed by a project inside a company world.

## Rules

- Workspace scope is the Sprint 1 baseline.
- Company hierarchy is the future operating direction.
- Capabilities remain cross-project reusable assets.
- Executive coordination must stay above company, project, and agent layers.
- Diagrams describe domain relationships, not implementation APIs.
