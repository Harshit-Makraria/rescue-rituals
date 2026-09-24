import type { EventItem, RsvpStatus } from '@/lib/api';
import { Pill } from './ui';

const RSVP: Record<RsvpStatus, { tone: 'going' | 'wait' | 'muted'; label: string }> = {
  going: { tone: 'going', label: 'Going' },
  waitlisted: { tone: 'wait', label: 'Waitlisted' },
  cancelled: { tone: 'muted', label: 'Cancelled' },
};

export function StatusPill({ status }: { status: RsvpStatus }) {
  return <Pill tone={RSVP[status].tone}>{RSVP[status].label}</Pill>;
}

/** The single most useful status for an event row, from the viewer's point of view. */
export function EventStatus({ event }: { event: EventItem }) {
  if (event.status === 'draft') return <Pill tone="violet">Draft</Pill>;
  if (event.status === 'cancelled') return <Pill tone="muted">Cancelled</Pill>;
  if (event.myRsvpStatus === 'going' || event.myRsvpStatus === 'waitlisted') return <StatusPill status={event.myRsvpStatus} />;
  if (new Date(event.endsAt) < new Date()) return <Pill tone="muted">Ended</Pill>;
  if (event.seatsLeft === 0) return <Pill tone="danger">Full</Pill>;
  if (event.seatsLeft !== null && event.seatsLeft <= 3) return <Pill tone="wait">{event.seatsLeft} left</Pill>;
  return <Pill tone="accent">Open</Pill>;
}
