# Conversation Domain

## Purpose

This document defines Conversation as the future interaction domain for human, executive, and agent exchanges inside CommandCore.

Conversation is not the product itself. It is one interface through which executive intelligence, work coordination, and memory may be expressed.

## Responsibilities

- Capture structured interaction context between humans and CommandCore intelligence surfaces.
- Preserve prompts, responses, clarifications, and cited references where appropriate.
- Feed approved context back into the knowledge and memory layers.
- Support briefing, delegation, review, and explanation workflows.

## Ownership

Conversation is governed by the Executive and Knowledge domains.

Jarvis may use conversation as an interface, but Jarvis is not reducible to conversation.

## Lifecycle

Future lifecycle:
1. A conversation is initiated around a question, decision, briefing, or task.
2. Context is retrieved from approved records.
3. Responses are generated with citations and safety checks.
4. Important outputs may be promoted into durable records such as notes, decisions, or tasks.
5. The conversation history becomes a recoverable context layer where appropriate.

Sprint 1 note:
- Full Jarvis chat is an explicit non-goal.
- Conversation should therefore be treated as a reserved future domain concept, not an implementation promise.

## Relationships

- Conversation may serve as an interface to Jarvis, executive roles, and future agents.
- Conversation depends on Knowledge, Search, Memory Layer, and Approval Layer.
- Conversation may produce Notes, Decisions, Next Actions, or Task proposals.
- Conversation is subordinate to source records; it should not replace them.

## Future Extensions

- Executive briefing threads
- Agent task handoff conversations
- Review and approval dialogues
- Conversation-to-record promotion
- Persistent conversational memory

## Examples

Example 1:
- A user asks, "Which projects have no next action?" and receives a cited answer from indexed records.

Example 2:
- A future conversation with Jarvis summarizes a company world and proposes executive attention areas.

Example 3:
- A human reviews an agent's proposed work through a conversation-based approval step before execution.

## Rules

- Conversation is an interface, not the executive layer itself.
- Conversation responses must cite source records where possible.
- Conversation must not invent missing context.
- Conversation must respect the no-secret rule.
- Sprint 1 must not implement full Jarvis chat as though it were already in scope.

## Canonical Conversation Facets

### Thread

Thread is the bounded exchange around one mission, question, review, or decision context.

### Turn

Turn is a single human or system contribution inside a thread.

### Context

Context is the approved set of records, search results, and memory made available to the conversation.

### Citation

Citation is the explicit link back to source records that grounds the conversation in real system memory.

### Promotion

Promotion is the act of converting a conversational result into durable operational memory, such as a decision, note, or next action.
