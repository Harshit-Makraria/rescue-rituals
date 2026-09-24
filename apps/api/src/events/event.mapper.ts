import { Event, RsvpStatus } from '@prisma/client';
import { EventResponse } from './events.dto';

export type EventWithHost = Event & { creator: { id: string; name: string } };

export const hostSelect = { creator: { select: { id: true, name: true } } } as const;

export function toEventResponse(event: EventWithHost, myRsvpStatus?: RsvpStatus | null): EventResponse {
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
    host: event.creator,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    ...(myRsvpStatus !== undefined && { myRsvpStatus }),
  };
}
