import type { ConversationContextState } from "../executiveAssistant";

type ConversationContextBarProps = {
  context: ConversationContextState;
};

export function ConversationContextBar({ context }: ConversationContextBarProps) {
  const entries: Array<{ label: string; value: string }> = [
    { label: "Planet", value: context.planet },
    { label: "Company", value: context.company ?? "Not focused" },
    { label: "Workspace", value: context.workspace ?? "Not focused" },
    { label: "Project", value: context.project ?? "Not focused" },
    { label: "Mission", value: context.mission ?? "Not focused" },
    { label: "Investigation", value: context.investigation ?? "None yet — open an evidence card to start one" },
  ];

  return (
    <section className="panel surface conversation-context-bar">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Conversation Context</h3>
          <span>Where Jarvis believes this conversation is currently scoped.</span>
        </div>
      </div>
      <div className="conversation-context-grid">
        {entries.map((entry) => (
          <div key={entry.label} className="conversation-context-chip">
            <span>{entry.label}</span>
            <strong>{entry.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
