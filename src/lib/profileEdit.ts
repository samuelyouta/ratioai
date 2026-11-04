import { translate } from "@/i18n";
import { calculateTargets, type Activity, type Gender, type Goal, type Profile, type Unit } from "@/lib/profile";

/** Editable copy of the profile, always in metric units. */
export interface ProfileDraft {
  name: string;
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
}

export const PROFILE_LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 25, max: 300 },
  calories: { min: 800, max: 8000 },
  macro: { min: 0, max: 1500 },
} as const;

export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

const KG_PER_LB = 0.45359237;

export const lbsToKg = (lbs: number) => lbs * KG_PER_LB;
export const kgToLbs = (kg: number) => kg / KG_PER_LB;
export const ftInToCm = (ft: number, inches: number) => (ft * 12 + inches) * 2.54;

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const total = Math.round(cm / 2.54);
  return { ft: Math.floor(total / 12), inches: total % 12 };
}

/** Parses user input; empty or unparseable text is NaN so validation can flag it. */
export function parseNumber(text: string): number {
  const cleaned = text.trim().replace(",", ".");
  if (!cleaned) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export function draftFromProfile(p: Profile): ProfileDraft {
  return {
    name: p.name ?? "",
    gender: p.gender,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    unit: p.unit ?? "metric",
    activity: p.activity,
    goal: p.goal,
    calorieTarget: p.calorieTarget,
    proteinTarget: p.proteinTarget,
    carbsTarget: p.carbsTarget,
    fatTarget: p.fatTarget,
  };
}

export function recommendedTargets(d: ProfileDraft) {
  return calculateTargets({
    gender: d.gender,
    age: d.age,
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    activity: d.activity,
    goal: d.goal,
  });
}

/** True when the saved targets are not what the formula would produce, i.e. the user (or an older build) set them. */
export function hasCustomTargets(d: ProfileDraft): boolean {
  const rec = recommendedTargets(d);
  return (
    rec.calorieTarget !== d.calorieTarget ||
    rec.proteinTarget !== d.proteinTarget ||
    rec.carbsTarget !== d.carbsTarget ||
    rec.fatTarget !== d.fatTarget
  );
}

/** Keeps the macro mix when the calorie target changes. */
export function rescaleMacros(d: ProfileDraft, calories: number) {
  const base = d.calorieTarget > 0 ? d.calorieTarget : calories;
  const factor = base > 0 ? calories / base : 1;
  return {
    proteinTarget: Math.round(d.proteinTarget * factor),
    carbsTarget: Math.round(d.carbsTarget * factor),
    fatTarget: Math.round(d.fatTarget * factor),
  };
}

export function macroCalories(d: Pick<ProfileDraft, "proteinTarget" | "carbsTarget" | "fatTarget">) {
  return Math.round(d.proteinTarget * 4 + d.carbsTarget * 4 + d.fatTarget * 9);
}

function inRange(value: number, { min, max }: { min: number; max: number }) {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function validateProfile(d: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  const { age, heightCm, weightKg, calories, macro } = PROFILE_LIMITS;
  if (!inRange(d.age, age)) errors.age = translate("edit.err.age", { min: age.min, max: age.max });
  if (!inRange(d.heightCm, heightCm)) errors.heightCm = translate("edit.err.height");
  if (!inRange(d.weightKg, weightKg)) errors.weightKg = translate("edit.err.weight");
  if (!inRange(d.calorieTarget, calories)) {
    errors.calorieTarget = translate("edit.err.calories", { min: calories.min, max: calories.max });
  }
  const macros = ["proteinTarget", "carbsTarget", "fatTarget"] as const;
  for (const key of macros) {
    if (!inRange(d[key], macro)) errors[key] = translate("edit.err.macro", { max: macro.max });
  }
  return errors;
}

export function applyDraft(base: Profile, d: ProfileDraft): Profile {
  return {
    ...base,
    name: d.name.trim() || undefined,
    gender: d.gender,
    age: Math.round(d.age),
    heightCm: Math.round(d.heightCm),
    weightKg: Math.round(d.weightKg * 10) / 10,
    unit: d.unit,
    activity: d.activity,
    goal: d.goal,
    calorieTarget: Math.round(d.calorieTarget),
    proteinTarget: Math.round(d.proteinTarget),
    carbsTarget: Math.round(d.carbsTarget),
    fatTarget: Math.round(d.fatTarget),
  };
}
