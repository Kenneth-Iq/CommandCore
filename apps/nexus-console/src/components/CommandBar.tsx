import { useMemo, useState } from "react";
import type { NavPage } from "../data/mockKernel";
import { commandSuggestions, type SearchEntry } from "../data/nexusCentres";
import { StatusBadge } from "./StatusBadge";

type CommandBarProps = {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  searchEntries: SearchEntry[];
};

export function CommandBar({ activePage, onNavigate, searchEntries }: CommandBarProps) {
  const [query, setQuery] = useState("");

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

  function commitNavigation(page: NavPage) {
    onNavigate(page);
    setQuery("");
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
      commitNavigation(firstResult.page);
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
        <span>Local search across the live or seeded operating picture. Routing stays deterministic and read-only.</span>
      </div>
      <div className="command-bar-shortcut">Ctrl K</div>

      <div className="command-input-shell">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              routeFromQuery(query);
            }
          }}
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
          <span>{visibleResults.length ? `${visibleResults.length} matched records` : "No routed matches"}</span>
        </div>
        {visibleResults.length ? (
          <div className="command-results-list">
            {visibleResults.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="command-result-row"
                onClick={() => commitNavigation(entry.page)}
              >
                <div>
                  <div className="knowledge-card-header">
                    <strong>{entry.label}</strong>
                    {entry.context ? <span className="knowledge-asset-id">{entry.context}</span> : null}
                  </div>
                  <p>{entry.description}</p>
                </div>
                <div className="knowledge-row-meta">
                  <StatusBadge tone={entry.tone ?? "idle"}>{pageLabel(entry.page)}</StatusBadge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty command-empty">
            <strong>No Local Match</strong>
            <p>Search remains local-only in this wave and routes to the nearest relevant page.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function pageLabel(page: NavPage): string {
  switch (page) {
    case "kernel":
      return "Home";
    case "workspaces":
      return "Portfolio";
    default:
      return page.charAt(0).toUpperCase() + page.slice(1);
  }
}
