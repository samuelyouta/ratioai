-- Push notification device tokens
CREATE TABLE public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can register a device token (pre-auth, waitlist phase)
CREATE POLICY "Anyone can insert their device token"
ON public.push_tokens FOR INSERT
WITH CHECK (true);

-- No public reads (only service role can read for sending pushes)
CREATE POLICY "No public reads"
ON public.push_tokens FOR SELECT
USING (false);

-- Auto-update timestamp trigger (reuses existing function if present, otherwise creates)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_push_tokens_email ON public.push_tokens(email);