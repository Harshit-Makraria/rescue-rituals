import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from './mailer.service';

interface DueEvent {
  id: string;
  title: string;
  starts_at: Date;
  location: string | null;
}

/**
 * Sends event reminders ("starts in 1 hour") to everyone going.
 *
 * Safe with any number of API instances running this cron at once:
 *  - Claiming: one UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) marks
 *    due events as sent. Concurrent runs skip rows another run has locked, so
 *    each event is claimed exactly once.
 *  - Idempotency: a partial unique index allows one reminder per (user, event);
 *    inserts use ON CONFLICT DO NOTHING.
 *  - Claim and inserts share one transaction: if inserting fails, the claim
 *    rolls back and the next run retries.
 * Editing an event's start time resets reminder_sent_at, so the reminder is
 * re-armed for the new time.
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'event-reminders', disabled: process.env.REMINDERS_DISABLED === 'true' })
  async tick() {
    try {
      const sent = await this.sendDueReminders();
      if (sent.events) this.logger.log(`Reminders: ${sent.notifications} sent for ${sent.events} event(s)`);
    } catch (e) {
      this.logger.error('Reminder run failed', (e as Error).stack);
    }
  }

  async sendDueReminders(batchSize = 50): Promise<{ events: number; notifications: number }> {
    const emails: { to: string; subject: string; text: string }[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      const due = await tx.$queryRaw<DueEvent[]>`
        UPDATE events SET reminder_sent_at = now()
        WHERE id IN (
          SELECT id FROM events
          WHERE reminder_minutes IS NOT NULL
            AND reminder_sent_at IS NULL
            AND deleted_at IS NULL
            AND status = 'published'
            AND starts_at > now()
            AND starts_at <= now() + make_interval(mins => reminder_minutes)
          ORDER BY starts_at
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, title, starts_at, location`;

      let notifications = 0;
      for (const event of due) {
        const when = formatLead(event.starts_at);
        const title = `Reminder: ${event.title} ${when}`;
        const body = event.location ? `See you at ${event.location}.` : 'See you there.';
        notifications += await tx.$executeRaw`
          INSERT INTO notifications (user_id, event_id, type, title, body)
          SELECT r.user_id, r.event_id, 'event_reminder', ${title}, ${body}
          FROM rsvps r
          WHERE r.event_id = ${event.id}::uuid AND r.status = 'going'
          ON CONFLICT (user_id, event_id, type) WHERE type = 'event_reminder' DO NOTHING`;

        if (this.mailer.enabled) {
          const people = await tx.rsvp.findMany({
            where: { eventId: event.id, status: 'going' },
            select: { user: { select: { email: true, name: true } } },
          });
          people.forEach(({ user }) =>
            emails.push({ to: user.email, subject: title, text: `Hi ${user.name},\n\n${title}. ${body}` }),
          );
        }
      }
      return { events: due.length, notifications };
    });

    // Email after commit, outside the transaction: slow I/O never holds row locks.
    await Promise.allSettled(emails.map((m) => this.mailer.send(m.to, m.subject, m.text)));
    return result;
  }
}

function formatLead(startsAt: Date) {
  const minutes = Math.max(1, Math.round((startsAt.getTime() - Date.now()) / 60_000));
  if (minutes < 60) return `starts in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `starts in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `starts in ${days} day${days === 1 ? '' : 's'}`;
}
