'use client';

import { useActionState, useEffect, useState } from 'react';
import { saveEvent, type FormState } from '@/app/actions';
import type { EventItem } from '@/lib/api';
import { Field, FormError, inputClass, SubmitButton } from './form-bits';

/** ISO instant → value for <input type="datetime-local"> in the viewer's timezone. */
function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EventForm({ event }: { event?: EventItem }) {
  const [state, action] = useActionState<FormState, FormData>(saveEvent, undefined);
  const [tzOffset, setTzOffset] = useState(0);
  const [defaults, setDefaults] = useState({ startsAt: '', endsAt: '' });
  useEffect(() => {
    setTzOffset(new Date().getTimezoneOffset());
    setDefaults({ startsAt: toLocalInput(event?.startsAt), endsAt: toLocalInput(event?.endsAt) });
  }, [event]);

  const v = state?.values;

  return (
    <form action={action} className="space-y-5">
      {event && <input type="hidden" name="id" value={event.id} />}
      {event && <input type="hidden" name="version" value={event.version} />}
      <input type="hidden" name="tzOffset" value={tzOffset} />

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
        <Field label="Starts" hint="In your local time">
          <input
            key={`s-${defaults.startsAt}`}
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={v?.startsAt ?? defaults.startsAt}
            className={inputClass}
          />
        </Field>
        <Field label="Ends">
          <input
            key={`e-${defaults.endsAt}`}
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={v?.endsAt ?? defaults.endsAt}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Capacity"
          hint={event ? `Leave empty for unlimited. Can’t go below ${event.goingCount} (already going).` : 'Leave empty for unlimited. Extra RSVPs join a waitlist.'}
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
            <option value="published">Published — anyone can RSVP</option>
            <option value="draft">Draft — only you can see it</option>
          </select>
        </Field>
      </div>

      <SubmitButton pendingText="Saving…">{event ? 'Save changes' : 'Publish event'}</SubmitButton>
    </form>
  );
}
