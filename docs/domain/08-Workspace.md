# Workspace Domain

## Purpose

This document defines the Workspace as the Sprint 1 operational boundary of CommandCore.

The workspace is the local-first container in which records, users, search, and memory are scoped.

## Responsibilities

- Provide the top-level operational scope for Sprint 1 records.
- Hold users, settings, and local-first data.
- Bound ownership, search, and activity.
- Act as the practical wedge before first-class company worlds are fully implemented.

## Ownership

The Workspace is owned by its users, with MVP roles of `owner` and `member`.

Architecturally, the Workspace belongs to the local-first foundation of CommandCore.

## Lifecycle

1. A workspace is created or seeded.
2. Users are attached to the workspace.
3. Core records are created within workspace scope.
4. Search, backups, and activity history operate inside this boundary.
5. The workspace becomes the practical container for daily operational memory.

## Relationships

- Every major MVP entity belongs to a workspace.
- Users belong to a workspace.
- Projects, clients, records, activity, and search index entries are workspace-scoped.
- The workspace is the current practical container for future company, capability, and agent evolution.

## Future Extensions

- Multi-workspace governance
- Shared capability libraries across workspaces
- Team and cloud versions
- Encrypted sync
- Hosted collaboration

## Examples

Example 1:
- Kenneth and partner use one local-first workspace as the private command center for projects, runbooks, decisions, and search.

Example 2:
- Seed data loads MindX, Jarvis, Teachfolk, and related records into a workspace to establish initial operational memory.

## Rules

- Every major Sprint 1 entity belongs to a workspace.
- The workspace must remain local-first and offline-capable.
- The workspace must support backup and export.
- The workspace must not weaken the path to first-class company worlds.
- Workspace records must honor the no-secret rule.

## Canonical Workspace Facets

### Scope

Scope is the boundary that determines which records, users, and activity belong together operationally.

### Membership

Membership is the set of users allowed to participate in the workspace.

In the MVP this is limited to `owner` and `member`.

### Locality

Locality is the workspace commitment to local database, local storage, offline usefulness, and no mandatory cloud dependency.

### Memory Boundary

Memory Boundary is the rule that search, records, and activity are scoped first to the workspace before broader enterprise layers are introduced.
