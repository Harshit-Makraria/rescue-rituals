import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

type Tx = Prisma.TransactionClient;

/** Give seats back (a cancellation, or fewer plus-ones). */
export async function releaseSeats(tx: Tx, eventId: string, seats: number) {
  await tx.$executeRaw`
    UPDATE events SET going_count = going_count - ${seats} WHERE id = ${eventId}::uuid`;
}

/**
 * Fill free seats from the waitlist. Runs inside the caller's transaction
 * (after a cancellation, fewer plus-ones, or the host raising capacity).
 *
 * Order: oldest first, but a party that doesn't fit is skipped so a smaller one
 * behind it can take the remaining seats (it keeps its place for next time).
 *
 * The event row is locked FOR UPDATE, so no concurrent RSVP can take the same
 * seats while we promote; SKIP LOCKED means concurrent promotions never pick the
 * same person. Promoted users get a notification in the same transaction.
 */
export async function promoteFromWaitlist(tx: Tx, eventId: string, notifications: NotificationsService): Promise<number> {
  const [event] = await tx.$queryRaw<{ title: string; free: number | null; open: boolean }[]>`
    SELECT title,
           CASE WHEN capacity IS NULL THEN NULL ELSE capacity - going_count END AS free,
           (status = 'published' AND deleted_at IS NULL AND starts_at > now()) AS open
    FROM events WHERE id = ${eventId}::uuid
    FOR UPDATE`;
  if (!event?.open) return 0;

  let free = event.free === null ? Infinity : Number(event.free);
  if (free <= 0) return 0;

  const waiting = await tx.$queryRaw<{ id: string; user_id: string; plus_ones: number }[]>`
    SELECT id, user_id, plus_ones FROM rsvps
    WHERE event_id = ${eventId}::uuid AND status = 'waitlisted'
    ORDER BY updated_at, id
    LIMIT 500
    FOR UPDATE SKIP LOCKED`;

  const chosen: typeof waiting = [];
  let seats = 0;
  for (const w of waiting) {
    const need = 1 + w.plus_ones;
    if (need <= free) {
      chosen.push(w);
      free -= need;
      seats += need;
    }
    if (free <= 0) break;
  }
  if (!chosen.length) return 0;

  const ids = chosen.map((c) => c.id);
  await tx.$executeRaw`
    UPDATE rsvps SET status = 'going', updated_at = now() WHERE id = ANY(${ids}::uuid[])`;
  await tx.$executeRaw`
    UPDATE events SET going_count = going_count + ${seats} WHERE id = ${eventId}::uuid`;
  await notifications.notify(
    chosen.map((c) => ({
      userId: c.user_id,
      eventId,
      type: 'waitlist_promoted' as const,
      title: `You're in! A seat opened up for ${event.title}`,
      body: c.plus_ones ? `You and your ${c.plus_ones} guest${c.plus_ones === 1 ? '' : 's'} are now going.` : 'You were moved from the waitlist to going.',
    })),
    tx,
  );
  return chosen.length;
}
