const suggestions = [
  "View active missions",
  "Inspect failed executions",
  "Open knowledge changes",
  "Search workspace activity",
];

export function CommandBar() {
  return (
    <section className="surface command-bar">
      <div className="command-bar-icon">J</div>
      <div className="command-bar-copy">
        <strong>Ask Jarvis or search CommandCore...</strong>
        <span>Placeholder command surface for future runtime and search integration.</span>
      </div>
      <div className="command-bar-shortcut">Ctrl K</div>
      <div className="command-suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" className="command-chip">
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
