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
