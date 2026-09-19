import { beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  isDemoMode,
  matchesDemoCredentials,
  startDemoMode,
  stopDemoMode,
} from "@/lib/demoMode";
import { getMeals, getProfile } from "@/lib/profile";

beforeEach(() => {
  localStorage.clear();
});

describe("matchesDemoCredentials", () => {
  it("accepts the exact credentials published in App Store Connect", () => {
    expect(matchesDemoCredentials(DEMO_EMAIL, DEMO_PASSWORD)).toBe(true);
  });

  it("accepts whitespace and casing the way a reviewer would type them", () => {
    expect(matchesDemoCredentials("  Reviewer@RatioAi.app ", " 1234 ")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(matchesDemoCredentials(DEMO_EMAIL, "12345")).toBe(false);
  });

  it("rejects any other account", () => {
    expect(matchesDemoCredentials("someone@example.com", DEMO_PASSWORD)).toBe(false);
  });
});

describe("demo mode session", () => {
  it("is off by default", () => {
    expect(isDemoMode()).toBe(false);
  });

  it("seeds a profile and meals so every screen has content", () => {
    startDemoMode();

    expect(isDemoMode()).toBe(true);
    expect(getProfile()).not.toBeNull();
    expect(getProfile()?.calorieTarget).toBeGreaterThan(0);
    expect(getMeals().length).toBeGreaterThan(0);
  });

  it("logs meals for today so the Today screen is populated", () => {
    startDemoMode();

    const today = new Date().toISOString().slice(0, 10);
    expect(getMeals().some((m) => m.loggedAt.startsWith(today))).toBe(true);
  });

  it("removes its own sample data on exit", () => {
    startDemoMode();
    stopDemoMode();

    expect(isDemoMode()).toBe(false);
    expect(getProfile()).toBeNull();
    expect(getMeals()).toHaveLength(0);
  });

  it("never overwrites data a real user already has", () => {
    const realMeal = {
      id: "real-1",
      loggedAt: new Date().toISOString(),
      title: "My own meal",
      icon: "🍎",
      items: [],
      totalCalories: 100,
      totalProtein: 1,
      totalCarbs: 2,
      totalFat: 3,
    };
    localStorage.setItem("ratioai.meals", JSON.stringify([realMeal]));

    startDemoMode();
    stopDemoMode();

    expect(getMeals()).toHaveLength(1);
    expect(getMeals()[0].id).toBe("real-1");
  });
});
