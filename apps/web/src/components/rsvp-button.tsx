'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { setRsvp } from '@/app/actions';
import type { RsvpStatus } from '@/lib/api';

type Props = {
  eventId: string;
  status: RsvpStatus | null;
  full: boolean;
  signedIn: boolean;
  closed: boolean;
};

/**
 * Optimistic RSVP: the button flips instantly, then reconciles with the server.
 * If the last seat went to someone else a moment earlier, the server answers
 * `waitlisted` and we say so rather than pretending you got in.
 */
export function RsvpButton({ eventId, status, full, signedIn, closed }: Props) {
  const [confirmed, setConfirmed] = useState<RsvpStatus | null>(status);
  const [optimistic, setOptimistic] = useOptimistic(confirmed);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (closed) {
    return <p className="rounded-xl bg-raised px-4 py-3 text-sm text-muted">RSVPs are closed for this event.</p>;
  }
  if (!signedIn) {
    return (
      <Link
        href={`/login?next=/events/${eventId}`}
        className="block rounded-xl bg-accent px-4 py-3 text-center font-semibold text-accent-ink hover:opacity-90"
      >
        Log in to RSVP
      </Link>
    );
  }

  const active = optimistic === 'going' || optimistic === 'waitlisted';

  function toggle() {
    const joining = !active;
    setMessage(null);
    startTransition(async () => {
      setOptimistic(joining ? (full ? 'waitlisted' : 'going') : 'cancelled');
      const res = await setRsvp(eventId, joining);
      if (!res.ok) {
        setMessage({ tone: 'error', text: res.error });
        return;
      }
      setConfirmed(res.result.status);
      if (joining && res.result.status === 'waitlisted') {
        setMessage({
          tone: 'warn',
          text: full
            ? "You're on the waitlist. We'll move you up automatically if a seat opens."
            : 'The last seat was just taken, so you’re first in line on the waitlist.',
        });
      } else if (joining) {
        setMessage({ tone: 'ok', text: "You're going! See you there." });
      } else {
        setMessage({ tone: 'ok', text: 'RSVP cancelled. Your seat went to the next person in line.' });
      }
    });
  }

  const label = pending
    ? active
      ? 'Saving…'
      : 'Cancelling…'
    : optimistic === 'going'
      ? 'Cancel my RSVP'
      : optimistic === 'waitlisted'
        ? 'Leave waitlist'
        : full
          ? 'Join waitlist'
          : 'RSVP — I’m going';

  return (
    <div className="space-y-3">
      {optimistic === 'going' && (
        <p className="rounded-xl bg-going-soft px-4 py-3 font-semibold text-going">✓ You’re going</p>
      )}
      {optimistic === 'waitlisted' && (
        <p className="rounded-xl bg-wait-soft px-4 py-3 font-semibold text-wait">You’re on the waitlist</p>
      )}
      <button
        onClick={toggle}
        disabled={pending}
        className={
          active
            ? 'w-full rounded-xl border border-line bg-surface px-4 py-3 font-semibold text-muted hover:text-danger disabled:opacity-60'
            : 'w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60'
        }
      >
        {label}
      </button>
      <p
        aria-live="polite"
        className={
          message?.tone === 'error' ? 'text-sm text-danger' : message?.tone === 'warn' ? 'text-sm text-wait' : 'text-sm text-muted'
        }
      >
        {message?.text}
      </p>
    </div>
  );
}
