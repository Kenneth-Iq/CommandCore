export type FilterFieldOption = {
  value: string;
  label: string;
};

export type FilterField = {
  id: string;
  label: string;
  value: string;
  options: FilterFieldOption[];
  onChange: (value: string) => void;
};

type FilterBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  fields: FilterField[];
  visibleCount: number;
  totalCount: number;
  onClear: () => void;
};

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search this page...",
  fields,
  visibleCount,
  totalCount,
  onClear,
}: FilterBarProps) {
  const hasActiveFilter = Boolean(searchValue.trim()) || fields.some((field) => field.value);

  return (
    <section className="panel surface filter-bar-panel">
      <div className="panel-header filter-bar-header">
        <div className="panel-title-stack">
          <h3>Page Filters</h3>
          <span>
            {visibleCount} of {totalCount} visible
            {hasActiveFilter ? " (filtered)" : ""}
          </span>
        </div>
        <button type="button" className="route-chip filter-clear-button" onClick={onClear} disabled={!hasActiveFilter}>
          Clear Filters
        </button>
      </div>

      <div className="filter-bar-controls">
        <label className="focus-filter-field filter-bar-search">
          <span>Search</span>
          <input
            type="text"
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        {fields.map((field) => (
          <label key={field.id} className="focus-filter-field">
            <span>{field.label}</span>
            <select value={field.value} onChange={(event) => field.onChange(event.target.value)}>
              <option value="">All {field.label}</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
