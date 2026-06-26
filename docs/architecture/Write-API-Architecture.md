# Write API Architecture (Beta-2)

## 1. Purpose

Defines the API-layer shape that carries Command submissions (Mission/Agent/Tool Commands, and others) from Nexus to CommandCore. This is the transport and contract layer; the Command model itself (actor, payload, policy_result) is defined in the Write Capability Architecture document.

## 2. Current State (Beta-1)

CommandCore's API is exclusively `GET` routes returning dashboard aggregations (`/dashboard/*`, `/health`, `/readiness`). There is no `POST`/`PUT`/`PATCH`/`DELETE` route anywhere in the API today, and `test_commandcore_api_is_read_only_for_defined_routes` exists specifically to lock this in.

## 3. Proposed Architecture

- **New route family**: write commands are exposed under a distinct path prefix (e.g., `/commands/*`), never layered onto the existing `/dashboard/*` read routes, so the read-only guarantee for `/dashboard/*` can remain mechanically testable and unambiguous.
- **Single submission shape**: one route (e.g., `POST /commands`) accepts a `{ kind, payload }` envelope rather than one bespoke route per command kind, mirroring the Command model's "one model, many kinds" design. Per-kind routes may be added later for ergonomics, but the underlying handler dispatch stays centralized.
- **Synchronous response contract**: the response to a command submission reports the command's immediate state (`accepted_pending_policy`, `accepted_pending_approval`, `rejected`, with a reason) — never a bare success boolean, since most commands will not execute synchronously.
- **Status polling / streaming**: a corresponding `GET /commands/{id}` route (read-only) lets Nexus poll a submitted command's state, reusing the existing read-route conventions; a streaming option (e.g., the existing WebSocket event replay pattern referenced in the Engineering Bible) is preferred over polling once available, but polling is an acceptable first cut.

## 4. Relationship to Existing Read API

- The Write API is additive. No existing `/dashboard/*` route changes shape or behavior because of this work.
- Dashboard routes may eventually reflect operator-submitted writes (e.g., a Nexus-created mission appearing in `/dashboard/missions`) — this is expected and desired, and requires no special-casing, since the kernel state both routes read from is the same.

## 5. Key Decisions / Open Questions

- Whether command kinds get individual REST routes once the pattern stabilizes, or stay unified under one envelope route indefinitely — defer this decision until at least three command kinds (Mission, Agent, Tool) are implemented and real ergonomics pain is felt.
- Whether the Write API requires a distinct API version marker from the read API, given they will evolve at different rates once writes exist.

## 6. Dependencies

- Depends on: Authentication Architecture, Permissions Architecture.
- Depended on by: Mission Commands, Agent Commands, Tool Commands, Workflow Engine, Approval Engine — all of these need this transport layer to exist before they can be implemented end to end.

## 7. Risks

- If write routes are added ad hoc per command kind without the centralized dispatch/validation/policy/audit pipeline this document specifies, every future command kind reinvents that pipeline slightly differently.
- Synchronous-looking responses that hide asynchronous approval/execution will mislead the UI into showing false "done" states; the response contract in §3 exists specifically to prevent this.
