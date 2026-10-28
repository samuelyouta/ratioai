// LocalStorage-backed profile + meal log for RatioAi
// All app state lives on-device per user request.

import { notifyLocalDataChanged } from "@/lib/cloudSyncTrigger";
import {
  dayKey,
  isValidDayKey,
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
  /**
   * The calendar day this meal belongs to, fixed when it was logged. Days are
   * stored rather than recomputed from `loggedAt` so that changing time zone
   * (travel, a device setting, the in-app override) can never move a meal onto
   * a different day and make a day's calorie count look like it reset.
   */
  day?: DayKey;
  /** Last local edit, used to pick the newer copy when merging with the cloud. */
  updatedAt?: string;
}

const PROFILE_KEY = "ratioai.profile";
const MEALS_KEY = "ratioai.meals";
const MEALS_BACKUP_KEY = "ratioai.meals.backup";
const MEALS_CORRUPT_KEY = "ratioai.meals.corrupt";
const MEALS_PENDING_KEY = "ratioai.meals.pending";
const MEALS_DELETED_KEY = "ratioai.meals.deleted";

/** Fired on `window` whenever the meal log changes, so open screens can refresh. */
export const DATA_CHANGED_EVENT = "ratioai:data-changed";

function announceDataChanged() {
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  } catch {
    /* non-browser environment */
  }
}

/** The day a meal counts toward. Legacy meals saved before `day` existed fall back to `loggedAt`. */
export function mealDay(meal: Pick<Meal, "day" | "loggedAt">): DayKey {
  return meal.day && isValidDayKey(meal.day) ? meal.day : dayKey(meal.loggedAt);
}

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
  for (const key of [
    MEALS_KEY,
    MEALS_BACKUP_KEY,
    MEALS_CORRUPT_KEY,
    MEALS_PENDING_KEY,
    MEALS_DELETED_KEY,
  ]) {
    localStorage.removeItem(key);
  }
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
function parseMeals(raw: string | null): Meal[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (m): m is Meal => !!m && typeof m === "object" && typeof (m as Meal).id === "string",
    );
  } catch {
    return null;
  }
}

/**
 * Read the meal log. A missing or unreadable list is never silently treated as
 * "no meals": the damaged copy is set aside and the last good snapshot is
 * restored, so the next save cannot overwrite a recoverable history with a
 * single new entry.
 */
export function getMeals(): Meal[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(MEALS_KEY);
  } catch {
    return [];
  }

  const meals = parseMeals(raw);
  if (meals) return meals;

  let backup: Meal[] | null = null;
  try {
    backup = parseMeals(localStorage.getItem(MEALS_BACKUP_KEY));
    if (raw !== null) localStorage.setItem(MEALS_CORRUPT_KEY, raw);
  } catch {
    /* storage unavailable */
  }
  if (backup && backup.length > 0) {
    try {
      localStorage.setItem(MEALS_KEY, JSON.stringify(backup));
    } catch {
      /* still return the recovered list */
    }
    return backup;
  }
  return [];
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
  for (const m of meals) {
    if (!m.day) m.day = dayKey(m.loggedAt);
  }
  try {
    localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
  } catch {
    return false;
  }
  try {
    // Photo-free snapshot: cheap enough to keep alongside the log, and enough to
    // rebuild every day's totals if the main entry is ever damaged.
    const slim = meals.map(({ imageDataUrl: _photo, ...rest }) => ({ ...rest, imageDataUrl: null }));
    localStorage.setItem(MEALS_BACKUP_KEY, JSON.stringify(slim));
  } catch {
    /* the backup is best-effort */
  }
  return true;
}

