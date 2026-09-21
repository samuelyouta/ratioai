import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_WEB_ORIGIN = (
  import.meta.env.VITE_PUBLIC_APP_URL || "https://ratioai.vercel.app"
).replace(/\/$/, "");

const MEAL_AI_TIMEOUT_MS = 55_000;

/**
 * Meal AI calls go to Vercel serverless routes that use OPENAI_API_KEY.
 */
function mealAiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) return PUBLIC_WEB_ORIGIN;
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return PUBLIC_WEB_ORIGIN;
  }
  return PUBLIC_WEB_ORIGIN;
}

function userFacingAiError(raw: string, status?: number): string {
  const lower = raw.toLowerCase();
  if (
    lower === "load failed" ||
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("offline")
  ) {
    return "You appear to be offline or the connection dropped. Check your network and try again.";
  }
  if (lower.includes("abort") || lower.includes("timed out") || lower.includes("timeout")) {
    return "Meal analysis timed out. Try a clearer photo or try again in a moment.";
  }
  if (lower.includes("api_key") || lower.includes("not configured") || lower.includes("openai")) {
    return "Meal analysis is temporarily unavailable. Please try again later.";
  }
  if (status === 429 || lower.includes("rate limit")) {
    return "Meal AI is busy right now. Please wait a moment and try again.";
  }
  if (/FUNCTION_INVOCATION_FAILED/i.test(raw)) {
    return "Meal analysis is temporarily unavailable. Please try again later.";
  }
  // Strip internal ops hints from user-visible errors.
  if (lower.includes("redeploy") || lower.includes("vercel") || lower.includes("supabase")) {
    return "Meal analysis is temporarily unavailable. Please try again later.";
  }
  return raw || "Meal analysis failed. Please try again.";
}

async function postMealAi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("You appear to be offline. Check your network and try again.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), MEAL_AI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${mealAiBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    throw new Error(userFacingAiError(raw));
  } finally {
    window.clearTimeout(timer);
  }

  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const errMsg =
      payload && typeof payload === "object" && "error" in payload && (payload as { error?: string }).error
        ? String((payload as { error: string }).error)
        : text || `Meal AI request failed (${res.status})`;
    throw new Error(userFacingAiError(errMsg, res.status));
  }

  if (payload && typeof payload === "object" && "error" in payload && (payload as { error?: string }).error) {
    throw new Error(userFacingAiError(String((payload as { error: string }).error)));
  }

  return payload as T;
}

export function analyzeMealPhoto<T = unknown>(imageBase64: string): Promise<T> {
  return postMealAi<T>("/api/analyze-meal", { imageBase64 });
}

export function describeMealText<T = unknown>(description: string): Promise<T> {
  return postMealAi<T>("/api/describe-meal", { description });
}
