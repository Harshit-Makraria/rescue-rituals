import type { Metadata } from 'next';
import Link from 'next/link';
import { EventForm } from '@/components/event-form';
import { Card, Icon } from '@/components/ui';

export const metadata: Metadata = { title: 'Create event' };

export default function NewEventPage() {
  return (
    <Card className="mx-auto max-w-2xl p-6 sm:p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Create Event</h1>
          <p className="mt-1 text-sm text-muted">Set a capacity and we’ll run the waitlist for you.</p>
        </div>
        <Link href="/" aria-label="Close" className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:text-ink">
          <Icon name="x" size={16} />
        </Link>
      </header>
      <EventForm />
    </Card>
  );
}
