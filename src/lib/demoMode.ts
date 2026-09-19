/**
 * App Review demonstration mode.
 *
 * Apple's reviewers could not sign in with the demo credentials we published in
 * App Store Connect, so the credentials below unlock a fully local review
 * session instead of a Supabase account. Demo mode needs no network, no
 * Supabase user and no App Store purchase, which means it cannot break between
 * submissions the way a hosted demo account can.
 */

import {
  calculateTargets,
  getMeals,
  getProfile,
  saveProfile,
  type Meal,
  type Profile,
} from "@/lib/profile";

/** Credentials published in App Store Connect → App Review Information. */
export const DEMO_EMAIL = "reviewer@ratioai.app";
export const DEMO_PASSWORD = "1234";

const DEMO_FLAG_KEY = "ratioai.demo_mode";
const DEMO_SEEDED_PROFILE_KEY = "ratioai.demo_seeded_profile";
const DEMO_SEEDED_MEALS_KEY = "ratioai.demo_seeded_meals";
const MEALS_KEY = "ratioai.meals";

export const DEMO_MODE_EVENT = "ratioai:demo-mode-changed";

export const DEMO_USER_ID = "00000000-0000-4000-8000-00000000d3m0";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function isDemoMode(): boolean {
  return readFlag(DEMO_FLAG_KEY);
}

/** True when the reviewer typed the exact demo credentials from App Store Connect. */
export function matchesDemoCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_EMAIL && password.trim() === DEMO_PASSWORD
  );
}

function demoProfile(): Profile {
  const base = {
    gender: "male" as const,
    age: 29,
    heightCm: 178,
    weightKg: 76,
    activity: "moderate" as const,
    goal: "lose" as const,
  };
  return {
    name: "App Review",
    unit: "metric",
    createdAt: new Date().toISOString(),
    ...base,
    ...calculateTargets(base),
  };
}

