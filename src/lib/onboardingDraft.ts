// 4-step onboarding state shared across steps via localStorage draft
import { Activity, Gender, Goal, Unit } from "@/lib/profile";

const KEY = "ratioai.onboarding.draft";

export interface OnboardingDraft {
  goal?: Goal;
  gender?: Gender;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  unit?: Unit;
  activity?: Activity;
}

export function getDraft(): OnboardingDraft {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function setDraft(patch: Partial<OnboardingDraft>) {
  const next = { ...getDraft(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearDraft() {
  localStorage.removeItem(KEY);
}
