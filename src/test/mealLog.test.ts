import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getMeals,
  getMealsForDay,
  getTotalsForDay,
  itemServings,
  saveMeal,
  setMealItemServings,
  withItemServings,
  type Meal,
  type MealItem,
} from "@/lib/profile";
import { dayKey, setTimeZone, timestampForDay } from "@/lib/dayKey";

const item = (over: Partial<MealItem> = {}): MealItem => ({
  name: "Chicken breast",
  portion: "150g",
  basePortion: "150g",
  servings: 1,
  baseMacros: { calories: 250, protein: 46, carbs: 0, fat: 6 },
  calories: 250,
  protein: 46,
  carbs: 0,
  fat: 6,
  ...over,
});

const meal = (over: Partial<Meal> = {}): Meal => ({
  id: `meal_${Math.random().toString(36).slice(2)}`,
  loggedAt: new Date("2026-05-20T18:00:00.000Z").toISOString(),
  title: "Grilled chicken",
  icon: "",
  items: [item()],
  totalCalories: 250,
  totalProtein: 46,
  totalCarbs: 0,
  totalFat: 6,
  hiddenIngredient: null,
  source: "photo",
  verified: true,
  ...over,
});

/** Stand-in for a device whose localStorage quota is nearly full. */
function capStorageAt(maxChars: number) {
  const real = Storage.prototype.setItem;
  const spy = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function (this: Storage, key: string, value: string) {
      if (value.length > maxChars) {
        const err = new DOMException("exceeded the quota", "QuotaExceededError");
        throw err;
      }
      return real.call(this, key, value);
    });
  return spy;
}

describe("meal log storage", () => {
  beforeEach(() => {
    localStorage.clear();
    setTimeZone("UTC");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("logs a meal on the first attempt under normal conditions", () => {
    const result = saveMeal(meal({ id: "m1" }));
    expect(result.ok).toBe(true);
    expect(result.photoDropped).toBe(false);
    expect(getMeals().map((m) => m.id)).toEqual(["m1"]);
  });

  it("still logs the meal when storage is full, shedding older photos first", () => {
    const photo = `data:image/jpeg;base64,${"A".repeat(4000)}`;
    saveMeal(meal({ id: "old", imageDataUrl: photo }));

    // Only enough headroom for one payload's worth of image data.
    capStorageAt(6000);

    const result = saveMeal(meal({ id: "new", imageDataUrl: photo, title: "New meal" }));

    expect(result.ok).toBe(true);
    expect(result.olderPhotosDropped).toBe(true);

    const stored = getMeals();
    expect(stored.map((m) => m.id)).toEqual(["old", "new"]);
    expect(stored.find((m) => m.id === "old")?.imageDataUrl).toBeNull();
    // The new meal keeps its photo and, crucially, its macros.
    expect(stored.find((m) => m.id === "new")?.imageDataUrl).toBe(photo);
    expect(stored.find((m) => m.id === "new")?.totalCalories).toBe(250);
  });

  it("gives up the new photo rather than the meal when nothing else will fit", () => {
    const photo = `data:image/jpeg;base64,${"A".repeat(4000)}`;
    capStorageAt(2000);

    const result = saveMeal(meal({ id: "only", imageDataUrl: photo }));

    expect(result.ok).toBe(true);
    expect(result.photoDropped).toBe(true);
    const stored = getMeals();
    expect(stored).toHaveLength(1);
    expect(stored[0].imageDataUrl).toBeNull();
    expect(stored[0].totalCalories).toBe(250);
  });

  it("reports failure instead of throwing when the meal cannot be stored at all", () => {
    capStorageAt(1);
    expect(() => saveMeal(meal({ id: "doomed" }))).not.toThrow();
    expect(saveMeal(meal({ id: "doomed" })).ok).toBe(false);
  });

  it("files entries under the day they were eaten in the active zone", () => {
    setTimeZone("America/New_York");
    const iso = timestampForDay("2026-05-18");
    saveMeal(meal({ id: "past", loggedAt: iso }));

    expect(dayKey(iso)).toBe("2026-05-18");
    expect(getMealsForDay("2026-05-18").map((m) => m.id)).toEqual(["past"]);
    expect(getTotalsForDay("2026-05-18").calories).toBe(250);
    expect(getMealsForDay("2026-05-19")).toHaveLength(0);
  });
});

describe("portions on logged meals", () => {
  beforeEach(() => {
    localStorage.clear();
    setTimeZone("UTC");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("scales macros and portion text from the per-serving baseline", () => {
    const doubled = withItemServings(item(), 2);
    expect(doubled.calories).toBe(500);
    expect(doubled.protein).toBe(92);
    expect(doubled.portion).toBe("2 × 150g");
    expect(doubled.basePortion).toBe("150g");
  });

  it("returns to the original amounts after scaling up and back down", () => {
    const roundTrip = withItemServings(withItemServings(withItemServings(item(), 3), 2), 1);
    expect(roundTrip.calories).toBe(250);
    expect(roundTrip.protein).toBe(46);
    expect(roundTrip.portion).toBe("150g");
  });

  it("supports half portions", () => {
    const half = withItemServings(item(), 0.5);
    expect(half.calories).toBe(125);
    expect(half.portion).toBe("0.5 × 150g");
  });

  it("never drops below half a portion", () => {
    expect(itemServings(withItemServings(item(), 0))).toBe(0.5);
    expect(itemServings(withItemServings(item(), -3))).toBe(0.5);
  });

  it("derives a baseline for legacy items saved without one", () => {
    const legacy: MealItem = {
      name: "Rice",
      portion: "200g",
      calories: 260,
      protein: 5,
      carbs: 56,
      fat: 1,
    };
    const doubled = withItemServings(legacy, 2);
    expect(doubled.calories).toBe(520);
    expect(doubled.portion).toBe("2 × 200g");
  });

  it("updates a stored meal's totals when a portion changes", () => {
    saveMeal(meal({ id: "m1" }));

    expect(setMealItemServings("m1", 0, 2)).toBe(true);

    const updated = getMeals().find((m) => m.id === "m1")!;
    expect(updated.items[0].calories).toBe(500);
    expect(updated.totalCalories).toBe(500);
    expect(updated.totalProtein).toBe(92);
  });
});
