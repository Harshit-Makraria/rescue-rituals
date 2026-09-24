import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decodeCursor, encodeCursor } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { hostSelect, toEventResponse } from './event.mapper';
import { CreateEventDto, EventPage, EventResponse, ListEventsQuery, UpdateEventDto } from './events.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

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
        status: dto.status ?? 'published',
      },
      include: hostSelect,
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
      include: hostSelect,
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
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...hostSelect,
        ...(userId && { rsvps: { where: { userId }, select: { status: true } } }),
      },
    });
    // Drafts are invisible to everyone but the host (404, not 403 — don't leak existence).
    if (!event || (event.status === 'draft' && event.creatorId !== userId)) {
      throw new NotFoundException('Event not found.');
    }
    const myRsvpStatus = userId ? (event.rsvps?.[0]?.status ?? null) : undefined;
    return toEventResponse(event, myRsvpStatus);
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
    // Ownership + version are in the WHERE clause, so check and write are one atomic step.
    const result = await this.prisma.event.updateMany({
      where: { id, creatorId: userId, deletedAt: null, ...(version !== undefined && { version }) },
      data: {
        ...fields,
        ...(dto.startsAt && { startsAt }),
        ...(dto.endsAt && { endsAt }),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConflictException('This event was changed by someone else. Reload and try again.');
    }
    return this.findOne(id, userId);
  }

  /** Soft delete: keeps the attendee history (and lets us notify attendees later). */
  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedEvent(id, userId);
    await this.prisma.event.update({
      where: { id },
      data: { status: 'cancelled', deletedAt: new Date(), version: { increment: 1 } },
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
