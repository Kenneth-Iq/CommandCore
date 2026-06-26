import type { NavPage, StatusTone } from "./mockKernel";

export type ScopeKind = "workspace" | "company" | "project" | "mission";

export type ScopeBadgeRecord = {
  kind: ScopeKind;
  value: string;
};

export type KnowledgeAssetRecord = {
  assetId: string;
  title: string;
  assetType: string;
  summary: string;
  safeToQuery: boolean;
  relationshipCount: number;
  linkedAssetIds: string[];
  tags: string[];
  citations: string[];
  scopes: ScopeBadgeRecord[];
};

export type WorkspaceRecord = {
  workspaceId: string;
  name: string;
  status: string;
  companyIds: string[];
  projectIds: string[];
  agentIds: string[];
  capabilityIds: string[];
  knowledgeBoundarySummary?: string;
  assetCount: number;
  relationshipCount: number;
  localFirst: boolean;
  offlineCapable: boolean;
};

export type CompanyRecord = {
  companyId: string;
  name: string;
  mission: string;
  status: string;
  lifecycleState: string;
  projectIds: string[];
  capabilityIds: string[];
  agentIds: string[];
  operatingState?: string;
};

export type ProjectRecord = {
  projectId: string;
  name: string;
  companyId?: string;
  status: string;
  lifecycleState: string;
  capabilityIds: string[];
  agentIds: string[];
  mission?: string;
  outcome?: string;
  nextActionSummary?: string;
};

export type CapabilityRecord = {
  capabilityId: string;
  name: string;
  description: string;
  status: string;
  lifecycleState: string;
  permissionLevel: string;
  certificationStatus: string;
  marketplaceReady: boolean;
  consumerCount: number;
  providerCount: number;
};

export type KnowledgeCentreData = {
  assets: KnowledgeAssetRecord[];
};

export type PortfolioExplorerData = {
  workspaces: WorkspaceRecord[];
  companies: CompanyRecord[];
  projects: ProjectRecord[];
  capabilities: CapabilityRecord[];
};

export type CommandSuggestion = {
  id: string;
  label: string;
  hint: string;
  page: NavPage;
  aliases: string[];
  tone: StatusTone;
};

export type SearchEntry = {
  id: string;
  label: string;
  description: string;
  page: NavPage;
  selection: {
    missionId?: string;
    agentId?: string;
    toolId?: string;
    conversationId?: string;
    assetId?: string;
    workspaceId?: string;
    companyId?: string;
    projectId?: string;
  };
  keywords: string[];
  context?: string;
  tone?: StatusTone;
};

export const commandSuggestions: CommandSuggestion[] = [
  {
    id: "open-missions",
    label: "Open Missions",
    hint: "Mission Centre",
    page: "missions",
    aliases: ["open missions", "missions", "mission centre", "mission center"],
    tone: "active",
  },
  {
    id: "open-agents",
    label: "Open Agents",
    hint: "Agent Centre",
    page: "agents",
    aliases: ["open agents", "agents", "agent centre", "agent center"],
    tone: "ready",
  },
  {
    id: "open-tools",
    label: "Open Tools",
    hint: "Tool Centre",
    page: "tools",
    aliases: ["open tools", "tools", "tool centre", "tool center"],
    tone: "warning",
  },
  {
    id: "open-conversations",
    label: "Open Conversations",
    hint: "Conversation Centre",
    page: "conversations",
    aliases: ["open conversations", "conversations", "threads", "messages"],
    tone: "idle",
  },
  {
    id: "open-knowledge",
    label: "Open Knowledge",
    hint: "Knowledge Centre",
    page: "knowledge",
    aliases: ["open knowledge", "knowledge", "knowledge centre", "knowledge center"],
    tone: "complete",
  },
  {
    id: "open-workspaces",
    label: "Open Workspaces",
    hint: "Portfolio Explorer",
    page: "workspaces",
    aliases: ["open workspaces", "workspaces", "portfolio", "companies", "projects", "capabilities"],
    tone: "active",
  },
  {
    id: "open-health",
    label: "Open Health",
    hint: "Health / Readiness",
    page: "health",
    aliases: ["open health", "health", "readiness", "status"],
    tone: "ready",
  },
];

export const mockKnowledgeCentre: KnowledgeCentreData = {
  assets: [
    {
      assetId: "asset-launch-runbook",
      title: "Launch Readiness Runbook",
      assetType: "runbook",
      summary: "Primary operational checklist used by missions, recovery reviews, and operator handoffs.",
      safeToQuery: true,
      relationshipCount: 3,
      linkedAssetIds: ["asset-mission-debrief", "asset-risk-register", "asset-recovery-brief"],
      tags: ["launch", "operations", "runbook"],
      citations: ["ops://runbooks/launch", "doc://alpha5/review"],
      scopes: [
        { kind: "workspace", value: "ws-local" },
        { kind: "company", value: "comp-mindx" },
        { kind: "project", value: "proj-alpha5" },
        { kind: "mission", value: "mission-alpha5-ui" },
      ],
    },
    {
      assetId: "asset-mission-debrief",
      title: "Alpha-5 Mission Debrief",
      assetType: "debrief",
      summary: "Outcome notes linked from the completed dashboard validation mission and governance thread.",
      safeToQuery: true,
      relationshipCount: 2,
      linkedAssetIds: ["asset-launch-runbook", "asset-governance-note"],
      tags: ["debrief", "mission", "alpha5"],
      citations: ["conv://thread-gov-review"],
      scopes: [
        { kind: "workspace", value: "ws-local" },
        { kind: "project", value: "proj-alpha5" },
        { kind: "mission", value: "mission-alpha5-ops" },
      ],
    },
    {
      assetId: "asset-risk-register",
      title: "Connector Risk Register",
      assetType: "risk-log",
      summary: "Tracks recurring connector instability, ownership, and approved recovery pathways.",
      safeToQuery: false,
      relationshipCount: 1,
      linkedAssetIds: ["asset-launch-runbook"],
      tags: ["risk", "connectors", "recovery"],
      citations: ["ops://risk/register"],
      scopes: [
        { kind: "workspace", value: "ws-ops" },
        { kind: "company", value: "comp-mindx" },
        { kind: "mission", value: "mission-alpha5-recovery" },
      ],
    },
    {
      assetId: "asset-governance-note",
      title: "Governance Review Notes",
      assetType: "note",
      summary: "Policy and decision context used to explain why the current operating posture is considered safe.",
      safeToQuery: true,
      relationshipCount: 1,
      linkedAssetIds: ["asset-mission-debrief"],
      tags: ["governance", "policy"],
      citations: ["conv://thread-gov-review"],
      scopes: [
        { kind: "workspace", value: "ws-local" },
        { kind: "project", value: "proj-governance" },
      ],
    },
  ],
};

