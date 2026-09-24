/** Seats meter: bar + label. Turns amber when nearly full, red at capacity. */
export function Capacity({ going, capacity }: { going: number; capacity: number | null }) {
  if (capacity === null) {
    return (
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{going} going</span>
        <span className="text-muted">Unlimited seats</span>
      </div>
    );
  }
  const left = Math.max(capacity - going, 0);
  const pct = Math.min(100, Math.round((going / capacity) * 100));
  const tone = left === 0 ? 'bg-danger' : pct >= 80 ? 'bg-wait' : 'bg-accent';

  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-semibold">
          {going} <span className="font-normal text-muted">/ {capacity} going</span>
        </span>
        <span className={left === 0 ? 'font-semibold text-danger' : left <= 3 ? 'font-semibold text-wait' : 'text-muted'}>
          {left === 0 ? 'Full · waitlist open' : `${left} seat${left === 1 ? '' : 's'} left`}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-raised"
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
