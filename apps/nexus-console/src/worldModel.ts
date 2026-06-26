import type {
  AgentCentreData,
  ConversationCentreData,
  MissionCentreData,
  MissionRecord,
  NavPage,
  ToolCentreData,
} from "./data/mockKernel";
import type {
  CompanyRecord,
  KnowledgeCentreData,
  PortfolioExplorerData,
  ProjectRecord,
  WorkspaceRecord,
} from "./data/nexusCentres";
import type { RouteSelection } from "./routing";

export type WorldData = {
  portfolioExplorer: PortfolioExplorerData;
  missionCentre: MissionCentreData;
  agentCentre: AgentCentreData;
  toolCentre: ToolCentreData;
  conversationCentre: ConversationCentreData;
  knowledgeCentre: KnowledgeCentreData;
};

export type WorldNodeKind =
  | "galaxy"
  | "planet"
  | "portfolio"
  | "company"
  | "workspace"
  | "project"
  | "mission"
  | "conversation"
  | "knowledge"
  | "agent"
  | "tool";

export type WorldNode = {
  id: string;
  kind: WorldNodeKind;
  label: string;
  page: NavPage;
  selection: RouteSelection;
  children: WorldNode[];
};

export type WorldSummaryCounts = {
  companies: number;
  workspaces: number;
  projects: number;
  missions: number;
  agents: number;
  knowledgeAssets: number;
  tools: number;
  conversations: number;
};

export type RelationshipLink = {
  label: string;
  page: NavPage;
  selection: RouteSelection;
};

export type RelationshipCardData = {
  parent?: RelationshipLink;
  belongsTo: RelationshipLink[];
  relatedItems: RelationshipLink[];
  dependencies: RelationshipLink[];
  children: RelationshipLink[];
};

export type WorldEntityKind = "company" | "workspace" | "project" | "mission" | "agent" | "tool" | "conversation" | "knowledge";

export type ResolvedContext = {
  company?: CompanyRecord;
  workspace?: WorkspaceRecord;
  project?: ProjectRecord;
  mission?: MissionRecord;
};

export type BreadcrumbSegment = {
  label: string;
  page: NavPage;
  selection: RouteSelection;
  isCurrent: boolean;
};

function link(label: string, page: NavPage, selection: RouteSelection): RelationshipLink {
  return { label, page, selection };
}

function compact<T>(items: Array<T | undefined | false>): T[] {
  return items.filter((item): item is T => Boolean(item));
}

function allMissionsOf(missionCentre: MissionCentreData): MissionRecord[] {
  return [...missionCentre.active, ...missionCentre.completed, ...missionCentre.failed];
}

function scopeValue(scope: string[], kind: string): string | undefined {
  const entry = scope.find((value) => value.startsWith(`${kind}:`));
  return entry ? entry.replace(`${kind}:`, "") : undefined;
}

