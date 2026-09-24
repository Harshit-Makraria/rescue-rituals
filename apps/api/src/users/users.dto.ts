import { ApiProperty } from '@nestjs/swagger';
import { EventResponse } from '../events/events.dto';

export class MeResponse {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  /** Events you host (not cancelled) */
  hostingCount: number;
  /** Events you're going to */
  goingCount: number;
}

export class MyEventsResponse {
  @ApiProperty({ type: [EventResponse] })
  items: EventResponse[];
}
