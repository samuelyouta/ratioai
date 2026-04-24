// Streak rewards: freeze days, theme unlocks, and protein streak tracking.
// All on-device; no backend.

import { getMeals, getProfile, getLast7DaysTotals, getStreak } from "./profile";

const STREAK_STATE_KEY = "ratioai.streakState";
const THEME_KEY = "ratioai.theme";

export type ThemeName = "default" | "neon" | "midnight";

export interface StreakState {
  freezeDays: number;
  lastFreezeAwardDate: string | null; // YYYY-MM-DD when last freeze granted
  consumedFreezeDates: string[]; // YYYY-MM-DD dates auto-protected
  unlockedThemes: ThemeName[];
  lastSeenStreak: number; // for triggering level-up modal
  lastFlameDate: string | null; // YYYY-MM-DD — last day flame animation shown
}

const DEFAULT_STATE: StreakState = {
  freezeDays: 0,
  lastFreezeAwardDate: null,
  consumedFreezeDates: [],
  unlockedThemes: ["default"],
  lastSeenStreak: 0,
  lastFlameDate: null,
};

export function getStreakState(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveStreakState(s: StreakState) {
  localStorage.setItem(STREAK_STATE_KEY, JSON.stringify(s));
}

export function getActiveTheme(): ThemeName {
  return (localStorage.getItem(THEME_KEY) as ThemeName) || "default";
}

export function setActiveTheme(t: ThemeName) {
  localStorage.setItem(THEME_KEY, t);
  applyTheme(t);
}

export function applyTheme(t: ThemeName) {
  const root = document.documentElement;
  root.classList.remove("theme-neon", "theme-midnight");
  if (t === "neon") root.classList.add("theme-neon");
  if (t === "midnight") root.classList.add("theme-midnight");
}

const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Check if this is the FIRST meal logged today (call BEFORE adding the meal,
 * or check after by counting today's meals === 1).
 */
export function isFirstMealOfToday(): boolean {
  const today = todayKey();
  const todays = getMeals().filter((m) => m.loggedAt.startsWith(today));
  return todays.length === 1; // call right after saveMeal
}

export function shouldShowFlameToday(): boolean {
  const s = getStreakState();
  return s.lastFlameDate !== todayKey();
}

export function markFlameShown() {
  const s = getStreakState();
  s.lastFlameDate = todayKey();
  saveStreakState(s);
}

/**
 * Award a freeze day if user hit protein goal 3 days in a row, max once per
 * 3-day window. Returns true if a freeze was newly awarded.
 */
export function evaluateProteinStreakReward(): boolean {
  const profile = getProfile();
  if (!profile) return false;
  const days = getLast7DaysTotals();
  const last3 = days.slice(-3);
  if (last3.length < 3) return false;
  const allHit = last3.every((d) => d.protein >= profile.proteinTarget);
  if (!allHit) return false;

  const s = getStreakState();
  // Only award once per 3-day window: re-award only if last award was >=3 days ago.
  if (s.lastFreezeAwardDate) {
    const last = new Date(s.lastFreezeAwardDate);
    const diff = Math.floor((Date.now() - last.getTime()) / 86400000);
    if (diff < 3) return false;
  }
  s.freezeDays = Math.min(s.freezeDays + 1, 3); // cap at 3
  s.lastFreezeAwardDate = todayKey();
  saveStreakState(s);
  return true;
}

/**
 * Auto-consume freeze days for missed log dates (weekend forgiveness).
 * For any date in the last 7 days with no meals, spend a freeze if available.
 */
export function autoConsumeFreezesForMisses() {
  const s = getStreakState();
  if (s.freezeDays <= 0) return;
  const meals = getMeals();
  for (let i = 1; i <= 6; i++) {
    if (s.freezeDays <= 0) break;
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (s.consumedFreezeDates.includes(key)) continue;
    const has = meals.some((m) => m.loggedAt.startsWith(key));
    if (!has) {
      s.freezeDays -= 1;
      s.consumedFreezeDates.push(key);
    }
  }
  saveStreakState(s);
}

/**
 * Effective streak counts freeze-protected days as logged.
 */
export function getProtectedStreak(): number {
  autoConsumeFreezesForMisses();
  const meals = getMeals();
  const s = getStreakState();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const has = meals.some((m) => m.loggedAt.startsWith(key));
    const frozen = s.consumedFreezeDates.includes(key);
    if (has || frozen) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

export interface LevelUpReward {
  level: number;
  theme: ThemeName;
  title: string;
  description: string;
}

const REWARDS: LevelUpReward[] = [
  { level: 7, theme: "neon", title: "Neon Unlocked", description: "7-day streak — the lime gets louder." },
  { level: 14, theme: "midnight", title: "Midnight Unlocked", description: "14 days strong — deep blue aesthetic." },
];

/**
 * Returns a reward to celebrate if the user just crossed a threshold.
 * Marks it as "seen" so it only fires once.
 */
export function checkLevelUp(): LevelUpReward | null {
  const current = getProtectedStreak();
  const s = getStreakState();
  const reward = REWARDS.find((r) => current >= r.level && s.lastSeenStreak < r.level);
  if (!reward) {
    if (s.lastSeenStreak !== current) {
      s.lastSeenStreak = current;
      saveStreakState(s);
    }
    return null;
  }
  if (!s.unlockedThemes.includes(reward.theme)) s.unlockedThemes.push(reward.theme);
  s.lastSeenStreak = current;
  saveStreakState(s);
  return reward;
}
