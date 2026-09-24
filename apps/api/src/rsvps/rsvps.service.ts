import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decodeCursor, encodeCursor } from '../common/pagination';
import { RsvpStatusValue } from '../events/events.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AttendeePage, AttendeesQuery, GuestList, RsvpDto, RsvpResponse } from './rsvps.dto';
import { promoteFromWaitlist, releaseSeats } from './waitlist';

type Tx = Prisma.TransactionClient;

// Under a spike, requests queue for pooled connections; give them room instead
// of failing after Prisma's 2s default.
const TX_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

interface RsvpRow {
  id: string;
  status: RsvpStatusValue;
  plus_ones: number;
  phone: string | null;
  note: string | null;
  inserted: boolean;
}

@Injectable()
export class RsvpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Join an event, or update your RSVP details. Idempotent: sending the same
   * request twice changes nothing.
   *
   * Seats: an RSVP takes 1 + plusOnes seats. They are claimed with ONE conditional
   * UPDATE (`going_count + seats <= capacity`). Postgres row-locks the event for
   * it, so concurrent requests queue on that row and each re-checks against the
   * latest committed value. The CHECK constraint on events is a second safety net.
   *
   * Fields left out of the body keep their current value; `null` clears phone/note.
   */
  async join(eventId: string, userId: string, dto: RsvpDto = {}): Promise<RsvpResponse> {
    await this.assertJoinable(eventId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Upsert my RSVP row. The unique (event_id, user_id) index serialises
      //    duplicate taps; the no-op UPDATE makes RETURNING work on conflict and
      //    hands back the *old* details, which we need to compute seat changes.
      const [row] = await tx.$queryRaw<RsvpRow[]>`
        INSERT INTO rsvps (event_id, user_id, status)
        VALUES (${eventId}::uuid, ${userId}::uuid, 'waitlisted')
        ON CONFLICT (event_id, user_id) DO UPDATE SET event_id = EXCLUDED.event_id
        RETURNING id, status::text AS status, plus_ones, phone, note, (xmax = 0) AS inserted`;

      const plusOnes = dto.plusOnes ?? row.plus_ones;
      const phone = dto.phone === undefined ? row.phone : dto.phone || null;
      const note = dto.note === undefined ? row.note : dto.note || null;
      const isNew = row.inserted || row.status === 'cancelled';

      let status = row.status;
      let promote = false;

      if (isNew) {
        // Fresh RSVP (or re-joining after cancelling): try to claim all seats at once.
        status = (await this.claimSeats(tx, eventId, 1 + plusOnes)) ? 'going' : 'waitlisted';
      } else if (row.status === 'going') {
        const delta = plusOnes - row.plus_ones;
        if (delta > 0 && !(await this.claimSeats(tx, eventId, delta))) {
          throw new ConflictException(
            `Not enough seats left to add ${delta} more guest${delta === 1 ? '' : 's'}. Your RSVP is unchanged.`,
          );
        }
        if (delta < 0) {
          await releaseSeats(tx, eventId, -delta);
          promote = true;
        }
      }
      // (Waitlisted: details just update; seats are counted when promoted.)

      // updated_at is the waitlist position — only reset it when (re)joining.
      if (isNew) {
        await tx.$executeRaw`
          UPDATE rsvps SET status = ${status}::rsvp_status, plus_ones = ${plusOnes}, phone = ${phone},
                 note = ${note}, updated_at = now()
          WHERE id = ${row.id}::uuid`;
      } else {
        await tx.$executeRaw`
          UPDATE rsvps SET plus_ones = ${plusOnes}, phone = ${phone}, note = ${note}
          WHERE id = ${row.id}::uuid`;
      }
      if (promote) await promoteFromWaitlist(tx, eventId, this.notifications);
      if (isNew) await this.notifyHost(tx, eventId, userId, status, plusOnes);

      return this.snapshot(tx, eventId, status, plusOnes);
    }, TX_OPTIONS);
  }

  /** Leave an event. Your seats (you + plus-ones) go to the waitlist. */
  async leave(eventId: string, userId: string): Promise<RsvpResponse> {
    return this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ id: string; status: RsvpStatusValue; plus_ones: number }[]>`
        SELECT id, status::text AS status, plus_ones FROM rsvps
        WHERE event_id = ${eventId}::uuid AND user_id = ${userId}::uuid
        FOR UPDATE`;
      if (!row || row.status === 'cancelled') throw new NotFoundException("You haven't RSVP'd to this event.");

      await tx.$executeRaw`
        UPDATE rsvps SET status = 'cancelled', updated_at = now() WHERE id = ${row.id}::uuid`;

      if (row.status === 'going') {
        await releaseSeats(tx, eventId, 1 + row.plus_ones);
        await promoteFromWaitlist(tx, eventId, this.notifications);
      }
      return this.snapshot(tx, eventId, 'cancelled', row.plus_ones);
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
      select: { id: true, updatedAt: true, plusOnes: true, user: { select: { id: true, name: true } } },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      items: page.map((r) => ({ userId: r.user.id, name: r.user.name, plusOnes: r.plusOnes, joinedAt: r.updatedAt })),
      total: event.goingCount,
      nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last.id) : null,
    };
  }

  /** Waitlist in promotion order. Host only: guests shouldn't see who else is waiting. */
  async waitlist(eventId: string, userId: string): Promise<AttendeePage> {
    await this.assertHost(eventId, userId, 'Only the host can see the waitlist.');
    const rows = await this.prisma.rsvp.findMany({
      where: { eventId, status: 'waitlisted' },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: 200,
      select: { updatedAt: true, plusOnes: true, user: { select: { id: true, name: true } } },
    });
    return {
      items: rows.map((r) => ({ userId: r.user.id, name: r.user.name, plusOnes: r.plusOnes, joinedAt: r.updatedAt })),
      total: rows.length,
      nextCursor: null,
    };
  }

  /** Full guest list with contact details. Host only. */
  async guestList(eventId: string, userId: string): Promise<GuestList> {
    await this.assertHost(eventId, userId, 'Only the host can see guest details.');
    const rows = await this.prisma.rsvp.findMany({
      where: { eventId, status: { in: ['going', 'waitlisted'] } },
      orderBy: [{ status: 'asc' }, { updatedAt: 'asc' }, { id: 'asc' }],
      take: 2000,
      select: {
        status: true,
        plusOnes: true,
        phone: true,
        note: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    const items = rows.map((r) => ({
      userId: r.user.id,
      name: r.user.name,
      email: r.user.email,
      phone: r.phone,
      plusOnes: r.plusOnes,
      note: r.note,
      status: r.status as 'going' | 'waitlisted',
      since: r.updatedAt,
    }));
    const going = items.filter((i) => i.status === 'going');
    return {
      items,
      goingRsvps: going.length,
      goingSeats: going.reduce((n, i) => n + 1 + i.plusOnes, 0),
      waitlisted: items.length - going.length,
    };
  }

  /** The same guest list as CSV, safe to open in Excel or Google Sheets. */
  async guestListCsv(eventId: string, userId: string): Promise<{ filename: string; body: string }> {
    const [list, event] = await Promise.all([
      this.guestList(eventId, userId),
      this.prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { title: true } }),
    ]);
    const header = ['Name', 'Email', 'Phone', 'Status', 'Plus-ones', 'Seats', 'Note', 'RSVP at (UTC)'];
    const lines = [header, ...list.items.map((i) => [
      i.name, i.email, i.phone ?? '', i.status, String(i.plusOnes), String(1 + i.plusOnes), i.note ?? '', i.since.toISOString(),
    ])].map((cells) => cells.map(csvCell).join(','));
    const slug = event.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event';
    // BOM so Excel reads UTF-8 names correctly
    return { filename: `${slug}-guests.csv`, body: '﻿' + lines.join('\r\n') + '\r\n' };
  }

/** Tell the host someone joined (or joined the waitlist). Same transaction as the RSVP. */
  private async notifyHost(tx: Tx, eventId: string, userId: string, status: RsvpStatusValue, plusOnes: number) {
    const [info] = await tx.$queryRaw<{ creator_id: string; title: string; name: string }[]>`
      SELECT e.creator_id, e.title, u.name
      FROM events e JOIN users u ON u.id = ${userId}::uuid
      WHERE e.id = ${eventId}::uuid`;
    if (!info || info.creator_id === userId) return; // no self-notifications
    const party = plusOnes ? ` (+${plusOnes} guest${plusOnes === 1 ? '' : 's'})` : '';
    await this.notifications.notify(
      [
        {
          userId: info.creator_id,
          eventId,
          type: 'new_attendee',
          title: status === 'going' ? `${info.name}${party} is going to ${info.title}` : `${info.name}${party} joined the waitlist for ${info.title}`,
          body: 'See your guest list for their details.',
        },
      ],
      tx,
    );
  }

    private async assertHost(eventId: string, userId: string, message: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event) throw new NotFoundException('Event not found.');
    if (event.creatorId !== userId) throw new ForbiddenException(message);
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

  /** Atomically take `seats` seats if they all fit. */
  private async claimSeats(tx: Tx, eventId: string, seats: number): Promise<boolean> {
    const updated = await tx.$executeRaw`
      UPDATE events SET going_count = going_count + ${seats}
      WHERE id = ${eventId}::uuid
        AND status = 'published'
        AND deleted_at IS NULL
        AND starts_at > now()
        AND (capacity IS NULL OR going_count + ${seats} <= capacity)`;
    return updated === 1;
  }

  private async snapshot(tx: Tx, eventId: string, status: RsvpStatusValue, plusOnes: number): Promise<RsvpResponse> {
    const event = await tx.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { goingCount: true, capacity: true },
    });
    return {
      eventId,
      status,
      plusOnes,
      goingCount: event.goingCount,
      seatsLeft: event.capacity === null ? null : Math.max(event.capacity - event.goingCount, 0),
    };
  }
}

/**
 * Quote a CSV cell, and neutralise spreadsheet formula injection: a guest named
 * `=HYPERLINK(...)` must not execute when the host opens the file.
 */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
