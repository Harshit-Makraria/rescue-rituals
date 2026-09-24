#!/usr/bin/env node
/**
 * Proves the RSVP guarantee against a running API (local or deployed):
 * N people RSVP to the same event at the same moment; exactly `capacity` get in.
 *
 *   node scripts/live-concurrency-check.mjs                       # deployed API, 15 people, 5 seats
 *   API=http://localhost:3001 PEOPLE=50 SEATS=10 node scripts/live-concurrency-check.mjs
 *
 * Creates throwaway users (loom-*@test.dev) and one event, then cancels the event.
 */
const API = (process.env.API ?? 'https://events-api-43jh.onrender.com').replace(/\/$/, '') + '/api/v1';
const PEOPLE = Number(process.env.PEOPLE ?? 15);
const SEATS = Number(process.env.SEATS ?? 5);

async function call(method, path, body, token, retried = false) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (res.status === 429 && !retried) {
    // The API rate-limits sign-ups per IP (20/min) — wait for the window and retry once.
    console.log("  (rate limited by the API as designed; waiting 60s)");
    await new Promise((r) => setTimeout(r, 61_000));
    return call(method, path, body, token, true);
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const run = Date.now();
console.log(`API: ${API}\nCreating an event with ${SEATS} seats and ${PEOPLE} people…`);

const host = await call('POST', '/auth/register', { email: `loom-host-${run}@test.dev`, password: 'Password123!', name: 'Loom Host' });
const start = new Date(Date.now() + 2 * 86_400_000);
const event = await call(
  'POST',
  '/events',
  { title: `Concurrency check ${run}`, startsAt: start.toISOString(), endsAt: new Date(+start + 3_600_000).toISOString(), capacity: SEATS, status: 'draft' },
  host.accessToken,
);
await call('PATCH', `/events/${event.id}`, { status: 'published' }, host.accessToken);

const people = [];
for (let i = 0; i < PEOPLE; i += 10) {
  // register in small batches so the demo doesn't trip the rate limiter
  const batch = await Promise.all(
    Array.from({ length: Math.min(10, PEOPLE - i) }, (_, j) =>
      call('POST', '/auth/register', { email: `loom-${run}-${i + j}@test.dev`, password: 'Password123!', name: `Loom ${i + j}` }),
    ),
  );
  people.push(...batch);
}

console.log(`Firing ${PEOPLE} RSVPs at the same moment…`);
const t0 = performance.now();
const results = await Promise.all(people.map((p) => call('POST', `/events/${event.id}/rsvp`, {}, p.accessToken)));
const ms = Math.round(performance.now() - t0);

const going = results.filter((r) => r.status === 'going').length;
const waitlisted = results.filter((r) => r.status === 'waitlisted').length;
const after = await call('GET', `/events/${event.id}`);

console.log(`\n  going:       ${going}`);
console.log(`  waitlisted:  ${waitlisted}`);
console.log(`  event count: ${after.goingCount} / ${after.capacity}   (${ms} ms for all ${PEOPLE})`);
console.log(going === SEATS && after.goingCount === SEATS ? '\n✅ No overbooking.' : '\n❌ Mismatch!');

await call('DELETE', `/events/${event.id}`, null, host.accessToken);
console.log('(test event cancelled)');