export function buildWorldTree(world: WorldData): WorldNode {
  const { portfolioExplorer, conversationCentre, knowledgeCentre, toolCentre } = world;
  const missions = allMissionsOf(world.missionCentre);

  const companies: WorldNode[] = portfolioExplorer.companies.map((company) => {
    const workspaces = portfolioExplorer.workspaces.filter((workspace) => workspace.companyIds.includes(company.companyId));

    const workspaceNodes: WorldNode[] = workspaces.map((workspace) => {
      const projects = portfolioExplorer.projects.filter((project) => workspace.projectIds.includes(project.projectId));

      const projectNodes: WorldNode[] = projects.map((project) => {
        const missionNodes: WorldNode[] = missions
          .filter((mission) => mission.scope.includes(`project:${project.projectId}`))
          .map((mission) => ({
            id: `mission-${mission.missionId}`,
            kind: "mission" as const,
            label: mission.title,
            page: "missions" as const,
            selection: { missionId: mission.missionId },
            children: [],
          }));

        const conversationNodes: WorldNode[] = conversationCentre.conversations
          .filter((conversation) => conversation.projectId === project.projectId)
          .map((conversation) => ({
            id: `conversation-${conversation.conversationId}`,
            kind: "conversation" as const,
            label: conversation.conversationId,
            page: "conversations" as const,
            selection: { conversationId: conversation.conversationId },
            children: [],
          }));

        const knowledgeNodes: WorldNode[] = knowledgeCentre.assets
          .filter((asset) => asset.scopes.some((scope) => scope.kind === "project" && scope.value === project.projectId))
          .map((asset) => ({
            id: `knowledge-${asset.assetId}`,
            kind: "knowledge" as const,
            label: asset.title,
            page: "knowledge" as const,
            selection: { assetId: asset.assetId },
            children: [],
          }));

        const agentNodes: WorldNode[] = project.agentIds.map((agentId) => ({
          id: `agent-${project.projectId}-${agentId}`,
          kind: "agent" as const,
          label: agentId,
          page: "agents" as const,
          selection: { agentId },
          children: [],
        }));

        const toolNodes: WorldNode[] = toolCentre.tools
          .filter((tool) => tool.agentId && project.agentIds.includes(tool.agentId))
          .map((tool) => ({
            id: `tool-${project.projectId}-${tool.toolId}`,
            kind: "tool" as const,
            label: tool.name,
            page: "tools" as const,
            selection: { toolId: tool.toolId },
            children: [],
          }));

        return {
          id: `project-${project.projectId}`,
          kind: "project" as const,
          label: project.name,
          page: "workspaces" as const,
          selection: { projectId: project.projectId },
          children: [...missionNodes, ...conversationNodes, ...knowledgeNodes, ...agentNodes, ...toolNodes],
        };
      });

      return {
        id: `workspace-${workspace.workspaceId}`,
        kind: "workspace" as const,
        label: workspace.name,
        page: "workspaces" as const,
        selection: { workspaceId: workspace.workspaceId },
        children: projectNodes,
      };
    });

    return {
      id: `company-${company.companyId}`,
      kind: "company" as const,
      label: company.name,
      page: "workspaces" as const,
      selection: { companyId: company.companyId },
      children: workspaceNodes,
    };
  });

  return {
    id: "portfolio-root",
    kind: "portfolio",
    label: "Portfolio",
    page: "workspaces",
    selection: {},
    children: companies,
  };
}

export function buildGalaxyTree(world: WorldData): WorldNode {
  const portfolioRoot = buildWorldTree(world);

  const planetNode: WorldNode = {
    id: "planet-enterprise",
    kind: "planet",
    label: "Enterprise",
    page: "workspaces",
    selection: {},
    children: [portfolioRoot],
  };

  return {
    id: "galaxy-prime",
    kind: "galaxy",
    label: "Prime Galaxy",
    page: "workspaces",
    selection: {},
    children: [planetNode],
  };
}

export function buildWorldSummary(world: WorldData): WorldSummaryCounts {
  return {
    companies: world.portfolioExplorer.companies.length,
    workspaces: world.portfolioExplorer.workspaces.length,
    projects: world.portfolioExplorer.projects.length,
    missions: world.missionCentre.counts.total,
    agents: world.agentCentre.counts.total,
    knowledgeAssets: world.knowledgeCentre.assets.length,
    tools: world.toolCentre.counts.total,
    conversations: world.conversationCentre.counts.conversations,
  };
}

