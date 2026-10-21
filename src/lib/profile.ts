// LocalStorage-backed profile + meal log for RatioAi
// All app state lives on-device per user request.

import { notifyLocalDataChanged } from "@/lib/cloudSyncTrigger";
import {
  dayKey,
  recentDayKeys,
  shiftDayKey,
  timestampForDay,
  todayKey,
  type DayKey,
} from "@/lib/dayKey";

export type Gender = "male" | "female" | "other";
export type Activity = "sedentary" | "light" | "moderate" | "very";
export type Goal = "lose" | "muscle" | "maintain" | "endurance";
export type Unit = "metric" | "imperial";

export interface Profile {
  name?: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  unit: Unit;
  activity: Activity;
  goal: Goal;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  createdAt: string;
}

export interface MealItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** How many of `basePortion` this item represents. Defaults to 1. */
  servings?: number;
  /** Portion text for a single serving, kept stable as servings change. */
  basePortion?: string;
  /** Macros for a single serving, so scaling never compounds rounding. */
  baseMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export type MealSource = "photo" | "voice" | "manual";

export interface Meal {
  id: string;
  loggedAt: string; // ISO
  title: string;
  icon: string;
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  hiddenIngredient?: string | null;
  source?: MealSource;
  imageDataUrl?: string | null;
  verified?: boolean;
  notes?: string;
}

const PROFILE_KEY = "ratioai.profile";
const MEALS_KEY = "ratioai.meals";

export function getProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  notifyLocalDataChanged();
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(MEALS_KEY);
}

// Mifflin–St Jeor BMR
export function calculateTargets(input: {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
}) {
  const { gender, age, heightCm, weightKg, activity, goal } = input;
  const base =
    10 * weightKg + 6.25 * heightCm - 5 * age + (gender === "male" ? 5 : gender === "female" ? -161 : -78);
  const activityMultipliers: Record<Activity, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
  };
  const tdee = base * activityMultipliers[activity];
  const goalAdjust: Record<Goal, number> = {
    lose: -500,
    muscle: 300,
    maintain: 0,
    endurance: 200,
  };
  const calorieTarget = Math.round(tdee + goalAdjust[goal]);

  // Macro split per goal
  const split: Record<Goal, { p: number; c: number; f: number }> = {
    lose: { p: 0.4, c: 0.35, f: 0.25 },
    muscle: { p: 0.3, c: 0.45, f: 0.25 },
    maintain: { p: 0.3, c: 0.4, f: 0.3 },
    endurance: { p: 0.25, c: 0.55, f: 0.2 },
  };
  const s = split[goal];
  return {
    calorieTarget,
    proteinTarget: Math.round((calorieTarget * s.p) / 4),
    carbsTarget: Math.round((calorieTarget * s.c) / 4),
    fatTarget: Math.round((calorieTarget * s.f) / 9),
  };
}

// Meals
export function getMeals(): Meal[] {
  try {
    const raw = localStorage.getItem(MEALS_KEY);
    return raw ? (JSON.parse(raw) as Meal[]) : [];
  } catch {
    return [];
  }
}

