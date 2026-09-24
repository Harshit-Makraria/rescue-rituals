import type { Metadata } from 'next';
import Link from 'next/link';
import { markAllNotificationsRead } from '@/app/actions';
import { LocalTime } from '@/components/local-time';
import { NotificationLink } from '@/components/notification-link';
import { Card, Icon } from '@/components/ui';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'Notifications' };

const TYPE = {
  event_reminder: { icon: 'bell', tone: 'bg-accent-soft text-accent' },
  new_attendee: { icon: 'users', tone: 'bg-violet-soft text-violet' },
  waitlist_promoted: { icon: 'check', tone: 'bg-going-soft text-going' },
  event_updated: { icon: 'edit', tone: 'bg-wait-soft text-wait' },
  event_cancelled: { icon: 'x', tone: 'bg-danger-soft text-danger' },
} as const;

export default async function NotificationsPage() {
  const client = await api();
  const { data } = await client.GET('/api/v1/users/me/notifications');
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-muted">Reminders, waitlist updates and changes to events you’re going to.</p>
        </div>
        {(data?.unreadCount ?? 0) > 0 && (
          <form action={markAllNotificationsRead}>
            <button className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-accent">
              Mark all as read
            </button>
          </form>
        )}
      </header>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon name="bell" size={26} />
            </span>
            <p className="mt-4 text-lg font-bold">You’re all caught up</p>
            <p className="mt-1 text-muted">
              RSVP to an event and you’ll get a reminder before it starts.{' '}
              <Link href="/" className="font-semibold text-accent">
                Discover events
              </Link>
            </p>
          </div>
        ) : (
          <ul>
            {items.map((n) => {
              const t = TYPE[n.type];
              return (
                <li key={n.id} className="border-b border-line last:border-b-0">
                  <NotificationLink id={n.id} unread={!n.readAt} href={n.eventId ? `/events/${n.eventId}` : '/notifications'}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.tone}`}>
                      <Icon name={t.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block ${n.readAt ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                      <span className="block text-sm text-muted">{n.body}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      <LocalTime iso={n.createdAt} mode="day" />
                    </span>
                    {!n.readAt && <span className="size-2.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                  </NotificationLink>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
