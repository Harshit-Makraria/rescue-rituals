/** Seats meter: turns amber when nearly full, shows "Full · waitlist open" at capacity. */
export function Capacity({ going, capacity }: { going: number; capacity: number | null }) {
  if (capacity === null) {
    return <p className="text-sm text-muted">{going} going · open to all</p>;
  }
  const left = Math.max(capacity - going, 0);
  const pct = Math.min(100, Math.round((going / capacity) * 100));
  const tone = left === 0 ? 'bg-danger' : left <= Math.max(2, capacity * 0.2) ? 'bg-wait' : 'bg-going';
  const label = left === 0 ? 'Full · waitlist open' : `${left} of ${capacity} seats left`;

  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">{going} going</span>
        <span className={left === 0 ? 'font-semibold text-danger' : left <= 2 ? 'font-semibold text-wait' : 'text-muted'}>
          {label}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={going}
        aria-label="Seats taken"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
