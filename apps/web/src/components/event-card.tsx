import Link from 'next/link';
import type { EventItem } from '@/lib/api';
import { Capacity } from './capacity';
import { DateStub, LocalTime } from './local-time';
import { StatusPill } from './status-pill';

export function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <DateStub iso={event.startsAt} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-accent">{event.title}</h3>
          {event.myRsvpStatus && event.myRsvpStatus !== 'cancelled' && <StatusPill status={event.myRsvpStatus} />}
          {event.status === 'draft' && (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">Draft</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          <LocalTime iso={event.startsAt} mode="time" />
          {event.location && <> · {event.location}</>} · by {event.host.name}
        </p>
        <div className="mt-3">
          <Capacity going={event.goingCount} capacity={event.capacity} />
        </div>
      </div>
    </Link>
  );
}
