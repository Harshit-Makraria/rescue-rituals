import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsUrl,
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
export const EVENT_CATEGORIES = ['tech', 'music', 'food', 'sports', 'arts', 'networking', 'outdoors', 'other'] as const;
export type EventCategoryValue = (typeof EVENT_CATEGORIES)[number];
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

  @IsOptional()
  @ApiProperty({ enum: EVENT_CATEGORIES, default: 'other', required: false })
  @IsIn(EVENT_CATEGORIES)
  category?: EventCategoryValue;

  /** Online meeting link (https). Only people going and the host can see it. @example "https://meet.google.com/abc-defg-hij" */
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'meetingUrl must be an https:// link' })
  @MaxLength(500)
  meetingUrl?: string | null;

  /** Remind attendees this many minutes before the start (5 min – 7 days). Omit or null for no reminder. @example 60 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(10_080)
  reminderMinutes?: number | null;

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

  @IsOptional()
  @ApiProperty({ enum: EVENT_CATEGORIES, required: false })
  @IsIn(EVENT_CATEGORIES)
  category?: EventCategoryValue;

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
  /** Minutes before start that attendees get a reminder; null = none */
  reminderMinutes: number | null;
  @ApiProperty({ enum: EVENT_CATEGORIES })
  category: EventCategoryValue;
  /** True if the event has an online link (the link itself may be hidden from you) */
  hasMeetingLink: boolean;
  /** The online link. Present only for the host and people going. */
  @ApiProperty({ type: String, nullable: true, required: false })
  meetingUrl?: string | null;
  host: HostResponse;
  /** Names of the first few people going (for avatar stacks) */
  attendeePreview: string[];
  createdAt: Date;
  updatedAt: Date;
  /** Your own RSVP details (plus-ones, phone, note) — present only if you have an active RSVP. */
  @ApiProperty({ type: () => MyRsvp, nullable: true, required: false })
  myRsvp?: MyRsvp | null;
  /** The caller's RSVP status — present only when a valid token is sent. */
  @ApiProperty({ enum: RSVP_STATUSES, nullable: true, required: false })
  myRsvpStatus?: RsvpStatusValue | null;
}

export class MyRsvp {
  plusOnes: number;
  phone: string | null;
  note: string | null;
}

export class EventPage {
  @ApiProperty({ type: [EventResponse] })
  items: EventResponse[];
  /** Pass as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
}
