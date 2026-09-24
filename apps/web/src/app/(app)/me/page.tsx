import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard, EventTableHead } from '@/components/event-card';
import { Avatar, Card, Icon } from '@/components/ui';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'My events' };

const TABS = [
  { id: 'going', label: 'Going', icon: 'check' },
  { id: 'waitlisted', label: 'Waitlisted', icon: 'clock' },
  { id: 'hosting', label: 'Hosting', icon: 'ticket' },
  { id: 'past', label: 'Past', icon: 'calendar' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const EMPTY: Record<Tab, string> = {
  going: 'No upcoming RSVPs',
  waitlisted: 'You’re not on any waitlists',
  hosting: 'You aren’t hosting anything yet',
  past: 'No past events yet',
};

export default async function MyEventsPage({ searchParams }: PageProps<'/me'>) {
  const { tab: raw } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : 'going';
  const client = await api();
  const [me, rsvps, hosting] = await Promise.all([
    client.GET('/api/v1/users/me'),
    client.GET('/api/v1/users/me/rsvps'),
    client.GET('/api/v1/users/me/events'),
  ]);

  const now = Date.now();
  const mine = rsvps.data?.items ?? [];
  const upcoming = mine.filter((e) => new Date(e.endsAt).getTime() > now);
  const lists: Record<Tab, typeof mine> = {
    going: upcoming.filter((e) => e.myRsvpStatus === 'going'),
    waitlisted: upcoming.filter((e) => e.myRsvpStatus === 'waitlisted'),
    hosting: hosting.data?.items ?? [],
    past: mine.filter((e) => new Date(e.endsAt).getTime() <= now),
  };
  const items = lists[tab];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {me.data && <Avatar name={me.data.name} size={52} />}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">My events</h1>
            {me.data && (
              <p className="text-muted">
                Hosting {me.data.hostingCount} · Going to {me.data.goingCount}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-card hover:opacity-90"
        >
          <Icon name="plus" size={17} /> New event
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="h-fit p-2">
          <nav aria-label="Filter my events" className="flex gap-1 overflow-x-auto lg:flex-col">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={`/me?tab=${t.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    active ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:bg-raised hover:text-ink'
                  }`}
                >
                  <Icon name={t.icon} size={17} />
                  <span className="flex-1">{t.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      active ? 'bg-accent text-accent-ink' : 'bg-raised text-muted'
                    }`}
                  >
                    {lists[t.id].length}
                  </span>
                </Link>
              );
            })}
          </nav>
        </Card>

        <Card>
          {items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Icon name="calendar" size={26} />
              </span>
              <p className="mt-4 text-lg font-bold">{EMPTY[tab]}</p>
              <Link href={tab === 'hosting' ? '/events/new' : '/'} className="mt-2 inline-block font-semibold text-accent">
                {tab === 'hosting' ? 'Create an event' : 'Discover events'}
              </Link>
            </div>
          ) : (
            <div className="pt-4">
              <EventTableHead />
              {items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
