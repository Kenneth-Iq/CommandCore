# Jarvis — Product Requirements Document

**Version:** 1.2  
**Status:** Draft — Architecture Decisions Locked  
**Author:** Kenneth Jones  
**Last Updated:** 2026-05-18

### Locked Decisions

| # | Decision | Value |
|---|---|---|
| LLM Backend | NVIDIA NIM API (OpenAI-compatible) | `integrate.api.nvidia.com/v1` |
| LLM Model | Runtime config — checked at Phase 1 start | `C:\jarvis\config\jarvis.yaml` |
| STT | NVIDIA NIM — Nemotron ASR Streaming | `nvidia/nemotron-asr-streaming` via `integrate.api.nvidia.com/v1` |
| Wake Word Engine | openWakeWord (open-source, Python subprocess) | No API key required |
| TTS | Piper (local) | Voice model downloaded at setup |
| UI Shell | Electron | Desktop app, always-on-top overlay |
| Sandbox Root | Local filesystem | `C:\jarvis\` |
| Email Provider (Phase 2) | Microsoft Outlook | Microsoft Graph API |
| SSH Key Management | User manages existing keys | Path configured in `jarvis.yaml` |
| Proactive Alerts | Audio (TTS) + Windows desktop notification | Both channels active by default |
| Research Feeds (Phase 4) | ArXiv (AI/ML), Reddit (configurable subreddits), RSS (custom) | Sources defined in `C:\jarvis\config\feeds.yaml` |

---

## Table of Contents

1. [Vision & Purpose](#1-vision--purpose)
2. [Target User](#2-target-user)
3. [Core Principles](#3-core-principles)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Voice Interface](#5-voice-interface)
6. [Local UI & File System Access](#6-local-ui--file-system-access)
7. [Integration Modules](#7-integration-modules)
8. [Permission & Security Model](#8-permission--security-model)
9. [Context & Memory System](#9-context--memory-system)
10. [Functional Requirements](#10-functional-requirements)
11. [Edge Cases & Failure Modes](#11-edge-cases--failure-modes)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Phased Rollout Plan](#13-phased-rollout-plan)
14. [Open Questions](#14-open-questions)

---

## 1. Vision & Purpose

Jarvis is a **voice-first, locally hosted AI agent** that acts as a unified command layer for your digital life. It sits on your local machine, speaks and listens naturally, and connects to your calendar, email, social media, research feeds, and running server products — while also being able to read and write files within a sandboxed root folder.

The goal is not another chatbot. Jarvis is an **ambient operator** — always available, proactively surfacing what matters, and capable of taking real action across your digital environment without requiring you to switch between apps.

**Core Promise:** You talk to Jarvis the way you'd talk to a highly capable assistant who has read access to your entire world and write access where you've explicitly granted it.

---

## 2. Target User

**Primary User:** Kenneth Jones (sole operator, v1)

| Attribute | Detail |
|---|---|
| Technical level | High — comfortable with servers, APIs, file systems |
| Usage context | Home office / local machine, always-on setup |
| Primary pain point | Context-switching between too many tools; losing track of what's running, what's due, what to act on |
| Secondary pain point | Research and ideas scattered across feeds, documents, and notes with no unified interface |

---

## 3. Core Principles

1. **Voice-first, not voice-only.** Every action triggerable by voice must also be accessible via a minimal text UI fallback. Voice is the primary UX, not a bolt-on.
2. **Local sovereignty.** The agent runs on your machine. Integrations go out to the cloud; the core does not. Credentials never leave the local environment.
3. **Sandboxed writes.** File system mutations are strictly confined to a user-defined root folder. Jarvis can read anywhere it has OS-level permission; it can only write inside the sandbox.
4. **Explicit permission gates.** Every new integration, write operation class, and external send action requires one-time explicit approval. Approvals are logged and auditable.
5. **Graceful degradation.** If any integration goes offline, Jarvis continues operating with reduced capability — it never crashes or becomes fully unavailable due to a single broken integration.
6. **Transparent action log.** Every action Jarvis takes — file edits, emails sent, calendar events created, API calls made — is written to an append-only local log. The user can review all logged actions; undo support for selected operations is planned for Phase 6.

---

## 4. System Architecture Overview

```
┌───────────────────────────────────────────────────┐
│                   LOCAL MACHINE                   │
│                                                   │
│  ┌─────────────┐    ┌──────────────────────────┐  │
│  │  Voice I/O  │◄──►│     Jarvis Core Agent    │  │
│  │  (mic/TTS)  │    │  (LLM + orchestration)   │  │
│  └─────────────┘    └──────────┬───────────────┘  │
│                                │                  │
│  ┌─────────────┐    ┌──────────▼───────────────┐  │
│  │  Local UI   │◄──►│   Integration Router     │  │
│  │  (minimal)  │    └──────────┬───────────────┘  │
│  └─────────────┘               │                  │
│                                │                  │
│  ┌─────────────────────────────▼───────────────┐  │
│  │              Sandboxed File System           │  │
│  │              C:\jarvis\ (writes only)        │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
                         │
         ┌───────────────┼──────────────────┐
         │               │                  │
    ┌────▼────┐    ┌──────▼─────┐    ┌──────▼──────┐
    │ Calendar│    │   Email    │    │  Social     │
    │ Google/ │    │ Gmail/     │    │  Twitter/   │
    │ Outlook │    │ Outlook    │    │  LinkedIn   │
    └─────────┘    └────────────┘    └─────────────┘
         │               │                  │
    ┌────▼────┐    ┌──────▼─────┐    ┌──────▼──────┐
    │Research │    │  Servers   │    │  Future     │
    │ Feeds   │    │  (SSH/API) │    │  Modules    │
    │ RSS/HN  │    │            │    │             │
    └─────────┘    └────────────┘    └─────────────┘
