import Link from 'next/link';
import type { EventItem } from '@/lib/api';
import { LocalTime } from './local-time';
import { AvatarStack, Icon } from './ui';

/**
 * Hero card for the most popular upcoming event (Discover reference). No photos
 * yet, so the visual weight comes from a big calendar tile and a soft grid.
 */
export function FeaturedEvent({ event }: { event: EventItem }) {
  const d = new Date(event.startsAt);
  return (
    <section className="relative overflow-hidden rounded-3xl bg-accent text-accent-ink shadow-card">
      <div
        aria-hidden
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 85% 20%, rgb(255 255 255 / 0.5), transparent 40%), linear-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.12) 1px, transparent 1px)',
          backgroundSize: 'auto, 32px 32px, 32px 32px',
        }}
      />
      <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0 space-y-4">
          <p className="text-sm font-semibold opacity-80">Most popular right now</p>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{event.title}</h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-90">
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={16} />
              <LocalTime iso={event.startsAt} mode="full" />
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <Icon name="pin" size={16} />
                {event.location}
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link
              href={`/events/${event.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#1f6bff] shadow-sm hover:bg-white/90"
            >
              {event.myRsvpStatus === 'going' ? 'You’re going · View' : event.seatsLeft === 0 ? 'Join waitlist' : 'RSVP now'}
              <Icon name="arrow" size={16} />
            </Link>
            <span className="flex items-center gap-2 text-sm font-medium">
              <AvatarStack names={event.attendeePreview} total={event.goingCount} size={28} />
              {event.goingCount > 0 && <span className="opacity-90">{event.goingCount} going</span>}
            </span>
          </div>
        </div>

        <div className="hidden rotate-3 rounded-2xl bg-white/95 p-1.5 shadow-xl md:block" suppressHydrationWarning>
          <div className="w-36 overflow-hidden rounded-xl bg-white text-center text-[#111827]">
            <div className="bg-[#e5484d] py-2 text-sm font-bold uppercase tracking-widest text-white" suppressHydrationWarning>
              {d.toLocaleString(undefined, { month: 'long' })}
            </div>
            <div className="py-3 text-6xl font-extrabold leading-none" suppressHydrationWarning>
              {d.getDate()}
            </div>
            <div className="pb-3 text-sm font-semibold text-[#6b7280]" suppressHydrationWarning>
              {d.toLocaleString(undefined, { weekday: 'long' })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
