# Nexus Beta-1 Master Plan

## 1. Current Status

CommandCore is now complete enough at the kernel layer to support a real UI milestone.

Current repository status:

- CommandCore kernel foundations exist and are wired.
- Nexus Console exists as the user-facing UI shell.
- A read-only CommandCore API exists.
- Demo data seeding exists for useful live dashboard views.
- Successful focused tests and frontend builds have been demonstrated.

Practical interpretation:

- The backend is ready for read-only operational visibility work.
- The frontend is ready to evolve from scaffold into daily-use command centre.
- The next roadmap should focus on usability, clarity, and operational depth rather than foundational rewrites.

## 2. Product Framing

- CommandCore = operating kernel
- Nexus = user-facing command centre
- Jarvis = executive intelligence
- Hermes-Claw = tool/action layer
- Odysseus = multi-agent planning layer

Relationship framing:

- CommandCore owns governed runtime state, observability, and system composition.
- Nexus exposes that state to operators in a usable command-centre interface.
- Jarvis will eventually sit above the command centre as executive intelligence, but not before command routing and visibility are solid.
- Hermes-Claw will eventually power tool execution and action surfaces.
- Odysseus will eventually power deeper multi-agent planning and orchestration.

## 3. Beta-1 Goal

Make Nexus a usable daily command centre.

Beta-1 is not about full autonomy, production deployment, or AI-native execution.

Beta-1 is about:

- making CommandCore readable and operable through Nexus
- making operational state visible and navigable
- making the UI useful enough for repeated daily use
- strengthening the read-only API and dashboard detail surfaces
- preparing cleanly for later Jarvis, Hermes-Claw, and Odysseus integration

## 4. Beta-1 Waves

### Wave 1

Executive Home polish

- Kernel health
- Readiness
- Attention panel
- Live activity feed

Primary intent:

- make the home view immediately useful on open
- show system posture, recent changes, and intervention cues
- confirm that seeded/live data stays visually meaningful

### Wave 2

Mission Centre

- Mission timeline
- Mission details
- Agent assignments
- Mission outcomes

Primary intent:

- move from summary-only mission views to operator-usable mission inspection
- make mission state, assignment history, and outcomes easy to follow

### Wave 3

Agent Centre

- Agent profiles
- Agent activity
- Agent runtime status
- Mission assignment history

Primary intent:

- make the agent layer understandable as a living runtime surface rather than a count dashboard

### Wave 4

Tool Centre

- Tool registry
- Tool invocation history
- Tool permissions
- Hermes-Claw preparation

Primary intent:

- expose the tool layer clearly before any real execution is enabled
- prepare the UX vocabulary for future Hermes-Claw integration

### Wave 5

Conversation Centre

- Threads
- Messages
- Linked knowledge
- Context view

Primary intent:

- make conversation state directly inspectable
- connect operational dialogue to knowledge and mission context

### Wave 6

Knowledge Centre

- Assets
- Links
- Scopes
- Search placeholder

Primary intent:

- make knowledge visible as a structured operating layer, not just counts

### Wave 7

Jarvis Command Bar

- Non-AI command routing first
- Search
- Navigation
- Command suggestions

Primary intent:

- establish the command surface before adding intelligence
- keep routing deterministic and governed first

### Wave 8

Portfolio / Company view

- Workspaces
- Companies
- Projects
- Capabilities
- Missions by company

Primary intent:

- extend Nexus from kernel-centric visibility to portfolio-level operational oversight

### Wave 9

API expansion

- Read-only detail endpoints
- No writes yet unless explicitly approved

Primary intent:

- support deeper UI detail panels and drill-downs
- preserve the current no-write safety boundary

### Wave 10

Beta-1 lock

- Tests
- Build
- Runbook
- Demo walkthrough

Primary intent:

- stabilize the Beta-1 slice
- document how to run it
- prove it works as a coherent product milestone

## 5. Codex Efficiency Rules

- Build vertical slices
- Bundle frontend + API + tests
- Avoid micro milestones
- Always check files exist
- Always run focused tests/build
- Commit by meaningful milestone

Additional execution guidance:

- prefer one coherent operational slice over many tiny UI-only patches
- avoid partial milestone claims
- keep read-only API and frontend changes aligned in the same milestone when detail surfaces require both
- do not introduce backend writes casually
- verify builds and focused tests before closeout

## 6. Milestone Table

