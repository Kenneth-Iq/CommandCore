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
        <span>Command routing and search surface for the governed runtime.</span>
      </div>
      <div className="command-bar-shortcut">Ctrl K</div>
      <div className="command-suggestions">
        <p className="command-suggestions-label">Quick Actions</p>
        <div className="command-suggestions-row">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" className="command-chip">
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
