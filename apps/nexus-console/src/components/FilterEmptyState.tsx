type FilterEmptyStateProps = {
  title?: string;
  message?: string;
  onClear: () => void;
};

export function FilterEmptyState({
  title = "No Matching Records",
  message = "No records match the current page filters.",
  onClear,
}: FilterEmptyStateProps) {
  return (
    <div className="empty-state filter-empty-state">
      <strong>{title}</strong>
      <p>{message}</p>
      <button type="button" className="route-chip" onClick={onClear}>
        Clear Filters
      </button>
    </div>
  );
}
