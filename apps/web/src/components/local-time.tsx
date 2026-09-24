'use client';

/**
 * Renders a UTC instant in the *viewer's* timezone. The server renders in UTC,
 * so the first paint may differ until hydration — hence suppressHydrationWarning.
 */
export function LocalTime({
  iso,
  mode = 'full',
}: {
  iso: string;
  mode?: 'full' | 'time' | 'day' | 'date' | 'weekday-date';
}) {
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    full: { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' },
    time: { hour: 'numeric', minute: '2-digit' },
    day: { weekday: 'short', day: 'numeric', month: 'short' },
    date: { day: 'numeric', month: 'short', year: 'numeric' },
    'weekday-date': { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  }[mode] as Intl.DateTimeFormatOptions;
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {new Intl.DateTimeFormat(undefined, options).format(d)}
    </time>
  );
}

/** Calendar tile: month over day number. */
export function DateStub({ iso, size = 'md' }: { iso: string; size?: 'md' | 'lg' }) {
  const d = new Date(iso);
  const big = size === 'lg';
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface leading-none ${
        big ? 'size-20' : 'size-12'
      }`}
      suppressHydrationWarning
    >
      <span className={`font-bold uppercase tracking-wider text-accent ${big ? 'text-xs' : 'text-[10px]'}`} suppressHydrationWarning>
        {d.toLocaleString(undefined, { month: 'short' })}
      </span>
      <span className={`font-extrabold ${big ? 'mt-1 text-3xl' : 'mt-0.5 text-lg'}`} suppressHydrationWarning>
        {d.getDate()}
      </span>
    </div>
  );
}
