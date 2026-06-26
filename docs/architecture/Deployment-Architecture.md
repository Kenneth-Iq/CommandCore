# Deployment Architecture (Beta-2)

## 1. Purpose

Defines the hosting, configuration, and observability model for running CommandCore and Nexus outside of local development, once authentication, persistence, and write capability make a real deployment meaningful. Expands Beta-2 Backlog item 3.12.

## 2. Current State (Beta-1)

CommandCore runs as a single `uvicorn` process started manually; Nexus runs as a single Vite dev server or static build. The existing runbook (`docs/runbooks/Nexus-Beta-1-Demo-Walkthrough.md`) documents local and same-network demo usage only — there is no environment config strategy, secrets handling, or process supervision beyond a manually started process.

## 3. Proposed Architecture

- **Hosting model decision first**: before any deployment tooling is built, decide between self-hosted (operator runs the process/container themselves), containerized single-host (Docker Compose-style, one company/team), or managed multi-tenant hosting. This document assumes self-hosted or containerized single-host as the realistic Beta-2 target; managed multi-tenant hosting is a much larger decision deferred explicitly.
- **Process topology**: CommandCore API as one process, Nexus served as a static build behind a reverse proxy (rather than the Vite dev server) in any non-local environment. The reverse proxy is also the natural place to terminate TLS and enforce the authentication boundary at the network edge in addition to the application-layer checks in the Authentication Architecture.
- **Configuration**: environment-specific values (API base URL, persistence connection string, identity provider settings) are supplied via environment variables, following the same pattern already used for `VITE_COMMANDCORE_API_URL` today, not hardcoded or checked into source.
- **Secrets handling**: identity provider credentials and any persistence connection secrets are never committed to the repository or baked into a container image; they are injected at deploy time through whatever secrets mechanism the chosen hosting model provides (environment injection, mounted secret files, or a secrets manager).
- **Observability**: structured logs, and at minimum a liveness/readiness check building on the existing `/health` and `/readiness` routes, are required before any non-local deployment — given how central event-driven observability is to the product's own identity, the deployment of the product itself must not be a black box.

## 4. Key Decisions / Open Questions

- Containerization is likely the right first packaging step regardless of final hosting model, since it forces explicit dependency and configuration declaration even for self-hosted operators.
- Whether persistence (SQLite file) lives on a mounted volume for a containerized deployment, or whether the Persistence Architecture's database choice needs revisiting once real deployment constraints (e.g., multi-replica) are known.

## 5. Dependencies

- Depends on: Authentication Architecture (network-edge and application-layer auth both need a real deployment target to enforce against), Persistence Architecture (a deployed instance needs durable state to be worth deploying at all).
- Loosely related to: every other Stream D document, in that "deployment" is the point at which all of them become real rather than theoretical.

## 6. Risks

- Deploying before persistence and authentication are both solid means deploying a system that loses all state on restart and has no access control — not meaningfully safer than the current local-only posture, despite looking production-like.
- Treating containerization as sufficient observability on its own (i.e., "it runs in a container so it's fine") without structured logs or health checks wired to real monitoring leaves operators unable to diagnose a production incident.
