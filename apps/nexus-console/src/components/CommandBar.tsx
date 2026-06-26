import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { NavPage } from "../data/mockKernel";
import { commandSuggestions, type SearchEntry } from "../data/nexusCentres";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

type CommandBarProps = {
  activePage: NavPage;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  searchEntries: SearchEntry[];
};

export function CommandBar({ activePage, onNavigate, searchEntries }: CommandBarProps) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const visibleSuggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return commandSuggestions.slice(0, 6);
    }

    return commandSuggestions.filter((suggestion) =>
      suggestion.label.toLowerCase().includes(normalized)
      || suggestion.aliases.some((alias) => alias.includes(normalized)),
    );
  }, [query]);

  const visibleResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return searchEntries.slice(0, 6);
    }

    return searchEntries.filter((entry) => {
      const haystack = [entry.label, entry.description, entry.context ?? "", ...entry.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    }).slice(0, 8);
  }, [query, searchEntries]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  function commitNavigation(page: NavPage, selection: RouteSelection = {}) {
    onNavigate(page, selection);
    setQuery("");
    setHighlightedIndex(-1);
  }

  function routeFromQuery(nextQuery: string) {
    const normalized = nextQuery.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    const suggestionMatch = commandSuggestions.find((suggestion) =>
      suggestion.aliases.includes(normalized) || suggestion.label.toLowerCase() === normalized,
    );
    if (suggestionMatch) {
      commitNavigation(suggestionMatch.page);
      return;
    }

    const firstResult = visibleResults[0];
    if (firstResult) {
      commitNavigation(firstResult.page, firstResult.selection);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((previous) => Math.min(previous + 1, visibleResults.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((previous) => Math.max(previous - 1, -1));
      return;
    }
    if (event.key === "Enter") {
      if (highlightedIndex >= 0 && visibleResults[highlightedIndex]) {
        const entry = visibleResults[highlightedIndex];
        commitNavigation(entry.page, entry.selection);
        return;
      }
      routeFromQuery(query);
      return;
    }
    if (event.key === "Escape") {
      setQuery("");
      setHighlightedIndex(-1);
    }
  }

  return (
    <section className="surface command-bar">
      <div className="command-bar-icon">J</div>
      <div className="command-bar-copy">
        <div className="command-bar-title-row">
          <strong>Jarvis Command Routing</strong>
          <StatusBadge tone="warning">Routing Mode / AI Disabled</StatusBadge>
        </div>
        <span>Jump anywhere across the operating picture. Once you are on a page, use its local filters to narrow what is shown without leaving it.</span>
      </div>
      <div className="command-bar-shortcut">Press / or Ctrl K</div>

      <div className="command-input-shell">
        <input
          id="command-bar-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          className="command-input"
          placeholder="Search pages, missions, agents, tools, conversations, knowledge, workspaces"
          aria-label="Jarvis command routing"
        />
        <button type="button" className="route-chip" onClick={() => routeFromQuery(query)}>
          Route
        </button>
      </div>

      <div className="command-suggestions">
        <p className="command-suggestions-label">Route Suggestions</p>
        <div className="command-suggestions-row">
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className={`command-chip ${activePage === suggestion.page ? "is-active" : ""}`}
              onClick={() => commitNavigation(suggestion.page)}
            >
              <span>{suggestion.label}</span>
              <small>{suggestion.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="command-results-panel">
        <div className="panel-title-stack">
          <h3>Local Search</h3>
          <span>{visibleResults.length ? `${visibleResults.length} matched records (↑↓ to navigate, Enter to open)` : "No routed matches"}</span>
        </div>
        {visibleResults.length ? (
          <div className="command-results-list">
            {visibleResults.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                className={`command-result-row ${index === highlightedIndex ? "is-highlighted" : ""}`}
                onClick={() => commitNavigation(entry.page, entry.selection)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div>
                  <div className="knowledge-card-header">
                    <strong>{entry.label}</strong>
                    {entry.context ? <span className="knowledge-asset-id">{entry.context}</span> : null}
                  </div>
                  <p>{entry.description}</p>
                </div>
                <div className="knowledge-row-meta">
                  <StatusBadge tone={entry.tone ?? "idle"}>{pageLabel(entry.page, entry.selection)}</StatusBadge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty command-empty">
            <strong>No Local Match</strong>
            <p>Search remains local-only in this wave and routes to the nearest exact record when available.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function pageLabel(page: NavPage, selection: RouteSelection): string {
  const hasSelection = Object.values(selection).some(Boolean);
  const base = page === "kernel" ? "Home" : page === "workspaces" ? "Portfolio" : page.charAt(0).toUpperCase() + page.slice(1);
  return hasSelection ? `${base} Detail` : base;
}
