-- Reminders: the host chooses how long before the event attendees are reminded.
ALTER TABLE "events"
    ADD COLUMN "reminder_minutes" INTEGER,
    ADD COLUMN "reminder_sent_at" TIMESTAMPTZ(3),
    ADD CONSTRAINT "chk_reminder_minutes" CHECK ("reminder_minutes" IS NULL OR "reminder_minutes" BETWEEN 5 AND 10080);

-- The reminder job's scan: only events that still owe a reminder, ordered by start time.
CREATE INDEX "idx_events_reminder_due" ON "events" ("starts_at")
    WHERE "reminder_minutes" IS NOT NULL AND "reminder_sent_at" IS NULL AND "deleted_at" IS NULL;

-- In-app notifications
CREATE TYPE "notification_type" AS ENUM ('event_reminder', 'waitlist_promoted', 'event_updated', 'event_cancelled');

CREATE TABLE "notifications" (
    "id"         UUID                NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID                NOT NULL,
    "event_id"   UUID,
    "type"       "notification_type" NOT NULL,
    "title"      TEXT                NOT NULL,
    "body"       TEXT                NOT NULL,
    "read_at"    TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3)      NOT NULL DEFAULT now(),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id")
        REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Inbox: newest first per user
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" ("user_id", "created_at" DESC);
-- At most one reminder per (user, event), even if two job runs overlap
CREATE UNIQUE INDEX "uq_notification_reminder" ON "notifications" ("user_id", "event_id", "type")
    WHERE "type" = 'event_reminder';
