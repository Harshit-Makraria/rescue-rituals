'use client';

/**
 * Renders a UTC instant in the *viewer's* timezone. The server renders in UTC,
 * so the first paint may differ by a few hours until hydration — hence
 * suppressHydrationWarning.
 */
export function LocalTime({ iso, mode = 'full' }: { iso: string; mode?: 'full' | 'time' | 'day' }) {
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions =
    mode === 'time'
      ? { hour: 'numeric', minute: '2-digit' }
      : mode === 'day'
        ? { weekday: 'short', day: 'numeric', month: 'short' }
        : { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {new Intl.DateTimeFormat(undefined, options).format(d)}
    </time>
  );
}

/** The calendar-stub date block used on cards. */
export function DateStub({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div
      className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-line bg-raised py-1.5 leading-none"
      suppressHydrationWarning
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-accent" suppressHydrationWarning>
        {d.toLocaleString(undefined, { month: 'short' })}
      </span>
      <span className="font-display text-2xl font-bold" suppressHydrationWarning>
        {d.getDate()}
      </span>
      <span className="text-[11px] text-muted" suppressHydrationWarning>
        {d.toLocaleString(undefined, { weekday: 'short' })}
      </span>
    </div>
  );
}
