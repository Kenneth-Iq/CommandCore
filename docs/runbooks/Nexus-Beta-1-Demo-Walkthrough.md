# Nexus Beta-1 Demo Walkthrough

## 1. Purpose

This runbook explains how to start CommandCore and Nexus Console together and how to walk through Nexus as a coherent Beta-1 demo. It follows the CommandCore Engineering Bible, the Nexus Beta-1 Master Plan, and the Nexus Beta-2 Backlog.

This is an operator and reviewer document. It does not change source code and does not describe any write behavior, because Beta-1 has none.

## 2. Current Status

- CommandCore kernel runs in-memory, with a read-only API exposing kernel, executive, mission, agent, tool, conversation, knowledge, and workspace dashboards.
- Nexus Console is a Vite/React single-page app that consumes that API, with a built-in mock-data fallback when the API is unreachable or unconfigured.
- All ten Beta-1 waves are implemented: Executive Home, Mission Centre, Agent Centre, Tool Centre, Conversation Centre, Knowledge Centre, Jarvis Command Bar (routing/search only), Workspaces/Portfolio Explorer, the Enterprise World Model (Explorer, Context Breadcrumb, Relationship Cards), and page-local filters.
- Beta-1 is read-only end to end: no writes, no auth, no database, no AI calls. See `docs/roadmap/Nexus-Beta-2-Backlog.md` for everything deferred past this point.

## 3. Start CommandCore API

From the repository root:

```bash
cd core
python3 -m uvicorn commandcore.api.app:app --host 0.0.0.0 --port 8008
```

Local API example:

```text
http://127.0.0.1:8008
```

Confirm it is up:

```text
http://127.0.0.1:8008/health
http://127.0.0.1:8008/readiness
```

## 4. Start Nexus Console

From the repository root:

```bash
cd apps/nexus-console
VITE_COMMANDCORE_API_URL=http://127.0.0.1:8008 npm run dev
```

If you want the Vite dev server reachable from another machine on the network:

```bash
cd apps/nexus-console
VITE_COMMANDCORE_API_URL=http://YOUR_SERVER_IP:8008 npm run dev:host
```

Production build check (does not start a server, just verifies the build):

```bash
cd apps/nexus-console
npm run build
```

## 5. Server IP / Localhost Note

- `localhost` and `127.0.0.1` only work when the browser and the API are on the same machine.
- If you are reviewing Nexus from a different machine than the one running the API, use the actual server IP address for both `VITE_COMMANDCORE_API_URL` and the Vite dev server (`npm run dev:host`).
- Example remote setup:

  ```text
  API server:  http://192.168.1.50:8008
  Vite UI:     http://192.168.1.50:5173
  ```

- The API must be started with `--host 0.0.0.0` for a remote browser to reach it at all; firewall/security-group rules must also allow the chosen port.
- If `VITE_COMMANDCORE_API_URL` is missing or unreachable, Nexus does not error out — it falls back to built-in seeded mock data automatically. This is expected behavior, not a bug, and is visible via the `Live API` / `Mock Data` badge described below.

## 6. Expected Pages To Review

Open the Vite URL (typically `http://127.0.0.1:5173` for local dev) and confirm these pages exist and load without errors:

- Executive Home (default landing route)
- Governance (Executive Dashboard)
- Mission Centre
- Agent Centre
- Tool Centre
- Conversation Centre
- Knowledge Centre
- Workspaces (Portfolio Explorer)
- Health / Readiness
- Settings (placeholder — intentionally minimal in Beta-1)

The sidebar groups these into Executive / Operations / Memory / Portfolio / System sections, per the locked Nexus design language.

## 7. Demo Flow

Walk through the surfaces in this order. Each step calls out what to look for.

### 7.1 Executive Home

- Confirm the source strip shows either `Live API` or `Mock Data` clearly — this should never be ambiguous.
- Confirm the Executive Health Board, Alerts, Focus Panel, Dependency Graph, and Unified Timeline are present and visually read as one cohesive operating picture, not five disconnected widgets.
- Try the Executive Focus Mode filters (company/workspace/project/mission/agent) and confirm the situational-awareness cards, dependency graph, and KPI metrics all narrow together.

### 7.2 Enterprise Explorer

- Still on Executive Home, locate the Enterprise World Model panel.
- Confirm the World Summary band shows counts for companies, workspaces, projects, missions, agents, knowledge assets, tools, and conversations, plus Health and Readiness badges.
- Expand and collapse a few tree nodes (Portfolio → Company → Workspace → Project → leaf entities). Confirm the expand state persists if you navigate away and back (it is stored in browser local storage).
- Click a leaf node (for example, a mission or an agent under a project) and confirm it navigates straight to that record's detail view on the correct centre page.

### 7.3 Mission Centre

- Confirm the mission status breakdown, timeline, and active/completed/failed sections render.
- Use the page-local filter bar (agent, capability, workspace, project, search) and confirm the visible-count text updates and matches what's rendered.
- Clear filters and confirm everything returns.
- Click into one mission and confirm the Record Detail panel, Selected Context Bar, and Relationship Card (Parent / Belongs To / Related Items / Dependencies / Children) all populate.

### 7.4 Agent Centre

- Confirm active/idle/failed agent sections and the agent profile grid render.
- Filter by status and by capability; confirm counts and visible records update together.
- Select an agent and confirm its Relationship Card shows its workspace/company/project ancestry plus related tools and missions.

