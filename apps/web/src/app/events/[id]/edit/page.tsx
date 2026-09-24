import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventForm } from '@/components/event-form';
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
      <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Only the host can edit this event</h1>
        <Link href={`/events/${id}`} className="mt-4 inline-block font-semibold text-accent underline">
          Back to the event
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link href={`/events/${id}`} className="text-sm font-semibold text-muted hover:text-ink">
          ← Back to event
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Edit event</h1>
      </header>
      <div className="rounded-xl border border-line bg-surface p-5">
        <EventForm event={event} />
      </div>
    </div>
  );
}
