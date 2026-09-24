import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export const NOTIFICATION_TYPES = ['event_reminder', 'waitlist_promoted', 'event_updated', 'event_cancelled'] as const;
export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[number];

export class NotificationResponse {
  id: string;
  @ApiProperty({ enum: NOTIFICATION_TYPES })
  type: NotificationTypeValue;
  title: string;
  body: string;
  /** Event this notification is about, if any */
  eventId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export class NotificationPage {
  @ApiProperty({ type: [NotificationResponse] })
  items: NotificationResponse[];
  unreadCount: number;
}

export class ListNotificationsQuery {
  /** Only unread notifications */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unread?: boolean;
}
