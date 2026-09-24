'use server';

import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, errorMessage, type EventItem, type RsvpResult } from '@/lib/api';
import { ACCESS_COOKIE, REFRESH_COOKIE, sessionCookies, USER_COOKIE, type AuthTokens } from '@/lib/session';

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** Only allow same-site relative redirects after login (no open redirect). */
const safeNext = (next: string) => (next.startsWith('/') && !next.startsWith('//') ? next : '/');

async function startSession(tokens: AuthTokens) {
  const jar = await cookies();
  sessionCookies(tokens).forEach((c) => jar.set(c));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const client = await api();
  const { data, error } = await client.POST('/api/v1/auth/login', {
    body: { email: str(form, 'email'), password: String(form.get('password') ?? '') },
  });
  if (!data) return { error: errorMessage(error), values: { email: str(form, 'email') } };
  await startSession(data as AuthTokens);
  redirect(safeNext(str(form, 'next')));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const client = await api();
  const values = { name: str(form, 'name'), email: str(form, 'email') };
  const { data, error } = await client.POST('/api/v1/auth/register', {
    body: { ...values, password: String(form.get('password') ?? '') },
  });
  if (!data) return { error: errorMessage(error), values };
  await startSession(data as AuthTokens);
  redirect(safeNext(str(form, 'next')));
}

export async function logout() {
  const client = await api();
  await client.POST('/api/v1/auth/logout').catch(() => undefined);
  const jar = await cookies();
  [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE].forEach((c) => jar.delete(c));
  redirect('/');
}

/**
 * `<input type="datetime-local">` has no timezone. The form sends the browser's
 * UTC offset alongside, so we store the exact instant the host meant.
 */
function toIso(local: string, offsetMinutes: number): string | null {
  if (!local) return null;
  const asUtc = Date.parse(`${local}:00Z`);
  return Number.isNaN(asUtc) ? null : new Date(asUtc + offsetMinutes * 60_000).toISOString();
}

export async function saveEvent(_: FormState, form: FormData): Promise<FormState> {
  const id = str(form, 'id');
  const offset = Number(form.get('tzOffset') ?? 0);
  const values = Object.fromEntries(
    ['title', 'description', 'location', 'startsAt', 'endsAt', 'capacity', 'status'].map((k) => [k, str(form, k)]),
  );
  const startsAt = toIso(values.startsAt, offset);
  const endsAt = toIso(values.endsAt, offset);
  if (!startsAt || !endsAt) return { error: 'Pick a start and end time.', values };

  const body = {
    title: values.title,
    description: values.description || undefined,
    location: values.location || undefined,
    startsAt,
    endsAt,
    capacity: values.capacity ? Number(values.capacity) : null,
    status: (values.status === 'draft' ? 'draft' : 'published') as 'draft' | 'published',
  };

  const client = await api();
  const result = id
    ? await client.PATCH('/api/v1/events/{id}', {
        params: { path: { id } },
        body: { ...body, version: Number(form.get('version')) },
      })
    : await client.POST('/api/v1/events', { body });

  if (!result.data) return { error: errorMessage(result.error), values };
  redirect(`/events/${(result.data as EventItem).id}`);
}

export async function cancelEvent(id: string) {
  const client = await api();
  const { error, response } = await client.DELETE('/api/v1/events/{id}', { params: { path: { id } } });
  if (!response.ok) return { error: errorMessage(error) };
  redirect('/me?tab=hosting');
}

export type RsvpActionResult = { ok: true; result: RsvpResult } | { ok: false; error: string };

export async function setRsvp(eventId: string, going: boolean): Promise<RsvpActionResult> {
  const client = await api();
  const opts = { params: { path: { id: eventId } } };
  const { data, error } = going
    ? await client.POST('/api/v1/events/{id}/rsvp', opts)
    : await client.DELETE('/api/v1/events/{id}/rsvp', opts);
  if (!data) return { ok: false, error: errorMessage(error) };
  refresh(); // re-render server components (attendee list, counts)
  return { ok: true, result: data };
}

export async function loadMoreEvents(cursor: string, q?: string) {
  const client = await api();
  const { data } = await client.GET('/api/v1/events', { params: { query: { cursor, q: q || undefined } } });
  return data ?? { items: [], nextCursor: null };
}
