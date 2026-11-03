import { describe, expect, it } from "vitest";
import {
  applyDraft,
  cmToFtIn,
  draftFromProfile,
  ftInToCm,
  hasCustomTargets,
  kgToLbs,
  lbsToKg,
  macroCalories,
  parseNumber,
  recommendedTargets,
  rescaleMacros,
  validateProfile,
} from "@/lib/profileEdit";
import { calculateTargets, type Profile } from "@/lib/profile";

const stats = { gender: "male", age: 30, heightCm: 180, weightKg: 80, activity: "moderate", goal: "maintain" } as const;

const profile = (over: Partial<Profile> = {}): Profile =>
  ({ ...stats, name: "Sam", unit: "metric", ...calculateTargets(stats), ...over }) as Profile;

describe("profileEdit", () => {
  it("round-trips a profile through a draft", () => {
    const p = profile();
    expect(applyDraft(p, draftFromProfile(p))).toEqual(p);
  });

  it("recognises formula targets versus custom ones", () => {
    const d = draftFromProfile(profile());
    expect(hasCustomTargets(d)).toBe(false);
    expect(hasCustomTargets({ ...d, calorieTarget: d.calorieTarget + 50 })).toBe(true);
    expect(recommendedTargets({ ...d, goal: "lose" }).calorieTarget).toBeLessThan(d.calorieTarget);
  });

  it("rescales macros when calories change", () => {
    const d = draftFromProfile(profile());
    const doubled = rescaleMacros(d, d.calorieTarget * 2);
    expect(doubled.proteinTarget).toBe(Math.round(d.proteinTarget * 2));
    expect(macroCalories(d)).toBeGreaterThan(0);
  });

  it("validates ranges", () => {
    const d = draftFromProfile(profile());
    expect(validateProfile(d)).toEqual({});
    const bad = validateProfile({ ...d, age: 5, heightCm: NaN, calorieTarget: 100, proteinTarget: -1 });
    expect(Object.keys(bad).sort()).toEqual(["age", "calorieTarget", "heightCm", "proteinTarget"]);
  });

  it("trims names and drops blanks", () => {
    const p = profile();
    expect(applyDraft(p, { ...draftFromProfile(p), name: "  " }).name).toBeUndefined();
    expect(applyDraft(p, { ...draftFromProfile(p), name: " Al " }).name).toBe("Al");
  });

  it("converts units and parses input", () => {
    expect(lbsToKg(kgToLbs(80))).toBeCloseTo(80);
    expect(ftInToCm(6, 0)).toBeCloseTo(182.88);
    expect(cmToFtIn(182.88)).toEqual({ ft: 6, inches: 0 });
    expect(parseNumber("72,5")).toBe(72.5);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
  });
});
