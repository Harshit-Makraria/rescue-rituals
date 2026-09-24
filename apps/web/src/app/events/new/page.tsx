import type { Metadata } from 'next';
import { EventForm } from '@/components/event-form';

export const metadata: Metadata = { title: 'Host an event' };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Host an event</h1>
        <p className="mt-1 text-muted">Set a capacity and we’ll handle the waitlist for you.</p>
      </header>
      <div className="rounded-xl border border-line bg-surface p-5">
        <EventForm />
      </div>
    </div>
  );
}
