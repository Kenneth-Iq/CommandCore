type FavouriteToggleProps = {
  active: boolean;
  onToggle: () => void;
  label?: string;
};

export function FavouriteToggle({ active, onToggle, label = "Favourite" }: FavouriteToggleProps) {
  return (
    <button
      type="button"
      className={`favourite-toggle ${active ? "is-active" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? `Remove from ${label.toLowerCase()}s` : `Add to ${label.toLowerCase()}s`}
      title={active ? `Remove from ${label.toLowerCase()}s` : `Add to ${label.toLowerCase()}s`}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
