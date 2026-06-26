
CREATE TABLE public.app_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL UNIQUE,
  platform text,
  user_agent text,
  email text,
  profile jsonb,
  meals jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_sessions_client_id_idx ON public.app_sessions(client_id);

GRANT SELECT, INSERT, UPDATE ON public.app_sessions TO anon, authenticated;
GRANT ALL ON public.app_sessions TO service_role;

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a session"
  ON public.app_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read sessions by client id"
  ON public.app_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update sessions"
  ON public.app_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_app_sessions_updated_at
  BEFORE UPDATE ON public.app_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
