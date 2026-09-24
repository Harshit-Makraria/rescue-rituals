import { Event, RsvpStatus } from '@prisma/client';
import { EventResponse } from './events.dto';

export type EventWithHost = Event & {
  creator: { id: string; name: string };
  rsvps?: { user: { name: string } }[];
};

/** Host + the first few attendees (for avatar stacks). Prisma batches the nested read: no N+1. */
export const eventInclude = {
  creator: { select: { id: true, name: true } },
  rsvps: {
    where: { status: 'going' },
    orderBy: { updatedAt: 'asc' },
    take: 4,
    select: { user: { select: { name: true } } },
  },
} as const;

/**
 * `viewerId` controls field-level access: the meeting link is revealed only to
 * the host and to people going. Everyone else just sees `hasMeetingLink`.
 */
export function toEventResponse(
  event: EventWithHost,
  myRsvpStatus?: RsvpStatus | null,
  viewerId?: string | null,
): EventResponse {
  const canSeeLink = Boolean(viewerId && (viewerId === event.creatorId || myRsvpStatus === 'going'));
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    capacity: event.capacity,
    goingCount: event.goingCount,
    seatsLeft: event.capacity === null ? null : Math.max(event.capacity - event.goingCount, 0),
    status: event.status,
    version: event.version,
    reminderMinutes: event.reminderMinutes,
    category: event.category,
    hasMeetingLink: Boolean(event.meetingUrl),
    ...(canSeeLink && { meetingUrl: event.meetingUrl }),
    host: event.creator,
    attendeePreview: event.rsvps?.map((r) => r.user.name) ?? [],
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    ...(myRsvpStatus !== undefined && { myRsvpStatus }),
  };
}
