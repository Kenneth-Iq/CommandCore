import { StatusBadge } from "./StatusBadge";

const plannedCapabilities = [
  {
    label: "Command Routing",
    detail: "Deterministic routing of operator commands to governed runtime surfaces.",
  },
  {
    label: "Conversation Search",
    detail: "Search across conversations, threads, and messages from the command bar.",
  },
  {
    label: "Navigation Shortcuts",
    detail: "Jump directly to a conversation, mission, or knowledge asset from a query.",
  },
  {
    label: "Executive Intelligence",
    detail: "Jarvis sits above the command centre once routing and visibility are solid.",
  },
];

export function JarvisIntegrationPlaceholder() {
  return (
    <section className="panel surface jarvis-placeholder-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Jarvis Future Integration</h3>
          <span>Reserved surface for command routing and search, not AI chat</span>
        </div>
      </div>

      <div className="panel-rows">
        {plannedCapabilities.map((item) => (
          <div key={item.label} className="data-row">
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </div>
            <div className="row-meta">
              <StatusBadge tone="idle">Planned</StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
