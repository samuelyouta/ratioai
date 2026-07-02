// Bridges the on-device profile + meal cache with the per-user cloud tables.
// Runs on sign-in: if the user has local data and no cloud data yet, push it.
// If the user has cloud data and the local cache is empty (new device), pull.

import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/session";
import {
  getProfile,
  saveProfile,
  getMeals,
  type Profile,
  type Meal,
} from "@/lib/profile";

const MEALS_KEY = "ratioai.meals";

function profileToRow(p: Profile) {
  return {
    name: p.name ?? null,
    gender: p.gender ?? null,
    age: p.age ?? null,
    height_cm: p.heightCm ?? null,
    weight_kg: p.weightKg ?? null,
    goal: p.goal ?? null,
    activity: p.activity ?? null,
    calorie_target: p.calorieTarget ?? null,
    protein_target: p.proteinTarget ?? null,
    carbs_target: p.carbsTarget ?? null,
    fat_target: p.fatTarget ?? null,
    data: p as unknown as Record<string, unknown>,
  };
}

function rowToProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row) return null;
  if (row.data && typeof row.data === "object") return row.data as Profile;
  return null;
}

function mealToRow(m: Meal, userId: string) {
  return {
    user_id: userId,
    client_id: m.id,
    logged_at: m.loggedAt,
    name: m.title,
    icon: m.icon,
    calories: Math.round(m.totalCalories || 0),
    protein: m.totalProtein || 0,
    carbs: m.totalCarbs || 0,
    fat: m.totalFat || 0,
    source: m.source ?? null,
    data: m as unknown as Record<string, unknown>,
  };
}

function rowToMeal(row: Record<string, unknown>): Meal | null {
  if (row.data && typeof row.data === "object") return row.data as Meal;
  return null;
}

/** Pull anonymous session snapshot into local storage before first cloud push. */
async function hydrateFromAnonymousSession() {
  try {
    const client_id = getClientId();
    const { data: session } = await supabase
      .from("app_sessions")
      .select("profile, meals")
      .eq("client_id", client_id)
      .maybeSingle();

    if (!session) return;

    if (!getProfile() && session.profile) {
      saveProfile(session.profile as unknown as Profile);
    }
    if (getMeals().length === 0 && Array.isArray(session.meals)) {
      localStorage.setItem(MEALS_KEY, JSON.stringify(session.meals));
    }
  } catch (e) {
    console.warn("hydrateFromAnonymousSession failed", e);
  }
}

/**
 * Two-way merge between local cache and cloud tables for the signed-in user.
 * Safe to call multiple times; upserts by (user_id, client_id) for meals
 * and by primary key for profile.
 */
export async function syncUserData(userId: string) {
  try {
    await hydrateFromAnonymousSession();

    const localProfile = getProfile();
    const { data: cloudProfileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const cloudProfile = rowToProfile(cloudProfileRow as Record<string, unknown> | null);

    if (localProfile) {
      const { error } = await supabase
        .from("profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({ id: userId, ...profileToRow(localProfile) } as any, { onConflict: "id" });
      if (error) console.warn("profile upsert failed", error);
    } else if (cloudProfile) {
      saveProfile(cloudProfile);
    }

    const localMeals = getMeals();
    if (localMeals.length > 0) {
      const rows = localMeals.map((m) => mealToRow(m, userId));
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const { error } = await supabase
          .from("meals")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .upsert(rows.slice(i, i + chunkSize) as any, { onConflict: "user_id,client_id" });
        if (error) console.warn("meals upsert failed", error);
      }
    } else {
      const { data: cloudMeals } = await supabase
        .from("meals")
        .select("data")
        .eq("user_id", userId)
        .order("logged_at", { ascending: true });
      if (cloudMeals && cloudMeals.length) {
        const restored = cloudMeals
          .map((r) => rowToMeal(r as Record<string, unknown>))
          .filter(Boolean) as Meal[];
        if (restored.length) localStorage.setItem(MEALS_KEY, JSON.stringify(restored));
      }
    }
  } catch (e) {
    console.warn("syncUserData failed", e);
  }
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Push a single meal to the signed-in user's cloud table. */
export async function pushMealToCloud(meal: Meal) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("meals")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(mealToRow(meal, userId) as any, { onConflict: "user_id,client_id" });
  if (error) console.warn("pushMealToCloud failed", error);
}

/** Remove a meal from the signed-in user's cloud table. */
export async function deleteMealFromCloud(clientId: string) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("user_id", userId)
    .eq("client_id", clientId);
  if (error) console.warn("deleteMealFromCloud failed", error);
}

/** Push profile to cloud for the signed-in user. */
export async function pushProfileToCloud() {
  const userId = await getAuthenticatedUserId();
  const localProfile = getProfile();
  if (!userId || !localProfile) return;
  const { error } = await supabase
    .from("profiles")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ id: userId, ...profileToRow(localProfile) } as any, { onConflict: "id" });
  if (error) console.warn("pushProfileToCloud failed", error);
}

let cloudPushTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced full sync for signed-in users after local data changes. */
export function scheduleCloudPush() {
  if (cloudPushTimer) clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(() => {
    void pushLocalChangesIfAuthenticated();
  }, 800);
}

export async function pushLocalChangesIfAuthenticated() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return;
  await syncUserData(userId);
}
