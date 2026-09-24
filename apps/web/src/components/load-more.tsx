'use client';

import { useState, useTransition } from 'react';
import { loadMoreEvents } from '@/app/actions';
import type { EventItem } from '@/lib/api';
import { EventCard } from './event-card';

/** Cursor pagination: fetches the next page through a server action and appends it. */
export function LoadMore({ initialCursor, q, to }: { initialCursor: string | null; q: string; to?: string }) {
  const [items, setItems] = useState<EventItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  return (
    <>
      {items.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      {cursor && (
        <div className="border-t border-line p-4">
          <button
            onClick={() =>
              startTransition(async () => {
                const page = await loadMoreEvents(cursor, q, to);
                setItems((prev) => [...prev, ...page.items]);
                setCursor(page.nextCursor);
              })
            }
            disabled={pending}
            className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted hover:border-accent hover:text-ink disabled:opacity-60"
          >
            {pending ? 'Loading…' : 'Load more events'}
          </button>
        </div>
      )}
    </>
  );
}