function readIdSet(key: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

/** Meals created or edited on this device that the cloud may not have yet. */
export function getPendingMealIds(): Set<string> {
  return readIdSet(MEALS_PENDING_KEY);
}

export function markMealsPending(ids: string[]) {
  const set = readIdSet(MEALS_PENDING_KEY);
  ids.forEach((id) => set.add(id));
  writeIdSet(MEALS_PENDING_KEY, set);
}

export function clearPendingMeals(ids: Iterable<string>) {
  const set = readIdSet(MEALS_PENDING_KEY);
  for (const id of ids) set.delete(id);
  writeIdSet(MEALS_PENDING_KEY, set);
}

/** Meals deleted on this device whose cloud copy may still exist. */
export function getDeletedMealIds(): Set<string> {
  return readIdSet(MEALS_DELETED_KEY);
}

export function forgetDeletedMeals(ids: Iterable<string>) {
  const set = readIdSet(MEALS_DELETED_KEY);
  for (const id of ids) set.delete(id);
  writeIdSet(MEALS_DELETED_KEY, set);
}

/**
 * Fold meals from another source (cloud, anonymous snapshot) into the local log.
 *
 * Runs synchronously against the *current* log, so a meal logged while a network
 * request was in flight is kept instead of being overwritten by a stale copy.
 * Never removes a local meal. For meals present on both sides the more recently
 * edited copy wins, and edits still waiting to be uploaded always win.
 */
export function mergeMealsIntoLocal(
  incoming: Meal[],
  options: { onlyIfEmpty?: boolean } = {},
): { added: number; updated: number } {
  const local = getMeals();
  if (options.onlyIfEmpty && local.length > 0) return { added: 0, updated: 0 };

  const deleted = getDeletedMealIds();
  const pending = getPendingMealIds();
  const byId = new Map(local.map((m) => [m.id, m]));
  let added = 0;
  let updated = 0;

  for (const remote of incoming) {
    if (!remote?.id || deleted.has(remote.id)) continue;
    const mine = byId.get(remote.id);
    if (!mine) {
      byId.set(remote.id, remote);
      added++;
      continue;
    }
    if (pending.has(remote.id)) continue;
    const remoteNewer = (remote.updatedAt ?? "") > (mine.updatedAt ?? "");
    if (remoteNewer) {
      byId.set(remote.id, { ...remote, imageDataUrl: mine.imageDataUrl ?? remote.imageDataUrl ?? null });
      updated++;
    }
  }

  if (added === 0 && updated === 0) return { added, updated };
  const merged = [...byId.values()].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  if (!persistMeals(merged)) return { added: 0, updated: 0 };
  announceDataChanged();
  return { added, updated };
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
  const stamped: Meal = {
    ...meal,
    day: meal.day && isValidDayKey(meal.day) ? meal.day : dayKey(meal.loggedAt),
    updatedAt: new Date().toISOString(),
  };
  const existing = meals.findIndex((m) => m.id === stamped.id);
  if (existing >= 0) meals[existing] = stamped;
  else meals.push(stamped);

  const outcome = persistMeals(meals, stamped.id);
  if (!outcome) {
    return { ok: false, photoDropped: false, olderPhotosDropped: false };
  }

  markMealsPending([stamped.id]);
  announceDataChanged();
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
    const merged = { ...m, ...patch, updatedAt: new Date().toISOString() };
    return patch.items ? recomputeTotals(merged) : merged;
  });
  if (!persistMeals(meals, id)) return false;
  markMealsPending([id]);
  announceDataChanged();
  notifyLocalDataChanged();
  return true;
}

export function deleteMeal(id: string) {
  const meals = getMeals().filter((m) => m.id !== id);
  if (!writeMeals(meals)) return;
  clearPendingMeals([id]);
  const deleted = readIdSet(MEALS_DELETED_KEY);
  deleted.add(id);
  writeIdSet(MEALS_DELETED_KEY, deleted);
  announceDataChanged();
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
    .filter((m) => mealDay(m) === key)
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
  return new Set(getMeals().map((m) => mealDay(m)));
}

export function getLast7DaysTotals() {
  const meals = getMeals();
  return recentDayKeys(7).map((key) => {
    const dayMeals = meals.filter((m) => mealDay(m) === key);
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
    day,
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
