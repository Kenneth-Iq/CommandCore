# Project Domain

## Purpose

This document defines Projects as the core work containers of the Sprint 1 operating foundation and as long-term operating units inside company worlds.

Projects produce outcomes, consume capabilities, and coordinate work.

## Responsibilities

- Hold the operational context for active work.
- Link runbooks, links, decisions, next actions, accounts, research, and notes into one working unit.
- Produce deliverables, outcomes, learning, and sometimes reusable capabilities.
- Coordinate humans, agents, and systems around a concrete mission.

## Ownership

A project has an owner and may also belong to a client or, in the future architecture, to a company, division, and department context.

The Project domain is part of the Productivity & Operations foundation but must remain compatible with the broader enterprise architecture.

## Lifecycle

Sprint 1 lifecycle:
1. A project is created inside a workspace.
2. Core operational metadata and related records are linked.
3. Decisions and next actions keep the project actionable.
4. Activity history and searchability preserve project memory.
5. The project is paused, archived, rejected, or promoted as needed.

Long-term lifecycle:
1. A project is placed inside a company world.
2. It consumes capabilities and coordinates teams and agents.
3. It may generate reusable outputs for the capability library.

## Relationships

- A Project belongs to a Workspace in Sprint 1.
- A Project may be linked to a Client in Sprint 1.
- In future architecture, a Project belongs within a Company, Division, and Department context.
- A Project links to runbooks, local commands, notes, decisions, next actions, links, tags, attachments, and activity.
- A Project may produce or consume Capabilities.
- A Project may coordinate Agents and Tasks in future architecture.

## Future Extensions

- Explicit company attachment
- Team and agent assignment
- Capability dependency views
- Health signals
- Project incubator promotion paths
- Richer cross-project portfolio reporting

## Examples

Examples from the PRD seed set:
- MindX
- Hatchling Heroes
- Jarvis
- Teachfolk
- Refiant.ai
- Tirra / Linkff WiFi Bridge

## Rules

- Projects are the Sprint 1 spine but not the permanent top of the hierarchy.
- Every meaningful item should be linkable to a project where relevant.
- Projects must remain searchable, actionable, and resumable.
- Projects may produce capabilities but must not trap capability value as project-only detail.
- Project memory must not store secrets.

## Canonical Project Facets

### Belongs to Companies

In the locked long-term model, projects belong to company worlds and sit below divisions and departments.

Sprint 1 must not assume a project is the highest permanent object.

### Produces Outcomes

A project exists to produce a concrete result, deliverable, improvement, experiment, or validated decision.

### Consumes Capabilities

A project uses reusable capabilities, patterns, tools, or workflows from the broader CommandCore ecosystem.

### Coordinates Agents

A project may coordinate humans, systems, and future agents as part of its execution model.

This coordination is conceptual in Sprint 1 and must not imply autonomous agent implementation.
