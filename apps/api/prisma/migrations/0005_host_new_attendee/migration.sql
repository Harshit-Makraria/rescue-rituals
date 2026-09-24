-- Hosts are notified when someone RSVPs to their event.
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'new_attendee';
