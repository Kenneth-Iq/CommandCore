# Model Domain

## Purpose

This document defines the AI model abstraction domain of CommandCore.

Models are replaceable reasoning resources made available through an abstraction layer rather than treated as the architecture itself.

## Responsibilities

- Abstract language model providers and runtimes.
- Support local and remote model execution.
- Preserve no vendor lock-in.
- Enable future routing and fallback for Jarvis and agents.

## Ownership

The Model domain is owned by CommandCore architecture and sits adjacent to infrastructure and agent execution.

LiteLLM is the explicitly named abstraction layer in the locked blueprint.

## Lifecycle

1. A model provider or runtime is connected through the abstraction layer.
2. Models become available to executive or agent roles.
3. Routing chooses an appropriate model for a task or context.
4. Fallback handles provider or runtime failure.
5. The model landscape evolves without redefining CommandCore architecture.

## Relationships

- Models support Jarvis and future Agents.
- LiteLLM abstracts model providers and runtimes.
- Ollama provides local model runtime capability.
- Open WebUI may provide a user-facing AI interface but is not the executive layer.
- Remote APIs are possible providers behind the abstraction layer.
- Infrastructure choices influence model availability but should remain modular.

## Future Extensions

- Explicit model policy by role
- Cost and latency awareness
- Model quality and safety scoring
- Provider health-based routing
- Multi-provider resilience

## Examples

Example 1:
- A local privacy-sensitive workflow uses an Ollama-hosted model through the model abstraction layer.

Example 2:
- A future executive summary route uses a remote model provider through LiteLLM while preserving provider replaceability.

Example 3:
- If a preferred provider is unavailable, a compatible fallback model is selected without changing the surrounding domain model.

## Rules

- Model providers must be abstracted where practical.
- CommandCore must not become architecturally dependent on one provider unless later explicitly approved.
- Local model runtime and remote APIs must be able to coexist.
- Model choice must not weaken the no-secret rule.
- Models are tools for intelligence surfaces, not the identity of CommandCore.

## Canonical Model Facets

### Providers

Providers are the external or local sources of model capability.

The locked documents explicitly support pluggable model providers and runtimes.

### Routing

Routing is the selection logic that chooses which model or runtime should serve a given executive or agent need.

The blueprint explicitly names routed models through LiteLLM and local runtime support through Ollama.

### Fallback

Fallback is the ability to move from one model provider or runtime to another when the preferred option is unavailable or unsuitable.

This follows directly from the no vendor lock-in principle.

### LiteLLM

LiteLLM is the named abstraction layer over model providers and runtimes.

Its architectural importance is provider neutrality, not product identity.

### Ollama

Ollama is the local model runtime reference for offline and private inference scenarios.

### Remote APIs

Remote APIs are non-local model provider interfaces accessed through the abstraction layer.

The blueprint allows them while insisting on modularity and vendor replaceability.

### Future Providers

Future Providers are any additional model vendors or runtimes that can be added without changing CommandCore's core domain architecture.
