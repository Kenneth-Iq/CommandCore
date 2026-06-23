# Knowledge Domain

## Purpose

This document defines the Knowledge domain of CommandCore.

Knowledge is the memory substrate that allows CommandCore, Jarvis, and future agents to reason from source records instead of invention.

## Responsibilities

- Preserve operational memory in human-readable records.
- Support universal search and future knowledge retrieval.
- Connect global and local context across workspace, project, company, and executive views.
- Provide the basis for source-cited intelligence, capability discovery, and agent context.

## Ownership

Knowledge is owned by CommandCore architecture and governed through the no-secret rule, search, and future Oracle-directed memory functions.

In Sprint 1, knowledge is primarily expressed through workspace records, search, decisions, notes, runbooks, and linked operational records.

## Lifecycle

1. Knowledge is captured in structured records or linked artifacts.
2. It is associated with a workspace and often with a project or client.
3. Search makes it retrievable.
4. Executive and agent layers use it as context.
5. New decisions, outputs, and activity update the knowledge base over time.

## Relationships

- Knowledge supports Jarvis, executive briefings, agent context, capability discovery, and infrastructure awareness.
- Search is the primary retrieval mechanism in Sprint 1.
- Knowledge may be global, company-scoped, project-scoped, conversational, document-based, vectorized, or graph-shaped in future architecture.
- Qdrant is the future vector-storage reference in the infrastructure blueprint.
- Neo4j is the future graph-storage option if relational links become insufficient.

## Future Extensions

- First-class KnowledgeRecord entity
- Morning briefs sourced from structured knowledge
- Cross-company knowledge core
- Semantic retrieval
- Knowledge graph relationships
- Document ingestion and enrichment

## Examples

Example 1:
- A runbook explaining how to launch a local API is project knowledge and operational memory.

Example 2:
- A decision log about rejecting a tool due to legal risk is structured knowledge that can inform future capability reviews.

Example 3:
- A future semantic search over company and project records enables Jarvis to cite the right operational sources for a briefing.

## Rules

- Knowledge must remain source-cited and human-readable.
- Search is a core capability, not an afterthought.
- Knowledge available to Jarvis and agents must be safe to query.
- CommandCore must not store secrets in knowledge records.
- Missing information should be stated explicitly rather than invented.

## Canonical Knowledge Facets

### Global Knowledge

Global Knowledge is knowledge that spans the CommandCore universe, such as cross-company knowledge core, reusable capability context, executive rules, and architecture memory.

### Company Knowledge

Company Knowledge is the knowledge local to a company world, including mission context, systems, runbooks, risks, decisions, and active operations.

### Project Knowledge

Project Knowledge is the knowledge attached to a concrete project, including runbooks, links, decisions, notes, commands, and operating context.

### Conversation Memory

Conversation Memory is the remembered context originating from human or executive interaction threads.

The locked documents only imply this indirectly through Jarvis chat as an interface and future AI use of indexed data. It should therefore be treated as a future knowledge category, not a Sprint 1 chat implementation commitment.

### Document Memory

Document Memory is knowledge captured in human-readable documents such as runbooks, notes, briefs, reviews, and attached files.

### Vector Memory

Vector Memory is semantic retrieval memory backed by embeddings and vector storage.

The blueprint names Qdrant as the future vector storage reference.

### Structured Knowledge

Structured Knowledge is knowledge stored in explicit fields, statuses, links, timestamps, and typed records.

Sprint 1 depends heavily on this form.

### Knowledge Graph

Knowledge Graph is the future relationship-centric view of companies, capabilities, projects, agents, systems, and knowledge links.

The blueprint reserves Neo4j as a possible future graph layer if relational links become insufficient.
