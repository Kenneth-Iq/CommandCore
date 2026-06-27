import { useEffect, useRef, useState } from "react";
import { classifyBadge, processConversationTurn, type JarvisPresenceState } from "../conversationOrchestrator";
import type { NavPage } from "../data/mockKernel";
import type { EvidenceLink } from "../executiveAssistant";
import { resolveGreeting } from "../executiveAssistant";
import { useConversationLog, usePinnedConversations, type ConversationBadgeKind, type ConversationLogEntry } from "../operatorPrefs";
import { useRuntimeContext } from "../runtimeContext";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./StatusBadge";

type MiniMessage = {
  id: string;
  sender: "jarvis" | "user";
  text: string;
  route?: EvidenceLink;
};

type DockTab = "conversation" | "recent" | "pinned";

const PAGE_SUGGESTIONS: Partial<Record<NavPage, string>> = {
  missions: "What's blocked right now?",
  agents: "How are my agents doing?",
  tools: "Any tool failures?",
  knowledge: "What's new in knowledge?",
  conversations: "Any conversation activity?",
  workspaces: "What's the portfolio status?",
  boardroom: "What needs my attention today?",
  kernel: "What needs my attention today?",
  health: "Is everything healthy?",
};

const BADGE_LABEL: Record<ConversationBadgeKind, string> = {
  information: "Information",
  recommendation: "Recommendation",
  warning: "Warning",
  decision: "Decision",
  approval: "Approval",
};

const BADGE_TONE: Record<ConversationBadgeKind, "idle" | "complete" | "warning" | "active" | "blocked"> = {
  information: "idle",
  recommendation: "complete",
  warning: "warning",
  decision: "active",
  approval: "blocked",
};

function suggestionForPage(page: NavPage): string {
  return PAGE_SUGGESTIONS[page] ?? "What needs my attention today?";
}

