const LAYERS = [
  {
    id: "jarvis",
    name: "Jarvis",
    role: "Conversational Layer",
    description: "What you talk to. Surfaces briefings, recommendations, and follow-ups in plain language.",
  },
  {
    id: "nexus",
    name: "Nexus",
    role: "Evidence & Control Layer",
    description: "What you look at. Every claim Jarvis makes resolves to a real record here.",
  },
  {
    id: "commandcore",
    name: "CommandCore",
    role: "Runtime (Invisible By Design)",
    description: "What actually runs missions, agents, and tools. Never addressed directly by the user.",
  },
] as const;

export function SystemLayerLegend() {
  return (
    <section className="panel surface system-layer-legend-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>System Layers</h3>
          <span>Jarvis, Nexus, and CommandCore are three distinct layers, not one product wearing different names.</span>
        </div>
      </div>
      <div className="system-layer-grid">
        {LAYERS.map((layer) => (
          <div key={layer.id} className={`system-layer-chip system-layer-${layer.id}`}>
            <strong>{layer.name}</strong>
            <span className="system-layer-role">{layer.role}</span>
            <p>{layer.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
