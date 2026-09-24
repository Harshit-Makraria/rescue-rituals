'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { saveEvent, type FormState } from '@/app/actions';
import type { EventItem } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { FormError, SubmitButton } from './form-bits';
import { Icon } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO instant → { date: "YYYY-MM-DD", time: "HH:mm" } in the viewer's timezone. */
function toLocalParts(iso?: string) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const REMINDERS = [
  { value: '', label: 'No reminder' },
  { value: '15', label: '15 minutes before' },
  { value: '60', label: '1 hour before event' },
  { value: '180', label: '3 hours before' },
  { value: '1440', label: '1 day before' },
];

const input =
  'block w-full rounded-xl border border-transparent bg-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none';
const label = 'mb-1.5 block text-sm font-semibold';

/** "This event will take place on May 15, 2023 from 02:00 PM until 05:45 PM" */
function summary(date: string, start: string, end: string) {
  if (!date || !start || !end) return null;
  const s = new Date(`${date}T${start}`);
  let e = new Date(`${date}T${end}`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  if (e <= s) e = new Date(e.getTime() + 86_400_000);
  const day = s.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const mins = Math.round((e.getTime() - s.getTime()) / 60_000);
  const length = `${Math.floor(mins / 60) ? `${Math.floor(mins / 60)}h ` : ''}${mins % 60 ? `${mins % 60}m` : ''}`.trim();
  const nextDay = e.getDate() !== s.getDate() ? ' (next day)' : '';
  return `This event will take place on ${day} from ${t(s)} until ${t(e)}${nextDay} · ${length}`;
}

export function EventForm({ event }: { event?: EventItem }) {
  const [state, action] = useActionState<FormState, FormData>(saveEvent, undefined);
  const v = state?.values;
  // Local-time values are computed after mount: the server renders in UTC and
  // doesn't know the viewer's timezone.
  const [tzOffset, setTzOffset] = useState(0);
  const [minDate, setMinDate] = useState('');
  const [when, setWhen] = useState({ date: v?.date ?? '', start: v?.startTime ?? '', end: v?.endTime ?? '' });
  const [showDescription, setShowDescription] = useState(Boolean(event?.description || v?.description));

  useEffect(() => {
    setTzOffset(new Date().getTimezoneOffset());
    setMinDate(toLocalParts(new Date().toISOString()).date);
    if (event && !v) {
      const s = toLocalParts(event.startsAt);
      setWhen({ date: s.date, start: s.time, end: toLocalParts(event.endsAt).time });
    }
  }, [event, v]);

  const line = summary(when.date, when.start, when.end);

  return (
    <form action={action} className="space-y-6">
      {event && <input type="hidden" name="id" value={event.id} />}
      {event && <input type="hidden" name="version" value={event.version} />}
      <input type="hidden" name="tzOffset" value={tzOffset} />

      <FormError error={state?.error} />

      <div>
        <label htmlFor="title" className={label}>
          Event name
        </label>
        <div className="flex gap-2 rounded-xl bg-raised p-1 pl-0 focus-within:ring-2 focus-within:ring-accent">
          <input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={120}
            defaultValue={v?.title ?? event?.title}
            placeholder="Enter event name"
            className="min-w-0 flex-1 bg-transparent px-3.5 py-1.5 text-sm placeholder:text-muted focus:outline-none"
          />
          {!showDescription && (
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:border-accent"
            >
              Add description
            </button>
          )}
        </div>
        {showDescription && (
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={5000}
            aria-label="Description"
            defaultValue={v?.description ?? event?.description ?? ''}
            placeholder="What should people expect? Line breaks are kept."
            className={`${input} mt-2`}
          />
        )}
      </div>

      <div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="date" className={label}>
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              min={event ? undefined : minDate}
              value={when.date}
              onChange={(e) => setWhen((w) => ({ ...w, date: e.target.value }))}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="startTime" className={label}>
              Time
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              required
              value={when.start}
              onChange={(e) => setWhen((w) => ({ ...w, start: e.target.value }))}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="endTime" className={label}>
              Ends
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              required
              value={when.end}
              onChange={(e) => setWhen((w) => ({ ...w, end: e.target.value }))}
              className={input}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {line ?? 'Times are in your timezone. An end time before the start means it ends the next day.'}
        </p>
      </div>

      <div>
        <label htmlFor="location" className={label}>
          Location
        </label>
        <div className="relative">
          <Icon name="pin" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="location"
            name="location"
            maxLength={200}
            defaultValue={v?.location ?? event?.location ?? ''}
            placeholder="Venue or area, or “Online”"
            className={`${input} pl-10`}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className={label}>
            Category
          </label>
          <select id="category" name="category" defaultValue={v?.category ?? event?.category ?? 'other'} className={input}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="meetingUrl" className={label}>
            Online link <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="meetingUrl"
            name="meetingUrl"
            type="url"
            pattern="https://.*"
            maxLength={500}
            defaultValue={v?.meetingUrl ?? event?.meetingUrl ?? ''}
            placeholder="https://meet.google.com/…"
            className={input}
          />
          <p className="mt-1.5 text-xs text-muted">Only you and people going can see it.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="capacity" className={label}>
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={event?.goingCount || 1}
            max={100000}
            defaultValue={v?.capacity ?? event?.capacity ?? ''}
            placeholder="Unlimited"
            className={input}
          />
          <p className="mt-1.5 text-xs text-muted">
            {event ? `At least ${event.goingCount} (already going).` : 'Extra RSVPs join a waitlist automatically.'}
          </p>
        </div>
        <div>
          <label htmlFor="reminderMinutes" className={label}>
            Set reminder
          </label>
          <select
            id="reminderMinutes"
            name="reminderMinutes"
            defaultValue={v?.reminderMinutes ?? (event ? String(event.reminderMinutes ?? '') : '60')}
            className={input}
          >
            {REMINDERS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">Everyone going gets an in-app notification.</p>
        </div>
      </div>

      <fieldset>
        <legend className={label}>Visibility</legend>
        <div className="inline-flex rounded-xl bg-raised p-1">
          {[
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft (only you)' },
          ].map((o) => (
            <label key={o.value} className="cursor-pointer">
              <input
                type="radio"
                name="status"
                value={o.value}
                defaultChecked={(v?.status ?? (event?.status === 'draft' ? 'draft' : 'published')) === o.value}
                className="peer sr-only"
              />
              <span className="block rounded-lg px-4 py-1.5 text-sm font-semibold text-muted peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-card peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Link
          href={event ? `/events/${event.id}` : '/'}
          className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold hover:bg-raised"
        >
          Cancel
        </Link>
        <div className="w-44">
          <SubmitButton pendingText="Saving…">{event ? 'Save changes' : 'Create Event'}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
