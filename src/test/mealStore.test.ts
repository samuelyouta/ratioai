import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/userSync", () => ({
  deleteMealFromCloud: vi.fn(),
  pushLocalChangesIfAuthenticated: vi.fn(),
  scheduleCloudPush: vi.fn(),
}));

import {
  deleteMeal,
  getDeletedMealIds,
  getMeals,
  getMealsForDay,
  getPendingMealIds,
  mealDay,
  mergeMealsIntoLocal,
  saveMeal,
  updateMeal,
  type Meal,
} from "@/lib/profile";
import { setTimeZone } from "@/lib/dayKey";

const meal = (over: Partial<Meal> = {}): Meal => ({
  id: `meal_${Math.random().toString(36).slice(2)}`,
  loggedAt: "2026-05-20T18:00:00.000Z",
  title: "Lunch",
  icon: "",
  items: [],
  totalCalories: 500,
  totalProtein: 30,
  totalCarbs: 50,
  totalFat: 10,
  hiddenIngredient: null,
  source: "photo",
  verified: true,
  ...over,
});

describe("meal day tracking", () => {
  beforeEach(() => {
    localStorage.clear();
    setTimeZone("UTC");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("stamps the day and last-edit time when a meal is saved", () => {
    saveMeal(meal({ id: "a" }));
    const [saved] = getMeals();
    expect(saved.day).toBe("2026-05-20");
    expect(saved.updatedAt).toBeTruthy();
    expect(getPendingMealIds().has("a")).toBe(true);
  });

  it("keeps a meal on the day it was logged even if the device time zone changes later", () => {
    saveMeal(meal({ id: "late", loggedAt: "2026-05-20T23:30:00.000Z" }));
    expect(getMealsForDay("2026-05-20").map((m) => m.id)).toEqual(["late"]);

    setTimeZone("Pacific/Auckland");
    expect(getMealsForDay("2026-05-20").map((m) => m.id)).toEqual(["late"]);
    expect(getMealsForDay("2026-05-21")).toEqual([]);
  });

  it("falls back to loggedAt for legacy meals with no stored day", () => {
    expect(mealDay({ loggedAt: "2026-05-20T18:00:00.000Z" })).toBe("2026-05-20");
  });

  it("recovers every meal from the backup when the main entry is corrupted", () => {
    saveMeal(meal({ id: "a" }));
    saveMeal(meal({ id: "b", loggedAt: "2026-05-21T10:00:00.000Z" }));
    localStorage.setItem("ratioai.meals", "{not json");

    expect(getMeals().map((m) => m.id).sort()).toEqual(["a", "b"]);
    expect(localStorage.getItem("ratioai.meals.corrupt")).toBe("{not json");
    expect(JSON.parse(localStorage.getItem("ratioai.meals")!)).toHaveLength(2);
  });

  it("tombstones deleted meals so a stale cloud copy cannot bring them back", () => {
    saveMeal(meal({ id: "a" }));
    deleteMeal("a");
    expect(getMeals()).toEqual([]);
    expect(getDeletedMealIds().has("a")).toBe(true);

    mergeMealsIntoLocal([meal({ id: "a" })]);
    expect(getMeals()).toEqual([]);
  });

  it("marks edited meals as pending upload", () => {
    saveMeal(meal({ id: "a" }));
    localStorage.removeItem("ratioai.meals.pending");
    updateMeal("a", { title: "Dinner" });
    expect(getPendingMealIds().has("a")).toBe(true);
  });
});

describe("mergeMealsIntoLocal", () => {
  beforeEach(() => {
    localStorage.clear();
    setTimeZone("UTC");
  });
  afterEach(() => localStorage.clear());

  it("never drops meals that only exist locally", () => {
    saveMeal(meal({ id: "local" }));
    mergeMealsIntoLocal([meal({ id: "remote", loggedAt: "2026-05-19T12:00:00.000Z" })]);
    expect(getMeals().map((m) => m.id).sort()).toEqual(["local", "remote"]);
  });

  it("keeps a pending local edit over the cloud copy", () => {
    saveMeal(meal({ id: "a", title: "Mine" }));
    mergeMealsIntoLocal([meal({ id: "a", title: "Cloud", updatedAt: "2099-01-01T00:00:00.000Z" })]);
    expect(getMeals()[0].title).toBe("Mine");
  });

  it("takes a newer cloud copy when there is no pending local edit", () => {
    saveMeal(meal({ id: "a", title: "Old", updatedAt: "2026-05-20T00:00:00.000Z" }));
    localStorage.removeItem("ratioai.meals.pending");
    mergeMealsIntoLocal([meal({ id: "a", title: "New", updatedAt: "2099-01-01T00:00:00.000Z" })]);
    expect(getMeals()[0].title).toBe("New");
  });

  it("keeps the local photo when taking a newer cloud copy", () => {
    saveMeal(meal({ id: "a", imageDataUrl: "data:image/jpeg;base64,AAAA" }));
    localStorage.removeItem("ratioai.meals.pending");
    mergeMealsIntoLocal([meal({ id: "a", title: "New", updatedAt: "2099-01-01T00:00:00.000Z" })]);
    expect(getMeals()[0].imageDataUrl).toBe("data:image/jpeg;base64,AAAA");
  });

  it("only hydrates an empty log when asked to", () => {
    saveMeal(meal({ id: "a" }));
    expect(mergeMealsIntoLocal([meal({ id: "b" })], { onlyIfEmpty: true })).toEqual({ added: 0, updated: 0 });
    expect(getMeals().map((m) => m.id)).toEqual(["a"]);

    localStorage.clear();
    mergeMealsIntoLocal([meal({ id: "b" })], { onlyIfEmpty: true });
    expect(getMeals().map((m) => m.id)).toEqual(["b"]);
  });
});
