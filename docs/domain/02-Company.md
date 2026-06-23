# Company Domain

## Purpose

This document defines the Company as a canonical future first-class domain object.

A Company is not a folder, label, or simple project group. A Company is a living operational world inside CommandCore.

## Responsibilities

- Hold the operational identity of a business world.
- Contain the context in which projects, teams, agents, knowledge, systems, and decisions operate.
- Consume capabilities.
- Expose company state to the Nexus and Executive Layer.
- Preserve history, risks, ownership, and active priorities.

## Ownership

The Company domain is owned by CommandCore architecture and governed by the Executive Layer.

A specific company world may have assigned executive attention and local operational owners.

## Lifecycle

Lifecycle pattern:
1. A company world is recognized as a first-class operating context.
2. Identity, mission, structure, knowledge, and active work are attached to that world.
3. Projects, teams, agents, and capabilities operate within the company.
4. Decisions, risks, metrics, and health signals change its operating state over time.
5. Activity history forms the company timeline.

Sprint 1 note:
- Companies may appear only as seed projects, tags, or placeholder records.
- The architecture must preserve an easy path to first-class Company objects.

## Relationships

- A Company belongs within the CommandCore universe and is visible to the Nexus.
- A Company may contain Divisions, Departments, Projects, Teams, Agents, Tasks, Systems, Decisions, Risks, and Opportunities.
- A Company consumes Capabilities.
- A Company may depend on Integrations, Infrastructure Services, and Knowledge.
- A Company is observed by executive roles and summarized by Jarvis.

## Future Extensions

- First-class division and department structures
- Company health signals
- Portfolio categorization
- Executive attention tracking
- Cross-company comparisons
- Company-level morning briefings

## Examples

Example 1:
- MindX is a company world containing projects, capabilities, knowledge, and active priorities around education products.

Example 2:
- Teachfolk may begin as a project/client context in Sprint 1 and later become part of a fuller company or external organization model.

Example 3:
- Future Ventures may act as a company world for incubating opportunities before they mature into distinct operating worlds.

## Rules

- Companies are living worlds, not folders.
- Companies are first-class objects in the future architecture.
- Companies consume capabilities.
- A company may contain many projects; projects are not the permanent top of the hierarchy.
- Company records must support executive visibility and activity history.

## Canonical Company Facets

### Identity

Identity is the durable definition of what the company is.

It includes the company name, portfolio category, and the contextual markers that distinguish the company world from others.

### Vision

Vision is the long-term direction the company world is pursuing.

It frames why the company exists in the broader CommandCore universe.

### Mission

Mission is the current operational purpose of the company world.

It gives executive, project, and agent work a shared target.

### Goals

Goals are the company-level intended outcomes that drive projects, capabilities, and decisions.

### Projects

Projects are the work containers inside the company world that produce concrete outcomes.

### Departments

Departments are future organizational groupings inside a company that organize operations below divisions and above projects.

Sprint 1 does not need to implement them as first-class objects.

### Knowledge

Knowledge is the company-scoped memory of systems, runbooks, decisions, notes, risks, and operational context.

### People

People are the human participants connected to the company world through teams, ownership, approval, communication, and review.

In Sprint 1, people are mainly represented through users, contacts, owners, and named records rather than a full human-resource model.

### AI Workforce

AI Workforce is the collection of agents and executive roles that act within or for the company world.

These actors are permission-aware and scoped through CommandCore interfaces.

### Metrics

Metrics are the signals used to understand company progress, health, operational readiness, and risk.

In the blueprint this aligns with future health signals, activity history, and executive summaries.

### Integrations

Integrations are the external systems, providers, and service relationships the company depends on.

### Capabilities

Capabilities are reusable enterprise skills the company consumes through projects, agents, or operations.

### Resources

Resources are the systems, infrastructure, knowledge, runbooks, tools, and human or agent capacity available to the company.

### Timeline

Timeline is the historical sequence of company activity, decisions, changes, and significant events.

### Operating State

Operating State is the current condition of the company world.

It is shaped by mission, status, risks, blockers, next actions, health signals, and recent activity.
