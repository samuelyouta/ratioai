-- Run once in Supabase SQL Editor for project myyjjtclthflfgxkgubr
-- https://supabase.com/dashboard/project/myyjjtclthflfgxkgubr/sql/new

-- MEALS (if missing)
CREATE TABLE IF NOT EXISTS public.meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  name text,
  icon text,
  calories integer,
  protein numeric,
  carbs numeric,
  fat numeric,
  image_url text,
  source text,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meals_user_id_logged_at_idx ON public.meals(user_id, logged_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meals_user_client_id_unique'
  ) THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_user_client_id_unique UNIQUE (user_id, client_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT ALL ON public.meals TO service_role;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own meals' AND tablename = 'meals') THEN
    CREATE POLICY "Users can view their own meals" ON public.meals FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own meals' AND tablename = 'meals') THEN
    CREATE POLICY "Users can insert their own meals" ON public.meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own meals' AND tablename = 'meals') THEN
    CREATE POLICY "Users can update their own meals" ON public.meals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own meals' AND tablename = 'meals') THEN
    CREATE POLICY "Users can delete their own meals" ON public.meals FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- EDGE FUNCTION RATE LIMITING
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  bucket_key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_hits integer;
  v_start timestamptz;
  v_retry integer;
BEGIN
  INSERT INTO public.edge_rate_limits (bucket_key, hits, window_start)
  VALUES (p_bucket, 0, v_now)
  ON CONFLICT (bucket_key) DO NOTHING;

  SELECT hits, window_start INTO v_hits, v_start
  FROM public.edge_rate_limits WHERE bucket_key = p_bucket FOR UPDATE;

  IF v_now >= v_start + make_interval(secs => p_window_seconds) THEN
    UPDATE public.edge_rate_limits SET hits = 1, window_start = v_now WHERE bucket_key = p_bucket;
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  IF v_hits >= p_limit THEN
    v_retry := GREATEST(0, EXTRACT(EPOCH FROM (v_start + make_interval(secs => p_window_seconds) - v_now))::integer);
    RETURN QUERY SELECT false, v_retry;
    RETURN;
  END IF;

  UPDATE public.edge_rate_limits SET hits = hits + 1 WHERE bucket_key = p_bucket;
  RETURN QUERY SELECT true, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;

-- AUTO-CREATE PROFILE ON SIGNUP (if missing)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Daily AI scan limit (40/day). Same SQL as supabase/migrations/20261102120000_daily_scan_usage.sql
-- Per-user daily cap on AI photo scans (service_role only, called from the Vercel analyze-meal route).
CREATE TABLE IF NOT EXISTS public.daily_scan_usage (
  bucket_key text NOT NULL,
  day date NOT NULL,
  scans integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_key, day)
);

CREATE INDEX IF NOT EXISTS daily_scan_usage_day_idx ON public.daily_scan_usage (day);

ALTER TABLE public.daily_scan_usage ENABLE ROW LEVEL SECURITY;

-- Atomically takes one scan from today's allowance. `allowed` is false once p_limit is used up.
CREATE OR REPLACE FUNCTION public.consume_daily_scan(
  p_key text,
  p_day date,
  p_limit integer
)
RETURNS TABLE(allowed boolean, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scans integer;
BEGIN
  INSERT INTO public.daily_scan_usage AS u (bucket_key, day, scans)
  VALUES (p_key, p_day, 1)
  ON CONFLICT (bucket_key, day) DO UPDATE
    SET scans = u.scans + 1, updated_at = now()
    WHERE u.scans < p_limit
  RETURNING u.scans INTO v_scans;

  IF FOUND THEN
    IF random() < 0.01 THEN
      DELETE FROM public.daily_scan_usage WHERE day < p_day - 14;
    END IF;
    RETURN QUERY SELECT true, v_scans;
    RETURN;
  END IF;

  SELECT u.scans INTO v_scans
  FROM public.daily_scan_usage u
  WHERE u.bucket_key = p_key AND u.day = p_day;

  RETURN QUERY SELECT false, COALESCE(v_scans, p_limit);
END;
$$;

-- Gives a scan back when the AI call failed, so errors never cost the user an allowance.
CREATE OR REPLACE FUNCTION public.refund_daily_scan(p_key text, p_day date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.daily_scan_usage
  SET scans = GREATEST(scans - 1, 0), updated_at = now()
  WHERE bucket_key = p_key AND day = p_day;
$$;

REVOKE ALL ON FUNCTION public.consume_daily_scan(text, date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_daily_scan(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_daily_scan(text, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_daily_scan(text, date) TO service_role;
