type LoadingStateProps = {
  label?: string;
  detail?: string;
};

export function LoadingState({ label = "Loading", detail = "Fetching the current operating picture..." }: LoadingStateProps) {
  return (
    <div className="surface loading-state">
      <span className="loading-state-spinner" aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}
