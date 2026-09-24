import Link from 'next/link';
import { EventCard, EventTableHead } from '@/components/event-card';
import { FeaturedEvent } from '@/components/featured-event';
import { LoadMore } from '@/components/load-more';
import { DateStub, LocalTime } from '@/components/local-time';
import { StatusPill } from '@/components/status-pill';
import { Card, Icon } from '@/components/ui';
import { api, currentUser } from '@/lib/api';

const RANGES = [
  { id: 'all', label: 'All upcoming', hours: null },
  { id: '24h', label: 'Next 24 hours', hours: 24 },
  { id: 'week', label: 'Next 7 days', hours: 24 * 7 },
  { id: 'month', label: 'Next 30 days', hours: 24 * 30 },
] as const;

export default async function DiscoverPage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const range = RANGES.find((r) => r.id === params.range) ?? RANGES[0];
  const to = range.hours ? new Date(Date.now() + range.hours * 3_600_000).toISOString() : undefined;

  const [client, user] = [await api(), await currentUser()];
  const [list, mine] = await Promise.all([
    client.GET('/api/v1/events', { params: { query: { q: query || undefined, to } } }),
    user ? client.GET('/api/v1/users/me/rsvps') : Promise.resolve(null),
  ]);
  const { data, error } = list;
  const next = mine?.data?.items.find((e) => new Date(e.startsAt) > new Date());

  // Feature the most popular event on the first page (soonest wins a tie).
  const featured =
    !query && data?.items.length
      ? [...data.items].sort((a, b) => b.goingCount - a.goingCount || a.startsAt.localeCompare(b.startsAt))[0]
      : null;

  const chipHref = (id: string) => {
    const sp = new URLSearchParams();
    if (query) sp.set('q', query);
    if (id !== 'all') sp.set('range', id);
    const s = sp.toString();
    return s ? `/?${s}` : '/';
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{query ? `Results for “${query}”` : 'Discover'}</h1>
          <p className="mt-1 text-muted">
            {query ? (
              <Link href="/" className="font-semibold text-accent">
                Clear search
              </Link>
            ) : (
              'RSVP in one tap. Full? Join the waitlist and we’ll move you up when a seat opens.'
            )}
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-card hover:opacity-90"
        >
          <Icon name="plus" size={17} /> New event
        </Link>
      </header>

      {featured && (
        <div className={`grid gap-5 ${next ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : ''}`}>
          <FeaturedEvent event={featured} />
          {next && (
            <Card className="flex flex-col p-5">
              <p className="text-sm font-semibold text-muted">Your next event</p>
              <Link href={`/events/${next.id}`} className="group mt-4 flex items-center gap-3">
                <DateStub iso={next.startsAt} />
                <div className="min-w-0">
                  <p className="truncate font-bold group-hover:text-accent">{next.title}</p>
                  <p className="text-sm text-muted">
                    <LocalTime iso={next.startsAt} mode="time" />
                  </p>
                </div>
              </Link>
              <div className="mt-4">{next.myRsvpStatus && <StatusPill status={next.myRsvpStatus} />}</div>
              <Link href="/me" className="mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-accent">
                All my events <Icon name="arrow" size={15} />
              </Link>
            </Card>
          )}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="mr-auto text-lg font-bold">Upcoming events</h2>
          <nav aria-label="Filter by date" className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <Link
                key={r.id}
                href={chipHref(r.id)}
                aria-current={r.id === range.id ? 'true' : undefined}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  r.id === range.id
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-muted hover:border-accent hover:text-ink'
                }`}
              >
                {r.label}
              </Link>
            ))}
          </nav>
        </div>

        {error || !data ? (
          <p role="alert" className="m-5 rounded-xl bg-danger-soft px-4 py-3 text-danger">
            Couldn’t load events. The API may be waking up; refresh in a few seconds.
          </p>
        ) : data.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon name="calendar" size={26} />
            </span>
            <p className="mt-4 text-lg font-bold">{query ? `No events match “${query}”` : 'Nothing scheduled in this range'}</p>
            <p className="mt-1 text-muted">
              {user ? (
                <Link href="/events/new" className="font-semibold text-accent">
                  Host an event
                </Link>
              ) : (
                'Try a wider date range, or sign up to host one.'
              )}
            </p>
          </div>
        ) : (
          <div className="pt-3">
            <EventTableHead />
            {data.items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
            <LoadMore initialCursor={data.nextCursor} q={query} to={to} />
          </div>
        )}
      </Card>
    </div>
  );
}
