import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CancelEventButton } from '@/components/cancel-event-button';
import { Capacity } from '@/components/capacity';
import { CalendarMenu, ShareButton } from '@/components/event-actions';
import { DateStub, LocalTime } from '@/components/local-time';
import { RsvpButton } from '@/components/rsvp-button';
import { EventStatus } from '@/components/status-pill';
import { Avatar, Card, Icon } from '@/components/ui';
import { API_URL, api, currentUser } from '@/lib/api';
import { categoryOf } from '@/lib/categories';

async function getEvent(id: string) {
  const client = await api();
  const { data, response } = await client.GET('/api/v1/events/{id}', { params: { path: { id } } });
  if (response.status === 404 || response.status === 400) notFound();
  if (!data) throw new Error('Could not load this event.');
  return data;
}

export async function generateMetadata({ params }: PageProps<'/events/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  return { title: event.title, description: event.description ?? undefined };
}

function reminderLabel(minutes: number | null) {
  if (!minutes) return 'No reminder';
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? '' : 's'} before`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'} before`;
  return `${minutes} minutes before`;
}

/** Google Calendar "template" link (times in UTC, basic format). */
function googleCalendarUrl(e: { title: string; startsAt: string; endsAt: string; description: string | null; location: string | null }) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const sp = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${fmt(e.startsAt)}/${fmt(e.endsAt)}`,
    details: e.description ?? '',
    location: e.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${sp}`;
}

