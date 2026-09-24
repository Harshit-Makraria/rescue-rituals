import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { RSVP_STATUSES, RsvpStatusValue } from '../events/events.dto';

export class RsvpResponse {
  eventId: string;
  /** `going` if you got a seat, `waitlisted` if the event is full. */
  @ApiProperty({ enum: RSVP_STATUSES })
  status: RsvpStatusValue;
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
  /** When this person got their seat */
  joinedAt: Date;
}

export class AttendeePage {
  @ApiProperty({ type: [Attendee] })
  items: Attendee[];
  total: number;
  nextCursor: string | null;
}
