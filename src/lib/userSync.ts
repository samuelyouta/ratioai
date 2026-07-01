// Bridges the on-device profile + meal cache with the per-user cloud tables.
// Runs on sign-in: if the user has local data and no cloud data yet, push it.
// If the user has cloud data and the local cache is empty (new device), pull.

import { supabase } from "@/integrations/supabase/client";
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
  // Prefer the full JSON snapshot so we don't lose fields (unit, createdAt, etc.)
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

/**
 * Two-way merge between local cache and cloud tables for the signed-in user.
 * Safe to call multiple times; upserts by (user_id, client_id) for meals
 * and by primary key for profile.
 */
export async function syncUserData(userId: string) {
  try {
    // -------- Profile --------
    const localProfile = getProfile();
    const { data: cloudProfileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const cloudProfile = rowToProfile(cloudProfileRow as Record<string, unknown> | null);

    if (localProfile) {
      await supabase
        .from("profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({ id: userId, ...profileToRow(localProfile) } as any, { onConflict: "id" });
    } else if (cloudProfile) {
      saveProfile(cloudProfile);
    }

    // -------- Meals --------
    const localMeals = getMeals();
    if (localMeals.length > 0) {
      const rows = localMeals.map((m) => mealToRow(m, userId));
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        await supabase
          .from("meals")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .upsert(rows.slice(i, i + chunkSize) as any, { onConflict: "user_id,client_id" });
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
