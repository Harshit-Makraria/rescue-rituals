'use client';

import { useState, useTransition } from 'react';
import { cancelEvent } from '@/app/actions';

/** Two-step confirm built into the page (no browser confirm() dialogs). */
export function CancelEventButton({ eventId }: { eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full rounded-xl px-4 py-2.5 font-semibold text-danger hover:bg-danger-soft"
      >
        Cancel event
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl bg-danger-soft p-3">
      <p className="text-sm text-danger">Cancel this event for everyone? Attendees will see it as cancelled.</p>
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await cancelEvent(eventId);
              if (res?.error) setError(res.error);
            })
          }
          className="flex-1 rounded-xl bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Cancelling…' : 'Yes, cancel it'}
        </button>
        <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold">
          Keep it
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
