import { describe, expect, it } from "vitest";
import {
  activeItems,
  customItem,
  foodToItem,
  gramsOf,
  parseAmount,
  sumItems,
  toMealItem,
  withGrams,
  type EditableItem,
} from "@/lib/mealEdit";
import { FOODS } from "@/lib/foodDb";

const rice: EditableItem = {
  name: "Rice",
  portion: "150g",
  calories: 195,
  protein: 4,
  carbs: 42,
  fat: 0.5,
  confidence: 90,
  servings: 1,
};

describe("withGrams", () => {
  it("scales macros in proportion to the new weight", () => {
    const doubled = withGrams(rice, 300);
    expect(doubled.portion).toBe("300g");
    expect(doubled.calories).toBe(390);
    expect(doubled.protein).toBe(8);
    expect(doubled.carbs).toBe(84);
    expect(doubled.fat).toBe(1);
  });

  it("keeps surrounding text when the portion has a description", () => {
    const bowl = { ...rice, portion: "1 bowl (150g)" };
    expect(withGrams(bowl, 200).portion).toBe("1 bowl (200g)");
    expect(gramsOf(withGrams(bowl, 200))).toBe(200);
  });

  it("scales back down and rounds sensibly", () => {
    const half = withGrams(rice, 75);
    expect(half.calories).toBe(98);
    expect(half.fat).toBe(0.3);
  });

  it("leaves items without a gram weight, or with invalid input, untouched", () => {
    const slice = { ...rice, portion: "1 slice" };
    expect(withGrams(slice, 50)).toBe(slice);
    expect(withGrams(rice, 0)).toBe(rice);
    expect(withGrams(rice, Number.NaN)).toBe(rice);
    expect(withGrams(rice, -5)).toBe(rice);
  });
});

describe("parseAmount", () => {
  it("accepts decimals and comma decimals", () => {
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount(" 0 ")).toBe(0);
  });

  it("rejects blank, negative and non-numeric input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount("-3")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("manual items", () => {
  it("builds an item from the built-in food list, optionally re-weighed", () => {
    const oil = FOODS.find((f) => f.name === "Olive oil")!;
    const base = foodToItem(oil);
    expect(base).toMatchObject({ name: "Olive oil", portion: "14g", calories: 119, manual: true });
    const double = foodToItem(oil, 28);
    expect(double.calories).toBe(238);
    expect(double.portion).toBe("28g");
  });

  it("builds a custom item with or without grams", () => {
    expect(
      customItem({ name: "  Side salad ", grams: 80, calories: 40.4, protein: 1.26, carbs: 5, fat: 2 }),
    ).toMatchObject({ name: "Side salad", portion: "80g", calories: 40, protein: 1.3, manual: true });
    expect(
      customItem({ name: "Mystery", grams: null, calories: 100, protein: 0, carbs: 0, fat: 0 }).portion,
    ).toBe("1 serving");
  });
});

describe("totals and saving", () => {
  const items: EditableItem[] = [
    { ...rice, servings: 2 },
    { ...rice, name: "Egg", portion: "50g", calories: 78, protein: 6, carbs: 0.6, fat: 5, servings: 1 },
    { ...rice, name: "Removed", servings: 0 },
  ];

  it("sums only what counts, times servings", () => {
    expect(activeItems(items)).toHaveLength(2);
    expect(sumItems(items)).toEqual({ calories: 468, protein: 14, carbs: 84.6, fat: 6 });
  });

  it("maps to a saved meal item that stays editable later", () => {
    const saved = toMealItem({ ...rice, servings: 2 });
    expect(saved).toMatchObject({
      portion: "2 × 150g",
      basePortion: "150g",
      servings: 2,
      calories: 390,
      baseMacros: { calories: 195, protein: 4, carbs: 42, fat: 0.5 },
    });
  });
});
