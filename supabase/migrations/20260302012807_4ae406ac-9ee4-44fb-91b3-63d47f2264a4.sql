
-- Add nurture tracking columns to waitlist
ALTER TABLE public.waitlist 
ADD COLUMN nurture_step integer NOT NULL DEFAULT 0,
ADD COLUMN nurture_sent_at timestamp with time zone;

-- Index for efficient querying of pending nurture emails
CREATE INDEX idx_waitlist_nurture ON public.waitlist (nurture_step, nurture_sent_at);
