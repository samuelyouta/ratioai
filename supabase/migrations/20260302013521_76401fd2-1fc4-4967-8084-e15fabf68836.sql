
-- Add unsubscribed column to waitlist
ALTER TABLE public.waitlist ADD COLUMN unsubscribed boolean NOT NULL DEFAULT false;