| Milestone Name | Scope | Files Likely Affected | Tests / Build Commands | Expected Outcome |
| --- | --- | --- | --- | --- |
| Wave 1: Executive Home Polish | Executive landing page, attention cues, health/readiness framing, event feed polish | `apps/nexus-console/src/pages/`, `apps/nexus-console/src/components/`, `apps/nexus-console/src/styles.css`, optionally `core/commandcore/api/routes.py`, `core/tests/test_commandcore_api.py` | `cd apps/nexus-console && npm run build` ; focused API route tests if changed | Executive home becomes daily-use entry point with meaningful live visibility |
| Wave 2: Mission Centre | Mission timeline, detail cards, assignment/outcome visibility | `apps/nexus-console/src/pages/MissionDashboard.tsx`, new mission components, optional API detail routes and schemas | `cd apps/nexus-console && npm run build` ; focused API tests if routes change | Missions become inspectable, not just summarized |
| Wave 3: Agent Centre | Agent profiles, activity, runtime status, assignment history | `apps/nexus-console/src/pages/AgentDashboard.tsx`, agent components, optional API detail routes | `cd apps/nexus-console && npm run build` ; focused API tests if routes change | Operators can understand agent state and history quickly |
| Wave 4: Tool Centre | Tool registry detail, invocation history, permission visibility | `apps/nexus-console/src/pages/ToolDashboard.tsx`, tool components, optional API detail routes | `cd apps/nexus-console && npm run build` ; focused API tests if routes change | Tool layer becomes operationally legible and Hermes-Claw-ready |
| Wave 5: Conversation Centre | Thread/message inspection, knowledge links, context views | `apps/nexus-console/src/pages/ConversationDashboard.tsx`, conversation components, optional read-only detail routes | `cd apps/nexus-console && npm run build` ; focused API tests if routes change | Conversation state becomes inspectable and connected to scope |
| Wave 6: Knowledge Centre | Asset/link/scope visibility and search placeholder | `apps/nexus-console/src/pages/KnowledgeDashboard.tsx`, knowledge components, optional read-only search/detail routes | `cd apps/nexus-console && npm run build` ; focused API tests if routes change | Knowledge becomes navigable rather than count-only |
| Wave 7: Jarvis Command Bar | Global command bar, navigation/search routing, suggestion UX | `apps/nexus-console/src/App.tsx`, `src/components/`, `src/styles.css`, optional lightweight read-only search routes | `cd apps/nexus-console && npm run build` ; focused API tests if routes change | Nexus gains a real operating-system command surface |
| Wave 8: Portfolio / Company View | Cross-workspace/company/project/capability/mission visibility | `apps/nexus-console/src/pages/WorkspacesDashboard.tsx`, new portfolio components, read-only API detail/aggregate routes | `cd apps/nexus-console && npm run build` ; focused API tests | Nexus expands from kernel dashboard to portfolio command centre |
| Wave 9: API Expansion | Read-only detail endpoints for deeper UI drill-downs | `core/commandcore/api/`, `core/tests/test_commandcore_api.py`, optional dashboard helpers | `PYTHONPATH=core ... pytest --noconftest core/tests/test_commandcore_api.py` ; `cd apps/nexus-console && npm run build` | UI can request structured detail data without crossing write boundaries |
| Wave 10: Beta-1 Lock | Final stabilization, docs, walkthrough, build/test verification | `docs/engineering/`, `docs/roadmap/`, `core/tests/`, `apps/nexus-console/` | focused pytest for changed backend routes ; `cd apps/nexus-console && npm run build` | Beta-1 is stable, documented, and demo-ready |

## 7. Deferred Until Beta-2

- auth
- database persistence
- write actions from UI
- AI model calls
- real Hermes-Claw execution
- Odysseus planning
- production deployment

Reason for deferral:

- these are important, but they would blur the current Beta-1 focus on operational visibility, read-only clarity, and stable interaction surfaces

## 8. Immediate Next Milestone Recommendation

Beta-1 Wave 1: Executive Home polish + live detail cards + API route verification.

Recommended immediate scope:

- strengthen the Executive Home cards with more explicit live detail
- verify every currently used read-only route remains stable and complete
- improve attention logic and event readability where needed
- keep the change as one vertical slice across frontend polish, any tiny read-only route verification, and focused tests/build

Success condition:

- the Nexus home page feels like the default daily command centre for CommandCore operations
- live seeded data is clearly visible and trustworthy
- no new backend write surface is introduced
