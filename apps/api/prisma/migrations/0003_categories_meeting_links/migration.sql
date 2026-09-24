-- Categories for discovery
CREATE TYPE "event_category" AS ENUM ('tech', 'music', 'food', 'sports', 'arts', 'networking', 'outdoors', 'other');

ALTER TABLE "events"
    ADD COLUMN "category" "event_category" NOT NULL DEFAULT 'other',
    -- Online meeting link: only revealed to people going and to the host
    ADD COLUMN "meeting_url" TEXT,
    ADD CONSTRAINT "chk_meeting_url" CHECK ("meeting_url" IS NULL OR "meeting_url" ~ '^https://');

-- "Upcoming events in category X", in the same order as the keyset pagination
CREATE INDEX "idx_events_category_upcoming" ON "events" ("category", "starts_at", "id")
    WHERE "status" = 'published' AND "deleted_at" IS NULL;