export function resolveContext(selection: RouteSelection, world: WorldData): ResolvedContext {
  const { portfolioExplorer, conversationCentre, knowledgeCentre, toolCentre } = world;
  const missions = allMissionsOf(world.missionCentre);

  let mission: MissionRecord | undefined;
  let projectId: string | undefined;
  let workspaceId: string | undefined;
  let companyId: string | undefined;

  if (selection.missionId) {
    mission = missions.find((candidate) => candidate.missionId === selection.missionId);
    if (mission) {
      projectId = scopeValue(mission.scope, "project");
      workspaceId = scopeValue(mission.scope, "workspace");
    }
  } else if (selection.conversationId) {
    const conversation = conversationCentre.conversations.find((candidate) => candidate.conversationId === selection.conversationId);
    projectId = conversation?.projectId;
    workspaceId = conversation?.workspaceId;
    companyId = conversation?.companyId;
    if (conversation?.missionId) {
      mission = missions.find((candidate) => candidate.missionId === conversation.missionId);
    }
  } else if (selection.assetId) {
    const asset = knowledgeCentre.assets.find((candidate) => candidate.assetId === selection.assetId);
    projectId = asset?.scopes.find((scope) => scope.kind === "project")?.value;
    workspaceId = asset?.scopes.find((scope) => scope.kind === "workspace")?.value;
    companyId = asset?.scopes.find((scope) => scope.kind === "company")?.value;
    const missionScopeId = asset?.scopes.find((scope) => scope.kind === "mission")?.value;
    if (missionScopeId) {
      mission = missions.find((candidate) => candidate.missionId === missionScopeId);
    }
  } else if (selection.agentId) {
    projectId = portfolioExplorer.projects.find((project) => project.agentIds.includes(selection.agentId as string))?.projectId;
    workspaceId = portfolioExplorer.workspaces.find((workspace) => workspace.agentIds.includes(selection.agentId as string))?.workspaceId;
    companyId = portfolioExplorer.companies.find((company) => company.agentIds.includes(selection.agentId as string))?.companyId;
  } else if (selection.toolId) {
    const tool = toolCentre.tools.find((candidate) => candidate.toolId === selection.toolId);
    if (tool?.agentId) {
      return resolveContext({ agentId: tool.agentId }, world);
    }
  } else if (selection.projectId) {
    projectId = selection.projectId;
  } else if (selection.workspaceId) {
    workspaceId = selection.workspaceId;
  } else if (selection.companyId) {
    companyId = selection.companyId;
  }

  const project = projectId ? portfolioExplorer.projects.find((candidate) => candidate.projectId === projectId) : undefined;
  if (!workspaceId && project) {
    workspaceId = portfolioExplorer.workspaces.find((workspace) => workspace.projectIds.includes(project.projectId))?.workspaceId;
  }
  if (!companyId) {
    companyId = project?.companyId
      ?? (workspaceId ? portfolioExplorer.workspaces.find((workspace) => workspace.workspaceId === workspaceId)?.companyIds[0] : undefined);
  }

  const workspace = workspaceId ? portfolioExplorer.workspaces.find((candidate) => candidate.workspaceId === workspaceId) : undefined;
  const company = companyId ? portfolioExplorer.companies.find((candidate) => candidate.companyId === companyId) : undefined;

  return { company, workspace, project, mission };
}

export function buildBreadcrumb(selection: RouteSelection, world: WorldData): BreadcrumbSegment[] {
  const context = resolveContext(selection, world);
  const segments: BreadcrumbSegment[] = [
    { label: "Portfolio", page: "workspaces", selection: {}, isCurrent: false },
  ];

  if (context.company) {
    segments.push({ label: context.company.name, page: "workspaces", selection: { companyId: context.company.companyId }, isCurrent: false });
  }
  if (context.workspace) {
    segments.push({ label: context.workspace.name, page: "workspaces", selection: { workspaceId: context.workspace.workspaceId }, isCurrent: false });
  }
  if (context.project) {
    segments.push({ label: context.project.name, page: "workspaces", selection: { projectId: context.project.projectId }, isCurrent: false });
  }
  if (context.mission) {
    segments.push({ label: context.mission.title, page: "missions", selection: { missionId: context.mission.missionId }, isCurrent: false });
  }

  segments[segments.length - 1].isCurrent = true;
  return segments;
}

export type ImpactAnalysis = {
  dependents: RelationshipLink[];
  dependencies: RelationshipLink[];
  blastRadius: number;
};

export function buildImpactAnalysis(data: RelationshipCardData): ImpactAnalysis {
  const dependents = [...data.children, ...data.relatedItems];
  const dependencies = [...data.belongsTo, ...data.dependencies];
  const blastRadius = dependents.length + dependencies.length + (data.parent ? 1 : 0);
  return { dependents, dependencies, blastRadius };
}

