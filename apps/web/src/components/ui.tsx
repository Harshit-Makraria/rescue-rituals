// Small shared UI primitives: avatars, progress ring, cards, section headers, icons.

const AVATAR_TONES = [
  'bg-accent-soft text-accent',
  'bg-going-soft text-going',
  'bg-wait-soft text-wait',
  'bg-violet-soft text-violet',
  'bg-danger-soft text-danger',
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function Avatar({ name, size = 32, ring = false }: { name: string; size?: number; ring?: boolean }) {
  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold ${AVATAR_TONES[hash(name) % AVATAR_TONES.length]} ${
        ring ? 'ring-2 ring-surface' : ''
      }`}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, total, size = 28 }: { names: string[]; total?: number; size?: number }) {
  const shown = names.slice(0, 4);
  const extra = (total ?? names.length) - shown.length;
  if (!shown.length) return <span className="text-sm text-muted">No one yet</span>;
  return (
    <span className="flex items-center">
      {shown.map((n, i) => (
        <span key={n + i} className={i ? '-ml-2' : ''}>
          <Avatar name={n} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{ width: size, height: size }}
          className="-ml-2 inline-grid place-items-center rounded-full bg-raised text-[11px] font-bold text-muted ring-2 ring-surface"
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

/** Circular capacity meter, as in the Projects reference. */
export function ProgressRing({ value, max, size = 36 }: { value: number; max: number | null; size?: number }) {
  if (max === null) {
    return <span className="text-sm font-semibold text-muted">∞</span>;
  }
  const pct = Math.min(100, Math.round((value / max) * 100));
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const tone = pct >= 100 ? 'text-danger' : pct >= 80 ? 'text-wait' : 'text-accent';
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} className={`-rotate-90 ${tone}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="3.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <span className="text-sm font-semibold tabular-nums">{pct}%</span>
    </span>
  );
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

export function Pill({ tone, children }: { tone: 'accent' | 'going' | 'wait' | 'danger' | 'muted' | 'violet'; children: React.ReactNode }) {
  const tones = {
    accent: 'bg-accent-soft text-accent',
    going: 'bg-going-soft text-going',
    wait: 'bg-wait-soft text-wait',
    danger: 'bg-danger-soft text-danger',
    violet: 'bg-violet-soft text-violet',
    muted: 'bg-raised text-muted',
  };
  return <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

type IconName =
  | 'compass' | 'plus' | 'calendar' | 'bell' | 'book' | 'code' | 'user' | 'logout' | 'login'
  | 'clock' | 'pin' | 'users' | 'search' | 'x' | 'arrow' | 'check' | 'menu' | 'ticket' | 'edit' | 'trash' | 'external';

const PATHS: Record<IconName, React.ReactNode> = {
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  book: <><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19" /></>,
  code: <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></>,
  logout: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11" />,
  login: <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l4-4-4-4M19 12H8" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.8 5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  ticket: <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM14 5v12" />,
  edit: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
};

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
