-- RSVP details. events.going_count now counts SEATS (people), i.e. 1 + plus_ones
-- per going RSVP. Existing rows have plus_ones = 0, so the counter stays correct.
ALTER TABLE "rsvps"
    ADD COLUMN "plus_ones" INTEGER NOT NULL DEFAULT 0,
    -- Host-only fields
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "note" TEXT,
    ADD CONSTRAINT "chk_plus_ones" CHECK ("plus_ones" BETWEEN 0 AND 5),
    ADD CONSTRAINT "chk_phone_len" CHECK ("phone" IS NULL OR char_length("phone") <= 30),
    ADD CONSTRAINT "chk_note_len" CHECK ("note" IS NULL OR char_length("note") <= 500);
