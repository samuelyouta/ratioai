
-- Fixed-window rate limiting for Supabase Edge Functions (service_role only).
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

  SELECT hits, window_start
  INTO v_hits, v_start
  FROM public.edge_rate_limits
  WHERE bucket_key = p_bucket
  FOR UPDATE;

  IF v_now >= v_start + make_interval(secs => p_window_seconds) THEN
    UPDATE public.edge_rate_limits
    SET hits = 1, window_start = v_now
    WHERE bucket_key = p_bucket;
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  IF v_hits >= p_limit THEN
    v_retry := GREATEST(
      0,
      EXTRACT(EPOCH FROM (v_start + make_interval(secs => p_window_seconds) - v_now))::integer
    );
    RETURN QUERY SELECT false, v_retry;
    RETURN;
  END IF;

  UPDATE public.edge_rate_limits
  SET hits = hits + 1
  WHERE bucket_key = p_bucket;

  RETURN QUERY SELECT true, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;
