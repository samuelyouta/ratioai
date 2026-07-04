import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "./cors.ts";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function consumeRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.warn("Rate limit skipped: missing Supabase env");
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const admin = createClient(url, serviceKey);
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("consume_rate_limit error", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
  };
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };
  if (retryAfterSeconds > 0) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }
  return new Response(
    JSON.stringify({
      error: "Rate limit reached. Please try again later.",
      retryAfterSeconds,
    }),
    { status: 429, headers },
  );
}