export default async function EventPage({ params, searchParams }: PageProps<'/events/[id]'>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const client = await api();
  const [event, user, attendees] = await Promise.all([
    getEvent(id),
    currentUser(),
    client.GET('/api/v1/events/{id}/attendees', { params: { path: { id }, query: { limit: 24 } } }),
  ]);

  const isHost = user?.id === event.host.id;
  const guests = isHost ? (await client.GET('/api/v1/events/{id}/guests', { params: { path: { id } } })).data : null;
  const category = categoryOf(event.category);
  const started = new Date(event.startsAt) <= new Date();
  const people = attendees.data?.items ?? [];
  const total = attendees.data?.total ?? event.goingCount;
  const joined = event.myRsvpStatus === 'going' || event.myRsvpStatus === 'waitlisted';
  // Invite link (?join=1): show a banner with a one-tap Join, unless there's nothing to join.
  const invited = query.join === '1' && !isHost && !joined && !started && event.status === 'published';
  const inviteUrl = `/events/${event.id}?join=1`;

  const details = [
    { icon: 'calendar' as const, label: 'Date', value: <LocalTime iso={event.startsAt} mode="weekday-date" /> },
    {
      icon: 'clock' as const,
      label: 'Time',
      value: (
        <>
          <LocalTime iso={event.startsAt} mode="time" /> – <LocalTime iso={event.endsAt} mode="time" />
          <span className="block text-xs font-normal text-muted">Shown in your timezone</span>
        </>
      ),
    },
    { icon: 'pin' as const, label: 'Location', value: event.location || 'To be announced' },
    { icon: 'bell' as const, label: 'Reminder', value: reminderLabel(event.reminderMinutes) },
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          Discover
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-ink">{event.title}</span>
      </nav>

      {invited && (
        <Card className="border-accent/40 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink">
              <Icon name="ticket" size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">You’re invited to {event.title}</p>
              <p className="text-sm text-muted">
                {event.host.name} is hosting ·{' '}
                {event.seatsLeft === 0
                  ? 'it’s full right now, so you’ll join the waitlist'
                  : event.seatsLeft === null
                    ? 'open to everyone'
                    : `${event.seatsLeft} seat${event.seatsLeft === 1 ? '' : 's'} left`}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <RsvpButton
                eventId={event.id}
                status={event.myRsvpStatus ?? null}
                full={event.seatsLeft === 0}
                signedIn={!!user}
                closed={false}
                seatsLeft={event.seatsLeft}
                myRsvp={event.myRsvp}
                returnTo={inviteUrl}
              />
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="relative bg-accent-soft px-6 py-7 sm:px-8">
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'linear-gradient(90deg, transparent, black 70%)',
            }}
          />
          <div className="relative flex flex-wrap items-center gap-5">
            <DateStub iso={event.startsAt} size="lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <EventStatus event={event} />
                <span className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                  <span className={`size-1.5 rounded-full ${category.dot}`} aria-hidden />
                  {category.label}
                </span>
                {event.status === 'draft' && <span className="text-sm text-muted">Only you can see this</span>}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{event.title}</h1>
              <p className="flex items-center gap-2 text-sm text-muted">
                <Avatar name={event.host.name} size={24} />
                Hosted by <span className="font-semibold text-ink">{isHost ? 'you' : event.host.name}</span>
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="p-6">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {details.map((d) => (
                <div key={d.label} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-accent">
                    <Icon name={d.icon} />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{d.label}</dt>
                    <dd className="mt-0.5 font-semibold">{d.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold">About this event</h2>
            <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-ink/90">
              {event.description || 'The host hasn’t added a description yet.'}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Who’s going <span className="font-medium text-muted">· {total}</span>
              </h2>
            </div>
            {people.length === 0 ? (
              <p className="mt-3 text-muted">No one yet. Be the first.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {people.map((p) => (
                  <li key={p.userId} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                    <Avatar name={p.name} size={34} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {p.name}
                        {p.plusOnes > 0 && <span className="ml-1.5 font-medium text-muted">+{p.plusOnes}</span>}
                      </p>
                      <p className="text-xs text-muted">
                        Joined <LocalTime iso={p.joinedAt} mode="day" />
                      </p>
                    </div>
                  </li>
                ))}
                {attendees.data?.nextCursor && (
                  <li className="flex items-center px-3 text-sm font-semibold text-muted">+{total - people.length} more</li>
                )}
              </ul>
            )}
          </Card>
        </div>

        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-5 p-5">
            <div>
              <p className="text-sm font-semibold text-muted">Attendance</p>
              <div className="mt-3">
                <Capacity going={event.goingCount} capacity={event.capacity} />
              </div>
            </div>
            <RsvpButton
              eventId={event.id}
              status={event.myRsvpStatus ?? null}
              full={event.seatsLeft === 0}
              signedIn={!!user}
              closed={started || event.status !== 'published'}
              seatsLeft={event.seatsLeft}
              myRsvp={event.myRsvp}
              returnTo={inviteUrl}
            />
            {event.hasMeetingLink &&
              (event.meetingUrl ? (
                <a
                  href={event.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-going/30 bg-going-soft px-3 py-2.5 text-sm"
                >
                  <Icon name="external" size={16} className="shrink-0 text-going" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-going">Join online</span>
                    <span className="block truncate text-xs text-muted">{event.meetingUrl}</span>
                  </span>
                </a>
              ) : (
                <p className="flex items-start gap-2 rounded-xl bg-raised px-3 py-2.5 text-xs text-muted">
                  <Icon name="external" size={15} className="mt-0.5 shrink-0" />
                  This event has an online link. It’s shared with people who are going.
                </p>
              ))}
            {event.reminderMinutes && !started && (
              <p className="flex items-start gap-2 rounded-xl bg-raised px-3 py-2.5 text-xs text-muted">
                <Icon name="bell" size={15} className="mt-0.5 shrink-0" />
                Going? You’ll get a reminder {reminderLabel(event.reminderMinutes)} the event.
              </p>
            )}
          </Card>

          {event.status === 'published' && (
            <div className="flex gap-2">
              <CalendarMenu icsUrl={`${API_URL}/api/v1/events/${event.id}/calendar.ics`} googleUrl={googleCalendarUrl(event)} />
              <ShareButton title={event.title} eventId={event.id} />
            </div>
          )}

          {isHost && (
            <Card className="space-y-2 p-5">
              <p className="text-sm font-semibold text-muted">You’re hosting</p>
              <Link
                href={`/events/${event.id}/edit`}
                className="flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 font-semibold hover:border-accent hover:text-accent"
              >
                <Icon name="edit" size={16} /> Edit event
              </Link>
              <CancelEventButton eventId={event.id} />
            </Card>
          )}
        </aside>
      </div>

      {isHost && guests && (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div className="mr-auto">
              <h2 className="text-lg font-bold">Guest list</h2>
              <p className="text-sm text-muted">
                {guests.goingRsvps} RSVP{guests.goingRsvps === 1 ? '' : 's'} · {guests.goingSeats} people going
                {guests.waitlisted > 0 && ` · ${guests.waitlisted} waitlisted`} · only you can see contact details
              </p>
            </div>
            {guests.items.length > 0 && (
              <a
                href={`/events/${event.id}/guests.csv`}
                className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent"
              >
                <Icon name="external" size={15} /> Export CSV
              </a>
            )}
          </div>
          {guests.items.length === 0 ? (
            <p className="px-5 py-8 text-center text-muted">No RSVPs yet. Share your invite link to get people in.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-5 py-3 font-semibold">Guest</th>
                    <th className="px-3 py-3 font-semibold">Phone</th>
                    <th className="px-3 py-3 font-semibold">Party</th>
                    <th className="px-3 py-3 font-semibold">Note</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.items.map((g, i) => (
                    <tr key={g.userId} className="border-t border-line align-top">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={g.name} size={30} />
                          <div className="min-w-0">
                            <p className="font-semibold">{g.name}</p>
                            <p className="text-xs text-muted">{g.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">{g.phone ?? <span className="text-muted">—</span>}</td>
                      <td className="px-3 py-3">{g.plusOnes ? `1 + ${g.plusOnes}` : '1'}</td>
                      <td className="max-w-64 px-3 py-3 text-muted">{g.note ?? '—'}</td>
                      <td className="px-5 py-3">
                        {g.status === 'going' ? (
                          <span className="rounded-md bg-going-soft px-2 py-0.5 text-xs font-semibold text-going">Going</span>
                        ) : (
                          <span className="rounded-md bg-wait-soft px-2 py-0.5 text-xs font-semibold text-wait">
                            Waitlist #{i + 1 - guests.goingRsvps}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
