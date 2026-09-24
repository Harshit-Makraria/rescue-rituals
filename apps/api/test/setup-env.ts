// e2e tests run against a real Postgres (never mocks: constraints and races are the point).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://events:events@localhost:5433/events_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.THROTTLE_DISABLED = 'true';
process.env.REMINDERS_DISABLED = 'true'; // tests trigger the job directly
