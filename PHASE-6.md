# Phase 6 Specification — Command Bridge v2 "Fleetglass"

**Version:** 1.0 · **Date:** 2026-06-12 · **Parent:** commander's Fleetglass brief + VISION.md §4 (Command Bridge), PRD §security
**Scope:** a premium command-centre UI for the expanded Electron window: live 3D agent constellation, mission rail, approval deck, sitrep stream, voice dock, system ribbon, artifact drawer. App-only — no changes to core/, services/, docker/, or the security model.

---

## 0. Outcome

The expanded window opens on a **Bridge** view (new default tab; all existing tabs remain): dark-graphite glass panels, the agent fleet rendered as a living constellation around Jarvis Prime, missions and approvals at a glance, live event stream below, voice state + command input docked at the bottom. Iron-Man-workshop-meets-SRE-control-room; no fake sci-fi clutter. Works fully offline via mock mode.

Layout (per the brief):

```
┌──────────────────────────────────────────────────────────────┐
│  SystemRibbon: Core/engine health, model, voice, approvals    │
├───────────────┬──────────────────────────────┬───────────────┤
│ MissionRail   │  AgentConstellation (R3F)     │ ApprovalDeck  │
├───────────────┴──────────────────────────────┴───────────────┤
│ SitrepStream: live events, tools, findings, alerts            │
├──────────────────────────────────────────────────────────────┤
│ VoiceDock: state, transcript, command input, push-to-talk     │
└──────────────────────────────────────────────────────────────┘
```

## 1. Deviations from the brief (architecture fit)

The brief is adopted wholesale except where it conflicts with the existing, working architecture:

1. **Events arrive over the existing IPC bridge, not a renderer WebSocket.** The main process already owns the Core WS connection (`core-client.js`: reconnect/backoff/offline detection) and broadcasts every event as `jarvis:event`. The renderer subscribes via `window.jarvis.onCoreEvent` — adding a second, renderer-owned socket would duplicate connection state and violate the thin-renderer rule for no gain. `VITE_JARVIS_EVENTS_URL` is therefore not used; Core address stays main-process config.
2. **JSX, not TypeScript** — the project is plain JS; the brief defers to existing style. The `types/jarvis.ts` file becomes JSDoc typedefs in `lib/jarvisEvents.js`.
3. **Approvals ride the existing confirmation flow.** Core `approval.requested` → main `confirm()` → `jarvis:confirmation-request` broadcast → renderer responds via `confirmationResponse(id, confirmed)`. ApprovalDeck renders cards from that channel, enriched with tier/agent/mission from the matching `approval.requested` Core event. No new REST path.
4. **ArtifactDrawer uses the existing sandbox IPC** (`fileList`/`fileRead`, already sandbox-jailed in main) to browse `missions/<mission_id>/`. No new filesystem access.
5. **3D stays out of the compact overlay** (per the brief) — Fleetglass mounts only in the expanded window.

## 2. Files

```
app/src/renderer/src/
├── command-bridge/
│   ├── CommandBridge.jsx        # layout shell + panel composition
│   ├── AgentConstellation.jsx   # R3F scene
│   ├── MissionRail.jsx
│   ├── ApprovalDeck.jsx
│   ├── SitrepStream.jsx
│   ├── VoiceDock.jsx
│   ├── SystemRibbon.jsx
│   ├── ArtifactDrawer.jsx
│   └── command-bridge.css
├── lib/jarvisEvents.js          # event typedefs + mock event generator
└── store/jarvisStore.js         # zustand store
```

`ExpandedPanel.jsx` gains a **Bridge** tab (first + default); existing tabs untouched.

## 3. Store (zustand)

Single store fed by one subscription point (`initJarvisFeed(store)` in `jarvisEvents.js`):

- `coreOnline`, `mockMode`, `engine`, `model`, `version` (from `core.status` / `coreStatus()` / health)
- `voiceState`, `transcript` (from `onStateChange` / `onTranscription`)
- `missions: {id -> mission}` (seeded via `coreMissions()`, updated by `mission.*` events)
- `agents: {mission_id -> {agent_id -> {role, state, lastTool, detail}}}` (from `agent.*`/`tool.*`)
- `approvals: [{id, action, description, tier, agent_id, mission_id, requireDouble}]` (confirmation requests joined with `approval.requested` payloads)
- `events: [last 200]` ring buffer for SitrepStream
- `selectedMissionId`, `artifactDrawer: {open, missionId}`

## 4. Mock mode

If `coreStatus()` reports offline at mount (and on transition to offline with zero missions), `startMockFeed()` seeds 2 demo missions and emits a scripted loop every 2s: `mission.created → plan.proposed → agent.spawned ×3 → agent.status/tool.call interleave → approval.requested → sitrep → mission.completed`, then repeats with fresh ids. Mock approvals resolve locally. A `MOCK` badge shows in the ribbon. Live events always win: the moment Core comes online, mock stops and the store reseeds from REST.

## 5. AgentConstellation

