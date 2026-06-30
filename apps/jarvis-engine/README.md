# @commandcore/jarvis-engine

A standalone Jarvis conversation engine skeleton: deterministic, no-AI turn
processing contracts and a dev/test engine implementation. Defines the future
durable conversation pipeline ahead of replacing
`apps/nexus-console/src/conversationOrchestrator.ts`'s frontend simulation —
see `docs/architecture/Jarvis-Conversation-Engine-Boundary.md`.

## What this is

- Pure TypeScript, no framework, no AI/LLM dependency of any kind.
- Core type contracts (`src/types.ts`): `JarvisConversationInput`,
  `JarvisConversationContext`, `JarvisConversationEvidence`,
  `JarvisConversationFollowUp`, `JarvisConversationDecision`,
  `JarvisApprovalNeededMarker`, `JarvisConversationResponse`,
  `JarvisConversationTurn`, and the `JarvisConversationEngine` interface
  (`processTurn(input): JarvisConversationResponse`).
- `DeterministicJarvisConversationEngine` (`src/engine.ts`) — a deterministic,
  keyword-based implementation (mirroring the same approach
  `conversationOrchestrator.ts` already rehearses in the frontend, but
  reimplemented independently here, not imported from there). Same input
  always produces the same output.
- A narrow `JarvisMemoryStore` interface the engine may optionally be given
  at construction — `retrieve(query): JarvisMemoryRecord[]`, read-only, no
  write method exists on the interface at all. "GlassmindStore-like" in
  spirit, but declared independently rather than depending on
  `apps/glassmind` directly, for the same decoupling reason
  `apps/glassmind` declares its own `EvidenceLink` independently of Nexus's.

## Honesty guarantees

- **Memory retrieval status is always explicit and honest.** `not_queried`
  (no memory store configured) is distinct from `no_memory_found` (queried,
  nothing came back) is distinct from `found` (with a record count). Neither
  empty case is ever treated as an error, and the engine never invents a
  recollection when memory comes back empty — see `engine.test.ts`'s
  "represents empty memory retrieval honestly" test.
- **Evidence is never fabricated.** The engine only includes an evidence item
  in its response when the memory store itself supplied one on a record; a
  memory record with no evidence contributes to the retrieval's record count
  but never produces an invented evidence item.

## What this is not (yet)

- Not connected to a real LLM — `DeterministicJarvisConversationEngine` is
  the only implementation, and it is deterministic keyword matching, the
  same boundary `conversationOrchestrator.ts` already operates inside.
- Not connected to `apps/glassmind` — `JarvisMemoryStore` is a narrow,
  independently-declared interface; wiring a real `GlassmindStore` behind it
  is later, separate integration work.
- Not connected to the Nexus frontend (`apps/nexus-console`) — no import in
  either direction. This package does not replace
  `conversationOrchestrator.ts`'s frontend simulation; it defines the
  contract a future durable engine will satisfy.
- Not connected to CommandCore's kernel (`core/`) — no write path exists
  anywhere in this package. `processTurn` only ever reads from an optional,
  write-method-less `JarvisMemoryStore`.
- Approval markers are markers only — `JarvisApprovalNeededMarker` flags
  that an approved command would be required; the engine never issues,
  requests, or simulates issuing one.

## Why this lives under `apps/`

Same reasoning as `apps/glassmind/README.md`: `services/` holds gitignored
runtime sandboxes, not tracked source; `core/` is CommandCore's Python
kernel with no TypeScript runtime to import a package into; `apps/nexus-console`
is the frontend this package must stay decoupled from. `apps/jarvis-engine`
sits as a sibling app — backend-safe domain code, not frontend UI, not a
database client, not an LLM client — consistent with the precedent
`apps/glassmind` already established.

## Commands

```
npm install
npm test    # vitest run
npm run build  # tsc -b
```