```

### Core Components

| Component | Responsibility |
|---|---|
| **Voice Engine** | Wake word detection, STT (speech-to-text), TTS (text-to-speech) |
| **Jarvis Core Agent** | LLM reasoning via NVIDIA NIM API, intent classification, tool orchestration, memory management |
| **Integration Router** | Dispatches actions to the correct integration module; handles auth refresh |
| **Sandbox File Manager** | File read/write within `C:\jarvis\`; enforces path containment |
| **Action Log** | Append-only SQLite log of every external action taken |
| **Local UI** | Electron app — always-on-top overlay with tray icon |
| **Credential Vault** | Encrypted local store for API keys, OAuth tokens (Windows Credential Manager) |

### LLM Backend — NVIDIA NIM API

Jarvis uses NVIDIA's free NIM inference API, which is OpenAI SDK-compatible. This means the standard `openai` Node.js / Python client works with a custom `baseURL` and `apiKey`.

```js
// Electron main process — LLM client config
const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,  // loaded from Windows Credential Manager
});
```

**Model selection:** The specific model is a runtime config value in `C:\jarvis\config\jarvis.yaml` — not hardcoded. This lets the user swap models without a code change. Default starter model: `nvidia/llama-3.1-nemotron-ultra-253b-v1` (or whichever free-tier model is available at setup time).

```yaml
# C:\jarvis\config\jarvis.yaml
llm:
  provider: nvidia-nim
  base_url: https://integrate.api.nvidia.com/v1
  model: nvidia/llama-3.1-nemotron-ultra-253b-v1
  max_tokens: 2048
  temperature: 0.7
```

**Edge cases for NVIDIA NIM:**
- Model not available: surface the API error and the list of available models from `/v1/models`
- Rate limit (free tier): queue with exponential backoff; surface wait time to user
- Model deprecation: config-driven model name means a one-line change to swap models
- Latency on large context: chunk long integration payloads before sending; never exceed the model's context window

---

## 5. Voice Interface

### 5.1 Wake Word

- Default wake word: **"Hey Jarvis"** (customizable)
- Engine: **openWakeWord** — open-source, no API key, runs as a Python subprocess alongside the Electron main process
- Fallback: configurable keyboard shortcut (default: `Ctrl+Shift+Space`) to activate listen mode without voice wake
- Wake word detection runs locally (no audio sent to cloud before activation)
- Indicator light / tray icon changes state when listening

### 5.2 Speech-to-Text

- **Phase 1:** NVIDIA NIM ASR — `nvidia/nemotron-asr-streaming` via `integrate.api.nvidia.com/v1` (same API key as LLM)
- Streaming mode for low latency; audio chunked from the microphone and sent over HTTP
- Auto-detect silence to end input (configurable timeout: 1–5 seconds)
- **Phase 6 option:** Local whisper.cpp as a swap-in if cloud STT is unwanted

### 5.3 Text-to-Speech

- **Phase 1:** Piper (local) — voice model downloaded at first run, no cloud dependency, no cost
- ElevenLabs / OpenAI TTS available as optional cloud upgrade for higher voice quality
- Response length awareness: long responses get summarized by default with "Want me to read the full response?" prompt
- Interruptible: any utterance while Jarvis is speaking cancels TTS and re-enters listen mode

### 5.4 Intent Classification

Jarvis classifies every utterance into one of these intent categories before acting:

| Category | Examples |
|---|---|
| **Query** | "What's on my calendar tomorrow?" / "Summarize my unread emails" |
| **Action** | "Create a meeting at 3pm Friday" / "Draft a reply to that last email" |
| **File Operation** | "Create a new document called Q2 Ideas" / "Open my notes from last week" |
| **System Status** | "Is the production server responding?" / "What's the CPU on the game server?" |
| **Research** | "What's trending in AI today?" / "Find me the latest paper on RAG" |
| **Clarification Needed** | Ambiguous input → Jarvis asks a targeted follow-up question |

### 5.5 Confirmation Protocol

For **destructive or irreversible actions** (sending email, deleting files, posting to social), Jarvis always reads back the action and waits for verbal or text confirmation before executing:

```
Jarvis: "I'm about to send an email to john@example.com with subject 
         'Meeting Follow-up'. Shall I send it?"