export function JarvisPresence() {
  const { world, simulation, recommendations, decisionQueue, pendingFollowUps, activePage, onNavigate } = useRuntimeContext();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DockTab>("conversation");
  const [presenceState, setPresenceState] = useState<JarvisPresenceState>("idle");
  const [messages, setMessages] = useState<MiniMessage[]>([]);
  const [draft, setDraft] = useState("");
  const stateTimeout = useRef<number | undefined>(undefined);
  const alertedIds = useRef<Set<string>>(new Set());
  const lastBriefingPeriod = useRef<string | undefined>(undefined);
  const lastHealthScore = useRef<number | undefined>(undefined);

  const { entries: conversationLog, record: recordConversation } = useConversationLog();
  const { pinnedIds, toggle: togglePinned, isPinned } = usePinnedConversations();

  useEffect(() => {
    return () => {
      if (stateTimeout.current) {
        window.clearTimeout(stateTimeout.current);
      }
    };
  }, []);

  function flashAlert() {
    setPresenceState("alert");
    if (stateTimeout.current) {
      window.clearTimeout(stateTimeout.current);
    }
    stateTimeout.current = window.setTimeout(() => setPresenceState("idle"), 2600);
  }

  // Executive interruptions: surface an alert the first time a recommendation, waiting
  // decision, or briefing-period change appears, without re-alerting on every simulation tick.
  useEffect(() => {
    let triggered = false;

    recommendations.forEach((card) => {
      if (!alertedIds.current.has(card.id)) {
        alertedIds.current.add(card.id);
        const badge: ConversationBadgeKind = card.kind === "risk" || card.kind === "anomaly" ? "warning" : "recommendation";
        recordConversation({ summary: card.title, badge });
        triggered = true;
      }
    });

    decisionQueue
      .filter((item) => item.status === "waiting")
      .forEach((item) => {
        if (!alertedIds.current.has(item.id)) {
          alertedIds.current.add(item.id);
          recordConversation({ summary: item.title, badge: "decision" });
          triggered = true;
        }
      });

    const { period } = resolveGreeting();
    if (lastBriefingPeriod.current && lastBriefingPeriod.current !== period) {
      recordConversation({ summary: `Your ${period} briefing is ready.`, badge: "information" });
      triggered = true;
    }
    lastBriefingPeriod.current = period;

    if (lastHealthScore.current !== undefined && lastHealthScore.current >= 70 && simulation.healthScore < 70) {
      recordConversation({ summary: `Simulated health score dropped to ${simulation.healthScore}.`, badge: "warning" });
      triggered = true;
    }
    lastHealthScore.current = simulation.healthScore;

    if (triggered) {
      flashAlert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations, decisionQueue, simulation.healthScore]);

  const waitingCount = decisionQueue.filter((item) => item.status === "waiting").length + pendingFollowUps.length;

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setMessages((previous) => [...previous, { id: `user-${Date.now()}`, sender: "user", text: trimmed }]);
    setDraft("");
    setPresenceState("thinking");

    window.setTimeout(() => {
      const turn = processConversationTurn(trimmed, world, simulation);
      setMessages((previous) => [
        ...previous,
        {
          id: `jarvis-${Date.now()}`,
          sender: "jarvis",
          text: turn.suggestedResponse,
          route: turn.routeSuggestion,
        },
      ]);
      recordConversation({
        summary: turn.suggestedResponse,
        badge: classifyBadge(turn),
        page: turn.routeSuggestion?.page,
        selection: turn.routeSuggestion?.selection,
      });
      setPresenceState("speaking");
      stateTimeout.current = window.setTimeout(() => setPresenceState("idle"), 1800);
    }, 450);
  }

  function renderLogEntry(entry: ConversationLogEntry) {
    return (
      <div key={entry.id} className="jarvis-dock-log-entry">
        <div className="jarvis-dock-log-entry-header">
          <StatusBadge tone={BADGE_TONE[entry.badge]}>{BADGE_LABEL[entry.badge]}</StatusBadge>
          <button
            type="button"
            className="jarvis-pin-toggle"
            aria-label={isPinned(entry.id) ? "Unpin conversation" : "Pin conversation"}
            onClick={() => togglePinned(entry.id)}
          >
            {isPinned(entry.id) ? "★" : "☆"}
          </button>
        </div>
        <p>{entry.summary}</p>
        {entry.page ? (
          <EvidenceCard evidence={{ label: "Open Nexus", page: entry.page, selection: entry.selection }} world={world} onNavigate={onNavigate} />
        ) : null}
      </div>
    );
  }

  const suggestion = suggestionForPage(activePage);
  const pinnedEntries = conversationLog.filter((entry) => pinnedIds.has(entry.id));

  return (
    <div className="jarvis-presence">
      {isOpen ? (
        <div className="jarvis-presence-popover panel surface">
          <div className="panel-header jarvis-presence-popover-header">
            <div className="panel-title-stack">
              <h3>Jarvis</h3>
              <span>Simulated conversation — AI calls are disabled in this build.</span>
            </div>
            <button type="button" className="jarvis-presence-close" aria-label="Close Jarvis dock" onClick={() => setIsOpen(false)}>
              ×
            </button>
          </div>

          <div className="jarvis-dock-tabs">
            <button type="button" className={activeTab === "conversation" ? "jarvis-dock-tab is-active" : "jarvis-dock-tab"} onClick={() => setActiveTab("conversation")}>
              Conversation
            </button>
            <button type="button" className={activeTab === "recent" ? "jarvis-dock-tab is-active" : "jarvis-dock-tab"} onClick={() => setActiveTab("recent")}>
              Recent ({conversationLog.length})
            </button>
            <button type="button" className={activeTab === "pinned" ? "jarvis-dock-tab is-active" : "jarvis-dock-tab"} onClick={() => setActiveTab("pinned")}>
              Pinned ({pinnedEntries.length})
            </button>
          </div>

          {activeTab === "conversation" ? (
            <>
              <div className="jarvis-presence-transcript">
                {messages.length === 0 ? (
                  <p className="simulation-empty">Ask a quick question without leaving this page.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`jarvis-message jarvis-message-${message.sender}`}>
                      <div className="jarvis-message-bubble">
                        <p>{message.text}</p>
                        {message.route ? <EvidenceCard evidence={message.route} world={world} onNavigate={onNavigate} /> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button type="button" className="command-chip jarvis-presence-suggestion" onClick={() => sendMessage(suggestion)}>
                {suggestion}
              </button>

              <form
                className="jarvis-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage(draft);
                }}
              >
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onFocus={() => setPresenceState((current) => (current === "idle" ? "listening" : current))}
                  onBlur={() => setPresenceState((current) => (current === "listening" ? "idle" : current))}
                  className="jarvis-composer-input"
                  placeholder="Ask Jarvis..."
                  aria-label="Quick message to Jarvis"
                />
                <button type="submit" className="route-chip">
                  Send
                </button>
              </form>

              <button type="button" className="route-chip jarvis-presence-full-link" onClick={() => onNavigate("kernel")}>
                Open Full Conversation
              </button>
            </>
          ) : null}

          {activeTab === "recent" ? (
            <div className="jarvis-dock-log">
              {conversationLog.length ? conversationLog.map(renderLogEntry) : <p className="simulation-empty">No recent conversation activity yet.</p>}
            </div>
          ) : null}

          {activeTab === "pinned" ? (
            <div className="jarvis-dock-log">
              {pinnedEntries.length ? pinnedEntries.map(renderLogEntry) : <p className="simulation-empty">Pin a conversation entry from Recent to keep it handy here.</p>}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={`jarvis-presence-avatar jarvis-presence-${presenceState}`}
        aria-label={isOpen ? "Close Jarvis dock" : "Open Jarvis dock"}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="jarvis-presence-glyph">J</span>
        {waitingCount > 0 ? <span className="jarvis-presence-badge">{waitingCount}</span> : null}
      </button>
      {!isOpen ? (
        <span className="jarvis-presence-state-label">
          <StatusBadge tone={presenceState === "idle" ? "idle" : presenceState === "alert" ? "warning" : "active"}>{presenceState}</StatusBadge>
        </span>
      ) : null}
    </div>
  );
}