- React Three Fiber + drei, mounted only while the Bridge tab is visible (unmount on tab switch — pauses all animation).
- Nodes: **Prime** centre orb (cyan); orbit ring of role nodes — Researcher (blue), Writer (violet), Analyst (amber), Operator (red, lock ring), Sentinel (green, watchtower elevation); **Odysseus** data core below (teal, slow rotation); **Hermes** engine ring around Prime.
- Node state from the store: idle (dim), planning/thinking (slow pulse), running/acting (bright pulse + orbit speed up), waiting_approval (amber flash), failed (red flare), done (steady glow).
- Event beams: an animated line Prime→node fires on `agent.spawned`/`tool.call` for that role (fades over ~1s).
- Performance: `dpr={[1, 1.5]}`, no postprocessing, ≤ ~40 meshes, `frameloop="always"` only when visible, `prefers-reduced-motion` → static scene (no orbit animation, state shown by colour only).

## 6. Panels

- **SystemRibbon** — Core online/offline dot, engine + model (from `core.status` event / `/health` via `coreStatus`), voice state chip, pending-approval count, MOCK badge. Token cost shown as `—` (Core doesn't report cost yet; typed TODO).
- **MissionRail** — missions newest-first: title, status chip (colour-coded), mode icon (chat/mission/research), active-agent count, relative time. Click selects (drives constellation focus + sitrep filter + artifact drawer target). "＋" quick-launch input (mission mode) reusing `coreCreateMission`.
- **ApprovalDeck** — cards: action, tier badge (T2 amber / T3 red), agent, mission title, payload summary, Approve / Deny buttons → `confirmationResponse`; double-confirm honored when `requireDouble`. Success/failure feedback inline (card flips to resolved state, then slides out via framer-motion).
- **SitrepStream** — virtualless capped list (last 200): timestamp, agent chip, type, payload summary; sitreps and `mission.failed` highlighted; `memory.recalled` and `research.progress` rendered with their own icons. Filter: all / selected mission.
- **VoiceDock** — voice state indicator (idle/listening/processing/speaking waveform-ish CSS animation), last transcript, text input → `sendMessage` (chat) with response appended to stream, push-to-talk button → `startListen()`.
- **ArtifactDrawer** — slide-over (framer-motion): `fileList('missions/<id>')`, click file → `fileRead` preview (text only, 50 KB cap, binary detection by extension). Empty state explains artifacts appear when missions write files.

## 7. Style

`command-bridge.css`: graphite `#0b0e13` background, glass panels (`rgba(255,255,255,.04)` + 1px `rgba(255,255,255,.08)` borders + backdrop-blur), status glows — cyan `#4fc3f7`, violet `#b388ff`, emerald `#69f0ae`, amber `#ffd54f`, red `#ff5252`. Readability first: body text ≥ 12px at ≥ 80% opacity; glow on accents only. `@media (prefers-reduced-motion: reduce)` kills pulses/beams/slide animations.

## 8. Dependencies (app/)

`three @react-three/fiber @react-three/drei framer-motion zustand lucide-react clsx` — all renderer-side; no new main-process deps; no Node/fs/secret access from the renderer (PRD rule, unchanged).

## 9. Acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| F1 | `npm run dev` starts; `npm run build` green | **done (2026-06-12)** — `electron-vite build` green; Three.js split into a lazy 1.4 MB chunk off the main path |
| F2 | Bridge renders with Core offline — mock missions, scripted events, MOCK badge | **pending visual** — code complete (mock feed in `jarvisEvents.js`) |
| F3 | Live mode: real mission shows in rail, constellation animates on agent/tool events, sitrep lands in stream | **pending visual** — code complete |
| F4 | Approval card Approve/Deny resolves the real broker (and the legacy dialog never double-fires) | **pending visual** — rides existing `confirmationResponse` IPC |
| F5 | No renderer console errors; Core WS drop/reconnect doesn't crash or wedge the UI | **pending visual** — reconnect owned by main-process `core-client.js` (already hardened in Phase 1); WebGL failure caught by `SceneBoundary` |
| F6 | No Node/fs/secret access from renderer (IPC only); contextIsolation intact | **done** — all data via `window.jarvis.*` IPC; no `require`/`fs`/`process` in `command-bridge/` |
| F7 | Reduced-motion preference disables animation | **done** — `prefers-reduced-motion` gates R3F frameloop + CSS keyframes |
| F8 | Existing tabs (Conversation/Missions/Files/Integrations/Action Log) still work | **done** — Bridge added as first tab; others rendered by the unchanged `activeTab !== 'Bridge'` branch |

## 10. Notes / risks

- The legacy `ConfirmationDialog` and ApprovalDeck both listen to `jarvis:confirmation-request`. In the expanded window the deck claims the request (responds); the dialog stays for the overlay window. Guard: the dialog component is suppressed in the expanded view while the Bridge tab is mounted.
- Three.js bundle adds ~600 KB gzipped to the renderer — acceptable for a desktop app; kept out of the overlay entry path via lazy `React.lazy` import so overlay load time is unaffected.
- Token cost + ETA in MissionRail are placeholders (Core doesn't expose them) — typed TODOs, not fake numbers.
