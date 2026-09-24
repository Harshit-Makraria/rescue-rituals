import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const EVENT_STATUSES = ['draft', 'published', 'cancelled'] as const;
export type EventStatusValue = (typeof EVENT_STATUSES)[number];
export const RSVP_STATUSES = ['going', 'waitlisted', 'cancelled'] as const;
export type RsvpStatusValue = (typeof RSVP_STATUSES)[number];

export class CreateEventDto {
  /** @example "Bangalore Backend Meetup" */
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  /** @example "Talks on Postgres internals and NestJS at scale." */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** @example "91springboard, Koramangala" */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  /** ISO 8601, must be in the future. @example "2026-10-10T12:30:00.000Z" */
  @IsDateString()
  startsAt: string;

  /** ISO 8601, after startsAt. @example "2026-10-10T15:30:00.000Z" */
  @IsDateString()
  endsAt: string;

  /** Max attendees. Omit or null for unlimited. @example 50 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  capacity?: number | null;

  /** `draft` events are visible only to their host. */
  @IsOptional()
  @ApiProperty({ enum: ['draft', 'published'], default: 'published', required: false })
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';
}

export class UpdateEventDto extends PartialType(CreateEventDto) {
  /**
   * Optimistic lock: send the `version` you last read. If someone else edited
   * the event since, you get 409 instead of silently overwriting their change.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  version?: number;
}

export class ListEventsQuery {
  /** Only events starting at/after this time. Defaults to now. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Only events starting before this time. */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Case-insensitive search on title and location. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsUUID()
  creatorId?: string;

  /** Opaque cursor from the previous page's `nextCursor`. */
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class HostResponse {
  id: string;
  name: string;
}

export class EventResponse {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  goingCount: number;
  /** null when capacity is unlimited */
  seatsLeft: number | null;
  @ApiProperty({ enum: EVENT_STATUSES })
  status: EventStatusValue;
  version: number;
  host: HostResponse;
  createdAt: Date;
  updatedAt: Date;
  /** The caller's RSVP status — present only when a valid token is sent. */
  @ApiProperty({ enum: RSVP_STATUSES, nullable: true, required: false })
  myRsvpStatus?: RsvpStatusValue | null;
}

export class EventPage {
  @ApiProperty({ type: [EventResponse] })
  items: EventResponse[];
  /** Pass as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
}
