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