export function buildRelationshipCard(kind: WorldEntityKind, id: string, world: WorldData): RelationshipCardData | undefined {
  const { portfolioExplorer, agentCentre, toolCentre, conversationCentre, knowledgeCentre } = world;
  const missions = allMissionsOf(world.missionCentre);

  if (kind === "mission") {
    const mission = missions.find((candidate) => candidate.missionId === id);
    if (!mission) {
      return undefined;
    }
    const context = resolveContext({ missionId: id }, world);
    const belongsTo = compact([
      context.company && link(context.company.name, "workspaces", { companyId: context.company.companyId }),
      context.workspace && link(context.workspace.name, "workspaces", { workspaceId: context.workspace.workspaceId }),
      context.project && link(context.project.name, "workspaces", { projectId: context.project.projectId }),
    ]);
    const relatedConversation = conversationCentre.conversations.find((conversation) => conversation.missionId === mission.missionId);
    const relatedAsset = knowledgeCentre.assets.find((asset) => asset.scopes.some((scope) => scope.kind === "mission" && scope.value === mission.missionId));
    const relatedItems = compact([
      mission.assignedAgentId ? link(mission.assignedAgentId, "agents", { agentId: mission.assignedAgentId }) : undefined,
      relatedConversation && link(relatedConversation.conversationId, "conversations", { conversationId: relatedConversation.conversationId }),
      relatedAsset && link(relatedAsset.title, "knowledge", { assetId: relatedAsset.assetId }),
    ]);
    return {
      parent: context.project ? link(context.project.name, "workspaces", { projectId: context.project.projectId }) : undefined,
      belongsTo,
      relatedItems,
      dependencies: mission.capabilityIds.map((capabilityId) => link(capabilityId, "workspaces", {})),
      children: [],
    };
  }

  if (kind === "agent") {
    const agent = agentCentre.profiles.find((candidate) => candidate.agentId === id);
    if (!agent) {
      return undefined;
    }
    const context = resolveContext({ agentId: id }, world);
    const belongsTo = compact([
      context.company && link(context.company.name, "workspaces", { companyId: context.company.companyId }),
      context.workspace && link(context.workspace.name, "workspaces", { workspaceId: context.workspace.workspaceId }),
      context.project && link(context.project.name, "workspaces", { projectId: context.project.projectId }),
    ]);
    const relatedTools = toolCentre.tools.filter((tool) => tool.agentId === agent.agentId).map((tool) => link(tool.name, "tools", { toolId: tool.toolId }));
    const relatedMissions = agent.missionQueue.map((missionId) => link(missionId, "missions", { missionId }));
    return {
      parent: context.project ? link(context.project.name, "workspaces", { projectId: context.project.projectId }) : undefined,
      belongsTo,
      relatedItems: relatedMissions,
      dependencies: agent.capabilityIds.map((capabilityId) => link(capabilityId, "workspaces", {})),
      children: relatedTools,
    };
  }

  if (kind === "tool") {
    const tool = toolCentre.tools.find((candidate) => candidate.toolId === id);
    if (!tool) {
      return undefined;
    }
    const context = tool.agentId ? resolveContext({ agentId: tool.agentId }, world) : {};
    const belongsTo = compact([
      tool.agentId ? link(tool.agentId, "agents", { agentId: tool.agentId }) : undefined,
      context.workspace && link(context.workspace.name, "workspaces", { workspaceId: context.workspace.workspaceId }),
    ]);
    return {
      parent: tool.agentId ? link(tool.agentId, "agents", { agentId: tool.agentId }) : undefined,
      belongsTo,
      relatedItems: [],
      dependencies: tool.capabilityId ? [link(tool.capabilityId, "workspaces", {})] : [],
      children: [],
    };
  }

  if (kind === "conversation") {
    const conversation = conversationCentre.conversations.find((candidate) => candidate.conversationId === id);
    if (!conversation) {
      return undefined;
    }
    const context = resolveContext({ conversationId: id }, world);
    const belongsTo = compact([
      context.company && link(context.company.name, "workspaces", { companyId: context.company.companyId }),
      context.workspace && link(context.workspace.name, "workspaces", { workspaceId: context.workspace.workspaceId }),
      context.project && link(context.project.name, "workspaces", { projectId: context.project.projectId }),
    ]);
    const relatedKnowledge = knowledgeCentre.assets
      .filter((asset) => conversationCentre.knowledgeLinks.some((linkRecord) => linkRecord.conversationId === conversation.conversationId && linkRecord.knowledgeAssetId === asset.assetId))
      .map((asset) => link(asset.title, "knowledge", { assetId: asset.assetId }));
    return {
      parent: context.project ? link(context.project.name, "workspaces", { projectId: context.project.projectId }) : undefined,
      belongsTo,
      relatedItems: compact([
        conversation.missionId ? link(conversation.missionId, "missions", { missionId: conversation.missionId }) : undefined,
        ...relatedKnowledge,
      ]),
      dependencies: [],
      children: [],
    };
  }

  if (kind === "knowledge") {
    const asset = knowledgeCentre.assets.find((candidate) => candidate.assetId === id);
    if (!asset) {
      return undefined;
    }
    const context = resolveContext({ assetId: id }, world);
    const belongsTo = compact([
      context.company && link(context.company.name, "workspaces", { companyId: context.company.companyId }),
      context.workspace && link(context.workspace.name, "workspaces", { workspaceId: context.workspace.workspaceId }),
      context.project && link(context.project.name, "workspaces", { projectId: context.project.projectId }),
      context.mission && link(context.mission.title, "missions", { missionId: context.mission.missionId }),
    ]);
    const linkedAssets = asset.linkedAssetIds.map((linkedId) => {
      const linkedAsset = knowledgeCentre.assets.find((candidate) => candidate.assetId === linkedId);
      return link(linkedAsset?.title ?? linkedId, "knowledge", { assetId: linkedId });
    });
    return {
      parent: context.project ? link(context.project.name, "workspaces", { projectId: context.project.projectId }) : undefined,
      belongsTo,
      relatedItems: linkedAssets,
      dependencies: [],
      children: [],
    };
  }

  if (kind === "workspace") {
    const workspace = portfolioExplorer.workspaces.find((candidate) => candidate.workspaceId === id);
    if (!workspace) {
      return undefined;
    }
    const company = portfolioExplorer.companies.find((candidate) => workspace.companyIds.includes(candidate.companyId));
    const projects = portfolioExplorer.projects.filter((project) => workspace.projectIds.includes(project.projectId));
    return {
      parent: company ? link(company.name, "workspaces", { companyId: company.companyId }) : undefined,
      belongsTo: company ? [link(company.name, "workspaces", { companyId: company.companyId })] : [],
      relatedItems: workspace.agentIds.map((agentId) => link(agentId, "agents", { agentId })),
      dependencies: workspace.capabilityIds.map((capabilityId) => link(capabilityId, "workspaces", {})),
      children: projects.map((project) => link(project.name, "workspaces", { projectId: project.projectId })),
    };
  }

  if (kind === "company") {
    const company = portfolioExplorer.companies.find((candidate) => candidate.companyId === id);
    if (!company) {
      return undefined;
    }
    const workspaces = portfolioExplorer.workspaces.filter((workspace) => workspace.companyIds.includes(company.companyId));
    return {
      parent: link("Portfolio", "workspaces", {}),
      belongsTo: [link("Portfolio", "workspaces", {})],
      relatedItems: company.agentIds.map((agentId) => link(agentId, "agents", { agentId })),
      dependencies: company.capabilityIds.map((capabilityId) => link(capabilityId, "workspaces", {})),
      children: workspaces.map((workspace) => link(workspace.name, "workspaces", { workspaceId: workspace.workspaceId })),
    };
  }

  if (kind === "project") {
    const project = portfolioExplorer.projects.find((candidate) => candidate.projectId === id);
    if (!project) {
      return undefined;
    }
    const workspace = portfolioExplorer.workspaces.find((candidate) => candidate.projectIds.includes(project.projectId));
    const company = project.companyId ? portfolioExplorer.companies.find((candidate) => candidate.companyId === project.companyId) : undefined;
    const projectMissions = missions.filter((mission) => mission.scope.includes(`project:${project.projectId}`));
    const projectConversations = conversationCentre.conversations.filter((conversation) => conversation.projectId === project.projectId);
    const projectKnowledge = knowledgeCentre.assets.filter((asset) => asset.scopes.some((scope) => scope.kind === "project" && scope.value === project.projectId));
    return {
      parent: workspace ? link(workspace.name, "workspaces", { workspaceId: workspace.workspaceId }) : undefined,
      belongsTo: compact([
        company && link(company.name, "workspaces", { companyId: company.companyId }),
        workspace && link(workspace.name, "workspaces", { workspaceId: workspace.workspaceId }),
      ]),
      relatedItems: project.agentIds.map((agentId) => link(agentId, "agents", { agentId })),
      dependencies: project.capabilityIds.map((capabilityId) => link(capabilityId, "workspaces", {})),
      children: [
        ...projectMissions.map((mission) => link(mission.title, "missions", { missionId: mission.missionId })),
        ...projectConversations.map((conversation) => link(conversation.conversationId, "conversations", { conversationId: conversation.conversationId })),
        ...projectKnowledge.map((asset) => link(asset.title, "knowledge", { assetId: asset.assetId })),
      ],
    };
  }

  return undefined;
}
