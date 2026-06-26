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
