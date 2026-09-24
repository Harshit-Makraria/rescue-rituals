import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard } from '@/components/event-card';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'My events' };

const TABS = [
  { id: 'going', label: 'Going & waitlisted' },
  { id: 'hosting', label: 'Hosting' },
] as const;

export default async function MyEventsPage({ searchParams }: PageProps<'/me'>) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === 'hosting' ? 'hosting' : 'going';
  const client = await api();
  const [me, list] = await Promise.all([
    client.GET('/api/v1/users/me'),
    tab === 'hosting' ? client.GET('/api/v1/users/me/events') : client.GET('/api/v1/users/me/rsvps'),
  ]);
  const items = list.data?.items ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Hi, {me.data?.name.split(' ')[0] ?? 'there'}</h1>
        {me.data && (
          <p className="mt-1 text-muted">
            Hosting {me.data.hostingCount} · Going to {me.data.goingCount}
          </p>
        )}
      </header>

      <nav className="flex gap-1 border-b border-line" aria-label="My events">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/me?tab=${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
            className={
              tab === t.id
                ? '-mb-px border-b-2 border-accent px-3 py-2 font-semibold'
                : 'px-3 py-2 font-semibold text-muted hover:text-ink'
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-xl font-semibold">
            {tab === 'hosting' ? 'You aren’t hosting anything yet' : 'No RSVPs yet'}
          </p>
          <Link href={tab === 'hosting' ? '/events/new' : '/'} className="mt-2 inline-block font-semibold text-accent underline">
            {tab === 'hosting' ? 'Host an event' : 'Browse upcoming events'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
