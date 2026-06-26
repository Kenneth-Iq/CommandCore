import { useEffect, useRef, useState } from "react";
import { processConversationTurn } from "../conversationOrchestrator";
import type { NavPage } from "../data/mockKernel";
import type { EvidenceLink } from "../executiveAssistant";
import { useRuntimeContext } from "../runtimeContext";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./StatusBadge";

type PresenceState = "idle" | "thinking" | "speaking";

type MiniMessage = {
  id: string;
  sender: "jarvis" | "user";
  text: string;
  route?: EvidenceLink;
};

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

function suggestionForPage(page: NavPage): string {
  return PAGE_SUGGESTIONS[page] ?? "What needs my attention today?";
}

export function JarvisPresence() {
  const { world, simulation, decisionQueue, pendingFollowUps, activePage, onNavigate } = useRuntimeContext();
  const [isOpen, setIsOpen] = useState(false);
  const [presenceState, setPresenceState] = useState<PresenceState>("idle");
  const [messages, setMessages] = useState<MiniMessage[]>([]);
  const [draft, setDraft] = useState("");
  const speakingTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (speakingTimeout.current) {
        window.clearTimeout(speakingTimeout.current);
      }
    };
  }, []);

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
      setPresenceState("speaking");
      speakingTimeout.current = window.setTimeout(() => setPresenceState("idle"), 1800);
    }, 450);
  }

  const suggestion = suggestionForPage(activePage);

  return (
    <div className="jarvis-presence">
      {isOpen ? (
        <div className="jarvis-presence-popover panel surface">
          <div className="panel-header jarvis-presence-popover-header">
            <div className="panel-title-stack">
              <h3>Jarvis</h3>
              <span>Quick access — full conversation lives on Executive Home.</span>
            </div>
            <button type="button" className="jarvis-presence-close" aria-label="Close Jarvis quick access" onClick={() => setIsOpen(false)}>
              ×
            </button>
          </div>

          <div className="jarvis-presence-transcript">
            {messages.length === 0 ? (
              <p className="simulation-empty">Ask a quick question without leaving this page.</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`jarvis-message jarvis-message-${message.sender}`}>
                  <div className="jarvis-message-bubble">
                    <p>{message.text}</p>
                    {message.route ? (
                      <EvidenceCard evidence={message.route} world={world} onNavigate={onNavigate} />
                    ) : null}
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
        </div>
      ) : null}

      <button
        type="button"
        className={`jarvis-presence-avatar jarvis-presence-${presenceState}`}
        aria-label={isOpen ? "Close Jarvis quick access" : "Open Jarvis quick access"}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="jarvis-presence-glyph">J</span>
        {waitingCount > 0 ? <span className="jarvis-presence-badge">{waitingCount}</span> : null}
      </button>
      {!isOpen ? (
        <span className="jarvis-presence-state-label">
          <StatusBadge tone={presenceState === "idle" ? "idle" : "active"}>{presenceState}</StatusBadge>
        </span>
      ) : null}
    </div>
  );
}
