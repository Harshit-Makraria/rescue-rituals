import Link from 'next/link';
import type { EventItem } from '@/lib/api';
import { categoryOf } from '@/lib/categories';
import { DateStub, LocalTime } from './local-time';
import { EventStatus } from './status-pill';
import { AvatarStack, Icon, ProgressRing } from './ui';

/** Column header for the event table (Projects reference). */
export function EventTableHead() {
  return (
    <div className="hidden grid-cols-[minmax(0,1fr)_150px_140px_110px_100px] gap-4 border-b border-line px-5 pb-3 text-xs font-semibold uppercase tracking-wider text-muted xl:grid">
      <span>Event</span>
      <span>When</span>
      <span>Attendees</span>
      <span>Capacity</span>
      <span>Status</span>
    </div>
  );
}

/** One event as a table row on desktop, a compact card on mobile. */
export function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group grid gap-3 border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-raised xl:grid-cols-[minmax(0,1fr)_150px_140px_110px_100px] xl:items-center xl:gap-4"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <DateStub iso={event.startsAt} />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate font-semibold group-hover:text-accent">{event.title}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className={`size-1.5 rounded-full ${categoryOf(event.category).dot}`} aria-hidden />
            {categoryOf(event.category).label}
            {event.hasMeetingLink && <span className="rounded bg-raised px-1.5 py-px">Online</span>}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
            <Icon name="pin" size={14} className="shrink-0" />
            <span className="truncate">{event.location || 'Location TBA'}</span>
            <span className="hidden sm:inline">· by {event.host.name}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 xl:contents">
        <span className="flex items-center gap-1.5 text-sm text-muted xl:text-ink">
          <Icon name="clock" size={15} className="text-muted" />
          <span>
            <LocalTime iso={event.startsAt} mode="day" />
            <span className="block text-xs text-muted">
              <LocalTime iso={event.startsAt} mode="time" />
            </span>
          </span>
        </span>
        <AvatarStack names={event.attendeePreview} total={event.goingCount} size={26} />
        <ProgressRing value={event.goingCount} max={event.capacity} size={30} />
        <span className="ml-auto xl:ml-0">
          <EventStatus event={event} />
        </span>
      </div>
    </Link>
  );
}