User:   "Yes, send it."
Jarvis: [sends email] "Done. Email sent."
```

Confirmation can be skipped for low-risk actions (reading, querying) and enabled by default for all write/send actions.

---

## 6. Local UI & File System Access

### 6.1 UI Surface — Electron App

Jarvis runs as an **Electron desktop application** on Windows. It presents two surfaces:

**Compact overlay** (default):
- Always-on-top, borderless window anchored to bottom-right corner
- 380×120px footprint
- Shows: listening indicator, last Jarvis response text, integration status dots
- Collapsible to system tray icon with right-click context menu
- Hotkey `Ctrl+Shift+J` toggles compact overlay visibility

**Expanded panel** (on click or voice command "open Jarvis"):
- Full Electron BrowserWindow (900×700px, resizable)
- Tabs: Conversation | Files | Integrations | Action Log
- **Conversation tab:** full scrollable history, text input fallback
- **Files tab:** file browser scoped to `C:\jarvis\` only (no navigation above this path)
- **Integrations tab:** per-integration status, last sync time, enable/disable toggles
- **Action Log tab:** searchable audit log table

**Electron architecture specifics:**
- Main process: LLM client, file system operations, integration router, IPC handler
- Renderer process: UI only — no direct file system or network access
- All sensitive operations go through `ipcMain` handlers in the main process
- `contextIsolation: true`, `nodeIntegration: false` in all renderer windows
- Auto-launch on Windows startup via registry entry (opt-in during setup)

### 6.2 Sandbox Root Folder

The **Jarvis Root Folder** is `C:\jarvis\` — fixed, not configurable without a code change. This path is the single directory where Jarvis has write access.

**Rules:**
- All file creation, editing, deletion is restricted to `C:\jarvis\` and its subdirectories
- Jarvis may read files anywhere the OS user has read permission (useful for referencing existing documents)
- Any path that resolves outside `C:\jarvis\` — including symlinks that escape it — is rejected with an error
- Path containment check uses `path.resolve()` and asserts the result starts with `C:\jarvis\` before every write
- The sandbox root is displayed in the Electron title bar and Integrations tab at all times

**Sandbox structure (created on first run):**
```
C:\jarvis\
├── config\
│   └── jarvis.yaml          # LLM model, integration toggles, voice settings
├── notes\                   # Quick captures, meeting notes
├── drafts\                  # Email and social media drafts
├── research\                # Saved articles, feed summaries
├── projects\                # Project-specific subfolders
├── exports\                 # Data exports from integrations
├── server-config\
│   └── allowed-commands.yaml  # Server command allowlist
├── memory\                  # Persistent memory YAML files
└── jarvis-log\
    └── actions.db           # Append-only SQLite audit log
