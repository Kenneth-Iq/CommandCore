type BulkActionsBarProps = {
  selectedIds: string[];
  onCopyIds: () => void;
  onExportJson: () => void;
  onClear: () => void;
};

export function BulkActionsBar({ selectedIds, onCopyIds, onExportJson, onClear }: BulkActionsBarProps) {
  if (!selectedIds.length) {
    return null;
  }

  return (
    <div className="surface bulk-actions-bar">
      <strong>{selectedIds.length} selected</strong>
      <div className="route-chip-row">
        <button type="button" className="route-chip" onClick={onCopyIds}>
          Copy IDs
        </button>
        <button type="button" className="route-chip" onClick={onExportJson}>
          Export Selection (JSON)
        </button>
        <button type="button" className="route-chip" onClick={onClear}>
          Clear Selection
        </button>
      </div>
    </div>
  );
}
