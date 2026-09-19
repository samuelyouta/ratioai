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

type MealTemplate = {
  key: string;
  title: string;
  icon: string;
  source: Meal["source"];
  hour: number;
  minute: number;
  items: Meal["items"];
  hiddenIngredient?: string;
};

const BREAKFASTS: MealTemplate[] = [
  {
    key: "yogurt-bowl",
    title: "Greek yogurt bowl",
    icon: "🥣",
    source: "photo",
    hour: 8,
    minute: 15,
    items: [
      { name: "Greek yogurt", portion: "200 g", calories: 130, protein: 20, carbs: 8, fat: 1 },
      { name: "Blueberries", portion: "80 g", calories: 46, protein: 1, carbs: 11, fat: 0 },
      { name: "Granola", portion: "60 g", calories: 276, protein: 6, carbs: 38, fat: 10 },
      { name: "Honey", portion: "1 tbsp", calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
  {
    key: "omelette",
    title: "Veggie omelette & toast",
    icon: "🍳",
    source: "photo",
    hour: 8,
    minute: 30,
    items: [
      { name: "Eggs", portion: "3 large", calories: 215, protein: 19, carbs: 1, fat: 15 },
      { name: "Spinach & peppers", portion: "100 g", calories: 35, protein: 3, carbs: 5, fat: 0 },
      { name: "Sourdough toast", portion: "2 slices", calories: 240, protein: 8, carbs: 46, fat: 2 },
      { name: "Butter", portion: "10 g", calories: 72, protein: 0, carbs: 0, fat: 8 },
    ],
  },
  {
    key: "oats",
    title: "Peanut butter oats",
    icon: "🥜",
    source: "manual",
    hour: 7,
    minute: 45,
    items: [
      { name: "Rolled oats", portion: "80 g", calories: 303, protein: 11, carbs: 54, fat: 5 },
      { name: "Whole milk", portion: "200 ml", calories: 124, protein: 7, carbs: 10, fat: 7 },
      { name: "Peanut butter", portion: "20 g", calories: 118, protein: 5, carbs: 4, fat: 10 },
    ],
  },
];

const LUNCHES: MealTemplate[] = [
  {
    key: "chicken-rice",
    title: "Chicken & rice bowl",
    icon: "🍗",
    source: "photo",
    hour: 13,
    minute: 5,
    items: [
      { name: "Grilled chicken breast", portion: "180 g", calories: 297, protein: 56, carbs: 0, fat: 7 },
      { name: "Jasmine rice", portion: "220 g", calories: 286, protein: 6, carbs: 63, fat: 0 },
      { name: "Avocado", portion: "70 g", calories: 112, protein: 1, carbs: 6, fat: 10 },
    ],
    hiddenIngredient: "Rice was cooked with about 1 tsp of oil — roughly 40 hidden calories.",
  },
  {
    key: "poke",
    title: "Tuna poke bowl",
    icon: "🍥",
    source: "photo",
    hour: 13,
    minute: 20,
    items: [
      { name: "Raw tuna", portion: "150 g", calories: 198, protein: 42, carbs: 0, fat: 2 },
      { name: "Sushi rice", portion: "220 g", calories: 286, protein: 5, carbs: 63, fat: 0 },
      { name: "Edamame & seaweed", portion: "100 g", calories: 119, protein: 10, carbs: 10, fat: 4 },
      { name: "Spicy mayo", portion: "1 tbsp", calories: 94, protein: 0, carbs: 1, fat: 10 },
    ],
    hiddenIngredient: "Spicy mayo adds around 90 calories that are easy to overlook.",
  },
  {
    key: "turkey-sandwich",
    title: "Turkey club sandwich",
    icon: "🥪",
    source: "manual",
    hour: 12,
    minute: 45,
    items: [
      { name: "Wholegrain bread", portion: "2 slices", calories: 180, protein: 8, carbs: 32, fat: 2 },
      { name: "Turkey breast", portion: "120 g", calories: 139, protein: 29, carbs: 0, fat: 2 },
      { name: "Cheddar", portion: "30 g", calories: 120, protein: 7, carbs: 0, fat: 10 },
      { name: "Sweet potato fries", portion: "120 g", calories: 194, protein: 2, carbs: 30, fat: 7 },
    ],
  },
  {
    key: "lentil-soup",
    title: "Lentil soup & bread",
    icon: "🍲",
    source: "voice",
    hour: 12,
    minute: 30,
    items: [
      { name: "Lentil soup", portion: "500 ml", calories: 350, protein: 22, carbs: 53, fat: 5 },
      { name: "Rye bread", portion: "2 slices", calories: 190, protein: 6, carbs: 36, fat: 2 },
      { name: "Feta", portion: "40 g", calories: 106, protein: 6, carbs: 2, fat: 9 },
    ],
  },
];

const DINNERS: MealTemplate[] = [
  {
    key: "salmon",
    title: "Salmon & roast potatoes",
    icon: "🐟",
    source: "photo",
    hour: 19,
    minute: 30,
    items: [
      { name: "Baked salmon", portion: "180 g", calories: 371, protein: 38, carbs: 0, fat: 24 },
      { name: "Roasted potatoes", portion: "220 g", calories: 257, protein: 5, carbs: 48, fat: 5 },
      { name: "Green salad", portion: "1 bowl", calories: 45, protein: 2, carbs: 6, fat: 1 },
    ],
  },
  {
    key: "beef-stirfry",
    title: "Beef stir fry",
    icon: "🥘",
    source: "photo",
    hour: 20,
    minute: 0,
    items: [
      { name: "Lean beef strips", portion: "170 g", calories: 283, protein: 44, carbs: 0, fat: 11 },
      { name: "Mixed vegetables", portion: "200 g", calories: 90, protein: 5, carbs: 16, fat: 1 },
      { name: "Egg noodles", portion: "180 g", calories: 315, protein: 11, carbs: 60, fat: 3 },
    ],
    hiddenIngredient: "Stir-fry sauce carries about 60 calories of added sugar.",
  },
  {
    key: "pizza",
    title: "Margherita pizza",
    icon: "🍕",
    source: "photo",
    hour: 19,
    minute: 10,
    items: [
      { name: "Margherita pizza", portion: "3 slices", calories: 780, protein: 33, carbs: 93, fat: 30 },
      { name: "Side salad", portion: "1 bowl", calories: 60, protein: 2, carbs: 7, fat: 3 },
    ],
  },
  {
    key: "chilli",
    title: "Turkey chilli & rice",
    icon: "🌶️",
    source: "voice",
    hour: 19,
    minute: 45,
    items: [
      { name: "Turkey chilli", portion: "350 g", calories: 420, protein: 38, carbs: 28, fat: 16 },
      { name: "Brown rice", portion: "180 g", calories: 200, protein: 5, carbs: 42, fat: 2 },
      { name: "Soured cream", portion: "30 g", calories: 60, protein: 1, carbs: 1, fat: 6 },
    ],
  },
];

const SNACKS: MealTemplate[] = [
  {
    key: "shake",
    title: "Protein shake",
    icon: "🥤",
    source: "voice",
    hour: 16,
    minute: 40,
    items: [
      { name: "Whey protein", portion: "1 scoop", calories: 120, protein: 24, carbs: 3, fat: 1 },
      { name: "Banana", portion: "1 medium", calories: 105, protein: 1, carbs: 27, fat: 0 },
    ],
  },
  {
    key: "almonds",
    title: "Almonds & apple",
    icon: "🍎",
    source: "manual",
    hour: 16,
    minute: 15,
    items: [
      { name: "Almonds", portion: "30 g", calories: 174, protein: 6, carbs: 6, fat: 15 },
      { name: "Apple", portion: "1 medium", calories: 95, protein: 0, carbs: 25, fat: 0 },
    ],
  },
];

function pick<T>(list: T[], day: number): T {
  return list[day % list.length];
}

/**
 * A week of realistic meals so Today, History and Insights all have content the
 * reviewer can explore without having to log anything first. Daily totals sit
 * near the seeded calorie target so the charts and streaks look plausible.
 */
function demoMeals(): Meal[] {
  const meals: Meal[] = [];

  for (let day = 0; day <= 6; day++) {
    const plan = [pick(BREAKFASTS, day), pick(LUNCHES, day), pick(SNACKS, day)];
    // Today is still in progress, so it has no dinner logged yet.
    if (day > 0) plan.splice(2, 0, pick(DINNERS, day));

    for (const t of plan) {
      meals.push(
        buildMeal(
          `d${day}-${t.key}`,
          isoAt(day, t.hour, t.minute),
          t.title,
          t.icon,
          t.source,
          t.items,
          t.hiddenIngredient,
        ),
      );
    }
  }

  return meals;
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
