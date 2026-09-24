import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { execSync } from 'child_process';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { RemindersService } from '../src/notifications/reminders.service';
import { PrismaService } from '../src/prisma/prisma.service';

const HOUR = 60 * 60 * 1000;
const future = (h: number) => new Date(Date.now() + h * HOUR).toISOString();

describe('Events API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let n = 0;

  const register = async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `user${++n}-${Date.now()}@test.dev`, password: 'Password123!', name: `User ${n}` })
      .expect(201);
    return res.body as { accessToken: string; refreshToken: string; user: { id: string } };
  };

  const createEvent = (token: string, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test event', startsAt: future(24), endsAt: future(26), ...body });

  beforeAll(async () => {
    execSync('npx prisma migrate deploy', { env: process.env, stdio: 'ignore' });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app as NestExpressApplication);
    await app.listen(0); // one real server: avoids supertest re-listening per request
    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe('TRUNCATE notifications, rsvps, events, users CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('registers, rejects duplicate email, logs in, rotates refresh tokens', async () => {
      const email = `auth-${Date.now()}@test.dev`;
      const server = app.getHttpServer();
      await request(server).post('/api/v1/auth/register').send({ email, password: 'Password123!', name: 'A' }).expect(201);
      await request(server).post('/api/v1/auth/register').send({ email, password: 'Password123!', name: 'A' }).expect(409);
      await request(server).post('/api/v1/auth/login').send({ email, password: 'wrong-password' }).expect(401);

      const login = await request(server).post('/api/v1/auth/login').send({ email, password: 'Password123!' }).expect(200);
      const first = login.body.refreshToken;
      const rotated = await request(server).post('/api/v1/auth/refresh').send({ refreshToken: first }).expect(200);
      expect(rotated.body.refreshToken).not.toEqual(first);
      // Reusing the old refresh token revokes the session
      await request(server).post('/api/v1/auth/refresh').send({ refreshToken: first }).expect(401);
      await request(server).post('/api/v1/auth/refresh').send({ refreshToken: rotated.body.refreshToken }).expect(401);
    });

    it('rejects unknown fields (mass assignment)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'x@test.dev', password: 'Password123!', name: 'X', isAdmin: true })
        .expect(400);
    });
  });

  describe('events', () => {
    it('requires auth to create, validates times, and lists upcoming events', async () => {
      const server = app.getHttpServer();
      await request(server).post('/api/v1/events').send({ title: 'Nope', startsAt: future(1), endsAt: future(2) }).expect(401);

      const host = await register();
      await createEvent(host.accessToken, { startsAt: future(5), endsAt: future(4) }).expect(400);
      const created = await createEvent(host.accessToken, { title: 'Listed event', capacity: 5 }).expect(201);
      expect(created.body).toMatchObject({ title: 'Listed event', capacity: 5, goingCount: 0, seatsLeft: 5, version: 1 });
      expect(created.body.host.id).toBe(host.user.id);

      const list = await request(server).get('/api/v1/events?q=listed').expect(200);
      expect(list.body.items.map((e: { id: string }) => e.id)).toContain(created.body.id);
    });

    it('paginates with a cursor without duplicates', async () => {
      const host = await register();
      for (let i = 0; i < 5; i++) await createEvent(host.accessToken, { title: `Page ${i}`, startsAt: future(100 + i), endsAt: future(101 + i) });
      const server = app.getHttpServer();
      const p1 = await request(server).get(`/api/v1/events?creatorId=${host.user.id}&limit=3`).expect(200);
      expect(p1.body.items).toHaveLength(3);
      const p2 = await request(server).get(`/api/v1/events?creatorId=${host.user.id}&limit=3&cursor=${p1.body.nextCursor}`).expect(200);
      expect(p2.body.items).toHaveLength(2);
      expect(p2.body.nextCursor).toBeNull();
      const titles = [...p1.body.items, ...p2.body.items].map((e: { title: string }) => e.title);
      expect(titles).toEqual(['Page 0', 'Page 1', 'Page 2', 'Page 3', 'Page 4']);
    });

    it('lets only the host edit or delete, with optimistic locking', async () => {
      const host = await register();
      const other = await register();
      const server = app.getHttpServer();
      const { body: event } = await createEvent(host.accessToken).expect(201);

      await request(server).patch(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${other.accessToken}`).send({ title: 'Hijacked' }).expect(403);
      await request(server).delete(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${other.accessToken}`).expect(403);

      const edited = await request(server).patch(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${host.accessToken}`).send({ title: 'Renamed', version: 1 }).expect(200);
      expect(edited.body).toMatchObject({ title: 'Renamed', version: 2 });
      // Stale version → 409 instead of a silent lost update
      await request(server).patch(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${host.accessToken}`).send({ title: 'Stale', version: 1 }).expect(409);

      await request(server).delete(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${host.accessToken}`).expect(204);
      await request(server).get(`/api/v1/events/${event.id}`).expect(404);
    });

    it('hides drafts from everyone but the host', async () => {
      const host = await register();
      const other = await register();
      const { body: draft } = await createEvent(host.accessToken, { status: 'draft' }).expect(201);
      const server = app.getHttpServer();
      await request(server).get(`/api/v1/events/${draft.id}`).set('Authorization', `Bearer ${other.accessToken}`).expect(404);
      await request(server).get(`/api/v1/events/${draft.id}`).set('Authorization', `Bearer ${host.accessToken}`).expect(200);
    });
  });

  describe('rsvp', () => {
    it('is idempotent and reports myRsvpStatus', async () => {
      const host = await register();
      const guest = await register();
      const { body: event } = await createEvent(host.accessToken, { capacity: 10 }).expect(201);
      const server = app.getHttpServer();
      const rsvp = () => request(server).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${guest.accessToken}`);

      expect((await rsvp().expect(200)).body).toMatchObject({ status: 'going', goingCount: 1, seatsLeft: 9 });
      expect((await rsvp().expect(200)).body).toMatchObject({ status: 'going', goingCount: 1 });

      const detail = await request(server).get(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${guest.accessToken}`).expect(200);
      expect(detail.body.myRsvpStatus).toBe('going');
      const attendees = await request(server).get(`/api/v1/events/${event.id}/attendees`).expect(200);
      expect(attendees.body.total).toBe(1);
    });

    it('never overbooks under 50 concurrent RSVPs for 10 seats', async () => {
      const host = await register();
      const { body: event } = await createEvent(host.accessToken, { capacity: 10 }).expect(201);
      const guests = await Promise.all(Array.from({ length: 50 }, register));

      const results = await Promise.all(
        guests.map((g) =>
          request(app.getHttpServer()).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${g.accessToken}`),
        ),
      );

      expect(results.every((r) => r.status === 200)).toBe(true);
      const statuses = results.map((r) => r.body.status);
      expect(statuses.filter((s) => s === 'going')).toHaveLength(10);
      expect(statuses.filter((s) => s === 'waitlisted')).toHaveLength(40);

      const row = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
      const going = await prisma.rsvp.count({ where: { eventId: event.id, status: 'going' } });
      expect(row.goingCount).toBe(10);
      expect(going).toBe(10); // counter and rows agree
    });

    it('promotes the oldest waitlisted guest when someone cancels', async () => {
      const host = await register();
      const [a, b, c] = [await register(), await register(), await register()];
      const { body: event } = await createEvent(host.accessToken, { capacity: 1 }).expect(201);
      const server = app.getHttpServer();
      const rsvp = (t: string) => request(server).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${t}`);

      expect((await rsvp(a.accessToken)).body.status).toBe('going');
      expect((await rsvp(b.accessToken)).body.status).toBe('waitlisted');
      expect((await rsvp(c.accessToken)).body.status).toBe('waitlisted');

      await request(server).delete(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${a.accessToken}`).expect(200);
      const bStatus = await request(server).get(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${b.accessToken}`);
      const cStatus = await request(server).get(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${c.accessToken}`);
      expect(bStatus.body.myRsvpStatus).toBe('going');
      expect(cStatus.body.myRsvpStatus).toBe('waitlisted');
      expect(bStatus.body.goingCount).toBe(1);
    });

    it('rejects lowering capacity below the number going', async () => {
      const host = await register();
      const [a, b] = [await register(), await register()];
      const { body: event } = await createEvent(host.accessToken, { capacity: 5 }).expect(201);
      const server = app.getHttpServer();
      for (const g of [a, b]) await request(server).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${g.accessToken}`).expect(200);
      await request(server).patch(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${host.accessToken}`).send({ capacity: 1 }).expect(409);
    });
  });
  describe('reminders & notifications', () => {
    const inbox = (t: string) =>
      request(app.getHttpServer()).get('/api/v1/users/me/notifications').set('Authorization', `Bearer ${t}`).expect(200);

    it('sends each due reminder exactly once, even when two job runs overlap', async () => {
      const host = await register();
      const [a, b] = [await register(), await register()];
      const { body: event } = await createEvent(host.accessToken, {
        title: 'Reminder test', startsAt: future(0.5), endsAt: future(1.5), reminderMinutes: 60,
      }).expect(201);
      expect(event.reminderMinutes).toBe(60);
      const server = app.getHttpServer();
      for (const g of [a, b]) await request(server).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${g.accessToken}`).expect(200);

      const reminders = app.get(RemindersService);
      const runs = await Promise.all([reminders.sendDueReminders(), reminders.sendDueReminders()]);
      expect(runs.reduce((n, r) => n + r.events, 0)).toBe(1); // claimed by exactly one run
      await reminders.sendDueReminders(); // later runs find nothing new

      const { body } = await inbox(a.accessToken);
      const mine = body.items.filter((n: { type: string; eventId: string }) => n.type === 'event_reminder' && n.eventId === event.id);
      expect(mine).toHaveLength(1);
      expect(mine[0].title).toMatch(/Reminder: Reminder test starts in/);
      expect(body.unreadCount).toBeGreaterThanOrEqual(1);

      await request(server).post('/api/v1/users/me/notifications/read-all').set('Authorization', `Bearer ${a.accessToken}`).expect(204);
      expect((await inbox(a.accessToken)).body.unreadCount).toBe(0);
    });

    it('does not remind events outside their reminder window', async () => {
      const host = await register();
      const { body: event } = await createEvent(host.accessToken, { startsAt: future(48), endsAt: future(49), reminderMinutes: 60 }).expect(201);
      await app.get(RemindersService).sendDueReminders();
      const row = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
      expect(row.reminderSentAt).toBeNull();
    });

    it('raising capacity promotes the waitlist and notifies the promoted guests', async () => {
      const host = await register();
      const [a, b, c] = [await register(), await register(), await register()];
      const { body: event } = await createEvent(host.accessToken, { capacity: 1 }).expect(201);
      const server = app.getHttpServer();
      for (const g of [a, b, c]) await request(server).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${g.accessToken}`).expect(200);

      const edited = await request(server).patch(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${host.accessToken}`).send({ capacity: 3 }).expect(200);
      expect(edited.body).toMatchObject({ goingCount: 3, seatsLeft: 0 });
      const { body } = await inbox(c.accessToken);
      expect(body.items.some((n: { type: string }) => n.type === 'waitlist_promoted')).toBe(true);
    });

    it('notifies attendees when the time changes or the event is cancelled', async () => {
      const host = await register();
      const guest = await register();
      const { body: event } = await createEvent(host.accessToken).expect(201);
      const server = app.getHttpServer();
      await request(server).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${guest.accessToken}`).expect(200);
      await request(server).patch(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${host.accessToken}`).send({ startsAt: future(30), endsAt: future(32) }).expect(200);
      await request(server).delete(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${host.accessToken}`).expect(204);
      const types = (await inbox(guest.accessToken)).body.items.map((n: { type: string }) => n.type);
      expect(types).toEqual(expect.arrayContaining(['event_updated', 'event_cancelled']));
    });
  });
  describe('categories, calendar, meeting links, waitlist', () => {
    it('filters the list by category', async () => {
      const host = await register();
      const { body: music } = await createEvent(host.accessToken, { title: 'Jazz night', category: 'music' }).expect(201);
      await createEvent(host.accessToken, { title: 'Board games', category: 'other' }).expect(201);
      const { body } = await request(app.getHttpServer()).get(`/api/v1/events?category=music&creatorId=${host.user.id}`).expect(200);
      expect(body.items.map((e: { id: string }) => e.id)).toEqual([music.id]);
      await request(app.getHttpServer()).get('/api/v1/events?category=nope').expect(400);
    });

    it('reveals the meeting link only to the host and people going', async () => {
      const host = await register();
      const [going, stranger] = [await register(), await register()];
      const { body: event } = await createEvent(host.accessToken, { meetingUrl: 'https://meet.example.com/abc' }).expect(201);
      expect(event.meetingUrl).toBe('https://meet.example.com/abc'); // host
      await createEvent(host.accessToken, { meetingUrl: 'http://insecure.example.com' }).expect(400);

      const server = app.getHttpServer();
      const get = (t?: string) => {
        const r = request(server).get(`/api/v1/events/${event.id}`);
        return (t ? r.set('Authorization', `Bearer ${t}`) : r).expect(200);
      };
      const anon = (await get()).body;
      expect(anon.hasMeetingLink).toBe(true);
      expect(anon.meetingUrl).toBeUndefined();
      expect((await get(stranger.accessToken)).body.meetingUrl).toBeUndefined();

      await request(server).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${going.accessToken}`).expect(200);
      expect((await get(going.accessToken)).body.meetingUrl).toBe('https://meet.example.com/abc');
      const list = await request(server).get(`/api/v1/events?creatorId=${host.user.id}`).expect(200);
      expect(list.body.items.every((e: { meetingUrl?: string }) => e.meetingUrl === undefined)).toBe(true);
    });

    it('serves a valid .ics file without the private link', async () => {
      const host = await register();
      const { body: event } = await createEvent(host.accessToken, {
        title: 'Calendar, test; event', meetingUrl: 'https://meet.example.com/secret',
      }).expect(201);
      const res = await request(app.getHttpServer()).get(`/api/v1/events/${event.id}/calendar.ics`).expect(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.headers['content-disposition']).toContain('.ics');
      expect(res.text).toContain('BEGIN:VEVENT');
      expect(res.text).toContain('SUMMARY:Calendar\\, test\\; event'); // RFC 5545 escaping
      expect(res.text).not.toContain('secret');
    });

    it('shows the waitlist to the host only, in promotion order', async () => {
      const host = await register();
      const [a, b, c] = [await register(), await register(), await register()];
      const { body: event } = await createEvent(host.accessToken, { capacity: 1 }).expect(201);
      const server = app.getHttpServer();
      for (const g of [a, b, c]) await request(server).post(`/api/v1/events/${event.id}/rsvp`).set('Authorization', `Bearer ${g.accessToken}`).expect(200);
      await request(server).get(`/api/v1/events/${event.id}/waitlist`).set('Authorization', `Bearer ${a.accessToken}`).expect(403);
      const { body } = await request(server).get(`/api/v1/events/${event.id}/waitlist`).set('Authorization', `Bearer ${host.accessToken}`).expect(200);
      expect(body.items.map((p: { userId: string }) => p.userId)).toEqual([b.user.id, c.user.id]);
    });
  });
});
