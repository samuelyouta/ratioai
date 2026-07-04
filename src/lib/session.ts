// Anonymous cross-visit session capture.
// A random client_id is generated once per device and used to upsert a row
// in `app_sessions` so a returning user can restore their profile + meals.

import { supabase } from "@/integrations/supabase/client";
import { getProfile, saveProfile, getMeals, type Profile, type Meal } from "@/lib/profile";

const CLIENT_ID_KEY = "ratioai.client_id";
const MEALS_KEY = "ratioai.meals";

export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id =
      (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
      `c_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function getPlatform(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "web";
}

/** Record a visit. If a row already exists, bump visit_count and last_seen_at. */
export async function recordVisit() {
  try {
    const client_id = getClientId();
    const { data: existing } = await supabase
      .from("app_sessions")
      .select("id, visit_count, profile, meals")
      .eq("client_id", client_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("app_sessions")
        .update({
          last_seen_at: new Date().toISOString(),
          visit_count: (existing.visit_count || 0) + 1,
        })
        .eq("client_id", client_id);

      // Restore data on this device if local is empty (e.g. cache cleared).
      if (!getProfile() && existing.profile) {
        saveProfile(existing.profile as unknown as Profile);
      }
      if (getMeals().length === 0 && Array.isArray(existing.meals)) {
        localStorage.setItem(MEALS_KEY, JSON.stringify(existing.meals));
      }
    } else {
      await supabase.from("app_sessions").insert([
        {
          client_id,
          platform: getPlatform(),
          user_agent: navigator.userAgent,
          profile: (getProfile() ?? null) as unknown as never,
          meals: getMeals() as unknown as never,
        },
      ]);
    }
  } catch (e) {
    console.warn("recordVisit failed", e);
  }
}

/** Push the latest local profile + meals snapshot to the cloud. */
export async function syncSession() {
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (auth.session?.user) {
      const { pushLocalChangesIfAuthenticated } = await import("@/lib/userSync");
      await pushLocalChangesIfAuthenticated();
      return;
    }

    const client_id = getClientId();
    await supabase
      .from("app_sessions")
      .update({
        profile: (getProfile() ?? null) as unknown as never,
        meals: getMeals() as unknown as never,
        last_seen_at: new Date().toISOString(),
      })
      .eq("client_id", client_id);
  } catch (e) {
    console.warn("syncSession failed", e);
  }
}

/** Start a light-weight auto-sync: pushes snapshot every 30s and on unload. */
export function startSessionAutoSync() {
  const interval = window.setInterval(syncSession, 30_000);
  const onHide = () => syncSession();
  window.addEventListener("visibilitychange", onHide);
  window.addEventListener("beforeunload", onHide);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("beforeunload", onHide);
  };
}
