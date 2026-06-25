import {
  mockKernel,
  mockMissionCentre,
  pageMap,
  type ActivityItem,
  type AvailabilityItem,
  type MissionAgentExecution,
  type MissionCentreData,
  type MissionRecord,
  type NavPage,
  type PageData,
  type StatusTone,
  type TableRow,
} from "../data/mockKernel";

export type DataSource = "live" | "mock";

export type ConsoleDataResult = {
  pages: Record<NavPage, PageData>;
  missionCentre: MissionCentreData;
  source: DataSource;
  baseUrl?: string;
  error?: string;
};

type JsonObject = Record<string, unknown>;

const API_TIMEOUT_MS = 3500;
const rawBaseUrl = import.meta.env.VITE_COMMANDCORE_API_URL as string | undefined;
const apiBaseUrl = rawBaseUrl?.trim().replace(/\/$/, "");

export async function loadConsoleData(): Promise<ConsoleDataResult> {
  if (!apiBaseUrl) {
    return {
      pages: pageMap,
      missionCentre: mockMissionCentre,
      source: "mock",
      error: "VITE_COMMANDCORE_API_URL is not configured.",
    };
  }

  try {
    const [health, readiness, kernel, executive, missions, agents, tools, conversations, workspaces, knowledge] =
      await Promise.all([
        fetchJson<JsonObject>("/health"),
        fetchJson<JsonObject>("/readiness"),
        fetchJson<JsonObject>("/dashboard/kernel"),
        fetchJson<JsonObject>("/dashboard/executive"),
        fetchJson<JsonObject>("/dashboard/missions"),
        fetchJson<JsonObject>("/dashboard/agents"),
        fetchJson<JsonObject>("/dashboard/tools"),
        fetchJson<JsonObject>("/dashboard/conversations"),
        fetchJson<JsonObject>("/dashboard/workspaces"),
        fetchJson<JsonObject>("/dashboard/knowledge"),
      ]);

    return {
      pages: {
        kernel: buildKernelOverview(kernel, health, readiness),
        executive: buildExecutiveDashboard(executive),
        missions: buildMissionDashboard(missions),
        agents: buildAgentDashboard(agents),
        tools: buildToolDashboard(tools),
        conversations: buildConversationDashboard(conversations),
        knowledge: buildKnowledgeDashboard(knowledge),
        workspaces: buildWorkspaceDashboard(workspaces),
        health: buildHealthDashboard(health, readiness),
        settings: pageMap.settings,
      },
      missionCentre: buildMissionCentre(missions),
      source: "live",
      baseUrl: apiBaseUrl,
    };
  } catch (error) {
    return {
      pages: pageMap,
      missionCentre: mockMissionCentre,
      source: "mock",
      baseUrl: apiBaseUrl,
      error: error instanceof Error ? error.message : "Unable to load CommandCore API.",
    };
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${path}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`API request timed out: ${path}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildKernelOverview(kernel: JsonObject, health: JsonObject, readiness: JsonObject): PageData {
  const audit = objectOf(kernel.audit_summary);
  const checks = objectOf(readiness.checks);
  const healthStatus = booleanOf(health.event_store_available) && booleanOf(health.orchestrator_available)
    ? "Healthy"
    : "Degraded";

  return {
    ...mockKernel.kernelOverview,
    status: {
      label: stringOf(readiness.status, "Unknown"),
      tone: toneFromStatus(stringOf(readiness.status, "warning")),
    },
    metrics: [
      metric("Readiness", stringOf(readiness.status, "Unknown"), "Kernel posture from readiness builder", toneFromStatus(stringOf(readiness.status, "warning"))),
      metric("Health", healthStatus, "Derived from service availability", toneFromStatus(healthStatus)),
      metric("Event Bus", numberOf(health.event_count), "Live event count", "active"),
      metric("Event Store", numberOf(health.event_store_event_count), "Canonical event history", "complete"),
      metric("Audit Entries", numberOf(health.audit_entry_count), "Operational audit trail", "active"),
    ],
    primaryPanel: panel("Kernel Signals", [
      row("Executive Surface", `Objectives visible: ${numberOf(objectOf(objectOf(kernel.executive_dashboard).objective_counts).total)}`, "Ready", "ready"),
      row("Mission Surface", `Mission count: ${numberOf(objectOf(objectOf(kernel.mission_dashboard).mission_counts).total)}`, "Live", "active"),
      row("Conversation Surface", `Conversation count: ${numberOf(objectOf(objectOf(kernel.conversation_dashboard).conversation_counts).total)}`, "Tracked", "idle"),
    ]),
    secondaryPanel: panel("Runtime Counts", [
      row("Tool Runtime", `${numberOf(health.tool_count)} tools / ${numberOf(health.tool_invocation_count)} invocations`, "Visible", "active"),
      row("Agent Runtime", `${numberOf(health.agent_assignment_count)} assignments / ${numberOf(health.agent_execution_count)} executions`, "Visible", "active"),
      row("Knowledge Layer", `${numberOf(objectOf(kernel.knowledge_counts).asset_count)} assets / ${numberOf(objectOf(kernel.knowledge_counts).relationship_count)} relationships`, "Indexed", "complete"),
    ]),
    tertiaryPanel: panel("Audit Summary", [
      row("Audit Entry Count", `${numberOf(audit.entry_count)} entries captured`, "Aligned", "ready"),
      row("Domain Events", `${numberOf(objectOf(audit.by_type).domain)} domain entries`, "Live", "active"),
      row("System Events", `${numberOf(objectOf(audit.by_type).system)} system entries`, "Tracked", "idle"),
    ]),
    availabilityGrid: [
      availability("event_bus", booleanOf(checks.event_bus), "Live dispatch surface"),
      availability("event_store", booleanOf(checks.event_store), "Canonical event history"),
      availability("audit_trail", booleanOf(checks.audit_trail), "Operational audit trace"),
      availability("agent_runtime", booleanOf(checks.agent_runtime), "Assignment and execution telemetry"),
      availability("tool_runtime", booleanOf(checks.tool_runtime), "Tool invocation telemetry"),
      availability("knowledge_engine", booleanOf(checks.knowledge_engine), "Knowledge asset visibility"),
      availability("mission_engine", booleanOf(checks.mission_engine), "Mission state visibility"),
      availability("executive_runtime", booleanOf(checks.executive_runtime), "Governance runtime visibility"),
    ],
    activity: activitiesOf(arrayOf(audit.recent_entries), "No recent kernel events available from audit summary."),
  };
}

function buildExecutiveDashboard(data: JsonObject): PageData {
  const objectiveCounts = objectOf(data.objective_counts);
  const warnings = arrayOf(data.policy_warnings);
  const blocks = arrayOf(data.policy_blocks);
  const outcomes = objectOf(data.executive_outcomes);
  const decisions = objectOf(data.decisions);
  const directives = objectOf(data.directives);

  return {
    ...mockKernel.executiveDashboard,
    metrics: [
      metric("Objectives", numberOf(objectiveCounts.total), "Tracked in executive report"),
      metric("With Missions", numberOf(objectiveCounts.with_missions), "Objective-to-mission linkage", "active"),
      metric("Policy Warnings", warnings.length, "Allowed with warning", warnings.length ? "warning" : "ready"),
      metric("Outcomes", numberOf(outcomes.count), "Recorded executive outcomes", numberOf(outcomes.count) ? "complete" : "idle"),
    ],
    primaryPanel: panel("Decision Lanes", [
      row("Tracked Objectives", `${numberOf(objectiveCounts.total)} total`, "Live", "active"),
      row("Decision Records", `${numberOf(decisions.count)} decision entries`, "Tracked", "ready"),
      row("Directive Records", `${numberOf(directives.count)} directives issued`, "Tracked", "idle"),
    ]),
    secondaryPanel: panel("Policy Summary", [
      row("Policy Warnings", `${warnings.length} warning events`, warnings.length ? "Warn" : "Clear", warnings.length ? "warning" : "ready"),
      row("Policy Blocks", `${blocks.length} blocked events`, blocks.length ? "Blocked" : "Clear", blocks.length ? "blocked" : "ready"),
      row("Outcome Records", `${numberOf(outcomes.count)} outcomes stored`, numberOf(outcomes.count) ? "Complete" : "Idle", numberOf(outcomes.count) ? "complete" : "idle"),
    ]),
    activity: activitiesOf([...warnings, ...blocks], "No recent executive activity available."),
  };
}

function buildMissionDashboard(data: JsonObject): PageData {
  const missionCounts = objectOf(data.mission_counts);
  const throughput = objectOf(data.mission_throughput);
  const active = arrayOf(data.active_missions);
  const completed = arrayOf(data.completed_missions);
  const failed = arrayOf(data.failed_missions);

  return {
    ...mockKernel.missionDashboard,
    metrics: [
      metric("Total Missions", numberOf(missionCounts.total), "Mission records in kernel"),
      metric("Active Missions", numberOf(missionCounts.active), "Requested / approved / blocked", numberOf(missionCounts.active) ? "active" : "idle"),
      metric("Completed", numberOf(missionCounts.completed), "Terminal missions", numberOf(missionCounts.completed) ? "complete" : "idle"),
      metric("Assigned Agents", numberOf(data.assigned_agent_count), "Distinct engaged agents", numberOf(data.assigned_agent_count) ? "ready" : "idle"),
    ],
    primaryPanel: panel("Mission Throughput", [
      row("Created", `${numberOf(throughput.created)} total mission records`),
      row("Completed", `${numberOf(throughput.completed)} completed missions`, "Complete", "complete"),
      row("Failed", `${numberOf(throughput.failed)} failed missions`, numberOf(throughput.failed) ? "Watch" : "Clear", numberOf(throughput.failed) ? "warning" : "ready"),
    ]),
    secondaryPanel: panel("Mission Inventory", [
      ...rowsFromObjects(active, "mission_id", "title", "status", "result_summary"),
      ...rowsFromObjects(completed, "mission_id", "title", "status", "result_summary"),
      ...rowsFromObjects(failed, "mission_id", "title", "status", "failure_reason"),
    ].slice(0, 6)),
    activity: activitiesOf(arrayOf(data.recent_mission_activity), "No recent mission activity available."),
  };
}

function buildMissionCentre(data: JsonObject): MissionCentreData {
  const counts = objectOf(data.mission_counts);
  const throughput = objectOf(data.mission_throughput);

  return {
    counts: {
      total: numberOf(counts.total),
      active: numberOf(counts.active),
      completed: numberOf(counts.completed),
      failed: numberOf(counts.failed),
    },
    throughput: {
      created: numberOf(throughput.created),
      completed: numberOf(throughput.completed),
      failed: numberOf(throughput.failed),
      terminal: numberOf(throughput.terminal),
      completionRate: numberOf(throughput.completion_rate),
    },
    assignedAgentCount: numberOf(data.assigned_agent_count),
    active: missionRecordsOf(arrayOf(data.active_missions)),
    completed: missionRecordsOf(arrayOf(data.completed_missions)),
    failed: missionRecordsOf(arrayOf(data.failed_missions)),
    executions: {
      active: executionRecordsOf(arrayOf(data.active_agent_executions)),
      completed: executionRecordsOf(arrayOf(data.completed_agent_executions)),
      failed: executionRecordsOf(arrayOf(data.failed_agent_executions)),
    },
  };
}

function missionRecordsOf(items: unknown[]): MissionRecord[] {
  return items.map((item, index) => {
    const object = objectOf(item);
    return {
      missionId: stringOf(object.mission_id, `mission-${index}`),
      title: stringOf(object.title, "Untitled mission"),
      status: stringOf(object.status, "unknown"),
      assignedAgentId: typeof object.assigned_agent_id === "string" ? object.assigned_agent_id : undefined,
      scope: arrayOf(object.scope).map((value) => stringOf(value, "")),
      capabilityIds: arrayOf(object.capability_ids).map((value) => stringOf(value, "")),
      taskCount: typeof object.task_count === "number" ? object.task_count : undefined,
      resultSummary: typeof object.result_summary === "string" ? object.result_summary : undefined,
      failureReason: typeof object.failure_reason === "string" ? object.failure_reason : undefined,
    };
  });
}

function executionRecordsOf(items: unknown[]): MissionAgentExecution[] {
  return items.map((item, index) => {
    const object = objectOf(item);
    return {
      executionId: stringOf(object.execution_id, `execution-${index}`),
      agentId: stringOf(object.agent_id, "unknown-agent"),
      missionId: typeof object.mission_id === "string" ? object.mission_id : undefined,
      taskId: typeof object.task_id === "string" ? object.task_id : undefined,
      capabilityId: typeof object.capability_id === "string" ? object.capability_id : undefined,
      status: stringOf(object.status, "unknown"),
      error: typeof object.error === "string" ? object.error : undefined,
    };
  });
}

function buildAgentDashboard(data: JsonObject): PageData {
  const agentCounts = objectOf(data.agent_counts);
  const assignmentCounts = objectOf(data.assignment_counts);
  const executionCounts = objectOf(data.execution_counts);
  const executionsByMission = objectOf(data.executions_by_mission);

  return {
    ...mockKernel.agentDashboard,
    metrics: [
      metric("Agents", numberOf(agentCounts.total), "Registered runtime agents"),
      metric("Available", numberOf(agentCounts.available), "Ready for assignment", numberOf(agentCounts.available) ? "ready" : "idle"),
      metric("Running Executions", numberOf(executionCounts.running), "Live execution flow", numberOf(executionCounts.running) ? "active" : "idle"),
      metric("Failed Executions", numberOf(executionCounts.failed), "Needs intervention", numberOf(executionCounts.failed) ? "warning" : "ready"),
    ],
    primaryPanel: panel("Assignment State", [
      row("Total Assignments", `${numberOf(assignmentCounts.total)} assignment records`),
      row("Completed", `${numberOf(assignmentCounts.completed)} completed assignments`, "Closed", "complete"),
      row("Running", `${numberOf(assignmentCounts.running)} running assignments`, "Live", "active"),
    ]),
    secondaryPanel: panel(
      "Executions by Mission",
      Object.entries(executionsByMission).map(([missionId, value]) => {
        const summary = objectOf(value);
        const hasFailure = numberOf(summary.failed) > 0;
        return row(
          missionId,
          `${numberOf(summary.total)} total / ${numberOf(summary.running)} running / ${numberOf(summary.completed)} completed / ${numberOf(summary.failed)} failed`,
          hasFailure ? "Attention" : "Stable",
          hasFailure ? "warning" : "ready",
        );
      }),
    ),
    activity: activitiesOf(arrayOf(data.recent_agent_activity), "No recent agent activity available."),
  };
}

function buildToolDashboard(data: JsonObject): PageData {
  const toolCounts = objectOf(data.tool_counts);
  const invocationCounts = objectOf(data.invocation_counts);
  const permissions = objectOf(data.tools_by_permission);

  return {
    ...mockKernel.toolDashboard,
    metrics: [
      metric("Registered Tools", numberOf(toolCounts.total), "Available tool definitions"),
      metric("Invocations", numberOf(invocationCounts.total), "Observed invocation records"),
      metric("Running", numberOf(invocationCounts.running), "Live tool work", numberOf(invocationCounts.running) ? "active" : "idle"),
      metric("Failed", numberOf(invocationCounts.failed), "Rejected or failed execution", numberOf(invocationCounts.failed) ? "warning" : "ready"),
    ],
    primaryPanel: panel("Tools by Permission", [
      row("Safe", `${numberOf(permissions.safe)} tools`, "Default", "ready"),
      row("Restricted", `${numberOf(permissions.restricted)} tools`, "Review", "warning"),
      row("Privileged", `${numberOf(permissions.privileged)} tools`, "Guarded", "idle"),
    ]),
    secondaryPanel: panel(
      "Invocation State",
      [
        ...rowsFromObjects(arrayOf(data.active_invocations), "tool_id", "invocation_id", "status", "agent_id"),
        ...rowsFromObjects(arrayOf(data.completed_invocations), "tool_id", "invocation_id", "status", "agent_id"),
        ...rowsFromObjects(arrayOf(data.failed_invocations), "tool_id", "invocation_id", "status", "error"),
      ].slice(0, 6),
    ),
    activity: activitiesOf(arrayOf(data.recent_tool_activity), "No recent tool activity available."),
  };
}

function buildConversationDashboard(data: JsonObject): PageData {
  const conversationCounts = objectOf(data.conversation_counts);
  const threadCounts = objectOf(data.thread_counts);
  const messageCounts = objectOf(data.message_counts);
  const context = objectOf(data.context_availability);

  return {
    ...mockKernel.conversationDashboard,
    metrics: [
      metric("Conversations", numberOf(conversationCounts.total), "Top-level conversation records"),
      metric("Threads", numberOf(threadCounts.total), "Thread records"),
      metric("Messages", numberOf(messageCounts.total), "Message records"),
      metric("Knowledge Links", numberOf(data.knowledge_link_count), "Thread/message links", numberOf(data.knowledge_link_count) ? "active" : "idle"),
    ],
    primaryPanel: panel("Context Availability", [
      row("Attached Context Records", `${numberOf(context.context_record_count)} total context entries`, booleanOf(context.available) ? "Available" : "Missing", booleanOf(context.available) ? "ready" : "warning"),
      row("Conversations With Context", `${numberOf(context.conversation_count_with_context)} enriched conversations`),
      row("Recent Message Events", `${arrayOf(data.recent_message_activity).length} message events`, "Pulse", "active"),
    ]),
    secondaryPanel: panel("Conversation Totals", [
      row("Conversation Count", `${numberOf(conversationCounts.total)} top-level records`),
      row("Thread Count", `${numberOf(threadCounts.total)} thread records`),
      row("Message Count", `${numberOf(messageCounts.total)} message records`),
    ]),
    activity: activitiesOf(arrayOf(data.recent_conversation_activity), "No recent conversation activity available."),
  };
}

function buildKnowledgeDashboard(data: JsonObject): PageData {
  const counts = objectOf(data.knowledge_counts);
  const workspaceCounts = objectOf(data.workspace_counts);
  const assets = objectOf(data.knowledge_asset_counts);
  const relationships = objectOf(data.knowledge_relationship_counts);

  return {
    ...mockKernel.knowledgeDashboard,
    metrics: [
      metric("Assets", numberOf(counts.asset_count || assets.total), "Knowledge assets in scope"),
      metric("Relationships", numberOf(counts.relationship_count || relationships.total), "Cross-linked graph edges", numberOf(counts.relationship_count || relationships.total) ? "complete" : "idle"),
      metric("Workspaces", numberOf(workspaceCounts.total), "Workspace estate represented"),
      metric("Coverage", `${numberOf(workspaceCounts.with_knowledge_assets)}/${numberOf(workspaceCounts.total)}`, "Workspaces with assets", "active"),
    ],
    primaryPanel: panel(
      "Asset Distribution",
      Object.entries(objectOf(assets.by_workspace)).map(([workspaceId, count]) =>
        row(workspaceId, `${numberOf(count)} assets`, "Indexed", "active"),
      ),
    ),
    secondaryPanel: panel("Knowledge Signals", [
      row("Asset Total", `${numberOf(assets.total)} knowledge assets`, "Tracked", "ready"),
      row("Relationship Total", `${numberOf(relationships.total)} linked relationships`, "Dense", "complete"),
      row("Workspace Coverage", `${numberOf(workspaceCounts.with_knowledge_assets)} workspaces with assets`, "Visible", "active"),
    ]),
    activity: activitiesOf(arrayOf(data.recent_workspace_activity), "No recent knowledge-linked activity available."),
  };
}

function buildWorkspaceDashboard(data: JsonObject): PageData {
  const workspaceCounts = objectOf(data.workspace_counts);
  const assets = objectOf(data.knowledge_asset_counts);
  const relationships = objectOf(data.knowledge_relationship_counts);

  return {
    ...mockKernel.workspaceDashboard,
    metrics: [
      metric("Workspaces", numberOf(workspaceCounts.total), "Visible workspace records"),
      metric("With Knowledge", numberOf(workspaceCounts.with_knowledge_assets), "Workspaces containing assets", numberOf(workspaceCounts.with_knowledge_assets) ? "active" : "idle"),
      metric("Assets", numberOf(assets.total), "Knowledge assets by workspace"),
      metric("Relationships", numberOf(relationships.total), "Workspace relationship count", numberOf(relationships.total) ? "complete" : "idle"),
    ],
    primaryPanel: panel(
      "Workspace Coverage",
      Object.entries(objectOf(assets.by_workspace)).map(([workspaceId, count]) =>
        row(workspaceId, `${numberOf(count)} assets attached`, "Tracked", "ready"),
      ),
    ),
    secondaryPanel: panel(
      "Workspace Relationships",
      Object.entries(objectOf(relationships.by_workspace)).map(([workspaceId, count]) =>
        row(workspaceId, `${numberOf(count)} linked relationships`, "Visible", numberOf(count) ? "complete" : "idle"),
      ),
    ),
    activity: activitiesOf(arrayOf(data.recent_workspace_activity), "No recent workspace activity available."),
  };
}

function buildHealthDashboard(health: JsonObject, readiness: JsonObject): PageData {
  const checks = objectOf(readiness.checks);
  const summary = objectOf(readiness.summary_counts);
  const warnings = arrayOf(readiness.warnings);

  return {
    ...mockKernel.healthReadiness,
    status: {
      label: stringOf(readiness.status, "Unknown"),
      tone: toneFromStatus(stringOf(readiness.status, "warning")),
    },
    metrics: [
      metric("Readiness Status", stringOf(readiness.status, "Unknown"), "Readiness report status", toneFromStatus(stringOf(readiness.status, "warning"))),
      metric("Warnings", warnings.length, "Readiness warning count", warnings.length ? "warning" : "complete"),
      metric("Kernel Checks", Object.keys(checks).length, "Availability checks evaluated"),
      metric("Event Count", numberOf(summary.event_count || health.event_count), "Visible event bus count", "active"),
    ],
    primaryPanel: panel("Snapshot Counts", [
      row("Events", `${numberOf(summary.event_count)} on event bus / ${numberOf(summary.event_store_event_count)} in event store`, "Aligned", "ready"),
      row("Agent Runtime", `${numberOf(summary.agent_assignment_count)} assignments / ${numberOf(summary.agent_execution_count)} executions`, "Visible", "active"),
      row("Tool Runtime", `${numberOf(summary.tool_count)} tools / ${numberOf(summary.tool_invocation_count)} invocations`, "Visible", "active"),
    ]),
    secondaryPanel: panel(
      "Readiness Checks",
      Object.entries(checks).slice(0, 8).map(([name, value]) =>
        row(name, booleanOf(value) ? "Available" : "Unavailable", booleanOf(value) ? "Pass" : "Fail", booleanOf(value) ? "ready" : "blocked"),
      ),
    ),
    activity: warnings.length
      ? warnings.map((warning, index) => ({
          id: `warning-${index}`,
          eventName: "ReadinessWarning",
          source: "commandcore.health.readiness",
          occurredAt: "now",
          detail: stringOf(warning, "Warning raised."),
          tone: "warning" as StatusTone,
        }))
      : [
          {
            id: "health-ready",
            eventName: "ReadinessEvaluated",
            source: "commandcore.health.readiness",
            occurredAt: "now",
            detail: "No warnings detected in readiness report.",
            tone: "ready",
          },
        ],
  };
}

function metric(label: string, value: string | number, hint?: string, tone?: StatusTone) {
  return { label, value, hint, tone };
}

function panel(title: string, rows: TableRow[]) {
  return { title, rows: rows.length ? rows : [row("No data", "This panel has no data yet.", "Empty", "idle")] };
}

function row(title: string, subtitle: string, badge?: string, badgeTone?: StatusTone, meta?: string): TableRow {
  return { title, subtitle, badge, badgeTone, meta };
}

function availability(name: string, available: boolean, detail: string): AvailabilityItem {
  return { name, available, detail };
}

function rowsFromObjects(items: unknown[], titleKey: string, subtitleKey: string, badgeKey: string, metaKey?: string): TableRow[] {
  return items.map((item, index) => {
    const object = objectOf(item);
    const badge = stringOf(object[badgeKey], "Tracked");
    return row(
      stringOf(object[titleKey], `row-${index}`),
      stringOf(object[subtitleKey], ""),
      badge,
      toneFromStatus(badge),
      metaKey ? stringOf(object[metaKey], "") : undefined,
    );
  });
}

function activitiesOf(items: unknown[], emptyMessage: string): ActivityItem[] {
  if (!items.length) {
    return [
      {
        id: "empty-activity",
        eventName: "NoRecentActivity",
        source: "commandcore.api",
        occurredAt: "now",
        detail: emptyMessage,
        tone: "idle",
      },
    ];
  }

  return items.slice(-8).map((item, index) => {
    const object = objectOf(item);
    return {
      id: stringOf(object.event_id, `event-${index}`),
      eventName: stringOf(object.event_name, "UnknownEvent"),
      source: stringOf(object.source, "commandcore"),
      occurredAt: formatOccurredAt(object.occurred_at),
      detail: describePayload(objectOf(object.payload)),
      tone: inferEventTone(stringOf(object.event_name, "")),
    };
  });
}

function describePayload(payload: JsonObject): string {
  const parts = Object.entries(payload)
    .filter(([key]) => key !== "event_name")
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${stringOf(value, "")}`)
    .filter(Boolean);

  return parts.length ? parts.join(" / ") : "No payload details available.";
}

