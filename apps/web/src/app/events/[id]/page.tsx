import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Capacity } from '@/components/capacity';
import { CancelEventButton } from '@/components/cancel-event-button';
import { LocalTime } from '@/components/local-time';
import { RsvpButton } from '@/components/rsvp-button';
import { api, currentUser } from '@/lib/api';

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

export default async function EventPage({ params }: PageProps<'/events/[id]'>) {
  const { id } = await params;
  const client = await api();
  const [event, user, attendees] = await Promise.all([
    getEvent(id),
    currentUser(),
    client.GET('/api/v1/events/{id}/attendees', { params: { path: { id }, query: { limit: 24 } } }),
  ]);

  const isHost = user?.id === event.host.id;
  const started = new Date(event.startsAt) <= new Date();
  const full = event.seatsLeft === 0;
  const people = attendees.data?.items ?? [];

  return (
    <article className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">
          ← All events
        </Link>
        <header className="space-y-3">
          {event.status === 'draft' && (
            <p className="inline-block rounded-full bg-wait-soft px-3 py-1 text-xs font-semibold text-wait">
              Draft — only you can see this
            </p>
          )}
          <h1 className="font-display text-4xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-muted">Hosted by {isHost ? 'you' : event.host.name}</p>
        </header>

        <dl className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Starts</dt>
            <dd className="mt-1 font-semibold">
              <LocalTime iso={event.startsAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Ends</dt>
            <dd className="mt-1 font-semibold">
              <LocalTime iso={event.endsAt} />
            </dd>
          </div>
          {event.location && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Where</dt>
              <dd className="mt-1 font-semibold">{event.location}</dd>
            </div>
          )}
        </dl>

        {event.description && (
          <section>
            <h2 className="mb-2 font-display text-xl font-semibold">About</h2>
            <p className="max-w-prose whitespace-pre-line leading-relaxed">{event.description}</p>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">
            Who’s going <span className="text-muted">· {attendees.data?.total ?? event.goingCount}</span>
          </h2>
          {people.length === 0 ? (
            <p className="text-muted">No one yet. Be the first.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {people.map((p) => (
                <li key={p.userId} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm">
                  <span
                    aria-hidden
                    className="grid size-7 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent"
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  {p.name}
                </li>
              ))}
              {attendees.data?.nextCursor && (
                <li className="self-center text-sm text-muted">
                  +{(attendees.data.total ?? 0) - people.length} more
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <Capacity going={event.goingCount} capacity={event.capacity} />
          <RsvpButton
            eventId={event.id}
            status={event.myRsvpStatus ?? null}
            full={full}
            signedIn={!!user}
            closed={started || event.status !== 'published'}
          />
        </div>
        {isHost && (
          <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold">You’re hosting</p>
            <Link
              href={`/events/${event.id}/edit`}
              className="block rounded-lg border border-line px-4 py-2.5 text-center font-semibold hover:border-accent"
            >
              Edit event
            </Link>
            <CancelEventButton eventId={event.id} />
          </div>
        )}
      </aside>
    </article>
  );
}