```

### 6.3 File Operations

| Operation | Allowed | Requires Confirmation |
|---|---|---|
| Read any file (OS-permitted) | Yes | No |
| Create file in sandbox | Yes | No (unless >1MB) |
| Edit file in sandbox | Yes | No for small edits; Yes for full overwrites |
| Delete file in sandbox | Yes | Always |
| Move file within sandbox | Yes | No |
| Move file out of sandbox | No | — |
| Create file outside sandbox | No | — |
| Edit file outside sandbox | No | — |

### 6.4 Document Editing

- Jarvis can open, read, edit `.txt`, `.md`, `.json`, `.yaml`, `.csv`, and other plaintext formats
- For `.docx`, `.pdf` — read-only extraction; edits produce a new `.md`/`.txt` copy in the sandbox
- Jarvis never silently overwrites; it always creates a `.backup` copy before overwriting any file larger than 10KB
- "Undo last edit" command restores from backup

---

## 7. Integration Modules

Each module is independently togglable. Disabling a module removes all its permissions and cached data.

### 7.1 Calendar

**Supported:** Google Calendar, Microsoft Outlook Calendar  
**Auth:** OAuth 2.0 (tokens stored in local credential vault)

**Read capabilities:**
- Fetch today's / this week's / upcoming events
- Search events by keyword, attendee, or date range
- Get event details (location, description, attendees, video link)
- Surface conflicts when scheduling

**Write capabilities (all require confirmation):**
- Create new events
- Edit existing events (title, time, description, attendees)
- Cancel / delete events
- RSVP to invitations
- Add video conferencing links

**Edge cases:**
- Recurring event edits: Jarvis always asks "This event only" vs. "This and all following" before editing recurring events
- Double-booking detection: Jarvis warns before creating an event that overlaps existing ones
- Timezone ambiguity: if the user doesn't specify a timezone, Jarvis uses local machine timezone and reads it back for confirmation
- OAuth token expiry: silently refresh; if refresh fails, surface a re-auth prompt in the UI before attempting the next calendar action

### 7.2 Email

**Supported (Phase 2):** Microsoft Outlook — via **Microsoft Graph API**  
**Supported (Phase 3+):** Gmail (future)  
**Auth:** OAuth 2.0 — Microsoft Identity Platform (MSAL)

**Auth flow:**
- App registered in Azure Portal (user's own Azure AD app registration)
- Scopes: `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`
- MSAL token cached in Windows Credential Manager
- Refresh token lifespan: 90 days (Microsoft default); re-auth prompted in UI before expiry

**Read capabilities:**
- Fetch unread count and list
- Read specific emails (subject, sender, body, attachments metadata)
- Search by sender, subject, keyword, date
- Thread context (read full thread before drafting replies)
- Attachment detection (names and sizes, never auto-download attachments)

**Write capabilities (all require confirmation):**
- Draft emails (saved to Drafts, not sent, until explicit "send" confirmation)
- Reply / reply-all
- Forward
- Send new email
- Archive / move to folder
- Mark read/unread
- Label/tag email

**Edge cases:**
- Reply-all guard: if a reply-all would send to >5 recipients, Jarvis explicitly lists the recipients and asks for confirmation
- Attachment sending: Jarvis can attach files from the sandbox folder; files outside the sandbox require the user to manually add them
- PII in voice: if the user dictates an email containing what looks like a credit card number or SSN, Jarvis flags it before sending
- Large mailbox: paginate fetch; never load >100 emails into context in one shot
- Draft conflicts: if the user asks to draft two emails without confirming the first, Jarvis surfaces "You have an unsaved draft — discard it or save it first?"

### 7.3 Social Media

**Supported (Phase 5):** Twitter/X, LinkedIn  
**Supported (Phase 5+):** Instagram, YouTube  
**Auth:** OAuth 2.0 / API keys per platform

**Read capabilities:**
- Fetch home feed (configurable limit)
- Search by keyword or hashtag
- Read notifications and mentions
- Read DMs (summary, not full content by default)
- Pull analytics for your own posts (impressions, engagement)

**Write capabilities (all require confirmation + two-step for public posts):**
- Compose and schedule posts
- Reply to mentions
- Like / repost (with explicit confirmation)
- Send DMs
- Follow / unfollow accounts

**Edge cases:**
- Character limit enforcement: Jarvis validates post length before confirming, suggests splits for threads
- Platform-specific rules: LinkedIn requires different tone; Jarvis adapts voice when drafting for each platform
- Scheduled post failure: if a scheduled post fails to send (API error), Jarvis surfaces a retry prompt at next interaction
- Accidental public post: two-confirmation rule — "Draft looks good. Post publicly to Twitter now?" → "Confirmed — posting now."
- Rate limits: if API rate limits are hit, Jarvis queues actions and informs the user of the delay

### 7.4 Research Feeds

**Supported:** ArXiv (AI/ML — cs.AI, cs.LG, cs.CL), Reddit (configurable subreddits, requires Reddit API key), RSS feeds (custom URLs)  
**Not in scope (v1):** Hacker News (dropped; ArXiv + Reddit cover the research signal needed)  
**Auth:** Reddit API key in credential vault; ArXiv and RSS are anonymous

**Read capabilities:**
- Fetch and summarize latest items from configured sources
- Search across all feeds by keyword
- Daily briefing: auto-summarize top N items across all feeds (triggered by schedule or "morning briefing" voice command)
- Save article to sandbox (`/research/` folder) with full text extraction
- Highlight and tag saved items

**Configuration:**
- User maintains a `feeds.yaml` in the sandbox root listing all sources
- Jarvis reloads this config on startup and when the file changes
- Each feed has a configurable refresh interval (minimum 5 minutes)

**Edge cases:**
- Paywalled content: Jarvis reads what is available without attempting to bypass paywalls; it surfaces the headline and abstract and tells the user the full article requires manual access
- Feed unavailability: if a feed URL returns an error for >3 consecutive fetches, Jarvis alerts the user and pauses that feed
- Duplicate detection: articles appearing across multiple feeds are deduplicated by URL/title similarity

### 7.5 Server Products

**Supported connection methods:** SSH, REST API polling, webhook ingestion  
**Auth:** SSH keys — user manages their own existing keys; Jarvis reads the key path from `jarvis.yaml`. API keys stored in credential vault.

**Read capabilities:**
- Ping / health check any registered server
- Tail recent logs (last N lines, configurable)
- Query custom API endpoints and display/summarize response
- Resource metrics (CPU, memory, disk) via SSH or monitoring API
- Service status (up/down/degraded)

**Write capabilities (require confirmation):**
- Restart a service (`systemctl restart`, `pm2 restart`, etc.)
- Deploy from a known deployment script (pre-registered scripts only)
- Run pre-approved shell commands (allowlist only)

**Security model for servers:**
- Only pre-registered servers appear in Jarvis's server list
- Only pre-approved commands can be executed (no freeform shell)
- Command allowlist is a file in the sandbox: `C:\jarvis\server-config\allowed-commands.yaml`
- All server commands are logged with timestamp, server, command, and output
- SSH private keys are stored in the OS credential manager, never written to disk by Jarvis

**Edge cases:**
- Server unreachable: if a health check fails, Jarvis surfaces an alert and stops queuing actions for that server
- Command timeout: SSH commands have a 30-second timeout; on timeout Jarvis reports "Command timed out — check the server manually"
- Ambiguous server reference: if the user says "restart the server" and multiple servers are registered, Jarvis asks "Which server — production, staging, or game server?"
- Partial deployment failure: Jarvis reports the full output of deployment scripts; it does not interpret success/failure automatically unless the script returns a standard exit code

---

## 8. Permission & Security Model

### 8.1 Credential Vault

- All OAuth tokens, API keys, and SSH references are stored in the OS-native credential manager (Windows Credential Manager / macOS Keychain)
- Jarvis never logs credentials
- Credentials are never included in LLM context — only used by the integration router

### 8.2 Permission Tiers

| Tier | Actions | Requires |
|---|---|---|
| **T0 — Read** | Fetch/query any integration | One-time integration setup |
| **T1 — Draft** | Create drafts (email, posts, files) | One-time integration setup |
| **T2 — Send/Post** | Send email, publish posts, edit calendar | Per-action voice/text confirmation |
| **T3 — Destructive** | Delete files, cancel events, remove content | Explicit double-confirmation |
| **T4 — Server Write** | Restart services, run commands | Allowlist + explicit confirmation |

### 8.3 Audit Log

Every T1–T4 action is written to an append-only SQLite database at `C:\jarvis\jarvis-log\actions.db`:

```
timestamp | intent | action_type | target | payload_summary | confirmed_by | result
```

- Log entries are never deleted by Jarvis
- Log is viewable via the UI's "Action Log" panel
- "Undo" operations (where supported) create a new log entry referencing the original

### 8.4 LLM Data Boundaries

- Email body content, calendar event descriptions, and document contents are passed to the LLM for processing
- The user is warned at setup that content from integrations will be processed by the configured LLM (local or cloud)
- For maximum privacy, a local LLM (Ollama + Llama 3 / Mistral) can be configured instead of a cloud provider
- Jarvis must clearly display in the UI whether a local or cloud LLM is currently active

---

## 9. Context & Memory System

### 9.1 Session Context

- Jarvis maintains a rolling in-session context window (last N turns of conversation + last N retrieved facts)
- Context is cleared on explicit "reset" command or on system restart (unless persistent memory is enabled)

### 9.2 Persistent Memory

Jarvis maintains a structured memory store at `C:\jarvis\memory\`:

| Memory Type | Contents | Example |
|---|---|---|
| **User facts** | Preferences, routines, known contacts | "Kenny's standup is 9am Mon–Fri" |
| **Project context** | Active projects, associated files, status | "Isikhathi app — Firebase auth, PostgreSQL backend" |
| **Recurring tasks** | Scheduled briefings, reminders | "Morning briefing at 8am daily" |
| **Integration state** | Last sync times, known failures | "Twitter API rate limit reset at 15:00" |

- Memory can be read, edited, and deleted by the user ("Jarvis, forget that my standup is at 9am")
- Memory contents are summarized into LLM context at session start, not injected in full
- Memory files are plaintext YAML for user inspectability

### 9.3 Proactive Surfacing

Jarvis can proactively surface information without being asked, based on configurable triggers:

| Trigger | Behavior |
|---|---|
| Morning (configurable time) | Delivers daily briefing: calendar, unread emails summary, top research items |
| Calendar event 15 min before | TTS audio alert + Windows desktop notification with event details and join link |
| Server health check failure | Immediate TTS alert + Windows desktop notification regardless of time |
| Unread email from VIP list | Surfaced at next interaction or immediately (TTS + notification) if urgent keywords found |
| Long silence (configurable) | Optional: "Good [time of day] — here's what's new" |

All proactive behaviors are opt-in and individually configurable.

---

## 10. Functional Requirements

### 10.1 Must Have (v1 — across all phases)

- [ ] Wake word detection (local)
- [ ] STT → LLM → TTS pipeline (end-to-end latency < 5 seconds for simple queries)
- [ ] Local UI overlay with conversation display and state indicators
- [ ] Sandboxed file system with strict path containment
- [ ] File create, read, edit, delete within sandbox
- [ ] Audit log (append-only, viewable in UI)
- [ ] Confirmation protocol for all T2+ actions
- [ ] Calendar integration (read + write)
- [ ] Email integration (read + draft + send with confirmation)
- [ ] Server health check (SSH + REST ping)
- [ ] Credential vault (OS-native)
- [ ] Graceful degradation when integrations are offline

### 10.2 Should Have (v1–v2)

- [ ] Research feed aggregation and morning briefing
- [ ] Social media read + draft (no publish without confirmation)
- [ ] Social media publish (with double-confirmation)
- [ ] Persistent memory system
- [ ] Proactive alerts (calendar, server health)
- [ ] Action undo (for supported operations)
- [ ] Local LLM option (Ollama)
- [ ] Server pre-approved command execution

### 10.3 Nice to Have (v2+)

- [ ] Multi-voice profile support
- [ ] Calendar scheduling assistant (find mutual free times)
- [ ] Email smart filters and digest summaries
- [ ] Webhook ingestion from server products
- [ ] Plugin/module system for third-party integrations
- [ ] Mobile companion app (push notifications from Jarvis)
- [ ] Conversation export and search

---

## 11. Edge Cases & Failure Modes

### 11.1 Voice

| Scenario | Handling |
|---|---|
| Background noise causes false wake | Confidence threshold on wake word; low confidence → ignore |
| User speaks too fast / accent variation | Offer to retranscribe; user can see transcription in UI before Jarvis acts |
| Ambiguous command ("Send it") with no prior context | Jarvis asks "Send what to whom?" |
| User interrupts mid-response | Stop TTS immediately; re-enter listen mode |
| Microphone unavailable | Fall back to text input mode with UI notification |
| STT returns empty or garbage | "I didn't catch that — could you repeat?" |
| Two users speak simultaneously | First clear signal wins; Jarvis asks for clarification |

### 11.2 File System

| Scenario | Handling |
|---|---|
| Path traversal attempt (`../../etc/passwd`) | Reject immediately; log the attempt; alert user |
| Symlink pointing outside sandbox | Resolve real path; if outside sandbox, reject |
| File already exists on create | Ask: overwrite, rename (`file_v2.md`), or cancel |
| Disk full during write | Abort write; surface error; never write partial files |
| File locked by another process | Report the lock; do not force-write |
| Sandbox root folder deleted externally | Alert user at startup; refuse all file operations until re-configured |
| Binary file encountered | Read operations: surface as "binary file, cannot display". Write operations: only allowed if explicitly requested |

### 11.3 Integrations

| Scenario | Handling |
|---|---|
| OAuth token expired | Auto-refresh if refresh token valid; otherwise surface re-auth prompt |
| OAuth refresh token expired | Surface re-auth prompt in UI; integration operates in read-cache-only mode |
| API rate limit hit | Queue retries with backoff; inform user of delay |
| Integration API returns 500 | Retry once after 5 seconds; surface error if still failing |
| Network offline | Detect offline state; disable all cloud integrations; continue local file operations |
| Calendar event in past | Warn user before editing a past event; require confirmation |
| Email with no recipients | Reject send; require at least one recipient |
| Social post with banned content | Surface API error verbatim; do not silently suppress |

### 11.4 LLM

| Scenario | Handling |
|---|---|
| LLM returns hallucinated action | Confirmation protocol catches most; for read-only queries, surface with caveat "based on my understanding" |
| LLM context window exceeded | Summarize earlier context; warn user if session is very long |
| Cloud LLM API unavailable | Fall back to local LLM if configured; otherwise queue and retry |
| LLM returns malformed tool call | Retry once with simplified prompt; if still malformed, surface "I had trouble with that — could you rephrase?" |
| Sensitive data in LLM context | User is warned at setup; no additional filtering in v1 (v2: optional local-only mode) |

### 11.5 Servers

| Scenario | Handling |
|---|---|
| SSH connection refused | Report immediately; do not retry without user prompt |
| Command not in allowlist | Reject with message listing allowed commands |
| Command output is very large | Truncate to last 100 lines; offer to save full output to sandbox |
| Server restart causes Jarvis connection drop | Handle gracefully; report "Connection lost during restart — reconnecting in 30 seconds" |
| Wrong server targeted | Confirmation message always includes server name; user must confirm |

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Metric | Target |
|---|---|
| Wake-to-listen latency | < 200ms |
| End-to-end voice response (simple query) | < 5 seconds |
| End-to-end voice response (integration fetch) | < 10 seconds |
| File operation completion | < 1 second for files under 10MB |
| UI idle CPU usage | < 2% |
| Memory footprint (idle) | < 500MB |

### 12.2 Reliability

- Integration failures must not crash the core agent
- All errors must be surfaced to the user in plain language, not stack traces
- Jarvis process must auto-restart on crash (via OS service / task scheduler)
- Action log must survive crashes (SQLite WAL mode)

### 12.3 Privacy

- No telemetry or usage data sent by Jarvis itself
- LLM provider telemetry is governed by the user's choice of provider
- Local LLM option available for full local operation
- Credential vault uses OS-native encryption

### 12.4 Extensibility

- Each integration is a discrete module with a documented interface
- New integrations can be added without modifying core agent code
- User-visible configuration is in human-readable files within the sandbox
- The LLM backend is swappable via config

---

## 13. Phased Rollout Plan

### Phase 1 — Core Shell (Weeks 1–4)

**Goal:** Prove the voice → LLM → action pipeline works end-to-end.

**Stack locked for Phase 1:**
- Runtime: Node.js (Electron main process)
- LLM: NVIDIA NIM API via `openai` npm package with custom `baseURL`; model set in `C:\jarvis\config\jarvis.yaml`
- STT: NVIDIA NIM — `nvidia/nemotron-asr-streaming` via `integrate.api.nvidia.com/v1` (same API key as LLM)
- TTS: Piper (local) — voice model downloaded at first run
- Wake word: openWakeWord Python subprocess
- UI: Electron BrowserWindow + Vite/React renderer

- [ ] Electron app scaffold (main + renderer, IPC skeleton)
- [ ] NVIDIA NIM client (`openai` package, custom baseURL, model from config)
- [ ] `C:\jarvis\` directory creation and config loading on startup
- [ ] Sandboxed file manager with `path.resolve()` containment check
- [ ] File create, read, edit, delete within `C:\jarvis\`
- [ ] Compact overlay UI (listening indicator, last response, tray icon)
- [ ] Voice pipeline (openWakeWord → NVIDIA NIM ASR → NIM LLM → Piper TTS)
- [ ] Intent classification (Query / Action / File Operation / Clarification)
- [ ] Confirmation protocol for destructive actions
- [ ] Append-only SQLite audit log at `C:\jarvis\jarvis-log\actions.db`

**Success criteria:** User says "Hey Jarvis, create a file called test.md with the text Hello World" — file appears at `C:\jarvis\notes\test.md`. User says "Read test.md" — Jarvis reads it back via TTS. End-to-end latency under 8 seconds.

---

### Phase 2 — Calendar & Email (Weeks 5–8)

**Goal:** Cover the two highest-ROI integrations via Microsoft Graph API.

- [ ] Azure AD app registration (user completes once in Azure Portal)
- [ ] MSAL OAuth flow in Electron (popup window for first-time auth)
- [ ] Microsoft Graph Calendar: read events, create, edit, cancel
- [ ] Microsoft Graph Mail (Outlook): read, search, draft, send
- [ ] Tokens stored in Windows Credential Manager via `keytar` npm package
- [ ] Per-action confirmation for send and calendar write
- [ ] Graceful offline degradation (cache last-known calendar for read-only)

**Microsoft Graph endpoints used:**
```
GET  /me/calendarView          — fetch events in date range
POST /me/events                — create event
PATCH /me/events/{id}          — edit event
DELETE /me/events/{id}         — cancel event
GET  /me/messages              — list emails
GET  /me/messages/{id}         — read email
POST /me/sendMail              — send email
POST /me/messages/{id}/reply   — reply to email
```

**Success criteria:** User says "What do I have tomorrow?" and gets accurate Outlook calendar results. User says "Draft a reply to the last email from [name]" and Jarvis produces a draft saved to `C:\jarvis\drafts\`.

---

### Phase 3 — Server Monitoring (Weeks 9–11)

**Goal:** Give Jarvis eyes on running products.

- [ ] SSH health check
- [ ] REST API ping
- [ ] Log tail
- [ ] Pre-approved command execution
- [ ] Server alert surfacing

**Success criteria:** User can say "Is the production server up?" and get an accurate answer within 5 seconds.

---

### Phase 4 — Research & Intelligence (Weeks 12–14)

**Goal:** Make Jarvis useful as a morning briefing and research assistant.

- [ ] RSS feed aggregation
- [ ] Hacker News / ArXiv integration
- [ ] Morning briefing command
- [ ] Save-to-sandbox for articles
- [ ] Persistent memory (user facts, project context)

**Success criteria:** "Jarvis, give me my morning briefing" produces a useful 2-minute summary of calendar, emails, and research.

---

### Phase 5 — Social Media (Weeks 15–18)

**Goal:** Extend Jarvis into social presence management.

- [ ] Twitter/X read + draft + publish
- [ ] LinkedIn read + draft + publish
- [ ] Double-confirmation for public posts
- [ ] Post scheduling

**Success criteria:** User can say "Draft a LinkedIn post about [topic]" and review/publish it via voice confirmation.

---

### Phase 6 — Polish & Hardening (Weeks 19–22)

- [ ] Local LLM option (Ollama)
- [ ] Full edge case coverage from Section 11
- [ ] Action undo system
- [ ] Mobile push notification companion
- [ ] Performance optimization
- [ ] Documentation

---

## 14. Open Questions

| # | Question | Status | Decision |
|---|---|---|---|
| 1 | Which LLM backend for v1? | ✅ **Resolved** | NVIDIA NIM API — `integrate.api.nvidia.com/v1`, model set in `jarvis.yaml` |
| 2 | Which TTS voice / engine? | ✅ **Resolved** | Piper (local) — voice model downloaded at setup |
| 3 | Sandbox root path? | ✅ **Resolved** | `C:\jarvis\` — fixed, not user-configurable |
| 4 | Email provider first? | ✅ **Resolved** | Microsoft Outlook via Microsoft Graph API |
| 5 | SSH keys: already managed or Jarvis generates? | ✅ **Resolved** | User manages existing keys; Jarvis reads key path from `jarvis.yaml` |
| 6 | Proactive alerts: desktop notification, audio, or both? | ✅ **Resolved** | Both — TTS audio alert + Windows desktop notification |
| 7 | LLM cost ceiling before switching to local model? | ✅ **Resolved** | NVIDIA NIM free tier — revisit only if rate limits are consistently hit |
| 8 | UI shell type? | ✅ **Resolved** | Electron app (compact overlay + full panel + tray) |
| 9 | Accessible from other devices on local network? | ✅ **Resolved** | Not in scope for v1 |
| 10 | Initial research feed sources? | ✅ **Resolved** | ArXiv (AI/ML), Reddit (configurable subreddits), RSS (custom) |
| 11 | Which NVIDIA NIM model to use as default? | ✅ **Resolved** | Query `/v1/models` at Phase 1 start; set in `jarvis.yaml` |
| 12 | Wake word detection engine? | ✅ **Resolved** | openWakeWord (open-source, Python subprocess, no API key) |
| 13 | STT engine for Phase 1? | ✅ **Resolved** | NVIDIA NIM — `nvidia/nemotron-asr-streaming` via `integrate.api.nvidia.com/v1` |
| 14 | Piper voice model (persona)? | Open | Choose specific Piper voice model at Phase 1 setup (e.g., `en_US-lessac-medium`) |
| 15 | Specific Reddit subreddits for research feed? | Open | Configure in `feeds.yaml` at Phase 4 start |

---

*End of Document*

*Next step: Review Phase 1 scope and answer the high-priority open questions before starting implementation.*
