export type StatusTone = "ready" | "warning" | "blocked" | "active" | "idle" | "complete";

export type NavPage =
  | "kernel"
  | "executive"
  | "missions"
  | "agents"
  | "tools"
  | "conversations"
  | "knowledge"
  | "workspaces"
  | "health";

export type MetricCard = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatusTone;
};

export type ActivityItem = {
  id: string;
  eventName: string;
  source: string;
  occurredAt: string;
  detail: string;
  tone?: StatusTone;
};

export type TableRow = {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: StatusTone;
  meta?: string;
};

export type PanelData = {
  title: string;
  rows: TableRow[];
};

export type AvailabilityItem = {
  name: string;
  available: boolean;
  detail: string;
};

export type PageData = {
  title: string;
  eyebrow: string;
  description: string;
  status: {
    label: string;
    tone: StatusTone;
  };
  metrics: MetricCard[];
  primaryPanel: PanelData;
  secondaryPanel: PanelData;
  tertiaryPanel?: PanelData;
  availabilityGrid?: AvailabilityItem[];
  activityTitle: string;
  activity: ActivityItem[];
  emptyState?: string;
};

export type KernelSnapshot = {
  kernelOverview: PageData;
  executiveDashboard: PageData;
  missionDashboard: PageData;
  agentDashboard: PageData;
  toolDashboard: PageData;
  conversationDashboard: PageData;
  knowledgeDashboard: PageData;
  workspaceDashboard: PageData;
  healthReadiness: PageData;
};

export const pageOrder: Array<{ id: NavPage; label: string; short: string }> = [
  { id: "kernel", label: "Kernel Overview", short: "KRNL" },
  { id: "executive", label: "Executive Dashboard", short: "EXEC" },
  { id: "missions", label: "Mission Dashboard", short: "MSSN" },
  { id: "agents", label: "Agent Dashboard", short: "AGNT" },
  { id: "tools", label: "Tool Dashboard", short: "TOOL" },
  { id: "conversations", label: "Conversation Dashboard", short: "CONV" },
  { id: "knowledge", label: "Knowledge Dashboard", short: "KNOW" },
  { id: "workspaces", label: "Workspace Dashboard", short: "WKSP" },
  { id: "health", label: "Health / Readiness", short: "HLTH" },
];

