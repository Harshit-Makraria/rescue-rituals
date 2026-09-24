'use client';

import { useActionState, useEffect, useState } from 'react';
import { saveEvent, type FormState } from '@/app/actions';
import type { EventItem } from '@/lib/api';
import { Field, FormError, inputClass, SubmitButton } from './form-bits';

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

export function EventForm({ event }: { event?: EventItem }) {
  const [state, action] = useActionState<FormState, FormData>(saveEvent, undefined);
  // Local-time values are computed after mount: the server renders in UTC and
  // doesn't know the viewer's timezone.
  const [local, setLocal] = useState({ tzOffset: 0, date: '', startTime: '', endTime: '', minDate: '' });
  useEffect(() => {
    const start = toLocalParts(event?.startsAt);
    const end = toLocalParts(event?.endsAt);
    setLocal({
      tzOffset: new Date().getTimezoneOffset(),
      date: start.date,
      startTime: start.time,
      endTime: end.time,
      minDate: toLocalParts(new Date().toISOString()).date,
    });
  }, [event]);

  const v = state?.values;
  const key = `${local.date}-${local.startTime}`; // remount date/time inputs once local values are known

  return (
    <form action={action} className="space-y-5">
      {event && <input type="hidden" name="id" value={event.id} />}
      {event && <input type="hidden" name="version" value={event.version} />}
      <input type="hidden" name="tzOffset" value={local.tzOffset} />

      <FormError error={state?.error} />

      <Field label="Title">
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          defaultValue={v?.title ?? event?.title}
          placeholder="Postgres Performance Night"
          className={inputClass}
        />
      </Field>

      <Field label="Description" hint="What should people expect? Plain text, line breaks are kept.">
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={5000}
          defaultValue={v?.description ?? event?.description ?? ''}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Date">
          <input
            key={`d-${key}`}
            id="date"
            name="date"
            type="date"
            required
            min={event ? undefined : local.minDate}
            defaultValue={v?.date ?? local.date}
            className={inputClass}
          />
        </Field>
        <Field label="Start time">
          <input
            key={`s-${key}`}
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue={v?.startTime ?? local.startTime}
            className={inputClass}
          />
        </Field>
        <Field label="End time" hint="Earlier than the start time = ends the next day.">
          <input
            key={`e-${key}`}
            id="endTime"
            name="endTime"
            type="time"
            required
            defaultValue={v?.endTime ?? local.endTime}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Location">
        <input
          id="location"
          name="location"
          maxLength={200}
          defaultValue={v?.location ?? event?.location ?? ''}
          placeholder="Koramangala, Bengaluru — or a meeting link"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Capacity"
          hint={
            event
              ? `Leave empty for unlimited. Can’t go below ${event.goingCount} (already going).`
              : 'Leave empty for unlimited. Extra RSVPs join a waitlist.'
          }
        >
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={event?.goingCount || 1}
            max={100000}
            defaultValue={v?.capacity ?? event?.capacity ?? ''}
            className={inputClass}
          />
        </Field>
        <Field label="Visibility">
          <select
            id="status"
            name="status"
            defaultValue={v?.status ?? (event?.status === 'draft' ? 'draft' : 'published')}
            className={inputClass}
          >
            <option value="published">Published: anyone can RSVP</option>
            <option value="draft">Draft: only you can see it</option>
          </select>
        </Field>
      </div>

      <p className="text-xs text-muted">Times are in your local timezone. Attendees see them converted to theirs.</p>

      <SubmitButton pendingText="Saving…">{event ? 'Save changes' : 'Publish event'}</SubmitButton>
    </form>
  );
}
