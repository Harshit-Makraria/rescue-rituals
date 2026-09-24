-- Enums
CREATE TYPE "event_status" AS ENUM ('draft', 'published', 'cancelled');
CREATE TYPE "rsvp_status" AS ENUM ('going', 'waitlisted', 'cancelled');

-- Users
CREATE TABLE "users" (
    "id"                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    "email"              TEXT           NOT NULL,
    "password_hash"      TEXT           NOT NULL,
    "name"               TEXT           NOT NULL,
    "refresh_token_hash" TEXT,
    "created_at"         TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at"         TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");

-- Events
CREATE TABLE "events" (
    "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
    "creator_id"  UUID           NOT NULL,
    "title"       TEXT           NOT NULL,
    "description" TEXT,
    "location"    TEXT,
    "starts_at"   TIMESTAMPTZ(3) NOT NULL,
    "ends_at"     TIMESTAMPTZ(3) NOT NULL,
    "capacity"    INTEGER,
    "going_count" INTEGER        NOT NULL DEFAULT 0,
    "status"      "event_status" NOT NULL DEFAULT 'published',
    "version"     INTEGER        NOT NULL DEFAULT 1,
    "created_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "deleted_at"  TIMESTAMPTZ(3),
    CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "events_creator_id_fkey" FOREIGN KEY ("creator_id")
        REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    -- The database itself refuses to overbook, whatever the application does
    CONSTRAINT "chk_capacity_positive" CHECK ("capacity" IS NULL OR "capacity" > 0),
    CONSTRAINT "chk_going_count" CHECK ("going_count" >= 0 AND ("capacity" IS NULL OR "going_count" <= "capacity")),
    CONSTRAINT "chk_event_time" CHECK ("ends_at" > "starts_at")
);
CREATE INDEX "events_creator_id_idx" ON "events" ("creator_id");
-- Hot read path: upcoming published events, sorted by start time (keyset pagination on starts_at, id)
CREATE INDEX "idx_events_upcoming" ON "events" ("starts_at", "id")
    WHERE "status" = 'published' AND "deleted_at" IS NULL;

-- RSVPs
CREATE TABLE "rsvps" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "event_id"   UUID           NOT NULL,
    "user_id"    UUID           NOT NULL,
    "status"     "rsvp_status"  NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rsvps_event_id_fkey" FOREIGN KEY ("event_id")
        REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rsvps_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- One RSVP row per (event, user): duplicate RSVPs are impossible even under races
CREATE UNIQUE INDEX "uq_rsvp_event_user" ON "rsvps" ("event_id", "user_id");
-- Attendee lists and oldest-first waitlist promotion
CREATE INDEX "rsvps_event_id_status_updated_at_idx" ON "rsvps" ("event_id", "status", "updated_at");
-- "My RSVPs"
CREATE INDEX "rsvps_user_id_status_idx" ON "rsvps" ("user_id", "status");
