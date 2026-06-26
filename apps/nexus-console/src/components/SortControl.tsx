export type SortDirection = "asc" | "desc";

export type SortOption = {
  value: string;
  label: string;
};

type SortControlProps = {
  options: SortOption[];
  value: string;
  direction: SortDirection;
  onChange: (value: string) => void;
  onToggleDirection: () => void;
};

export function SortControl({ options, value, direction, onChange, onToggleDirection }: SortControlProps) {
  return (
    <div className="sort-control">
      <label className="focus-filter-field">
        <span>Sort By</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="route-chip sort-direction-button" onClick={onToggleDirection}>
        {direction === "asc" ? "Ascending ↑" : "Descending ↓"}
      </button>
    </div>
  );
}