export const mockKernel: KernelSnapshot = {
  kernelOverview: {
    eyebrow: "CommandCore / Governed Kernel",
    title: "Kernel Overview",
    description:
      "Single-screen operating view across governance, runtime execution, tool flow, knowledge, and readiness.",
    status: { label: "Ready", tone: "ready" },
    metrics: [
      { label: "Readiness", value: "Ready", hint: "No blocking issues", tone: "ready" },
      { label: "Health", value: "Healthy", hint: "Core services visible", tone: "active" },
      { label: "Event Bus", value: 184, hint: "Live events observed", tone: "active" },
      { label: "Event Store", value: 184, hint: "Canonical history", tone: "complete" },
      { label: "Audit Entries", value: 184, hint: "Operational trace", tone: "active" },
    ],
    primaryPanel: {
      title: "Kernel Signals",
      rows: [
        { title: "Executive Surface", subtitle: "Objective governance and outcome visibility", badge: "Ready", badgeTone: "ready" },
        { title: "Mission Surface", subtitle: "Mission throughput and task-state visibility", badge: "Live", badgeTone: "active" },
        { title: "Tool Surface", subtitle: "Registered tool and invocation telemetry", badge: "Online", badgeTone: "active" },
      ],
    },
    secondaryPanel: {
      title: "Runtime Counts",
      rows: [
        { title: "Agent Runtime", subtitle: "8 assignments / 6 executions", badge: "Visible", badgeTone: "active" },
        { title: "Tool Runtime", subtitle: "5 tools / 6 invocations", badge: "Visible", badgeTone: "active" },
        { title: "Knowledge Layer", subtitle: "24 assets / 18 relationships", badge: "Indexed", badgeTone: "complete" },
      ],
    },
    tertiaryPanel: {
      title: "Recent Kernel Notes",
      rows: [
        { title: "Frontend-only slice", subtitle: "Live API + mock fallback active", badge: "Static", badgeTone: "idle" },
        { title: "Observability first", subtitle: "Read-only operating dashboard", badge: "Applied", badgeTone: "complete" },
      ],
    },
    availabilityGrid: [
      { name: "event_store", available: true, detail: "Canonical event history visible" },
      { name: "audit_trail", available: true, detail: "Operational trace aligned" },
      { name: "agent_runtime", available: true, detail: "Assignments and executions online" },
      { name: "tool_runtime", available: true, detail: "Invocation telemetry online" },
      { name: "conversation_engine", available: true, detail: "Message and context tracking visible" },
      { name: "executive_reporting", available: true, detail: "Governance dashboard available" },
    ],
    activityTitle: "Recent Kernel Activity",
    activity: [
      { id: "k1", eventName: "ExecutiveMissionCompleted", source: "commandcore.executive.orchestrator", occurredAt: "04:18 UTC", detail: "Alpha-5 planning mission closed with summary output.", tone: "complete" },
      { id: "k2", eventName: "ToolInvocationCompleted", source: "commandcore.tools.runtime", occurredAt: "04:11 UTC", detail: "Knowledge Search returned 3 matched assets.", tone: "active" },
      { id: "k3", eventName: "ConversationKnowledgeLinked", source: "commandcore.conversations.engine", occurredAt: "03:58 UTC", detail: "Mission planning thread linked to operating runbook.", tone: "idle" },
    ],
    emptyState: "Kernel activity will appear here when the API exposes audit summaries.",
  },
  executiveDashboard: {
    eyebrow: "Governance / Strategy Layer",
    title: "Executive Dashboard",
    description: "Objective flow, policy outcomes, and executive directives from the current reporting services.",
    status: { label: "Nominal", tone: "ready" },
    metrics: [
      { label: "Objectives", value: 3, hint: "Tracked this cycle" },
      { label: "With Missions", value: 3, hint: "Objective-to-mission linkage", tone: "active" },
      { label: "Policy Warnings", value: 1, hint: "Allowed with review", tone: "warning" },
      { label: "Outcomes", value: 2, hint: "Recorded executive results", tone: "complete" },
    ],
    primaryPanel: {
      title: "Decision Lanes",
      rows: [
        { title: "Release Readiness Review", subtitle: "Objective obj-alpha5", badge: "Allowed", badgeTone: "ready", meta: "1 mission attached" },
        { title: "Policy Escalation Sweep", subtitle: "Objective obj-governance", badge: "Warning", badgeTone: "warning", meta: "Human review recommended" },
        { title: "Capability Coverage Audit", subtitle: "Objective obj-capability", badge: "Complete", badgeTone: "complete", meta: "Outcome published" },
      ],
    },
    secondaryPanel: {
      title: "Directive Summary",
      rows: [
        { title: "Directive Count", subtitle: "2 issued to orchestration state", meta: "Governance lane live" },
        { title: "Policy Blocks", subtitle: "0 blocked objectives in mock cycle", meta: "Gate remains permissive" },
        { title: "Warning Pattern", subtitle: "High-priority objectives require review", badge: "Warn", badgeTone: "warning" },
      ],
    },
    activityTitle: "Recent Governance Activity",
    activity: [
      { id: "e1", eventName: "ExecutivePolicyGateChecked", source: "commandcore.executive.policy_gate", occurredAt: "04:08 UTC", detail: "Objective passed with warnings for high-priority review.", tone: "warning" },
      { id: "e2", eventName: "ExecutiveMissionCreated", source: "commandcore.executive.orchestrator", occurredAt: "03:49 UTC", detail: "Objective obj-alpha5 created a new governed mission.", tone: "active" },
      { id: "e3", eventName: "ExecutiveMissionCompleted", source: "commandcore.executive.orchestrator", occurredAt: "03:33 UTC", detail: "Outcome captured and mission marked terminal.", tone: "complete" },
    ],
    emptyState: "No governance events available yet.",
  },
  missionDashboard: {
    eyebrow: "Operations / Mission Engine",
    title: "Mission Dashboard",
    description: "Mission state, throughput, assigned agents, and mission-linked runtime flow.",
    status: { label: "Active", tone: "active" },
    metrics: [
      { label: "Total Missions", value: 6, hint: "Across current operating slice" },
      { label: "Active Missions", value: 2, hint: "Requested / approved / blocked" },
      { label: "Completed", value: 4, hint: "Terminal with result summaries", tone: "complete" },
      { label: "Assigned Agents", value: 3, hint: "Distinct operators engaged" },
    ],
    primaryPanel: {
      title: "Mission Throughput",
      rows: [
        { title: "Created", subtitle: "6 total mission records", meta: "Completion rate 80%" },
        { title: "Completed", subtitle: "4 resolved missions", badge: "80%", badgeTone: "complete" },
        { title: "Failed", subtitle: "1 failed mission in audit window", badge: "Watch", badgeTone: "warning" },
      ],
    },
    secondaryPanel: {
      title: "Current Mission Set",
      rows: [
        { title: "Prepare Alpha-5 UI review", subtitle: "mission-alpha5-ui", badge: "Requested", badgeTone: "active", meta: "2 tasks, capability cap-ui" },
        { title: "Validate runtime dashboards", subtitle: "mission-alpha5-ops", badge: "Completed", badgeTone: "complete", meta: "Result summary attached" },
        { title: "Recover failed connector sync", subtitle: "mission-alpha5-recovery", badge: "Failed", badgeTone: "warning", meta: "Failure reason stored" },
      ],
    },
    activityTitle: "Recent Mission Activity",
    activity: [
      { id: "m1", eventName: "MissionCompleted", source: "commandcore.mission.engine", occurredAt: "04:12 UTC", detail: "mission-alpha5-ops closed with review summary.", tone: "complete" },
      { id: "m2", eventName: "AgentMissionExecutionStarted", source: "commandcore.agents.mission_assignment", occurredAt: "03:57 UTC", detail: "Agent agent-hermes began task execution for mission-alpha5-ui.", tone: "active" },
      { id: "m3", eventName: "MissionFailed", source: "commandcore.mission.engine", occurredAt: "03:21 UTC", detail: "Connector sync mission recorded a recoverable failure.", tone: "warning" },
    ],
    emptyState: "No mission activity has been recorded yet.",
  },
  agentDashboard: {
    eyebrow: "Runtime / Agent Control",
    title: "Agent Dashboard",
    description: "Availability, assignment flow, and execution telemetry for the current in-memory workforce layer.",
    status: { label: "Online", tone: "ready" },
    metrics: [
      { label: "Agents", value: 4, hint: "Registered workforce nodes" },
      { label: "Available", value: 2, hint: "Ready for assignment", tone: "ready" },
      { label: "Running Executions", value: 2, hint: "In-flight work", tone: "active" },
      { label: "Failed Executions", value: 1, hint: "Needs intervention", tone: "warning" },
    ],
    primaryPanel: {
      title: "Assignment State",
      rows: [
        { title: "Total Assignments", subtitle: "8 assignment records", meta: "5 mission-linked" },
        { title: "Completed", subtitle: "4 assignments terminal", badge: "Closed", badgeTone: "complete" },
        { title: "Running", subtitle: "2 assignments executing", badge: "Live", badgeTone: "active" },
      ],
    },
    secondaryPanel: {
      title: "Executions by Mission",
      rows: [
        { title: "mission-alpha5-ui", subtitle: "2 total / 1 running / 1 completed", badge: "Mixed", badgeTone: "active" },
        { title: "mission-alpha5-ops", subtitle: "2 total / 2 completed", badge: "Stable", badgeTone: "complete" },
        { title: "mission-alpha5-recovery", subtitle: "1 failed execution", badge: "Attention", badgeTone: "warning" },
      ],
    },
    activityTitle: "Recent Agent Activity",
    activity: [
      { id: "a1", eventName: "AgentMissionExecutionCompleted", source: "commandcore.agents.mission_assignment", occurredAt: "04:05 UTC", detail: "agent-hermes completed a mission-linked execution.", tone: "complete" },
      { id: "a2", eventName: "AgentExecutionStarted", source: "commandcore.agents.runtime", occurredAt: "03:54 UTC", detail: "agent-claw started an internal runtime assignment.", tone: "active" },
      { id: "a3", eventName: "AgentExecutionFailed", source: "commandcore.agents.runtime", occurredAt: "03:17 UTC", detail: "agent-sentinel recorded a failed execution.", tone: "warning" },
    ],
    emptyState: "No agent execution events available yet.",
  },
  toolDashboard: {
    eyebrow: "Execution / Tool Runtime",
    title: "Tool Dashboard",
    description: "Registered tools, permission mix, and invocation telemetry for the in-memory runtime foundation.",
    status: { label: "Live", tone: "active" },
    metrics: [
      { label: "Registered Tools", value: 5, hint: "Safe + restricted surfaces" },
      { label: "Invocations", value: 6, hint: "Current dashboard sample" },
      { label: "Running", value: 2, hint: "Live tool work", tone: "active" },
      { label: "Failed", value: 1, hint: "Execution disabled / rejected", tone: "warning" },
    ],
    primaryPanel: {
      title: "Tools by Permission",
      rows: [
        { title: "Safe", subtitle: "3 tools", badge: "Default", badgeTone: "ready" },
        { title: "Restricted", subtitle: "1 tool", badge: "Review", badgeTone: "warning" },
        { title: "Privileged", subtitle: "1 tool", badge: "Guarded", badgeTone: "idle" },
      ],
    },
    secondaryPanel: {
      title: "Invocation State",
      rows: [
        { title: "Knowledge Search", subtitle: "invoke-204", badge: "Running", badgeTone: "active", meta: "agent-hermes / cap-search" },
        { title: "Mission Planner", subtitle: "invoke-203", badge: "Completed", badgeTone: "complete", meta: "2 matches returned" },
        { title: "Connector Sweep", subtitle: "invoke-201", badge: "Failed", badgeTone: "warning", meta: "Execution disabled in foundation" },
      ],
    },
    activityTitle: "Recent Tool Activity",
    activity: [
      { id: "t1", eventName: "ToolInvocationCompleted", source: "commandcore.tools.runtime", occurredAt: "04:15 UTC", detail: "Mission Planner invocation stored an output payload.", tone: "complete" },
      { id: "t2", eventName: "ToolInvocationStarted", source: "commandcore.tools.runtime", occurredAt: "04:07 UTC", detail: "Knowledge Search invocation entered running state.", tone: "active" },
      { id: "t3", eventName: "ToolInvocationFailed", source: "commandcore.tools.runtime", occurredAt: "03:46 UTC", detail: "Connector Sweep rejected with disabled execution error.", tone: "warning" },
    ],
    emptyState: "No tool events available yet.",
  },
  conversationDashboard: {
    eyebrow: "Coordination / Conversation Engine",
    title: "Conversation Dashboard",
    description: "Threads, messages, context records, and knowledge link visibility for the current in-memory conversation layer.",
    status: { label: "Contextual", tone: "ready" },
    metrics: [
      { label: "Conversations", value: 3, hint: "Top-level records" },
      { label: "Threads", value: 8, hint: "Discussion branches" },
      { label: "Messages", value: 41, hint: "Current retained messages" },
      { label: "Knowledge Links", value: 7, hint: "Message + thread linkage", tone: "active" },
    ],
    primaryPanel: {
      title: "Context Availability",
      rows: [
        { title: "Attached Context Records", subtitle: "5 total context entries", badge: "Available", badgeTone: "ready" },
        { title: "Conversations With Context", subtitle: "3 conversation records enriched", meta: "Mission scope included" },
        { title: "Recent Message Pulse", subtitle: "9 message events in last window", badge: "Busy", badgeTone: "active" },
      ],
    },
    secondaryPanel: {
      title: "Tracked Threads",
      rows: [
        { title: "Alpha-5 Launch Planning", subtitle: "thread-alpha5-plan", badge: "Hot", badgeTone: "active", meta: "12 messages / 3 assets linked" },
        { title: "Governance Review", subtitle: "thread-gov-review", badge: "Context", badgeTone: "ready", meta: "Context attached to mission scope" },
        { title: "Recovery Debrief", subtitle: "thread-recovery", badge: "Closed", badgeTone: "complete", meta: "Summary retained" },
      ],
    },
    activityTitle: "Recent Conversation Activity",
    activity: [
      { id: "c1", eventName: "ConversationMessageAdded", source: "commandcore.conversations.engine", occurredAt: "04:19 UTC", detail: "New operator note added to Alpha-5 planning thread.", tone: "active" },
      { id: "c2", eventName: "ConversationContextAttached", source: "commandcore.conversations.engine", occurredAt: "04:02 UTC", detail: "Mission scope context attached to governance review thread.", tone: "ready" },
      { id: "c3", eventName: "ConversationKnowledgeLinked", source: "commandcore.conversations.engine", occurredAt: "03:41 UTC", detail: "Message linked to launch runbook asset.", tone: "idle" },
    ],
    emptyState: "No conversation activity has been published yet.",
  },
  knowledgeDashboard: {
    eyebrow: "Memory / Knowledge Layer",
    title: "Knowledge Dashboard",
    description: "Knowledge asset density and relationship coverage across the current workspace estate.",
    status: { label: "Indexed", tone: "ready" },
    metrics: [
      { label: "Assets", value: 24, hint: "Knowledge records in mock scope" },
      { label: "Relationships", value: 18, hint: "Cross-linked context graph" },
      { label: "Workspaces", value: 4, hint: "Knowledge-bearing workspaces" },
      { label: "Coverage", value: "83%", hint: "Workspaces with assets", tone: "active" },
    ],
    primaryPanel: {
      title: "Asset Distribution",
      rows: [
        { title: "ws-local", subtitle: "9 assets / 6 relationships", badge: "Primary", badgeTone: "active" },
        { title: "ws-ops", subtitle: "7 assets / 5 relationships", badge: "Stable", badgeTone: "ready" },
        { title: "ws-labs", subtitle: "5 assets / 4 relationships", badge: "Growing", badgeTone: "idle" },
      ],
    },
    secondaryPanel: {
      title: "Knowledge Signals",
      rows: [
        { title: "Runbooks", subtitle: "High-value operational documents", badge: "Dense", badgeTone: "complete" },
        { title: "Mission Debriefs", subtitle: "Cross-linked to conversation threads", badge: "Linked", badgeTone: "active" },
        { title: "Research Notes", subtitle: "Lower relationship density", badge: "Monitor", badgeTone: "warning" },
      ],
    },
    activityTitle: "Recent Knowledge Activity",
    activity: [
      { id: "g1", eventName: "KnowledgeAssetCreated", source: "commandcore.knowledge.engine", occurredAt: "04:09 UTC", detail: "New launch runbook asset stored in ws-local.", tone: "complete" },
      { id: "g2", eventName: "KnowledgeAssetsLinked", source: "commandcore.knowledge.engine", occurredAt: "03:55 UTC", detail: "Mission debrief linked to operating checklist.", tone: "active" },
      { id: "g3", eventName: "WorkspaceCreated", source: "commandcore.registries.workspace", occurredAt: "03:18 UTC", detail: "ws-ops added to mock estate.", tone: "idle" },
    ],
    emptyState: "No knowledge events are currently available.",
  },
  workspaceDashboard: {
    eyebrow: "Estate / Workspace Layer",
    title: "Workspace Dashboard",
    description: "Workspace counts, knowledge coverage, and recent workspace-linked activity.",
    status: { label: "Tracked", tone: "ready" },
    metrics: [
      { label: "Workspaces", value: 4, hint: "Visible workspace records" },
      { label: "With Knowledge", value: 3, hint: "Workspaces with assets", tone: "active" },
      { label: "Assets", value: 24, hint: "Knowledge records" },
      { label: "Relationships", value: 18, hint: "Cross-links", tone: "complete" },
    ],
    primaryPanel: {
      title: "Workspace Coverage",
      rows: [
        { title: "ws-local", subtitle: "9 assets attached", badge: "Primary", badgeTone: "active" },
        { title: "ws-ops", subtitle: "7 assets attached", badge: "Stable", badgeTone: "ready" },
        { title: "ws-labs", subtitle: "5 assets attached", badge: "Growing", badgeTone: "idle" },
      ],
    },
    secondaryPanel: {
      title: "Knowledge Relationship Density",
      rows: [
        { title: "ws-local", subtitle: "6 linked relationships", badge: "Dense", badgeTone: "complete" },
        { title: "ws-ops", subtitle: "5 linked relationships", badge: "Healthy", badgeTone: "ready" },
        { title: "ws-labs", subtitle: "4 linked relationships", badge: "Moderate", badgeTone: "idle" },
      ],
    },
    activityTitle: "Recent Workspace Activity",
    activity: [
      { id: "w1", eventName: "WorkspaceCreated", source: "commandcore.registries.workspace", occurredAt: "04:01 UTC", detail: "ws-alpha5 created for UI operations.", tone: "active" },
      { id: "w2", eventName: "KnowledgeAssetCreated", source: "commandcore.knowledge.engine", occurredAt: "03:53 UTC", detail: "Runbook asset attached to ws-local.", tone: "complete" },
      { id: "w3", eventName: "KnowledgeAssetsLinked", source: "commandcore.knowledge.engine", occurredAt: "03:32 UTC", detail: "Workspace research note linked to mission debrief.", tone: "idle" },
    ],
    emptyState: "No workspace events are currently available.",
  },
  healthReadiness: {
    eyebrow: "Observability / Health + Readiness",
    title: "Health / Readiness",
    description: "Point-in-time kernel posture derived from readiness checks, warning conditions, and snapshot counts.",
    status: { label: "Ready", tone: "ready" },
    metrics: [
      { label: "Readiness Status", value: "Ready", hint: "No blocking issues", tone: "ready" },
      { label: "Warnings", value: 0, hint: "Clean mocked operating state", tone: "complete" },
      { label: "Kernel Checks", value: 11, hint: "Availability surfaces evaluated" },
      { label: "Audit Match", value: "True", hint: "Event bus and audit trail aligned", tone: "ready" },
    ],
    primaryPanel: {
      title: "Snapshot Counts",
      rows: [
        { title: "Events", subtitle: "184 on event bus / 184 in event store", badge: "Aligned", badgeTone: "ready" },
        { title: "Agent Runtime", subtitle: "8 assignments / 6 executions", badge: "Visible", badgeTone: "active" },
        { title: "Tool Runtime", subtitle: "5 tools / 6 invocations", badge: "Visible", badgeTone: "active" },
      ],
    },
    secondaryPanel: {
      title: "Readiness Checks",
      rows: [
        { title: "event_bus", subtitle: "Available", badge: "Pass", badgeTone: "ready" },
        { title: "event_store", subtitle: "Available", badge: "Pass", badgeTone: "ready" },
        { title: "dashboards", subtitle: "Kernel overview service ready", badge: "Pass", badgeTone: "ready" },
      ],
    },
    activityTitle: "Recent Health Signals",
    activity: [
      { id: "h1", eventName: "KernelSnapshotBuilt", source: "mock.nexus-console", occurredAt: "04:20 UTC", detail: "Static frontend snapshot refreshed from mock kernel data.", tone: "idle" },
      { id: "h2", eventName: "ReadinessEvaluated", source: "mock.nexus-console", occurredAt: "04:20 UTC", detail: "No blocking issues or warnings in displayed console state.", tone: "ready" },
      { id: "h3", eventName: "ToolInvocationCompleted", source: "commandcore.tools.runtime", occurredAt: "04:15 UTC", detail: "Recent runtime completion keeps tool layer visibly healthy.", tone: "complete" },
    ],
    emptyState: "No health signals are currently available.",
  },
};

export const pageMap: Record<NavPage, PageData> = {
  kernel: mockKernel.kernelOverview,
  executive: mockKernel.executiveDashboard,
  missions: mockKernel.missionDashboard,
  agents: mockKernel.agentDashboard,
  tools: mockKernel.toolDashboard,
  conversations: mockKernel.conversationDashboard,
  knowledge: mockKernel.knowledgeDashboard,
  workspaces: mockKernel.workspaceDashboard,
  health: mockKernel.healthReadiness,
};
