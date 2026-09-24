import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPage, NotificationTypeValue } from './notifications.dto';

type Db = PrismaService | Prisma.TransactionClient;

export interface NewNotification {
  userId: string;
  eventId?: string | null;
  type: NotificationTypeValue;
  title: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Accepts a transaction client so notifications commit atomically with the change that caused them. */
  async notify(items: NewNotification[], db: Db = this.prisma): Promise<void> {
    if (items.length) await db.notification.createMany({ data: items });
  }

  /** Notify everyone who is going or waitlisted for an event. */
  async notifyAttendees(
    eventId: string,
    type: NotificationTypeValue,
    title: string,
    body: string,
    db: Db = this.prisma,
  ): Promise<void> {
    const rsvps = await db.rsvp.findMany({
      where: { eventId, status: { in: ['going', 'waitlisted'] } },
      select: { userId: true },
    });
    await this.notify(rsvps.map((r) => ({ userId: r.userId, eventId, type, title, body })), db);
  }

  async list(userId: string, unreadOnly = false): Promise<NotificationPage> {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, ...(unreadOnly && { readAt: null }) },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, type: true, title: true, body: true, eventId: true, readAt: true, createdAt: true },
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0) {
      const exists = await this.prisma.notification.count({ where: { id, userId } });
      if (!exists) throw new NotFoundException('Notification not found.');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}
