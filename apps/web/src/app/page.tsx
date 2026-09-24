import Link from 'next/link';
import { EventCard } from '@/components/event-card';
import { LoadMore } from '@/components/load-more';
import { api, currentUser } from '@/lib/api';

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';
  const [client, user] = [await api(), await currentUser()];
  const { data, error } = await client.GET('/api/v1/events', { params: { query: { q: query || undefined } } });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Upcoming</p>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Events worth showing up for</h1>
        <p className="max-w-xl text-lg text-muted">
          RSVP in one tap. If it’s full, join the waitlist and we’ll move you up automatically when a seat opens.
        </p>
      </section>

      <form role="search" className="flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">
          Search events
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="Search by title or place"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 focus:border-accent focus:outline-none"
        />
        <button className="rounded-lg border border-line bg-surface px-4 font-semibold hover:border-accent">Search</button>
      </form>

      {error || !data ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-danger">
          Couldn’t load events right now. The API may be waking up — refresh in a few seconds.
        </p>
      ) : data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-xl font-semibold">{query ? `No events match “${query}”` : 'No upcoming events yet'}</p>
          <p className="mt-2 text-muted">
            {user ? (
              <Link href="/events/new" className="font-semibold text-accent underline">
                Host the first one
              </Link>
            ) : (
              'Check back soon, or sign up to host one.'
            )}
          </p>
        </div>
      ) : (
        <section aria-label="Events" className="grid gap-3 md:grid-cols-2">
          {data.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          <LoadMore initialCursor={data.nextCursor} q={query} />
        </section>
      )}
    </div>
  );
}
