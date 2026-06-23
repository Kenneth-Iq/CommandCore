# Jarvis Platform — Unified Vision & Build Plan

**Version:** 1.0
**Date:** 2026-06-11
**Author:** Kenneth Jones (with Claude)
**Relationship to PRD.md:** PRD v1.2 defined Jarvis as a single voice agent. This document supersedes its architecture by elevating Jarvis into a multi-agent platform built by combining three codebases. The PRD's voice pipeline, sandbox rules, permission tiers, and audit model are all retained and carried forward.

---

## 1. The one-line vision

**Jarvis is a command bridge: you speak missions to one entity — Jarvis Prime — and it plans, delegates to a fleet of role agents, escalates anything sensitive for your approval, and reports back like a chief of staff.**

You are the commander. Jarvis is the orchestrator. The agents are the crew.

---

## 2. What each project contributes

| Project | Role in the platform | What we take |
|---|---|---|
| **Jarvis** (`C:\Projects\Jarvis`) — *build target* | The face & the security model | Electron shell, always-on-top overlay, voice pipeline (openWakeWord → NIM ASR → Piper TTS), permission tiers T0–T4, sandbox containment (`C:\jarvis\`), append-only audit log, MSAL/Graph integration code |
| **Hermes-agent** (`C:\Projects\Hermes-agent`) — *reference* | The agent engine | Agent loop, subagent delegation (`tools/delegate_tool.py` — depth/concurrency/timeout controls), 40+ tools (browser, terminal ×7 backends, MCP, files, kanban/todo), self-improving skills system, memory manager + FTS5 session search, cron scheduler, messaging gateway (Telegram/Discord/Slack/WhatsApp/Signal), approval guardrails, context compression |
| **Odysseus** (`C:\Projects\odysseus`) — *reference* | The workspace services | ChromaDB + fastembed vector memory, email module w/ AI triage (IMAP/SMTP), CalDAV calendar, notes/tasks + reminders, Deep Research engine, multi-tab document editor, Cookbook (hardware-aware local model serving via vLLM/llama.cpp), auth/2FA, PWA mobile UI patterns |

**What we deliberately do NOT do:**
- No LangChain / CrewAI / AutoGen — Hermes already *is* the orchestration framework, with delegation, skills, and memory built in.
- No Pinecone — Odysseus already ships ChromaDB with local embeddings.
- No wholesale codebase merge — we run/embed each project where it's strong and connect via clean protocols (WebSocket, REST, MCP).

---

## 3. Target architecture

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1 — COMMAND BRIDGE (Electron, evolves current Jarvis) │
│  Voice I/O · Mission Control dashboard · Chat & briefings    │
│  Approval prompts · Action log ticker · Artifact browser     │
└───────────────▲──────────────────────────────────────────────┘
                │  WebSocket event stream + command channel
┌───────────────▼──────────────────────────────────────────────┐
│  LAYER 2 — JARVIS CORE (Python service, Hermes engine)       │
│  Jarvis Prime (orchestrator agent, the "Jarvis" persona)     │
│  Agent fleet (Hermes subagents: researcher/writer/analyst…)  │
│  Mission ledger (SQLite) · Approval broker · Cron scheduler  │
│  Messaging gateway (Telegram/WhatsApp = Jarvis in pocket)    │
└───────────────▲──────────────────────────────────────────────┘
                │  REST + MCP tool surface
┌───────────────▼──────────────────────────────────────────────┐
│  LAYER 3 — WORKSPACE SERVICES (Odysseus, headless)           │
│  ChromaDB memory · Email triage · CalDAV calendar · Notes    │
│  Deep Research · Documents · Cookbook model serving          │
└──────────────────────────────────────────────────────────────┘
```

### Layer boundaries & protocols
- **Bridge ↔ Core:** WebSocket (`ws://127.0.0.1:<port>/events`) for live events; REST for commands. JSON event envelope: `{mission_id, agent_id, type, payload, ts}`. Event types: `mission.created`, `plan.proposed`, `agent.spawned`, `agent.status`, `tool.call`, `approval.requested`, `approval.resolved`, `sitrep`, `mission.completed`, `alert`.
- **Core ↔ Services:** Odysseus REST API consumed by Hermes tools; key Odysseus capabilities (memory search, email, calendar, deep research) wrapped as MCP servers so any agent can use them and future plugins follow the same pattern.
- **Extension bus = MCP.** New capability → new MCP server. No core changes needed.

### LLM strategy
- Keep NVIDIA NIM as default (PRD decision stands) — Hermes already supports NIM natively.
- Odysseus Cookbook adds local model serving later for privacy-sensitive missions (per-mission model routing: cloud for reasoning, local for inbox content).

---

## 4. The mission control model (commander UX)

1. **Assign** — voice or text: "Research X, draft Y, by 5pm."
2. **Plan** — Jarvis Prime proposes a mission plan: objectives, agents to spawn, checkpoints, estimated cost. You approve/amend (voice or one click).
3. **Execute** — agents run as parallel Hermes subagents. Fleet panel shows per-agent: role, status, current tool, progress, last finding, token cost.
4. **Escalate** — tier 2+ actions (send/post/server-write) pause the agent and raise an approval card in the UI + spoken prompt + Telegram push. PRD tiers map directly onto Hermes approval callbacks:
   - T0 read → auto-approved
   - T1 draft → auto-approved + logged
   - T2 send/post → commander approval
   - T3 destructive → double confirmation
   - T4 server write → allowlist + approval
5. **Report** — agents file structured SITREPs; Jarvis Prime synthesizes into briefings (spoken if present, dashboard + Telegram if not). Artifacts → `C:\jarvis\missions\<id>\`. Every action → audit log.

### Standing agent roles (initial roster)
| Agent | Backed by | Duties |
|---|---|---|
| **Jarvis Prime** | Hermes main loop + persona | Orchestration, planning, briefings, your single point of contact |
| **Researcher** | Hermes subagent + Odysseus Deep Research | Web/feed/ArXiv sweeps, source-cited summaries |
| **Writer** | Hermes subagent + Odysseus documents | Reports, emails, posts — drafts only, never sends |
| **Analyst** | Hermes subagent + code execution | Numbers, forecasts, data files in the sandbox |
| **Operator** | Hermes subagent + Graph/IMAP/SSH tools | Email send, calendar writes, server commands — the only agent with T2+ tools |
| **Sentinel** | Hermes cron + server tools | Scheduled watches: server health, VIP inbox, feed digests, morning briefing |

Role = Hermes toolset + skill pack + permission ceiling. Adding a role is configuration, not code.

---

## 5. Security & permissions (carried from PRD, extended per-agent)

- Sandbox writes stay confined to `C:\jarvis\` (existing containment check).
- **Per-role tool ceilings:** only Operator holds send/post/server tools; Researcher/Writer/Analyst are physically incapable of T2+ actions because the tools aren't in their toolset (Hermes toolsets enforce this).
- Approval broker in Core is the single chokepoint for T2+; UI, voice, and Telegram are all just frontends to it.
- Audit log (SQLite, append-only) records every agent action with `mission_id` + `agent_id` lineage.
- Credentials stay in Windows Credential Manager / env; never in agent context.

---

## 6. Repo & deployment layout

```
C:\Projects\Jarvis\
├── app\          # Electron Command Bridge (current src\ migrates here)
├── core\         # Python: FastAPI gateway + embedded Hermes runtime
│   ├── missions\ # mission ledger, planner, approval broker
│   ├── agents\   # role definitions (toolsets, skills, ceilings)
│   └── events\   # WebSocket event hub
├── services\     # Odysseus deployment config (headless mode)
├── docker\       # compose: core + odysseus + chromadb
├── PRD.md        # v1.2 — single-agent spec (history)
└── VISION.md     # this document
```

**Runtime recommendation:** Python stack (Core + Odysseus) in Docker Desktop / WSL2 — both projects are Linux-first (Hermes native Windows is early beta; Odysseus is Docker-recommended). Electron runs native on Windows for mic/tray/overlay access. This kills the entire Windows-compat risk class at the cost of one `docker compose up`.

---

## 7. Roadmap

### Phase 0 — Foundation (week 1)
- Stand up Hermes + Odysseus locally (Docker compose), validate both run and talk.
- Define the event protocol (JSON envelope above) and freeze v1.
- Restructure repo into `app\` / `core\` / `services\`.
- **Exit:** `docker compose up` gives a healthy Core + Odysseus; Electron app still runs unchanged.

### Phase 1 — The spine (weeks 2–3)
- Core service: FastAPI + embedded Hermes loop, single Jarvis Prime agent, NIM backend.
- WebSocket event hub; Electron chat rewired from `llm.js` to Core (voice pipeline unchanged, transcript now goes to Core).
- Approval broker bridging Hermes approval callbacks → Electron confirmation dialogs (reuse `ConfirmationDialog.jsx`).
- Mission ledger (create/list/status) + audit log moved into Core.
- **Exit:** Speak a mission → watch Jarvis Prime execute with tools in a live event feed → approve a T2 action from the overlay.

### Phase 2 — The fleet (weeks 4–6)
- Enable Hermes delegation; define the 5 role agents (toolsets + ceilings + skill packs).
- Mission planner: plan proposal → commander approval → parallel spawn.
- Command Bridge v2: mission queue, live agent fleet cards, SITREP stream, artifact browser (per mockup).
- Voice briefings: "sitrep", "status on mission 3", "approved", "hold that".
- **Exit:** A research-and-write mission runs with 3 parallel agents visible on the dashboard, produces a cited report in `C:\jarvis\missions\`, and asks permission before emailing it.

### Phase 3 — The workspace (weeks 7–9)
- Wire Odysseus services as MCP tools: ChromaDB memory (shared across all agents), email triage, CalDAV calendar, notes/tasks, Deep Research as a mission type.
- Sentinel agent on Hermes cron: morning briefing (calendar + inbox + feeds), server health watch, VIP email alerts.
- Persistent memory: mission outcomes and your preferences accumulate in ChromaDB; Jarvis Prime recalls across sessions.
- **Exit:** "Morning briefing" works end-to-end from one voice command; agents cite memory from previous missions.

### Phase 4 — Everywhere + polish (weeks 10–12)
- Hermes messaging gateway: full Jarvis from Telegram/WhatsApp — assign missions, get sitreps, approve actions from your phone.
- Scheduled/recurring missions ("every Friday, compile the week's research").
- Futuristic UI pass: dark neon theme, agent avatars, animated fleet states, 3D command-room view (optional stretch).
- Plugin system = documented MCP recipe; Docker one-command self-host deploy.
- Security hardening review + undo system for supported operations.
- **Exit:** You approve an email from your phone while away from the desk; a stranger could deploy the stack with one compose command.

---

## 8. Key decisions locked by this document

| # | Decision | Choice |
|---|---|---|
| 1 | Orchestration framework | Hermes-agent engine (no LangChain/CrewAI) |
| 2 | Vector memory | Odysseus ChromaDB + fastembed (no Pinecone) |
| 3 | UI shell | Evolve existing Electron app into Command Bridge |
| 4 | Inter-layer protocol | WebSocket events + REST commands; MCP for tools/plugins |
| 5 | Python runtime | Docker Desktop / WSL2 (Hermes Windows-native is beta) |
| 6 | Permission model | PRD tiers T0–T4, enforced per-agent via Hermes toolsets + approval broker |
| 7 | LLM default | NVIDIA NIM (per PRD); Cookbook local serving later |
| 8 | Mobile access | Hermes gateway (Telegram first) — replaces PRD's "not in scope v1" |

## 9. Risks & open items

- **Hermes on Windows** is early beta → mitigated by Docker/WSL2 decision (D5). Validate in Phase 0.
- **Odysseus headless** — it's built as a full web app; we consume its API and skip its UI. Confirm its routes work without the frontend session flow (it has API tokens: `routes/api_token_routes.py`). Validate in Phase 0.
- **Wake word model** — current `hey_jarvis.onnx` is a hey_mycroft placeholder; training pipeline unvalidated. Revisit during Phase 1 voice rewiring.
- **License check** — Hermes is MIT. Verify Odysseus license terms for reuse before Phase 3 (note: optional PyMuPDF is AGPL — avoid bundling).
- **Latency budget** — voice → Core (Docker) → NIM round trip must stay under the PRD's 5s simple-query target. Measure in Phase 1.
- **Cost visibility** — multi-agent runs multiply token spend; fleet cards must show per-agent cost from day one (Hermes tracks usage pricing already).
