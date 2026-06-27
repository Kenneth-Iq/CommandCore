import { useEffect, useState } from "react";
import type { NavPage } from "./data/mockKernel";
import type { RouteSelection } from "./routing";

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage unavailable; preference simply will not persist.
  }
}

export type FavouriteKind = "mission" | "agent";

export function useFavourites(kind: FavouriteKind) {
  const storageKey = `nexus.favourites.${kind}`;
  const [favourites, setFavourites] = useState<Set<string>>(() => new Set(readLocalStorage<string[]>(storageKey, [])));

  useEffect(() => {
    writeLocalStorage(storageKey, Array.from(favourites));
  }, [favourites, storageKey]);

  function toggle(id: string) {
    setFavourites((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function isFavourite(id: string): boolean {
    return favourites.has(id);
  }

  return { favourites, toggle, isFavourite };
}

export type RecentlyViewedEntry = {
  id: string;
  label: string;
  page: NavPage;
  selection: RouteSelection;
  viewedAt: string;
};

const RECENTLY_VIEWED_KEY = "nexus.recentlyViewed";
const RECENTLY_VIEWED_LIMIT = 12;

export function loadRecentlyViewed(): RecentlyViewedEntry[] {
  return readLocalStorage<RecentlyViewedEntry[]>(RECENTLY_VIEWED_KEY, []);
}

export function recordRecentlyViewed(entry: Omit<RecentlyViewedEntry, "id" | "viewedAt">): RecentlyViewedEntry[] {
  const existing = loadRecentlyViewed();
  const id = `${entry.page}-${JSON.stringify(entry.selection)}`;
  const withoutDuplicate = existing.filter((item) => item.id !== id);
  const next: RecentlyViewedEntry[] = [
    { ...entry, id, viewedAt: new Date().toISOString() },
    ...withoutDuplicate,
  ].slice(0, RECENTLY_VIEWED_LIMIT);
  writeLocalStorage(RECENTLY_VIEWED_KEY, next);
  return next;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedEntry[]>(() => loadRecentlyViewed());

  function record(entry: Omit<RecentlyViewedEntry, "id" | "viewedAt">) {
    setItems(recordRecentlyViewed(entry));
  }

  return { items, record };
}

export function useSavedFilters<T>(pageKey: string, defaultValue: T) {
  const storageKey = `nexus.savedFilters.${pageKey}`;
  const [savedFilters, setSavedFilters] = useState<T | undefined>(() => {
    const raw = readLocalStorage<T | null>(storageKey, null);
    return raw ?? undefined;
  });

  function save(value: T) {
    writeLocalStorage(storageKey, value);
    setSavedFilters(value);
  }

  function clear() {
    writeLocalStorage(storageKey, null);
    setSavedFilters(undefined);
  }

  return { savedFilters, save, clear, defaultValue };
}

export type WatchlistEntry = {
  id: string;
  label: string;
  page: NavPage;
  selection: RouteSelection;
  addedAt: string;
};

const WATCHLIST_KEY = "nexus.watchlist";

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(() => readLocalStorage<WatchlistEntry[]>(WATCHLIST_KEY, []));

  useEffect(() => {
    writeLocalStorage(WATCHLIST_KEY, entries);
  }, [entries]);

  function add(entry: Omit<WatchlistEntry, "addedAt">) {
    setEntries((previous) => {
      if (previous.some((item) => item.id === entry.id)) {
        return previous;
      }
      return [...previous, { ...entry, addedAt: new Date().toISOString() }];
    });
  }

  function remove(id: string) {
    setEntries((previous) => previous.filter((item) => item.id !== id));
  }

  function isWatched(id: string): boolean {
    return entries.some((item) => item.id === id);
  }

  return { entries, add, remove, isWatched };
}

const FAVOURITE_DASHBOARDS_KEY = "nexus.favouriteDashboards";

export function useFavouriteDashboards() {
  const [favouritePages, setFavouritePages] = useState<Set<NavPage>>(
    () => new Set(readLocalStorage<NavPage[]>(FAVOURITE_DASHBOARDS_KEY, [])),
  );

  useEffect(() => {
    writeLocalStorage(FAVOURITE_DASHBOARDS_KEY, Array.from(favouritePages));
  }, [favouritePages]);

  function toggle(page: NavPage) {
    setFavouritePages((previous) => {
      const next = new Set(previous);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
  }

  function isFavourite(page: NavPage): boolean {
    return favouritePages.has(page);
  }

  return { favouritePages, toggle, isFavourite };
}

export type WidgetSize = "compact" | "standard" | "expanded";

export type BoardroomWidgetId = "status" | "mission" | "agent" | "health";

export type BoardroomWidgetConfig = {
  id: BoardroomWidgetId;
  visible: boolean;
  size: WidgetSize;
};

const BOARDROOM_LAYOUT_KEY = "nexus.boardroomLayout";

const defaultBoardroomLayout: BoardroomWidgetConfig[] = [
  { id: "status", visible: true, size: "standard" },
  { id: "mission", visible: true, size: "standard" },
  { id: "agent", visible: true, size: "standard" },
  { id: "health", visible: true, size: "standard" },
];

export function useBoardroomLayout() {
  const [layout, setLayout] = useState<BoardroomWidgetConfig[]>(
    () => readLocalStorage<BoardroomWidgetConfig[]>(BOARDROOM_LAYOUT_KEY, defaultBoardroomLayout),
  );

  useEffect(() => {
    writeLocalStorage(BOARDROOM_LAYOUT_KEY, layout);
  }, [layout]);

  function setSize(id: BoardroomWidgetId, size: WidgetSize) {
    setLayout((previous) => previous.map((widget) => (widget.id === id ? { ...widget, size } : widget)));
  }

  function toggleVisible(id: BoardroomWidgetId) {
    setLayout((previous) => previous.map((widget) => (widget.id === id ? { ...widget, visible: !widget.visible } : widget)));
  }

  function move(id: BoardroomWidgetId, direction: "up" | "down") {
    setLayout((previous) => {
      const index = previous.findIndex((widget) => widget.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }
      const next = [...previous];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function reset() {
    setLayout(defaultBoardroomLayout);
  }

  return { layout, setSize, toggleVisible, move, reset };
}

export type ConversationBadgeKind = "information" | "recommendation" | "warning" | "decision" | "approval";

export type ConversationLogEntry = {
  id: string;
  summary: string;
  badge: ConversationBadgeKind;
  occurredAt: string;
  page?: NavPage;
  selection?: RouteSelection;
};

const CONVERSATION_LOG_KEY = "nexus.jarvis.conversationLog";
const CONVERSATION_LOG_LIMIT = 20;

export function useConversationLog() {
  const [entries, setEntries] = useState<ConversationLogEntry[]>(
    () => readLocalStorage<ConversationLogEntry[]>(CONVERSATION_LOG_KEY, []),
  );

  useEffect(() => {
    writeLocalStorage(CONVERSATION_LOG_KEY, entries);
  }, [entries]);

  function record(entry: Omit<ConversationLogEntry, "id" | "occurredAt">) {
    const logged: ConversationLogEntry = { ...entry, id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, occurredAt: new Date().toISOString() };
    setEntries((previous) => [logged, ...previous].slice(0, CONVERSATION_LOG_LIMIT));
    return logged;
  }

  function clear() {
    setEntries([]);
  }

  return { entries, record, clear };
}

const PINNED_CONVERSATIONS_KEY = "nexus.jarvis.pinnedConversations";

export function usePinnedConversations() {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    () => new Set(readLocalStorage<string[]>(PINNED_CONVERSATIONS_KEY, [])),
  );

  useEffect(() => {
    writeLocalStorage(PINNED_CONVERSATIONS_KEY, Array.from(pinnedIds));
  }, [pinnedIds]);

  function toggle(id: string) {
    setPinnedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function isPinned(id: string): boolean {
    return pinnedIds.has(id);
  }

  return { pinnedIds, toggle, isPinned };
}

export type WorkspaceLayoutId = "executive" | "focus" | "operations" | "investigation";

export type WorkspacePanelId =
  | "systemLayerLegend"
  | "conversationContext"
  | "jarvisConversation"
  | "briefing"
  | "briefingTypes"
  | "recommendations"
  | "approvals"
  | "decisionQueue"
  | "followUps"
  | "conversationMemory"
  | "evidenceExplorer"
  | "evidenceTimeline"
  | "evidenceCrossReference"
  | "enterpriseExplorer"
  | "galaxyNavigator";

export type WorkspacePanelConfig = {
  id: WorkspacePanelId;
  visible: boolean;
  fullscreen?: boolean;
  size: WidgetSize;
};

export type WorkspaceLayout = {
  id: WorkspaceLayoutId;
  label: string;
  panels: WorkspacePanelConfig[];
};

const ALL_PANEL_IDS: WorkspacePanelId[] = [
  "systemLayerLegend",
  "conversationContext",
  "jarvisConversation",
  "briefing",
  "briefingTypes",
  "recommendations",
  "approvals",
  "decisionQueue",
  "followUps",
  "conversationMemory",
  "evidenceExplorer",
  "evidenceTimeline",
  "evidenceCrossReference",
  "enterpriseExplorer",
  "galaxyNavigator",
];

function panelsFor(visibleIds: WorkspacePanelId[]): WorkspacePanelConfig[] {
  return ALL_PANEL_IDS.map((id) => ({ id, visible: visibleIds.includes(id), size: "standard" as WidgetSize }));
}

const defaultWorkspaceLayouts: WorkspaceLayout[] = [
  { id: "executive", label: "Executive", panels: panelsFor(ALL_PANEL_IDS) },
  {
    id: "focus",
    label: "Focus",
    panels: panelsFor(["systemLayerLegend", "conversationContext", "jarvisConversation", "briefing", "recommendations", "followUps"]),
  },
  {
    id: "operations",
    label: "Operations",
    panels: panelsFor(["briefingTypes", "decisionQueue", "approvals", "evidenceExplorer", "enterpriseExplorer", "galaxyNavigator"]),
  },
  {
    id: "investigation",
    label: "Investigation",
    panels: panelsFor(["conversationMemory", "evidenceExplorer", "evidenceTimeline", "evidenceCrossReference", "enterpriseExplorer"]),
  },
];

const WORKSPACE_LAYOUT_KEY = "nexus.executiveWorkspace.layouts";
const WORKSPACE_ACTIVE_KEY = "nexus.executiveWorkspace.activeLayout";

export function useExecutiveWorkspace() {
  const [layouts, setLayouts] = useState<WorkspaceLayout[]>(
    () => readLocalStorage<WorkspaceLayout[]>(WORKSPACE_LAYOUT_KEY, defaultWorkspaceLayouts),
  );
  const [activeLayoutId, setActiveLayoutId] = useState<WorkspaceLayoutId>(
    () => readLocalStorage<WorkspaceLayoutId>(WORKSPACE_ACTIVE_KEY, "executive"),
  );
  const [fullscreenPanelId, setFullscreenPanelId] = useState<WorkspacePanelId | undefined>(undefined);

  useEffect(() => {
    writeLocalStorage(WORKSPACE_LAYOUT_KEY, layouts);
  }, [layouts]);

  useEffect(() => {
    writeLocalStorage(WORKSPACE_ACTIVE_KEY, activeLayoutId);
  }, [activeLayoutId]);

  const activeLayout = layouts.find((layout) => layout.id === activeLayoutId) ?? layouts[0];

  function togglePanel(panelId: WorkspacePanelId) {
    setLayouts((previous) =>
      previous.map((layout) =>
        layout.id === activeLayoutId
          ? { ...layout, panels: layout.panels.map((panel) => (panel.id === panelId ? { ...panel, visible: !panel.visible } : panel)) }
          : layout,
      ),
    );
  }

  function selectLayout(layoutId: WorkspaceLayoutId) {
    setActiveLayoutId(layoutId);
    setFullscreenPanelId(undefined);
  }

  function resetLayout() {
    setLayouts((previous) =>
      previous.map((layout) => {
        const defaults = defaultWorkspaceLayouts.find((candidate) => candidate.id === layout.id);
        return defaults ? { ...layout, panels: defaults.panels } : layout;
      }),
    );
  }

  function enterFullscreen(panelId: WorkspacePanelId) {
    setFullscreenPanelId(panelId);
  }

  function exitFullscreen() {
    setFullscreenPanelId(undefined);
  }

  function isPanelVisible(panelId: WorkspacePanelId): boolean {
    if (fullscreenPanelId) {
      return fullscreenPanelId === panelId;
    }
    return activeLayout?.panels.find((panel) => panel.id === panelId)?.visible ?? true;
  }

  function panelSize(panelId: WorkspacePanelId): WidgetSize {
    return activeLayout?.panels.find((panel) => panel.id === panelId)?.size ?? "standard";
  }

  function setPanelSize(panelId: WorkspacePanelId, size: WidgetSize) {
    setLayouts((previous) =>
      previous.map((layout) =>
        layout.id === activeLayoutId
          ? { ...layout, panels: layout.panels.map((panel) => (panel.id === panelId ? { ...panel, size } : panel)) }
          : layout,
      ),
    );
  }

  return {
    layouts,
    activeLayout,
    activeLayoutId,
    selectLayout,
    togglePanel,
    panelSize,
    setPanelSize,
    resetLayout,
    fullscreenPanelId,
    enterFullscreen,
    exitFullscreen,
    isPanelVisible,
  };
}
