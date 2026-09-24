'use client';

import Link from 'next/link';
import { useEffect, useOptimistic, useState, useTransition } from 'react';
import { setRsvp, type RsvpDetails } from '@/app/actions';
import type { RsvpStatus } from '@/lib/api';

type MyRsvp = { plusOnes: number; phone: string | null; note: string | null };

type Props = {
  eventId: string;
  status: RsvpStatus | null;
  full: boolean;
  signedIn: boolean;
  closed: boolean;
  /** Seats left, so the form can warn when a party won't fit (null = unlimited). */
  seatsLeft?: number | null;
  /** Your saved details, to prefill the form. */
  myRsvp?: MyRsvp | null;
  /** Where to come back to after logging in (keeps an invite link's ?join=1). */
  returnTo?: string;
};

const field =
  'mt-1 block w-full rounded-xl border border-transparent bg-raised px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none';

/**
 * RSVP with optional details (plus-ones, phone, note for the host).
 * Optimistic: the status flips instantly, then reconciles with the server. If the
 * last seats went to someone else a moment earlier, the server answers
 * `waitlisted` and we say so rather than pretending you got in.
 */
export function RsvpButton({ eventId, status, full, signedIn, closed, seatsLeft = null, myRsvp, returnTo }: Props) {
  const [confirmed, setConfirmed] = useState<RsvpStatus | null>(status);
  const [optimistic, setOptimistic] = useOptimistic(confirmed);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState({
    plusOnes: myRsvp?.plusOnes ?? 0,
    phone: myRsvp?.phone ?? '',
    note: myRsvp?.note ?? '',
  });
  // Stay in sync when the server re-renders (e.g. another RSVP button on the page was used).
  useEffect(() => setConfirmed(status), [status]);

  if (closed) {
    return <p className="rounded-xl bg-raised px-4 py-3 text-sm text-muted">RSVPs are closed for this event.</p>;
  }
  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(returnTo ?? `/events/${eventId}`)}`}
        className="block rounded-xl bg-accent px-4 py-3 text-center font-semibold text-accent-ink hover:opacity-90"
      >
        Log in to RSVP
      </Link>
    );
  }

  const active = optimistic === 'going' || optimistic === 'waitlisted';
  const seatsNeeded = 1 + details.plusOnes;
  const wontFit = !active && seatsLeft !== null && seatsNeeded > seatsLeft;

  function submit() {
    const body: RsvpDetails = {
      plusOnes: details.plusOnes,
      phone: details.phone.trim() || null,
      note: details.note.trim() || null,
    };
    setMessage(null);
    startTransition(async () => {
      if (!active) setOptimistic(full || wontFit ? 'waitlisted' : 'going');
      const res = await setRsvp(eventId, true, body);
      if (!res.ok) {
        setMessage({ tone: 'error', text: res.error });
        return;
      }
      setConfirmed(res.result.status);
      setFormOpen(false);
      if (active) {
        setMessage({ tone: 'ok', text: 'Your RSVP details were updated.' });
      } else if (res.result.status === 'waitlisted') {
        setMessage({
          tone: 'warn',
          text: full || wontFit
            ? "You're on the waitlist. We'll move you up automatically when enough seats open."
            : 'Those seats were just taken, so you’re on the waitlist.',
        });
      } else {
        setMessage({ tone: 'ok', text: "You're going! See you there." });
      }
    });
  }

  function leave() {
    setMessage(null);
    startTransition(async () => {
      setOptimistic('cancelled');
      const res = await setRsvp(eventId, false);
      if (!res.ok) {
        setMessage({ tone: 'error', text: res.error });
        return;
      }
      setConfirmed(res.result.status);
      setMessage({ tone: 'ok', text: 'RSVP cancelled. Your seat went to the next person in line.' });
    });
  }

  const form = (
    <div className="space-y-3 rounded-xl border border-line p-3">
      <label className="block text-xs font-semibold text-muted">
        Bringing anyone?
        <select
          value={details.plusOnes}
          onChange={(e) => setDetails((d) => ({ ...d, plusOnes: Number(e.target.value) }))}
          className={field}
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? 'Just me' : `Me + ${n} guest${n === 1 ? '' : 's'}`}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-muted">
        Phone <span className="font-normal">(optional, host only)</span>
        <input
          type="tel"
          inputMode="tel"
          maxLength={30}
          value={details.phone}
          onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
          placeholder="+91 98765 43210"
          className={field}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Note to host <span className="font-normal">(optional)</span>
        <textarea
          rows={2}
          maxLength={500}
          value={details.note}
          onChange={(e) => setDetails((d) => ({ ...d, note: e.target.value }))}
          placeholder="Dietary needs, arriving late…"
          className={field}
        />
      </label>
      {wontFit && (
        <p className="text-xs text-wait">
          Only {seatsLeft} seat{seatsLeft === 1 ? '' : 's'} left. Your party of {seatsNeeded} will join the waitlist.
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : active ? 'Save details' : full || wontFit ? 'Join waitlist' : 'Confirm RSVP'}
        </button>
        <button
          onClick={() => setFormOpen(false)}
          className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-ink"
        >
          Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {optimistic === 'going' && (
        <p className="rounded-xl bg-going-soft px-4 py-3 font-semibold text-going">
          ✓ You’re going{details.plusOnes > 0 && ` · +${details.plusOnes} guest${details.plusOnes === 1 ? '' : 's'}`}
        </p>
      )}
      {optimistic === 'waitlisted' && (
        <p className="rounded-xl bg-wait-soft px-4 py-3 font-semibold text-wait">You’re on the waitlist</p>
      )}

      {formOpen ? (
        form
      ) : active ? (
        <div className="flex gap-2">
          <button
            onClick={() => setFormOpen(true)}
            disabled={pending}
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent disabled:opacity-60"
          >
            Edit details
          </button>
          <button
            onClick={leave}
            disabled={pending}
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-muted hover:text-danger disabled:opacity-60"
          >
            {pending ? 'Saving…' : optimistic === 'waitlisted' ? 'Leave waitlist' : 'Cancel RSVP'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setFormOpen(true)}
          disabled={pending}
          className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {full ? 'Join waitlist' : 'RSVP — I’m going'}
        </button>
      )}

      <p
        aria-live="polite"
        className={message?.tone === 'error' ? 'text-sm text-danger' : message?.tone === 'warn' ? 'text-sm text-wait' : 'text-sm text-muted'}
      >
        {message?.text}
      </p>
    </div>
  );
}
