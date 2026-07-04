import { invokeEdgeFunction } from "@/lib/edgeFunction";
import { supabase } from "@/integrations/supabase/client";
import { logoutRevenueCat } from "@/lib/subscriptions";
import { clearProfile } from "@/lib/profile";

const LOCAL_KEYS = [
  "ratioai.streakState",
  "ratioai.onboarding.draft",
  "ratioai.theme",
  "ratioai.client_id",
  "ratioai.auth_redirect",
] as const;

/** Wipe on-device caches after server-side account deletion. */
export function clearLocalAccountData() {
  clearProfile();
  for (const key of LOCAL_KEYS) {
    localStorage.removeItem(key);
  }
  sessionStorage.removeItem("ratioai.lastImage");
  sessionStorage.removeItem("ratioai.auth_redirect");
}

/**
 * Permanently delete the signed-in user's auth account and cloud data.
 * Requires an active Supabase session.
 */
export async function deleteAccount() {
  await invokeEdgeFunction<{ success: boolean }>("delete-account", {});
  await logoutRevenueCat();
  await supabase.auth.signOut();
  clearLocalAccountData();
}