export const mockPortfolioExplorer: PortfolioExplorerData = {
  workspaces: [
    {
      workspaceId: "ws-local",
      name: "Local Command Workspace",
      status: "active",
      companyIds: ["comp-mindx"],
      projectIds: ["proj-alpha5", "proj-governance"],
      agentIds: ["agent-hermes", "agent-claw"],
      capabilityIds: ["cap-ui", "cap-search", "cap-ops"],
      knowledgeBoundarySummary: "Primary operating workspace for Alpha-5 review and governance context.",
      assetCount: 9,
      relationshipCount: 6,
      localFirst: true,
      offlineCapable: true,
    },
    {
      workspaceId: "ws-ops",
      name: "Ops Recovery Workspace",
      status: "active",
      companyIds: ["comp-mindx"],
      projectIds: ["proj-recovery"],
      agentIds: ["agent-sentinel"],
      capabilityIds: ["cap-recovery", "cap-monitoring"],
      knowledgeBoundarySummary: "Recovery and monitoring workspace for incident follow-up.",
      assetCount: 7,
      relationshipCount: 5,
      localFirst: true,
      offlineCapable: true,
    },
  ],
  companies: [
    {
      companyId: "comp-mindx",
      name: "MindX Operations",
      mission: "Operate a governed AI control plane with readable runtime state.",
      status: "active",
      lifecycleState: "active",
      projectIds: ["proj-alpha5", "proj-governance", "proj-recovery"],
      capabilityIds: ["cap-ui", "cap-search", "cap-ops", "cap-recovery", "cap-monitoring"],
      agentIds: ["agent-hermes", "agent-claw", "agent-sentinel", "agent-athena"],
      operatingState: "Daily command-centre review in progress.",
    },
  ],
  projects: [
    {
      projectId: "proj-alpha5",
      name: "Alpha-5 Console Review",
      companyId: "comp-mindx",
      status: "active",
      lifecycleState: "active",
      capabilityIds: ["cap-ui", "cap-search"],
      agentIds: ["agent-hermes", "agent-claw"],
      mission: "Prepare and validate the next Nexus UI slice.",
      outcome: "Mission dashboard and knowledge surfaces aligned.",
      nextActionSummary: "Link portfolio cards back into mission and tool centres.",
    },
    {
      projectId: "proj-governance",
      name: "Governance Visibility",
      companyId: "comp-mindx",
      status: "active",
      lifecycleState: "active",
      capabilityIds: ["cap-ops"],
      agentIds: ["agent-claw"],
      mission: "Keep policy and executive outcomes legible.",
      nextActionSummary: "Review executive decisions and conversation context.",
    },
    {
      projectId: "proj-recovery",
      name: "Connector Recovery",
      companyId: "comp-mindx",
      status: "active",
      lifecycleState: "active",
      capabilityIds: ["cap-recovery", "cap-monitoring"],
      agentIds: ["agent-sentinel", "agent-athena"],
      mission: "Stabilize failed connector flows without enabling writes.",
      nextActionSummary: "Inspect tool failures and health posture.",
    },
  ],
  capabilities: [
    {
      capabilityId: "cap-ui",
      name: "UI Delivery",
      description: "Frontend implementation and operator workflow polish.",
      status: "active",
      lifecycleState: "active",
      permissionLevel: "operate",
      certificationStatus: "provisional",
      marketplaceReady: false,
      consumerCount: 2,
      providerCount: 1,
    },
    {
      capabilityId: "cap-search",
      name: "Knowledge Search",
      description: "Search and route knowledge assets across workspace scope.",
      status: "active",
      lifecycleState: "active",
      permissionLevel: "read",
      certificationStatus: "certified",
      marketplaceReady: true,
      consumerCount: 3,
      providerCount: 1,
    },
    {
      capabilityId: "cap-ops",
      name: "Operations Reporting",
      description: "Summaries for governance, health, and mission posture.",
      status: "active",
      lifecycleState: "active",
      permissionLevel: "read",
      certificationStatus: "certified",
      marketplaceReady: true,
      consumerCount: 2,
      providerCount: 1,
    },
    {
      capabilityId: "cap-recovery",
      name: "Recovery Response",
      description: "Support recovery analysis and post-failure routing.",
      status: "active",
      lifecycleState: "active",
      permissionLevel: "operate",
      certificationStatus: "provisional",
      marketplaceReady: false,
      consumerCount: 1,
      providerCount: 1,
    },
  ],
};