function inferEventTone(eventName: string): StatusTone {
  const normalized = eventName.toLowerCase();
  if (normalized.includes("failed") || normalized.includes("blocked") || normalized.includes("warning")) {
    return "warning";
  }
  if (normalized.includes("completed") || normalized.includes("created")) {
    return normalized.includes("completed") ? "complete" : "active";
  }
  if (normalized.includes("started") || normalized.includes("running")) {
    return "active";
  }
  return "idle";
}

function toneFromStatus(value: string): StatusTone {
  const normalized = value.toLowerCase();
  if (["ready", "available", "healthy", "pass", "online"].includes(normalized)) {
    return "ready";
  }
  if (["warning", "failed", "degraded"].includes(normalized)) {
    return "warning";
  }
  if (["blocked", "unavailable", "fail"].includes(normalized)) {
    return "blocked";
  }
  if (["active", "running", "requested", "assigned", "live", "tracked"].includes(normalized)) {
    return "active";
  }
  if (["complete", "completed", "aligned", "indexed", "dense"].includes(normalized)) {
    return "complete";
  }
  return "idle";
}

function formatOccurredAt(value: unknown): string {
  const text = stringOf(value, "now");
  if (!text.includes("T")) {
    return text;
  }
  return text.replace("T", " ").replace("+00:00", " UTC");
}

function objectOf(value: unknown): JsonObject {
  return typeof value === "object" && value !== null ? (value as JsonObject) : {};
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringOf(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function numberOf(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function booleanOf(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}
