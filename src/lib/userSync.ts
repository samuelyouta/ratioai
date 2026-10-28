// Bridges the on-device profile + meal cache with the per-user cloud tables.
//
// Meals are merged, never replaced: the local log is the source of truth for
// anything created on this device, and the cloud only ever adds to it. Syncs
// also re-read the local log right before writing, so a meal logged while a
// request was in flight can't be overwritten by an older copy.

import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/session";
import {
  clearPendingMeals,
  forgetDeletedMeals,
  getDeletedMealIds,
  getMeals,
  getPendingMealIds,
  getProfile,
  mergeMealsIntoLocal,
  saveProfile,
  type Meal,
  type Profile,
} from "@/lib/profile";

const PAGE_SIZE = 500;
const UPSERT_CHUNK = 100;

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

/** Cloud meal payload without photo binaries (kept on-device only). */
function mealForCloud(m: Meal): Meal {
  const { imageDataUrl: _photo, ...rest } = m;
  return { ...rest, imageDataUrl: null };
}

function mealToRow(m: Meal, userId: string) {
  const cloudMeal = mealForCloud(m);
  return {
    user_id: userId,
    client_id: cloudMeal.id,
    logged_at: cloudMeal.loggedAt,
    name: cloudMeal.title,
    icon: cloudMeal.icon,
    calories: Math.round(cloudMeal.totalCalories || 0),
    protein: cloudMeal.totalProtein || 0,
    carbs: cloudMeal.totalCarbs || 0,
    fat: cloudMeal.totalFat || 0,
    source: cloudMeal.source ?? null,
    data: cloudMeal as unknown as Record<string, unknown>,
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
    if (Array.isArray(session.meals)) {
      // Only fills an empty log, and decides at write time rather than before the request.
      mergeMealsIntoLocal(session.meals as unknown as Meal[], { onlyIfEmpty: true });
    }
  } catch (e) {
    console.warn("hydrateFromAnonymousSession failed", e);
  }
}

async function syncProfile(userId: string) {
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
}

/** Every meal the cloud has for this user, or null if it couldn't be read in full. */
async function fetchCloudMeals(userId: string): Promise<Meal[] | null> {
  const out: Meal[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("meals")
      .select("data")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) {
      console.warn("meals fetch failed", error);
      return null;
    }
    for (const row of data) {
      const meal = rowToMeal(row as Record<string, unknown>);
      if (meal) out.push(meal);
    }
    if (data.length < PAGE_SIZE) return out;
  }
}

/** Upload the given meals; returns the ids that were stored. */
async function uploadMeals(userId: string, meals: Meal[]): Promise<string[]> {
  const stored: string[] = [];
  for (let i = 0; i < meals.length; i += UPSERT_CHUNK) {
    const chunk = meals.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase
      .from("meals")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(chunk.map((m) => mealToRow(m, userId)) as any, { onConflict: "user_id,client_id" });
    if (error) console.warn("meals upsert failed", error);
    else stored.push(...chunk.map((m) => m.id));
  }
  return stored;
}

async function flushDeletes(userId: string) {
  const ids = [...getDeletedMealIds()];
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("user_id", userId)
    .in("client_id", ids);
  if (error) console.warn("meal deletes failed", error);
  else forgetDeletedMeals(ids);
}

/** Upload only what changed on this device. Cheap enough to run often. */
async function pushPendingMeals(userId: string, alsoMissingFrom?: Set<string>) {
  const pending = getPendingMealIds();
  const deleted = getDeletedMealIds();
  const toPush = getMeals().filter(
    (m) => !deleted.has(m.id) && (pending.has(m.id) || (alsoMissingFrom && !alsoMissingFrom.has(m.id))),
  );
  if (toPush.length > 0) {
    const stored = await uploadMeals(userId, toPush);
    clearPendingMeals(stored);
  }
  await flushDeletes(userId);
}

let running: Promise<void> | null = null;
let rerunRequested = false;

async function runFullSync(userId: string) {
  await hydrateFromAnonymousSession();
  await syncProfile(userId);

  const cloud = await fetchCloudMeals(userId);
  if (cloud) {
    mergeMealsIntoLocal(cloud);
    await pushPendingMeals(userId, new Set(cloud.map((m) => m.id)));
  } else {
    await pushPendingMeals(userId);
  }
}

/**
 * Two-way merge between local cache and cloud tables for the signed-in user.
 * Safe to call repeatedly; overlapping calls are coalesced into one follow-up run.
 */
export async function syncUserData(userId: string) {
  if (running) {
    rerunRequested = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerunRequested = false;
        try {
          await runFullSync(userId);
        } catch (e) {
          console.warn("syncUserData failed", e);
        }
      } while (rerunRequested);
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * Sync before routing, but never hold the user on the sign-in screen waiting
 * for the network. Whatever has not arrived by the deadline is picked up by the
 * background sync in AuthSync.
 */
export async function syncUserDataBeforeRouting(userId: string, timeoutMs = 8_000) {
  await Promise.race([
    syncUserData(userId),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
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
  else forgetDeletedMeals([clientId]);
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
  try {
    await pushProfileToCloud();
    await pushPendingMeals(userId);
  } catch (e) {
    console.warn("pushLocalChanges failed", e);
  }
}
