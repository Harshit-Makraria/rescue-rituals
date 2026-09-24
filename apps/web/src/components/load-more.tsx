'use client';

import { useState, useTransition } from 'react';
import { loadMoreEvents } from '@/app/actions';
import type { EventItem } from '@/lib/api';
import { EventCard } from './event-card';

/** Cursor pagination: fetches the next page through a server action and appends it. */
export function LoadMore({ initialCursor, q }: { initialCursor: string | null; q: string }) {
  const [items, setItems] = useState<EventItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  return (
    <>
      {items.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      {cursor && (
        <div className="md:col-span-2">
          <button
            onClick={() =>
              startTransition(async () => {
                const page = await loadMoreEvents(cursor, q);
                setItems((prev) => [...prev, ...page.items]);
                setCursor(page.nextCursor);
              })
            }
            disabled={pending}
            className="w-full rounded-lg border border-line bg-surface py-3 font-semibold hover:border-accent disabled:opacity-60"
          >
            {pending ? 'Loading…' : 'Load more events'}
          </button>
        </div>
      )}
    </>
  );
}
