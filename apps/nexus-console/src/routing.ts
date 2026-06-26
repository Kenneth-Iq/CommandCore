import type { NavPage } from "./data/mockKernel";

export type RouteSelection = {
  missionId?: string;
  agentId?: string;
  toolId?: string;
  conversationId?: string;
  assetId?: string;
  workspaceId?: string;
  companyId?: string;
  projectId?: string;
};

export type NexusRoute = {
  page: NavPage;
  selection: RouteSelection;
};

const pathByPage: Record<NavPage, string> = {
  kernel: "/",
  executive: "/executive",
  missions: "/missions",
  agents: "/agents",
  tools: "/tools",
  conversations: "/conversations",
  knowledge: "/knowledge",
  workspaces: "/workspaces",
  health: "/health",
  settings: "/settings",
  boardroom: "/boardroom",
};

const pageByPath = new Map<string, NavPage>(
  Object.entries(pathByPage).map(([page, path]) => [path, page as NavPage]),
);

const allowedKeys: Array<keyof RouteSelection> = [
  "missionId",
  "agentId",
  "toolId",
  "conversationId",
  "assetId",
  "workspaceId",
  "companyId",
  "projectId",
];

export function routeFromLocation(location: Location): NexusRoute {
  const page = pageByPath.get(location.pathname) ?? "kernel";
  const search = new URLSearchParams(location.search);
  const selection: RouteSelection = {};

  for (const key of allowedKeys) {
    const value = search.get(key);
    if (value) {
      selection[key] = value;
    }
  }

  return { page, selection };
}

export function buildHref(page: NavPage, selection: RouteSelection = {}): string {
  const path = pathByPage[page];
  const params = new URLSearchParams();

  for (const key of allowedKeys) {
    const value = selection[key];
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function navigateTo(page: NavPage, selection: RouteSelection = {}) {
  const href = buildHref(page, selection);
  window.history.pushState({}, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
