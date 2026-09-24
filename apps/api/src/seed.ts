/**
 * Idempotent demo data, run on every deploy (`npm run render:start`).
 * Creates demo users once, and demo events only when there are no upcoming ones,
 * so reviewers always land on a populated app.
 */
import { EventCategory, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const PASSWORD = 'Password123!';
const DAY = 24 * 60 * 60 * 1000;

const at = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour, 30, 0, 0); // hour is UTC; 13:30 UTC = 7 PM IST / 9:30 AM ET
  return d;
};

async function main() {
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const people = [
    { email: 'demo@events.dev', name: 'Demo Host' },
    { email: 'guest@events.dev', name: 'Guest User' },
    ...['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Sara', 'Vikram', 'Zoya'].map((n) => ({
      email: `${n.toLowerCase()}@events.dev`,
      name: `${n} ${n === 'Sara' ? 'Khan' : 'Sharma'}`,
    })),
  ];
  const users = await Promise.all(
    people.map((p) =>
      prisma.user.upsert({ where: { email: p.email }, update: {}, create: { ...p, passwordHash } }),
    ),
  );
  const [host, , ...crowd] = users;

  // Backfill newer fields on the demo events (idempotent: only touches rows still at defaults).
  const demoMeta: Record<string, { category: EventCategory; meetingUrl?: string; reminderMinutes?: number }> = {
    'Postgres Performance Night': { category: 'tech', reminderMinutes: 60 },
    'Founders & Builders Breakfast': { category: 'networking', reminderMinutes: 1440 },
    'NestJS at Scale — Remote Session': { category: 'tech', meetingUrl: 'https://meet.google.com/gat-herd-emo', reminderMinutes: 15 },
    'Weekend Trek: Nandi Hills Sunrise': { category: 'outdoors', reminderMinutes: 180 },
    'GenAI Product Demo Day': { category: 'tech', reminderMinutes: 60 },
  };
  const backfill = async () => {
    for (const [title, meta] of Object.entries(demoMeta)) {
      await prisma.event.updateMany({ where: { title, creatorId: host.id, category: 'other' }, data: meta });
    }
  };
  await backfill();

  const upcoming = await prisma.event.count({ where: { startsAt: { gt: new Date() }, deletedAt: null } });
  if (upcoming > 0) {
    console.log(`Seed: ${upcoming} upcoming events exist — skipping events.`);
    return;
  }

  const events = [
    {
      title: 'Postgres Performance Night',
      description: 'EXPLAIN ANALYZE live on real slow queries, index design, and how MVCC actually works. Bring your worst query.',
      location: 'Koramangala, Bengaluru',
      startsAt: at(3, 13), endsAt: at(3, 16), capacity: 8, attendees: crowd.slice(0, 7), // one seat left
    },
    {
      title: 'Founders & Builders Breakfast',
      description: 'Small-table breakfast for early-stage founders and engineers. No slides, just conversations.',
      location: 'Indiranagar, Bengaluru',
      startsAt: at(5, 3), endsAt: at(5, 5), capacity: 3, attendees: crowd.slice(0, 3), // full → waitlist
    },
    {
      title: 'NestJS at Scale — Remote Session',
      description: 'Modules, guards, queues and observability for NestJS in production. Overlaps IST evening and ET morning.',
      location: 'Online (Google Meet)',
      startsAt: at(7, 13), endsAt: at(7, 15), capacity: null, attendees: crowd.slice(2, 8),
    },
    {
      title: 'Weekend Trek: Nandi Hills Sunrise',
      description: 'Early start, easy trail, great views. Carpool from the city.',
      location: 'Nandi Hills',
      startsAt: at(10, 23), endsAt: at(11, 5), capacity: 20, attendees: crowd.slice(0, 5),
    },
    {
      title: 'GenAI Product Demo Day',
      description: 'Ten-minute demos of LLM-powered products, with honest Q&A on what broke in production.',
      location: 'HSR Layout, Bengaluru',
      startsAt: at(14, 12), endsAt: at(14, 15), capacity: 40, attendees: crowd.slice(1, 4),
    },
  ];

  for (const { attendees, ...data } of events) {
    await prisma.event.create({
      data: {
        ...data,
        creatorId: host.id,
        goingCount: attendees.length,
        rsvps: { create: attendees.map((u) => ({ userId: u.id, status: 'going' as const })) },
      },
    });
  }
  await backfill();
  console.log(`Seed: created ${events.length} events. Log in as demo@events.dev or guest@events.dev / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
