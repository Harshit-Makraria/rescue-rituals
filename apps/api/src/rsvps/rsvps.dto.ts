import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { RSVP_STATUSES, RsvpStatusValue } from '../events/events.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Optional RSVP details. Omitted fields keep their current value; `null` clears phone/note. */
export class RsvpDto {
  /** Extra people you're bringing (0–5). Each takes a seat. @example 1 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  plusOnes?: number;

  /** Only the host can see it. @example "+91 98765 43210" */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^\+?[0-9()\s-]{6,30}$/, { message: 'phone must be a valid phone number' })
  phone?: string | null;

  /** A note for the host, e.g. dietary needs. Only the host can see it. @example "Vegetarian" */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class RsvpResponse {
  eventId: string;
  /** `going` if you got a seat, `waitlisted` if the event is full. */
  @ApiProperty({ enum: RSVP_STATUSES })
  status: RsvpStatusValue;
  plusOnes: number;
  /** Seats taken (people going, including plus-ones) */
  goingCount: number;
  /** null when capacity is unlimited */
  seatsLeft: number | null;
}

export class AttendeesQuery {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;
}

export class Attendee {
  userId: string;
  name: string;
  plusOnes: number;
  /** When this person got their seat */
  joinedAt: Date;
}

export class AttendeePage {
  @ApiProperty({ type: [Attendee] })
  items: Attendee[];
  /** Seats taken (people going, including plus-ones) */
  total: number;
  nextCursor: string | null;
}

export class Guest {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  plusOnes: number;
  note: string | null;
  @ApiProperty({ enum: ['going', 'waitlisted'] })
  status: 'going' | 'waitlisted';
  /** When they got their seat / joined the waitlist */
  since: Date;
}

export class GuestList {
  @ApiProperty({ type: [Guest] })
  items: Guest[];
  goingRsvps: number;
  /** People going, including plus-ones */
  goingSeats: number;
  waitlisted: number;
}