/** Stable id that works in WebViews where crypto.randomUUID is unavailable. */
export function createMealId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the timestamp id */
  }
  return `meal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function writeMeals(meals: Meal[]): boolean {
  try {
    localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist the meal list, shedding photo data when the device storage quota is
 * reached. Photos are a local nicety — macros are the data that matters and
 * the cloud copy never carries the image anyway — so a full disk must never be
 * the reason a meal fails to log.
 *
 * Returns which concessions were needed, or null when nothing could be written.
 */
function persistMeals(
  meals: Meal[],
  protectedId?: string,
): { droppedOwnPhoto: boolean; droppedOtherPhotos: boolean } | null {
  if (writeMeals(meals)) {
    return { droppedOwnPhoto: false, droppedOtherPhotos: false };
  }

  // Oldest photos first, so the most recent meals keep their images longest.
  const byAge = [...meals]
    .filter((m) => m.imageDataUrl && m.id !== protectedId)
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));

  let droppedOtherPhotos = false;
  for (const stale of byAge) {
    stale.imageDataUrl = null;
    droppedOtherPhotos = true;
    if (writeMeals(meals)) return { droppedOwnPhoto: false, droppedOtherPhotos };
  }

  // Still over quota: give up the new meal's own photo rather than the meal.
  const own = protectedId ? meals.find((m) => m.id === protectedId) : undefined;
  if (own?.imageDataUrl) {
    own.imageDataUrl = null;
    if (writeMeals(meals)) return { droppedOwnPhoto: true, droppedOtherPhotos };
  }

  return null;
}

export interface MealSaveResult {
  ok: boolean;
  /** The new meal's photo had to be discarded to fit in device storage. */
  photoDropped: boolean;
  /** Older meal photos were discarded to make room. */
  olderPhotosDropped: boolean;
}

/**
 * Append a meal to the log. Never throws: callers get a result they can act on
 * so the confirm button always resolves to either a logged meal or a message.
 */
export function saveMeal(meal: Meal): MealSaveResult {
  const meals = getMeals();
  const existing = meals.findIndex((m) => m.id === meal.id);
  if (existing >= 0) meals[existing] = meal;
  else meals.push(meal);

  const outcome = persistMeals(meals, meal.id);
  if (!outcome) {
    return { ok: false, photoDropped: false, olderPhotosDropped: false };
  }

  notifyLocalDataChanged();
  return {
    ok: true,
    photoDropped: outcome.droppedOwnPhoto,
    olderPhotosDropped: outcome.droppedOtherPhotos,
  };
}

function recomputeTotals(meal: Meal): Meal {
  return {
    ...meal,
    totalCalories: meal.items.reduce((s, i) => s + (i.calories || 0), 0),
    totalProtein: meal.items.reduce((s, i) => s + (i.protein || 0), 0),
    totalCarbs: meal.items.reduce((s, i) => s + (i.carbs || 0), 0),
    totalFat: meal.items.reduce((s, i) => s + (i.fat || 0), 0),
  };
}

export function updateMeal(id: string, patch: Partial<Meal>): boolean {
  const meals = getMeals().map((m) => {
    if (m.id !== id) return m;
    const merged = { ...m, ...patch };
    return patch.items ? recomputeTotals(merged) : merged;
  });
  if (!persistMeals(meals, id)) return false;
  notifyLocalDataChanged();
  return true;
}

export function deleteMeal(id: string) {
  const meals = getMeals().filter((m) => m.id !== id);
  writeMeals(meals);
  notifyLocalDataChanged();
  void import("@/lib/userSync").then(({ deleteMealFromCloud }) => deleteMealFromCloud(id));
}

/** Servings for an item, treating legacy entries without the field as one. */
export function itemServings(item: MealItem): number {
  return item.servings && item.servings > 0 ? item.servings : 1;
}

function singleServing(item: MealItem) {
  if (item.baseMacros) return item.baseMacros;
  const n = itemServings(item);
  return {
    calories: (item.calories || 0) / n,
    protein: (item.protein || 0) / n,
    carbs: (item.carbs || 0) / n,
    fat: (item.fat || 0) / n,
  };
}

export function formatServings(servings: number): string {
  return Number.isInteger(servings) ? String(servings) : servings.toFixed(1);
}

/**
 * Rescale one item of a logged meal to `servings` portions, keeping the
 * per-serving amounts as the source of truth so repeated edits never drift.
 */
export function withItemServings(item: MealItem, servings: number): MealItem {
  const next = Math.max(0.5, Math.round(servings * 2) / 2);
  const base = singleServing(item);
  const basePortion = item.basePortion ?? item.portion;
  const round = (v: number) => Math.round(v * 10) / 10;
  return {
    ...item,
    servings: next,
    basePortion,
    baseMacros: base,
    portion: next === 1 ? basePortion : `${formatServings(next)} × ${basePortion}`,
    calories: Math.round(base.calories * next),
    protein: round(base.protein * next),
    carbs: round(base.carbs * next),
    fat: round(base.fat * next),
  };
}

/** Change the portion count of a single item on an already-logged meal. */
export function setMealItemServings(
  mealId: string,
  itemIndex: number,
  servings: number,
): boolean {
  const meal = getMeals().find((m) => m.id === mealId);
  if (!meal || !meal.items[itemIndex]) return false;
  const items = meal.items.map((it, i) =>
    i === itemIndex ? withItemServings(it, servings) : it,
  );
  return updateMeal(mealId, { items });
}

/** Append a brand new portion/item to an already-logged meal. */
export function addMealItem(mealId: string, item: MealItem): boolean {
  const meal = getMeals().find((m) => m.id === mealId);
  if (!meal) return false;
  return updateMeal(mealId, { items: [...meal.items, item] });
}

export function getMealsForDay(key: DayKey): Meal[] {
  return getMeals()
    .filter((m) => dayKey(m.loggedAt) === key)
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
}

export function getTodayMeals(): Meal[] {
  return getMealsForDay(todayKey());
}

export function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totalCalories,
      protein: acc.protein + m.totalProtein,
      carbs: acc.carbs + m.totalCarbs,
      fat: acc.fat + m.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function getTotalsForDay(key: DayKey) {
  return sumMeals(getMealsForDay(key));
}

export function getTodayTotals() {
  return getTotalsForDay(todayKey());
}

/** Day keys in the active time zone that have at least one logged meal. */
export function getLoggedDayKeys(): Set<DayKey> {
  return new Set(getMeals().map((m) => dayKey(m.loggedAt)));
}

export function getLast7DaysTotals() {
  const meals = getMeals();
  return recentDayKeys(7).map((key) => {
    const dayMeals = meals.filter((m) => dayKey(m.loggedAt) === key);
    return {
      date: key,
      calories: dayMeals.reduce((s, m) => s + m.totalCalories, 0),
      protein: dayMeals.reduce((s, m) => s + m.totalProtein, 0),
      carbs: dayMeals.reduce((s, m) => s + m.totalCarbs, 0),
      fat: dayMeals.reduce((s, m) => s + m.totalFat, 0),
    };
  });
}

/**
 * Returns the most recent unique meals (deduped by title), sorted newest-first.
 * Useful for "Log again" / repeat-meal shortcuts.
 */
export function getRecentUniqueMeals(limit = 6): Meal[] {
  const meals = [...getMeals()].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const seen = new Set<string>();
  const out: Meal[] = [];
  for (const m of meals) {
    const key = (m.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Re-logs a previously saved meal as a new entry on `day` (today by default).
 * Returns the new meal so callers can navigate / toast.
 */
export function relogMeal(source: Meal, day: DayKey = todayKey()): Meal {
  const copy: Meal = {
    ...source,
    id: createMealId(),
    loggedAt: timestampForDay(day),
    // Drop image to keep storage small for one-tap re-logs
    imageDataUrl: null,
  };
  saveMeal(copy);
  return copy;
}

export function getStreak(): number {
  const meals = getMeals();
  if (meals.length === 0) return 0;
  const logged = getLoggedDayKeys();
  let streak = 0;
  let key = todayKey();
  for (let i = 0; i < 365; i++) {
    if (logged.has(key)) streak++;
    else if (i > 0) break; // allow today empty
    key = shiftDayKey(key, -1);
  }
  return streak;
}