### 7.5 Tool Centre

- Confirm the permission/status breakdown bar, the active/completed/failed invocation sections, and the tool registry list render.
- Filter the registry by permission level, agent, or capability.
- Confirm the Hermes-Claw Preparation panel is present and clearly read-only — it should describe readiness, not offer any execution control.

### 7.6 Conversation Centre

- Confirm the conversation/thread list, message preview panel, linked-knowledge panel, and context view all render.
- Filter by workspace, company, project, or mission and confirm the thread list narrows accordingly.
- Confirm the Jarvis Future Integration placeholder is visibly a reserved surface, not a working chat box.

### 7.7 Knowledge Centre

- Confirm the asset summary, full asset list, and linked-knowledge panel render with scope badges (workspace/company/project/mission).
- Filter by query-safe/restricted status and by scope; confirm the linked-knowledge panel still reflects whichever asset is selected even when filtered.

### 7.8 Workspaces / Portfolio

- Confirm the portfolio summary band (workspace/company/project/capability counts) and the company/project/capability lists render.
- Filter by status, company, or capability across workspaces, companies, and projects at once.
- Select a workspace, a company, and a project in turn and confirm each produces a distinct Record Detail panel and Relationship Card.

### 7.9 Command Bar Routing

- Confirm the command bar is visible on every page, not just Executive Home.
- Type a partial match (a mission title fragment, an agent name, a tool name) and confirm Local Search results appear and are click-to-route.
- Confirm the Route Suggestions row offers direct page jumps independent of the search results.
- Confirm the command bar's framing is explicit: it is global jump-anywhere routing, not a substitute for each page's local filters.

### 7.10 Selected Record Routing

- From any Relationship Card, Dependency Graph node, or cross-link chip, click through to a related record on a different centre page.
- Confirm the destination page opens directly on that record's detail view (not just the page's default list view) and that the Context Breadcrumb at the top reflects the new Company → Workspace → Project → Mission chain.
- Confirm a record that is currently selected via the URL is never hidden by that page's local filters — it should always remain visible, pinned if necessary.

## 8. What Is Live API Data

When `VITE_COMMANDCORE_API_URL` is set and the CommandCore API is reachable, every centre is built from the corresponding read-only dashboard endpoint:

- `/health`, `/readiness`
- `/dashboard/kernel`, `/dashboard/executive`
- `/dashboard/missions` (mission counts, throughput, active/completed/failed missions, agent executions)
- `/dashboard/agents` (agent counts, roster, assignments, executions)
- `/dashboard/tools` (tool counts, registry, permission breakdown, invocations)
- `/dashboard/conversations` (conversation/thread/message/knowledge-link/context counts and records)
- `/dashboard/workspaces`

The `Live API` badge in the source strip on every page reflects this state. The Enterprise World Model tree, World Summary, breadcrumb, and relationship cards are all derived client-side from this same live data — there is no separate "world model" endpoint.

## 9. What Is Seeded Demo Data

When the API is not configured or not reachable, Nexus falls back to built-in mock data defined in `apps/nexus-console/src/data/mockKernel.ts` and `apps/nexus-console/src/data/nexusCentres.ts`. This mock data:

- Tells one consistent demo story (an "Alpha-5" UI review mission, a governance review, a connector recovery effort) across missions, agents, tools, conversations, and knowledge assets, so cross-links resolve correctly during a fallback demo.
- Includes a small but complete portfolio (one company, two workspaces, three projects, four capabilities) so the Enterprise Explorer tree and Workspaces page are never empty.
- Is intentionally small. Do not read absolute counts as representative of a real deployment; they exist to make every panel and filter demonstrably non-empty.

The `Mock Data` badge in the source strip on every page reflects this state, and the source strip also shows the reason (missing configuration vs. a failed request) when falling back.

## 10. Known Limitations

- Settings is a placeholder page; it does not yet hold real preferences.
- Jarvis Command Bar performs local search and deterministic routing only — there is no AI interpretation of queries.
- The Hermes-Claw Preparation panel and Jarvis Future Integration placeholder are intentionally inert; they describe future capability, not present behavior.
- Filters are page-local and reset on navigation away from a page; they are not persisted like Enterprise Explorer's expanded-node state.
- The Enterprise World Model tree is derived entirely from existing relationship fields (workspace/company/project membership, mission scope strings, conversation links, knowledge scopes). It is not a separate graph store, so any relationship not already represented in those fields will not appear in the tree or in Relationship Cards.
- No backend writes exist, so nothing demonstrated in this walkthrough can change persisted state. Restarting the API resets it to its seeded state.

## 11. What Is Deferred To Beta-2

See `docs/roadmap/Nexus-Beta-2-Backlog.md` for the full backlog with risks and prerequisites. At a glance, Beta-2 is where the following begins:

- write actions from the UI (mission creation, agent assignment, tool invocation, conversation creation, knowledge linking, workspace/project metadata updates)
- authentication and role-based permissions
- persistence/database
- Jarvis command execution (beyond routing)
- Hermes-Claw real tool execution
- Odysseus multi-agent planning/orchestration
- approval workflows
- audit/replay/recovery UX
- production deployment

None of the above should be expected to work during a Beta-1 demo. If a reviewer asks for one of these, the correct answer is "that's Beta-2, deliberately deferred," not an in-place feature request against Beta-1.
