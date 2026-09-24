import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Icon } from '@/components/ui';
import { readTheme } from '@/lib/theme';

/** Topographic contour lines, drawn procedurally (no image asset). */
function Contours() {
  const rings = Array.from({ length: 9 }, (_, i) => i);
  const blob = (cx: number, cy: number, base: number, k: number) =>
    rings.map((i) => {
      const r = base + i * k;
      const pts = Array.from({ length: 48 }, (_, j) => {
        const a = (j / 48) * Math.PI * 2;
        const wobble = 1 + 0.12 * Math.sin(a * 3 + i * 0.7) + 0.06 * Math.cos(a * 5 - i);
        return `${(cx + Math.cos(a) * r * wobble).toFixed(1)},${(cy + Math.sin(a) * r * 0.8 * wobble).toFixed(1)}`;
      });
      return <polygon key={`${cx}-${i}`} points={pts.join(' ')} />;
    });
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35">
        {blob(110, 120, 14, 16)}
        {blob(300, 360, 18, 18)}
        {blob(330, 90, 10, 12)}
      </g>
    </svg>
  );
}

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  const theme = await readTheme();
  return (
    <div className="relative grid min-h-screen place-items-center bg-accent px-4 py-10">
      <div className="absolute right-4 top-4 rounded-xl bg-surface/90">
        <ThemeToggle initial={theme} />
      </div>
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-surface shadow-2xl md:grid-cols-2">
        <div className="relative hidden min-h-[480px] overflow-hidden bg-accent-soft p-8 text-accent md:block">
          <Contours />
          <Link href="/" className="relative flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink">
              <Icon name="ticket" size={18} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink">Gather</span>
          </Link>
          <div className="absolute inset-x-8 bottom-8 text-ink">
            <p className="text-2xl font-extrabold leading-snug tracking-tight">Find events worth showing up for.</p>
            <p className="mt-2 text-sm text-muted">RSVP in one tap. Full events have a waitlist that moves you up automatically.</p>
          </div>
        </div>
        <div className="p-8 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
