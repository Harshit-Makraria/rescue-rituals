import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventForm } from '@/components/event-form';
import { Card, Icon } from '@/components/ui';
import { api, currentUser } from '@/lib/api';

export const metadata: Metadata = { title: 'Edit event' };

export default async function EditEventPage({ params }: PageProps<'/events/[id]/edit'>) {
  const { id } = await params;
  const client = await api();
  const [{ data: event }, user] = await Promise.all([
    client.GET('/api/v1/events/{id}', { params: { path: { id } } }),
    currentUser(),
  ]);
  if (!event) notFound();

  // UI check for a friendly page; the API enforces ownership regardless.
  if (event.host.id !== user?.id) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Only the host can edit this event</h1>
        <Link href={`/events/${id}`} className="mt-4 inline-block font-semibold text-accent">
          Back to the event
        </Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl p-6 sm:p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Edit Event</h1>
          <p className="mt-1 text-sm text-muted">People going are notified if you change the time or location.</p>
        </div>
        <Link
          href={`/events/${id}`}
          aria-label="Close"
          className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:text-ink"
        >
          <Icon name="x" size={16} />
        </Link>
      </header>
      <EventForm event={event} />
    </Card>
  );
}
