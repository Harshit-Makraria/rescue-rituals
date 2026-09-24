import 'server-only';
import createClient from 'openapi-fetch';
import { cookies } from 'next/headers';
import type { components, paths } from './api-schema';
import { ACCESS_COOKIE, parseUser, USER_COOKIE } from './session';

export type EventItem = components['schemas']['EventResponse'];
export type RsvpResult = components['schemas']['RsvpResponse'];
export type RsvpStatus = NonNullable<EventItem['myRsvpStatus']>;

export const API_URL = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

/**
 * Typed API client (types generated from the API's OpenAPI spec), authenticated
 * with the session cookie. Server-only: the token never reaches the browser.
 */
export async function api() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  return createClient<paths>({
    baseUrl: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
}

export async function currentUser() {
  return parseUser((await cookies()).get(USER_COOKIE)?.value);
}

/** Turn the API's `{ message }` error body (string or validation list) into one readable line. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = (error as { message?: string | string[] } | undefined)?.message;
  if (Array.isArray(message)) return message.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join('. ');
  return message || fallback;
}
