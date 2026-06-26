import { useMemo, useState } from "react";
import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { ExecutiveSimulationState } from "../simulation";
import type { WorldData } from "../worldModel";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./StatusBadge";

type ChatMessage = {
  id: string;
  sender: "jarvis" | "user";
  text: string;
  route?: { label: string; page: NavPage; selection?: RouteSelection };
};

type BriefingCard = {
  id: string;
  text: string;
  tone: "warning" | "active" | "complete" | "idle";
  route: { label: string; page: NavPage; selection?: RouteSelection };
};

type SuggestedQuestion = {
  id: string;
  label: string;
};

type JarvisConversationPanelProps = {
  world: WorldData;
  simulation: ExecutiveSimulationState;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  onInvestigate?: (label: string) => void;
};

const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: "attention", label: "What needs my attention today?" },
  { id: "missions", label: "How are my missions going?" },
  { id: "agents", label: "How are my agents doing?" },
  { id: "tools", label: "Any tool failures?" },
  { id: "knowledge", label: "What's new in knowledge?" },
  { id: "conversations", label: "Any conversation activity?" },
];

export function JarvisConversationPanel({ world, simulation, onNavigate, onInvestigate }: JarvisConversationPanelProps) {
  const allMissions = useMemo(
    () => [...world.missionCentre.active, ...world.missionCentre.completed, ...world.missionCentre.failed],
    [world.missionCentre],
  );

  const blockedMissions = allMissions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
  const overdueMissions = allMissions.filter((mission) => simulation.missions[mission.missionId]?.isOverdue);
  const offlineAgents = world.agentCentre.profiles.filter((agent) => simulation.agents[agent.agentId]?.activity === "offline" || simulation.agents[agent.agentId]?.activity === "blocked");
  const unhealthyTools = world.toolCentre.tools.filter((tool) => simulation.tools[tool.toolId]?.health !== "healthy");
  const recentlyLinkedKnowledge = world.knowledgeCentre.assets.filter((asset) => simulation.knowledge[asset.assetId]?.recentlyLinked);

  const briefingCards = useMemo<BriefingCard[]>(() => {
    const cards: BriefingCard[] = [];

    if (blockedMissions.length || overdueMissions.length) {
      const count = new Set([...blockedMissions, ...overdueMissions].map((mission) => mission.missionId)).size;
      cards.push({
        id: "briefing-missions",
        text: `You have ${count} mission${count === 1 ? "" : "s"} that need attention right now.`,
        tone: "warning",
        route: { label: "Open Mission Centre", page: "missions" },
      });
    }

    if (offlineAgents.length) {
      cards.push({
        id: "briefing-agents",
        text: `${offlineAgents[0].name} is currently ${simulation.agents[offlineAgents[0].agentId]?.activity ?? "unavailable"}${offlineAgents.length > 1 ? ` and ${offlineAgents.length - 1} other agent(s) need a look` : ""}.`,
        tone: "warning",
        route: { label: "Open Agent Centre", page: "agents", selection: { agentId: offlineAgents[0].agentId } },
      });
    }

    if (unhealthyTools.length) {
      cards.push({
        id: "briefing-tools",
        text: `A tool execution issue was detected on ${unhealthyTools[0].name} and I've prepared the summary.`,
        tone: "warning",
        route: { label: "Open Tool Centre", page: "tools", selection: { toolId: unhealthyTools[0].toolId } },
      });
    }

    if (recentlyLinkedKnowledge.length) {
      cards.push({
        id: "briefing-knowledge",
        text: `I found a newly linked knowledge asset worth reviewing: "${recentlyLinkedKnowledge[0].title}".`,
        tone: "complete",
        route: { label: "Open Knowledge Centre", page: "knowledge", selection: { assetId: recentlyLinkedKnowledge[0].assetId } },
      });
    }

    if (!cards.length) {
      cards.push({
        id: "briefing-clear",
        text: "Everything is operating normally right now. No missions, agents, or tools need your attention.",
        tone: "idle",
        route: { label: "Open Executive Health Board", page: "kernel" },
      });
    }

    return cards.slice(0, 4);
  }, [blockedMissions, overdueMissions, offlineAgents, unhealthyTools, recentlyLinkedKnowledge, simulation.agents]);

  const [transcript, setTranscript] = useState<ChatMessage[]>(() => [
    {
      id: "jarvis-greeting",
      sender: "jarvis",
      text: "Good to see you. Here's where things stand across the operating picture right now.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  function generateReply(input: string): ChatMessage {
    const normalized = input.toLowerCase();

    if (normalized.includes("mission")) {
      const count = allMissions.length;
      return {
        id: `jarvis-${Date.now()}`,
        sender: "jarvis",
        text: `There are ${count} missions in view, ${blockedMissions.length} blocked and ${overdueMissions.length} running behind. Want me to open Mission Centre?`,
        route: { label: "Open Mission Centre", page: "missions" },
      };
    }
    if (normalized.includes("agent")) {
      return {
        id: `jarvis-${Date.now()}`,
        sender: "jarvis",
        text: `${world.agentCentre.profiles.length} agents are registered; ${offlineAgents.length} are offline or blocked right now.`,
        route: { label: "Open Agent Centre", page: "agents" },
      };
    }
    if (normalized.includes("tool")) {
      return {
        id: `jarvis-${Date.now()}`,
        sender: "jarvis",
        text: `${world.toolCentre.tools.length} tools are registered; ${unhealthyTools.length} are reporting degraded or down health.`,
        route: { label: "Open Tool Centre", page: "tools" },
      };
    }
    if (normalized.includes("knowledge")) {
      return {
        id: `jarvis-${Date.now()}`,
        sender: "jarvis",
        text: `${world.knowledgeCentre.assets.length} knowledge assets are tracked; ${recentlyLinkedKnowledge.length} were recently linked.`,
        route: { label: "Open Knowledge Centre", page: "knowledge" },
      };
    }
    if (normalized.includes("conversation")) {
      return {
        id: `jarvis-${Date.now()}`,
        sender: "jarvis",
        text: `${world.conversationCentre.conversations.length} conversations are active across the portfolio.`,
        route: { label: "Open Conversation Centre", page: "conversations" },
      };
    }
    if (normalized.includes("attention") || normalized.includes("today")) {
      return {
        id: `jarvis-${Date.now()}`,
        sender: "jarvis",
        text: briefingCards[0]?.text ?? "Nothing urgent right now.",
        route: briefingCards[0]?.route,
      };
    }

    return {
      id: `jarvis-${Date.now()}`,
      sender: "jarvis",
      text: "Conversational intelligence is simulated in Beta-1 — AI calls are disabled. Try asking about missions, agents, tools, knowledge, or conversations.",
    };
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text: trimmed };
    setTranscript((previous) => [...previous, userMessage]);
    setDraft("");
    setIsTyping(true);
    window.setTimeout(() => {
      setTranscript((previous) => [...previous, generateReply(trimmed)]);
      setIsTyping(false);
    }, 450);
  }

  return (
    <section className="panel surface jarvis-conversation-panel">
      <div className="panel-header jarvis-conversation-header">
        <div className="panel-title-stack">
          <h3>Jarvis</h3>
          <span>Your executive chief of staff for the current operating picture.</span>
        </div>
        <StatusBadge tone="warning">Conversation Simulation Mode / AI Disabled</StatusBadge>
      </div>

      <div className="jarvis-briefing-cards">
        {briefingCards.map((card) => (
          <article key={card.id} className={`jarvis-briefing-card tone-${card.tone}`}>
            <p>{card.text}</p>
            <EvidenceCard evidence={card.route} world={world} onNavigate={onNavigate} onInvestigate={onInvestigate} />
          </article>
        ))}
      </div>

      <div className="jarvis-transcript">
        {transcript.map((message) => (
          <div key={message.id} className={`jarvis-message jarvis-message-${message.sender}`}>
            <div className="jarvis-message-bubble">
              <p>{message.text}</p>
              {message.route ? (
                <EvidenceCard evidence={message.route} world={world} onNavigate={onNavigate} onInvestigate={onInvestigate} />
              ) : null}
            </div>
          </div>
        ))}
        {isTyping ? (
          <div className="jarvis-message jarvis-message-jarvis">
            <div className="jarvis-message-bubble jarvis-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}
      </div>

      <div className="jarvis-suggested-questions">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button key={question.id} type="button" className="command-chip" onClick={() => sendMessage(question.label)}>
            {question.label}
          </button>
        ))}
      </div>

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
          placeholder="Ask Jarvis about missions, agents, tools, knowledge, or conversations..."
          aria-label="Message Jarvis"
        />
        <button type="submit" className="route-chip">
          Send
        </button>
      </form>
    </section>
  );
}
