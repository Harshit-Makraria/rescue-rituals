import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Fill every free seat from the waitlist, oldest first. Runs inside the
 * caller's transaction (after a cancellation, or after the host raises capacity).
 *
 * The event row is locked FOR UPDATE, so no concurrent RSVP can take the same
 * seats while we promote; SKIP LOCKED means concurrent promotions never pick the
 * same waitlisted person. Promoted users get a notification in the same transaction.
 */
export async function promoteFromWaitlist(
  tx: Prisma.TransactionClient,
  eventId: string,
  notifications: NotificationsService,
): Promise<number> {
  const [event] = await tx.$queryRaw<{ title: string; free: number | null; open: boolean }[]>`
    SELECT title,
           CASE WHEN capacity IS NULL THEN NULL ELSE capacity - going_count END AS free,
           (status = 'published' AND deleted_at IS NULL AND starts_at > now()) AS open
    FROM events WHERE id = ${eventId}::uuid
    FOR UPDATE`;
  if (!event?.open) return 0;

  const limit = event.free === null ? 10_000 : Math.max(Number(event.free), 0);
  if (limit === 0) return 0;

  const promoted = await tx.$queryRaw<{ user_id: string }[]>`
    UPDATE rsvps SET status = 'going', updated_at = now()
    WHERE id IN (
      SELECT id FROM rsvps
      WHERE event_id = ${eventId}::uuid AND status = 'waitlisted'
      ORDER BY updated_at, id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING user_id`;
  if (!promoted.length) return 0;

  await tx.$executeRaw`
    UPDATE events SET going_count = going_count + ${promoted.length} WHERE id = ${eventId}::uuid`;
  await notifications.notify(
    promoted.map((p) => ({
      userId: p.user_id,
      eventId,
      type: 'waitlist_promoted' as const,
      title: `You're in! A seat opened up for ${event.title}`,
      body: 'You were moved from the waitlist to going.',
    })),
    tx,
  );
  return promoted.length;
}
