import type { RsvpStatus } from '@/lib/api';

const STYLES: Record<RsvpStatus, string> = {
  going: 'bg-going-soft text-going',
  waitlisted: 'bg-wait-soft text-wait',
  cancelled: 'bg-line text-muted',
};
const LABELS: Record<RsvpStatus, string> = { going: 'Going', waitlisted: 'Waitlisted', cancelled: 'Cancelled' };

export function StatusPill({ status }: { status: RsvpStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
