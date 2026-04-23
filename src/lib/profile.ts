// LocalStorage-backed profile + meal log for RatioAi
// All app state lives on-device per user request.

export type Gender = "male" | "female" | "other";
export type Activity = "sedentary" | "light" | "moderate" | "very";
export type Goal = "lose" | "muscle" | "maintain" | "endurance";
export type Unit = "metric" | "imperial";

export interface Profile {
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

export function saveMeal(meal: Meal) {
  const meals = getMeals();
  meals.push(meal);
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
}

export function updateMeal(id: string, patch: Partial<Meal>) {
  const meals = getMeals().map((m) => {
    if (m.id !== id) return m;
    const merged = { ...m, ...patch };
    if (patch.items) {
      merged.totalCalories = patch.items.reduce((s, i) => s + (i.calories || 0), 0);
      merged.totalProtein = patch.items.reduce((s, i) => s + (i.protein || 0), 0);
      merged.totalCarbs = patch.items.reduce((s, i) => s + (i.carbs || 0), 0);
      merged.totalFat = patch.items.reduce((s, i) => s + (i.fat || 0), 0);
    }
    return merged;
  });
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
}

export function deleteMeal(id: string) {
  const meals = getMeals().filter((m) => m.id !== id);
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
}

export function getTodayMeals(): Meal[] {
  const today = new Date().toISOString().slice(0, 10);
  return getMeals().filter((m) => m.loggedAt.startsWith(today));
}

export function getTodayTotals() {
  const meals = getTodayMeals();
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

export function getLast7DaysTotals() {
  const meals = getMeals();
  const days: { date: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayMeals = meals.filter((m) => m.loggedAt.startsWith(key));
    days.push({
      date: key,
      calories: dayMeals.reduce((s, m) => s + m.totalCalories, 0),
      protein: dayMeals.reduce((s, m) => s + m.totalProtein, 0),
      carbs: dayMeals.reduce((s, m) => s + m.totalCarbs, 0),
      fat: dayMeals.reduce((s, m) => s + m.totalFat, 0),
    });
  }
  return days;
}

export function getStreak(): number {
  const meals = getMeals();
  if (meals.length === 0) return 0;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const has = meals.some((m) => m.loggedAt.startsWith(key));
    if (has) streak++;
    else if (i === 0) continue; // allow today empty
    else break;
  }
  return streak;
}