function isoAt(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function buildMeal(
  idSuffix: string,
  loggedAt: string,
  title: string,
  icon: string,
  source: Meal["source"],
  items: Meal["items"],
  hiddenIngredient?: string,
): Meal {
  return {
    id: `demo-${idSuffix}`,
    loggedAt,
    title,
    icon,
    items,
    totalCalories: items.reduce((s, i) => s + i.calories, 0),
    totalProtein: items.reduce((s, i) => s + i.protein, 0),
    totalCarbs: items.reduce((s, i) => s + i.carbs, 0),
    totalFat: items.reduce((s, i) => s + i.fat, 0),
    hiddenIngredient: hiddenIngredient ?? null,
    source,
    imageDataUrl: null,
    verified: true,
  };
}

/**
 * A week of realistic meals so Today, History and Insights all have content the
 * reviewer can explore without having to log anything first.
 */
function demoMeals(): Meal[] {
  return [
    buildMeal("today-breakfast", isoAt(0, 8, 15), "Greek yogurt bowl", "🥣", "photo", [
      { name: "Greek yogurt", portion: "200 g", calories: 130, protein: 20, carbs: 8, fat: 1 },
      { name: "Blueberries", portion: "80 g", calories: 46, protein: 1, carbs: 11, fat: 0 },
      { name: "Granola", portion: "30 g", calories: 138, protein: 3, carbs: 19, fat: 5 },
    ]),
    buildMeal(
      "today-lunch",
      isoAt(0, 13, 5),
      "Chicken & rice bowl",
      "🍗",
      "photo",
      [
        { name: "Grilled chicken breast", portion: "180 g", calories: 297, protein: 56, carbs: 0, fat: 7 },
        { name: "Jasmine rice", portion: "150 g", calories: 195, protein: 4, carbs: 43, fat: 0 },
        { name: "Avocado", portion: "50 g", calories: 80, protein: 1, carbs: 4, fat: 7 },
      ],
      "Rice was cooked with about 1 tsp of oil — roughly 40 hidden calories.",
    ),
    buildMeal("today-snack", isoAt(0, 16, 40), "Protein shake", "🥤", "voice", [
      { name: "Whey protein", portion: "1 scoop", calories: 120, protein: 24, carbs: 3, fat: 1 },
      { name: "Banana", portion: "1 medium", calories: 105, protein: 1, carbs: 27, fat: 0 },
    ]),
    buildMeal("d1-dinner", isoAt(1, 19, 30), "Salmon & greens", "🐟", "photo", [
      { name: "Baked salmon", portion: "160 g", calories: 330, protein: 34, carbs: 0, fat: 21 },
      { name: "Roasted potatoes", portion: "150 g", calories: 175, protein: 4, carbs: 33, fat: 3 },
      { name: "Green salad", portion: "1 bowl", calories: 45, protein: 2, carbs: 6, fat: 1 },
    ]),
    buildMeal("d1-lunch", isoAt(1, 12, 45), "Turkey sandwich", "🥪", "manual", [
      { name: "Wholegrain bread", portion: "2 slices", calories: 180, protein: 8, carbs: 32, fat: 2 },
      { name: "Turkey breast", portion: "90 g", calories: 104, protein: 22, carbs: 0, fat: 2 },
      { name: "Cheddar", portion: "20 g", calories: 80, protein: 5, carbs: 0, fat: 7 },
    ]),
    buildMeal("d2-dinner", isoAt(2, 20, 0), "Beef stir fry", "🥘", "photo", [
      { name: "Lean beef strips", portion: "150 g", calories: 250, protein: 39, carbs: 0, fat: 10 },
      { name: "Mixed vegetables", portion: "200 g", calories: 90, protein: 5, carbs: 16, fat: 1 },
      { name: "Egg noodles", portion: "120 g", calories: 210, protein: 7, carbs: 40, fat: 2 },
    ]),
    buildMeal("d3-breakfast", isoAt(3, 8, 30), "Veggie omelette", "🍳", "photo", [
      { name: "Eggs", portion: "3 large", calories: 215, protein: 19, carbs: 1, fat: 15 },
      { name: "Spinach & peppers", portion: "100 g", calories: 35, protein: 3, carbs: 5, fat: 0 },
      { name: "Sourdough toast", portion: "1 slice", calories: 120, protein: 4, carbs: 23, fat: 1 },
    ]),
    buildMeal("d4-lunch", isoAt(4, 13, 20), "Poke bowl", "🍥", "photo", [
      { name: "Raw tuna", portion: "120 g", calories: 158, protein: 34, carbs: 0, fat: 2 },
      { name: "Sushi rice", portion: "180 g", calories: 234, protein: 4, carbs: 52, fat: 0 },
      { name: "Edamame & seaweed", portion: "80 g", calories: 95, protein: 8, carbs: 8, fat: 3 },
    ]),
    buildMeal("d5-dinner", isoAt(5, 19, 10), "Margherita pizza", "🍕", "photo", [
      { name: "Margherita pizza", portion: "2 slices", calories: 520, protein: 22, carbs: 62, fat: 20 },
      { name: "Side salad", portion: "1 bowl", calories: 60, protein: 2, carbs: 7, fat: 3 },
    ]),
    buildMeal("d6-lunch", isoAt(6, 12, 30), "Lentil soup & bread", "🍲", "voice", [
      { name: "Lentil soup", portion: "400 ml", calories: 280, protein: 18, carbs: 42, fat: 4 },
      { name: "Rye bread", portion: "1 slice", calories: 95, protein: 3, carbs: 18, fat: 1 },
    ]),
  ];
}

function writeMeals(meals: Meal[]) {
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
}

function emitChange() {
  window.dispatchEvent(new Event(DEMO_MODE_EVENT));
}

/**
 * Enter demo mode. Seeds a profile and a week of meals only when the device has
 * none, so a real user who somehow lands here never loses their own data.
 */
export function startDemoMode() {
  try {
    if (!getProfile()) {
      saveProfile(demoProfile());
      localStorage.setItem(DEMO_SEEDED_PROFILE_KEY, "1");
    }
    if (getMeals().length === 0) {
      writeMeals(demoMeals());
      localStorage.setItem(DEMO_SEEDED_MEALS_KEY, "1");
    }
    localStorage.setItem(DEMO_FLAG_KEY, "1");
  } catch {
    /* storage unavailable — demo mode still flips for this session below */
  }
  emitChange();
}

/** Leave demo mode and remove only the sample data demo mode created. */
export function stopDemoMode() {
  try {
    if (readFlag(DEMO_SEEDED_MEALS_KEY)) {
      writeMeals(getMeals().filter((m) => !m.id.startsWith("demo-")));
    }
    if (readFlag(DEMO_SEEDED_PROFILE_KEY)) {
      localStorage.removeItem("ratioai.profile");
    }
    localStorage.removeItem(DEMO_SEEDED_MEALS_KEY);
    localStorage.removeItem(DEMO_SEEDED_PROFILE_KEY);
    localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* storage unavailable */
  }
  emitChange();
}

/** Subscribe to demo-mode changes (same tab and other tabs). */
export function onDemoModeChange(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(DEMO_MODE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(DEMO_MODE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
