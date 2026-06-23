# CommandCore Ubiquitous Language

## Purpose

This document provides one canonical definition for the important terms used across CommandCore.

Its purpose is to remove ambiguity during Sprint 1 and future development.

## Responsibilities

- Define official CommandCore terms once.
- Align architecture, product, and implementation language.
- Prevent accidental redesign through inconsistent vocabulary.

## Ownership

This glossary is owned by CommandCore architecture and grounded in the locked Constitution, Master Blueprint, and MVP PRD.

## Lifecycle

1. Terms are defined from locked source documents.
2. Teams use the terms consistently in planning, design, implementation, and review.
3. Future additions should extend this glossary rather than creating competing definitions.

## Relationships

- This glossary applies across all domain documents in `docs/domain`.
- Definitions for future reserved entities must remain compatible with the locked hierarchy and principles.

## Future Extensions

- Add new terms only when they become architecturally necessary.
- Retain one canonical term per concept.
- Record replacements explicitly if a term ever changes by approved architecture decision.

## Examples

Example:
- Use `Capability` for reusable enterprise skill.
- Do not substitute it with vague alternatives such as feature block, reusable chunk, or utility pattern when the reusable enterprise meaning is intended.

## Rules

- Every important concept should have one canonical definition.
- Prefer the official CommandCore term over generic substitutes.
- Do not redefine locked terms locally inside feature work.
- If a term is future-facing, describe it as reserved or conceptual rather than implemented.

## Glossary

### Activity Log

The record of meaningful actions taken in a workspace or future operating context.

### Agent

A worker that executes scoped work through CommandCore interfaces, permissions, memory, and approved runtimes.

### Agent Engine

A pluggable runtime that executes agent work. It is not the CommandCore architecture.

### Approval Gate

A required review or authorization boundary in a task or agent work contract.

### Approval Layer

The conceptual governance layer that controls what work may proceed and where human approval is required.

### Attachment

A file linked to another record inside the workspace memory model.

### Athena

The locked executive role of Chief Operations Officer.

### Capability

A reusable enterprise skill that can be consumed by companies, projects, or agents.

### Capability Review

The evaluation process that scores a reusable candidate and yields Adopt, Adapt, Watch, or Reject.

### Client

An external organization context tracked by the MVP operational foundation.

### Cloud Enhanced

The principle that cloud services may extend CommandCore but must not replace the local-first foundation.

### CommandCore

The AI Enterprise Operating System that serves as the operating layer for companies, capabilities, agents, infrastructure, knowledge, decisions, and executive intelligence.

### Company

A living operational world inside CommandCore. It is future first-class and not a folder or simple project group.

### Company World

Another name for a Company understood as a living operating environment containing projects, teams, agents, systems, knowledge, and decisions.

### Constitution

The locked foundational identity document of CommandCore.

### Conversation

A future interaction thread between humans and CommandCore intelligence surfaces. It is one interface, not the executive layer itself.

### Cross-company Knowledge Core

The Nexus-held knowledge context that spans multiple company worlds.

### Decision

A record of a meaningful choice, including context, chosen option, reason, and review timing.

### Decision Engine

The conceptual executive reasoning function that evaluates context and recommends decisions or next actions.

### Department

A future organizational level inside a company world below division and above project.

### Division

A future organizational level inside a company world above department.

### Executive Intelligence

The function of turning structured memory into actionable executive understanding.

### Executive Layer

The senior intelligence and coordination layer of CommandCore that governs reasoning, review, delegation, briefings, security, research, operations, infrastructure, communications, memory, and capability management.

### Executive Role

A first-class future role inside the Executive Layer, such as Jarvis, Hermes, Odysseus, or Athena.

### Forge

The reserved executive role of Infrastructure Director.

### Future Ventures

One of the initial company portfolio items named in the Constitution and Blueprint.

### Health Signal

A future signal used to summarize operational condition, risk, or readiness.

### Hermes

The locked executive role of Chief Technology Officer.

### Idea

An Innovation Lab item capturing a potential product, capability, experiment, or opportunity.

### Innovation Interview

Not a canonical term in the locked documents and should not be used as a substitute for Innovation Lab review work.

### Innovation Lab

The permanent intake and experimentation environment for ideas, repos, tools, hardware, services, and reusable patterns.

### Infrastructure Service

A future first-class representation of an operational service such as LiteLLM, Ollama, Qdrant, Docker, or Traefik.

### Jarvis

Chief Executive Intelligence and the command layer of CommandCore.

### Knowledge

The memory substrate formed by structured records, search, documents, decisions, and future retrieval layers.

### Knowledge Graph

The future relationship-centric knowledge view across companies, capabilities, projects, agents, systems, and records.

### Knowledge Record

A future first-class knowledge object in the CommandCore architecture.

### LiteLLM

The named model abstraction layer over model providers and runtimes.

### Living Capability Library

The permanent registry of reusable CommandCore capabilities.

### Local-first

The principle that the first useful version of CommandCore runs locally with local data and no mandatory cloud dependency.

### Memory Layer

The conceptual memory substrate of structured records, search, knowledge retrieval, decisions, and next actions used by executive and agent reasoning.

### Mission

The operational purpose of a company, project, or task context.

### Mission Orchestrator

The conceptual coordination function that aligns executive intent with companies, projects, capabilities, humans, and agents.

### Model

A reasoning runtime or language model made available through CommandCore's abstraction layer.

### Morning Brief

A future executive summary object for daily or periodic operating awareness.

### Next Action

The MVP work-memory record for the next concrete thing that should happen.

### Nexus

The executive headquarters of CommandCore.

### Odysseus

The locked executive role of Chief Research Officer.

### Ollama

The named local model runtime reference for offline and private inference scenarios.

### Oracle

The reserved executive role of Knowledge and Memory Director.

### Outcome

The concrete result produced by a project, task, capability, or decision path.

### Portfolio

The current set of company worlds or company candidates inside CommandCore.

### Project

The core work container of the Sprint 1 foundation and a long-term operating unit inside a company world.

### Project Incubator

The future domain that turns validated ideas and capabilities into company projects.

### Qdrant

The named vector storage reference for embeddings and semantic retrieval.

### Remote API

A non-local provider interface accessed through the model abstraction layer or other integration patterns.

### Runbook

Operational instructions for launching, testing, recovering, deploying, or otherwise operating a system.

### Search Index

The retrieval structure that powers universal search across CommandCore records.

### Sentinel

The reserved executive role of Security Director.

### Sprint 1

The bridge phase that preserves the MVP as a useful local-first foundation while preparing the full enterprise architecture.

### Task

A future execution unit beneath an agent in the hierarchy. It is never the central product model.

### Team

A future grouping of humans, agents, systems, and responsibilities that sits between project and agent.

### Technology Radar

The future tracking domain for technologies, frameworks, tools, runtimes, models, services, databases, and patterns.

### Universe

The top-level operating context above the Nexus.

### Universal Search

The core search capability that retrieves CommandCore records and preserves source identity.

### User

A human participant in a workspace, with MVP roles of owner or member.

### Vault Reference

A safe pointer to an external password-manager item. It stores a reference, not the secret itself.

### Workspace

The Sprint 1 operational boundary that scopes users, records, search, and local-first memory.
