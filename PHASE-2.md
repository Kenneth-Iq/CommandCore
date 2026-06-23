# Phase 2 Specification — The Fleet

**Version:** 1.0 · **Date:** 2026-06-11 · **Parent:** VISION.md §7, builds on PHASE-0-1.md
**Scope:** multi-agent missions — planning, commander plan approval, parallel role agents with live visibility, sitrep synthesis, and the fleet dashboard. Messaging gateway, Odysseus tools, and Sentinel cron remain Phase 3.

---

## 0. Outcome

A `mode: "mission"` request no longer runs as a single Prime conversation. Instead:

1. **Plan** — Prime drafts a staged plan (which roles, what instructions, what runs in parallel).
2. **Approve** — the plan surfaces as a tier-2 approval; the commander approves/denies from the app (or REST).
3. **Execute** — each task runs as its own engine instance with its own role, toolset ceiling, and `agent_id`; tasks in the same stage run in parallel; every tool call streams as events tagged per agent.
4. **Report** — Prime synthesizes all task results into a sitrep; the mission completes with it.

`mode: "chat"` behavior is unchanged (direct Prime turn, no plan gate).

**Demo (exit):** POST a mission "research X and write a summary" → `plan.proposed` event with a researcher→writer plan → approve → researcher and analyst events interleave (parallel), then writer runs → `sitrep` event → mission completed. The app's Missions tab shows the fleet cards updating live.

## 1. Key decision: core-managed fleet (not Hermes `delegate_task`)

Hermes' own delegation runs child agents *inside* one `AIAgent` session — their tool calls never reach our callbacks, so the fleet would be invisible to the dashboard, and per-role toolset ceilings couldn't be enforced per child. Since fleet visibility and per-role permission ceilings are the product, **Core owns orchestration**: each task is a separate `Engine.run` with its own `RoleConfig`, `agent_id`, emit closure, and approval gate. Hermes `delegate_task` stays available *inside* a single agent's run for sub-delegation later, but the fleet layer is ours.

Trade-off accepted: Core implements staging/parallelism (~100 lines) instead of reusing Hermes'.

## 2. Contract changes (additive — protocol stays v1)

- **New event type** `plan.proposed`: payload `{plan, approval_required: true}`. Additive event types do not bump `v`; existing payload shapes remain frozen.
- **`sitrep`** (reserved in P1) now emitted: `{text}` from Prime's synthesis, agent_id `"prime"`.
- **`agent.spawned/agent.status/tool.*`** now carry fleet ids: `"researcher-1"`, `"writer-1"`, … (`"{role}-{ordinal}"`).
- **Mission row** gains `plan` (parsed JSON or null). Ledger: `missions` gets a `plan_json` column (idempotent ALTER on startup); new table:

```sql
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,            -- ar_<uuid4>
  mission_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,         -- researcher-1
  role TEXT NOT NULL,
  instruction TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','running','done','failed','skipped')),
  result_summary TEXT,
  started_at TEXT, finished_at TEXT
);
```

- **New endpoint** `GET /missions/{id}/agents` → `{agents: [agent_run rows]}`.

## 3. Plan model

```json
{"stages": [
  [{"role": "researcher", "instruction": "Find ..."},
   {"role": "analyst",    "instruction": "Crunch ..."}],
  [{"role": "writer",     "instruction": "Draft ... using the findings above"}]
]}
```

- Stages run sequentially; tasks within a stage run in parallel (pool cap 3).
- Later stages receive earlier results appended to their instruction (`Findings so far:` block, truncated to 4 000 chars per task).
- Validation: unknown role → fall back; >3 stages or >4 tasks/stage → truncate. Any parse/validation failure falls back to a single-stage `[[{role: prime, instruction: <original prompt>}]]` plan — a mission never dies on a malformed plan.
- Plan generation and sitrep synthesis use a new engine method `complete(role, prompt) -> str` (tool-light single completion). MockEngine scripts both; HermesEngine runs a minimal `AIAgent`.

## 4. Execution flow (mode=mission)

```
queued → planning → plan.proposed + approval.requested(tier 2,
  action "execute mission plan") → awaiting_approval
  ├─ deny/timeout → cancelled (mission.status event)
  └─ approve → running → stages → sitrep → completed
                          └─ any task failed → remaining stages skipped
                                              → failed (partial sitrep in error)
```

- Plan approval reuses the ApprovalBroker verbatim — the dashboard already renders `approval.requested`; the description embeds a human-readable plan summary.
- Per-task approval gates are constructed per role: `classify()` tier is checked against *that role's* `max_tier`; above-ceiling → auto-deny with audit row (`confirmed_by: "ceiling"`).
- `agent_runs` rows track per-task state; `agent.status {state: "done"|"failed"}` events close each card.

## 5. Role roster (full, replaces P1 prime-only file)

| Role | Toolsets | max_tier | Note |
|---|---|---|---|
| prime | files, terminal | 3 | orchestrator; plans, synthesizes, runs chat turns |
| researcher | web, files | 1 | gathers + cites; cannot send or destroy |
| writer | files | 1 | drafts only |
| analyst | files, terminal | 1 | computation in sandbox |
| operator | files, terminal | 3 | the only fleet role allowed T2/T3 actions |
| sentinel | files, web | 1 | reserved — activates with cron in Phase 3 |

Each gets a short system prompt in `core\agents\prompts\<role>.md`.

## 6. Dashboard (app)

New **Missions** tab in `ExpandedPanel.jsx`, fed by `window.jarvis.onCoreEvent` plus two new IPC bridges (`jarvis:core-missions`, already-existing event channel):

- Mission list (status pill per row, newest first; refreshed on mission.* events).
- Fleet board for the selected/active mission: one card per `agent_id` (role, state, last tool, last status detail) built purely from the event stream.
- Event ticker: last 50 events, monospace single-liners.
- Plan approvals keep flowing through the existing ConfirmationDialog (no new approval UI this phase).

Overlay is untouched. The neon/theming pass stays in Phase 4.

## 7. Acceptance criteria

| # | Check | Verified by |
|---|---|---|
| B1 | mission mode: plan.proposed → approval → staged parallel execution → sitrep → completed | pytest |
| B2 | plan denial cancels the mission; nothing executes | pytest |
| B3 | parallel stage tasks interleave (researcher + analyst events overlap) | pytest |
| B4 | role ceiling: T3 action from a tier-1 role is auto-denied + audited | pytest |
| B5 | malformed plan falls back to single-prime plan, mission still completes | pytest |
| B6 | agent_runs persisted with statuses; GET /missions/{id}/agents | pytest |
| B7 | chat mode regression: P1 suite still green | pytest |
| B8 | Missions tab renders fleet from live events | `npm run build` + manual |
| B9 | live fleet demo over real HTTP/WS | e2e script |

## 8. Risks

- Hermes `AIAgent` per task = heavier startup per agent; acceptable at fleet sizes ≤4. Revisit pooling in Phase 3.
- `complete()` with HermesEngine may still attempt tool calls; prompts instruct JSON-only and `max_iterations` is capped low. Mock keeps tests deterministic; live behavior validated in the NIM smoke (extended).
- Parallel Hermes runs share process CWD — the P1 `os.chdir` approach is not parallel-safe. Phase 2 sets CWD once at manager level (sandbox) instead of per-run chdir.
