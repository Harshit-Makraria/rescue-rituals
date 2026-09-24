import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decodeCursor, encodeCursor } from '../common/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { promoteFromWaitlist } from '../rsvps/waitlist';
import { eventInclude, toEventResponse } from './event.mapper';
import { CreateEventDto, EventPage, EventResponse, ListEventsQuery, UpdateEventDto } from './events.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateEventDto): Promise<EventResponse> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (startsAt <= new Date()) throw new BadRequestException('startsAt must be in the future.');
    assertTimeRange(startsAt, endsAt);

    const event = await this.prisma.event.create({
      data: {
        creatorId: userId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startsAt,
        endsAt,
        capacity: dto.capacity ?? null,
        reminderMinutes: dto.reminderMinutes ?? null,
        status: dto.status ?? 'published',
      },
      include: eventInclude,
    });
    return toEventResponse(event, null);
  }

  /** Upcoming published events, keyset-paginated on (startsAt, id) — served by idx_events_upcoming. */
  async list(query: ListEventsQuery): Promise<EventPage> {
    const limit = query.limit ?? 20;
    const where: Prisma.EventWhereInput = {
      status: 'published',
      deletedAt: null,
      startsAt: {
        gte: query.from ? new Date(query.from) : new Date(),
        ...(query.to && { lt: new Date(query.to) }),
      },
      ...(query.creatorId && { creatorId: query.creatorId }),
      ...(query.q && {
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { location: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    if (query.cursor) {
      const c = decodeCursor(query.cursor);
      where.AND = [{ OR: [{ startsAt: { gt: c.at } }, { startsAt: c.at, id: { gt: c.id } }] }];
    }

    const rows = await this.prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      items: page.map((e) => toEventResponse(e)),
      nextCursor: hasMore && last ? encodeCursor(last.startsAt, last.id) : null,
    };
  }

  async findOne(id: string, userId?: string | null): Promise<EventResponse> {
    const [event, mine] = await Promise.all([
      this.prisma.event.findFirst({ where: { id, deletedAt: null }, include: eventInclude }),
      userId
        ? this.prisma.rsvp.findUnique({ where: { eventId_userId: { eventId: id, userId } }, select: { status: true } })
        : null,
    ]);
    // Drafts are invisible to everyone but the host (404, not 403 — don't leak existence).
    if (!event || (event.status === 'draft' && event.creatorId !== userId)) {
      throw new NotFoundException('Event not found.');
    }
    return toEventResponse(event, userId ? (mine?.status ?? null) : undefined);
  }

  async update(id: string, userId: string, dto: UpdateEventDto): Promise<EventResponse> {
    const current = await this.getOwnedEvent(id, userId);
    if (current.status === 'cancelled') throw new ConflictException('Cancelled events cannot be edited.');

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;
    assertTimeRange(startsAt, endsAt);
    if (dto.capacity != null && dto.capacity < current.goingCount) {
      throw new ConflictException(
        `Capacity can't go below the ${current.goingCount} people already going.`,
      );
    }

    const { version, ...fields } = dto;
    const timeChanged =
      startsAt.getTime() !== current.startsAt.getTime() || endsAt.getTime() !== current.endsAt.getTime();
    const locationChanged = dto.location !== undefined && dto.location !== current.location;
    const capacityGrew =
      dto.capacity !== undefined && (dto.capacity === null || dto.capacity > (current.capacity ?? Infinity));

    await this.prisma.$transaction(async (tx) => {
      // Ownership + version are in the WHERE clause, so check and write are one atomic step.
      const result = await tx.event.updateMany({
        where: { id, creatorId: userId, deletedAt: null, ...(version !== undefined && { version }) },
        data: {
          ...fields,
          ...(dto.startsAt && { startsAt }),
          ...(dto.endsAt && { endsAt }),
          // New time or new reminder setting → re-arm the reminder.
          ...((timeChanged || (dto.reminderMinutes !== undefined && dto.reminderMinutes !== current.reminderMinutes)) && {
            reminderSentAt: null,
          }),
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new ConflictException('This event was changed by someone else. Reload and try again.');
      }
      // More seats → move people off the waitlist straight away.
      if (capacityGrew) await promoteFromWaitlist(tx, id, this.notifications);
      if (current.status === 'published' && (timeChanged || locationChanged)) {
        const what = [timeChanged && 'time', locationChanged && 'location'].filter(Boolean).join(' and ');
        await this.notifications.notifyAttendees(
          id,
          'event_updated',
          `${dto.title ?? current.title} has a new ${what}`,
          'The host updated this event. Check the details.',
          tx,
        );
      }
    });
    return this.findOne(id, userId);
  }

  /** Soft delete: keeps the attendee history (and lets us notify attendees later). */
  async remove(id: string, userId: string): Promise<void> {
    const event = await this.getOwnedEvent(id, userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: { status: 'cancelled', deletedAt: new Date(), version: { increment: 1 } },
      });
      if (event.status === 'published' && event.startsAt > new Date()) {
        await this.notifications.notifyAttendees(
          id,
          'event_cancelled',
          `${event.title} was cancelled`,
          'The host cancelled this event.',
          tx,
        );
      }
    });
  }

  private async getOwnedEvent(id: string, userId: string) {
    const event = await this.prisma.event.findFirst({ where: { id, deletedAt: null } });
    if (!event) throw new NotFoundException('Event not found.');
    if (event.creatorId !== userId) throw new ForbiddenException('Only the host can change this event.');
    return event;
  }
}

function assertTimeRange(startsAt: Date, endsAt: Date) {
  if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt.');
}
