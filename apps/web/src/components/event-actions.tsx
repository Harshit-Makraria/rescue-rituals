'use client';

import { useState } from 'react';
import { Icon } from './ui';

/**
 * Shares an invite link (`/events/<id>?join=1`). Whoever opens it gets a
 * "You're invited" banner with a one-tap Join. Opening the link never RSVPs by
 * itself: a GET must not change data, or link previews would sign people up.
 */
export function ShareButton({ title, eventId }: { title: string; eventId: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/events/${eventId}?join=1`;
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `Join me at ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed or clipboard blocked; nothing to do.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold hover:border-accent hover:text-accent"
    >
      <Icon name={copied ? 'check' : 'external'} size={16} />
      <span aria-live="polite">{copied ? 'Invite link copied' : 'Copy invite link'}</span>
    </button>
  );
}

/** "Add to calendar" menu: Google Calendar link or an .ics download from the API. */
export function CalendarMenu({ icsUrl, googleUrl }: { icsUrl: string; googleUrl: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold hover:border-accent hover:text-accent"
      >
        <Icon name="calendar" size={16} /> Add to calendar
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <a
            href={googleUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium hover:bg-raised"
          >
            Google Calendar
          </a>
          <a href={icsUrl} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm font-medium hover:bg-raised">
            Apple / Outlook (.ics)
          </a>
        </div>
      )}
    </div>
  );
}
