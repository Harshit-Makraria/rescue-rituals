import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decodeCursor, encodeCursor } from '../common/pagination';
import { RsvpStatusValue } from '../events/events.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AttendeePage, AttendeesQuery, RsvpResponse } from './rsvps.dto';

type Tx = Prisma.TransactionClient;

// Under a spike, requests queue for pooled connections; give them room instead
// of failing after Prisma's 2s default.
const TX_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

@Injectable()
export class RsvpsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Join an event. Idempotent: calling it again returns your current status.
   *
   * Concurrency: the seat is claimed with ONE conditional UPDATE. Postgres
   * row-locks the event for it, so simultaneous requests queue on that row and
   * each re-checks `going_count < capacity` against the latest committed value.
   * Overbooking is impossible without app-level locks, and the CHECK constraint
   * on events is a second safety net.
   */
  async join(eventId: string, userId: string): Promise<RsvpResponse> {
    await this.assertJoinable(eventId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Upsert my RSVP row. The unique (event_id, user_id) index serialises
      //    duplicate taps; the no-op UPDATE makes RETURNING work on conflict.
      const [row] = await tx.$queryRaw<{ id: string; status: RsvpStatusValue; inserted: boolean }[]>`
        INSERT INTO rsvps (event_id, user_id, status)
        VALUES (${eventId}::uuid, ${userId}::uuid, 'waitlisted')
        ON CONFLICT (event_id, user_id) DO UPDATE SET event_id = EXCLUDED.event_id
        RETURNING id, status::text AS status, (xmax = 0) AS inserted`;

      // Already going / already waitlisted → idempotent no-op.
      if (!row.inserted && row.status !== 'cancelled') {
        return this.snapshot(tx, eventId, row.status);
      }

      // 2. Try to claim a seat atomically.
      const claimed = await this.claimSeat(tx, eventId);
      const status: RsvpStatusValue = claimed ? 'going' : 'waitlisted';
      await tx.$executeRaw`
        UPDATE rsvps SET status = ${status}::rsvp_status, updated_at = now() WHERE id = ${row.id}::uuid`;

      return this.snapshot(tx, eventId, status);
    }, TX_OPTIONS);
  }

  /** Leave an event. If you had a seat, the oldest waitlisted person gets it. */
  async leave(eventId: string, userId: string): Promise<RsvpResponse> {
    return this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ id: string; status: RsvpStatusValue }[]>`
        SELECT id, status::text AS status FROM rsvps
        WHERE event_id = ${eventId}::uuid AND user_id = ${userId}::uuid
        FOR UPDATE`;
      if (!row || row.status === 'cancelled') throw new NotFoundException("You haven't RSVP'd to this event.");

      await tx.$executeRaw`
        UPDATE rsvps SET status = 'cancelled', updated_at = now() WHERE id = ${row.id}::uuid`;

      if (row.status === 'going') {
        await tx.$executeRaw`
          UPDATE events SET going_count = going_count - 1 WHERE id = ${eventId}::uuid`;
        await this.promoteFromWaitlist(tx, eventId);
      }
      return this.snapshot(tx, eventId, 'cancelled');
    }, TX_OPTIONS);
  }

  async attendees(eventId: string, query: AttendeesQuery): Promise<AttendeePage> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, status: { not: 'draft' } },
      select: { goingCount: true },
    });
    if (!event) throw new NotFoundException('Event not found.');

    const limit = query.limit ?? 30;
    const where: Prisma.RsvpWhereInput = { eventId, status: 'going' };
    if (query.cursor) {
      const c = decodeCursor(query.cursor);
      where.OR = [{ updatedAt: { gt: c.at } }, { updatedAt: c.at, id: { gt: c.id } }];
    }
    const rows = await this.prisma.rsvp.findMany({
      where,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      select: { id: true, updatedAt: true, user: { select: { id: true, name: true } } },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      items: page.map((r) => ({ userId: r.user.id, name: r.user.name, joinedAt: r.updatedAt })),
      total: event.goingCount,
      nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last.id) : null,
    };
  }

  /** Friendly errors up front; the conditional UPDATE is still the real guard. */
  private async assertJoinable(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { status: true, startsAt: true },
    });
    if (!event || event.status === 'draft') throw new NotFoundException('Event not found.');
    if (event.status === 'cancelled') throw new ConflictException('This event was cancelled.');
    if (event.startsAt <= new Date()) throw new ConflictException('This event has already started.');
  }

  private async claimSeat(tx: Tx, eventId: string): Promise<boolean> {
    const updated = await tx.$executeRaw`
      UPDATE events SET going_count = going_count + 1
      WHERE id = ${eventId}::uuid
        AND status = 'published'
        AND deleted_at IS NULL
        AND starts_at > now()
        AND (capacity IS NULL OR going_count < capacity)`;
    return updated === 1;
  }

  private async promoteFromWaitlist(tx: Tx, eventId: string) {
    // SKIP LOCKED: if two cancellations race, each promotes a different person.
    const [next] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM rsvps
      WHERE event_id = ${eventId}::uuid AND status = 'waitlisted'
      ORDER BY updated_at, id
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    if (next && (await this.claimSeat(tx, eventId))) {
      await tx.$executeRaw`
        UPDATE rsvps SET status = 'going', updated_at = now() WHERE id = ${next.id}::uuid`;
    }
  }

  private async snapshot(tx: Tx, eventId: string, status: RsvpStatusValue): Promise<RsvpResponse> {
    const event = await tx.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { goingCount: true, capacity: true },
    });
    return {
      eventId,
      status,
      goingCount: event.goingCount,
      seatsLeft: event.capacity === null ? null : Math.max(event.capacity - event.goingCount, 0),
    };
  }
}
