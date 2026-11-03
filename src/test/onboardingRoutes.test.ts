import { beforeEach, describe, expect, it } from "vitest";
import { ONBOARDING_ROUTES, previousOnboardingRoute } from "@/lib/onboardingRoutes";
import { calculateTargets, saveProfile, type Profile } from "@/lib/profile";

describe("previousOnboardingRoute", () => {
  beforeEach(() => localStorage.clear());

  it("goes to the previous step", () => {
    expect(previousOnboardingRoute(1)).toBe(ONBOARDING_ROUTES[0]);
    expect(previousOnboardingRoute(7)).toBe(ONBOARDING_ROUTES[6]);
  });

  it("leaves the first step for the welcome screen when new", () => {
    expect(previousOnboardingRoute(0)).toBe("/app/welcome");
  });

  it("leaves the first step for the profile when one exists", () => {
    const s = { gender: "male", age: 30, heightCm: 180, weightKg: 80, activity: "moderate", goal: "maintain" } as const;
    saveProfile({ ...s, ...calculateTargets(s) } as Profile);
    expect(previousOnboardingRoute(0)).toBe("/app/profile");
  });
});
