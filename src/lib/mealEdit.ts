import type { FoodDef } from "@/lib/foodDb";
import type { MealItem } from "@/lib/profile";
import { extractGrams } from "@/lib/portionGuides";

/** One line of a scanned meal that the user can still correct before logging. */
export interface EditableItem {
  name: string;
  /** Portion text for ONE serving, e.g. "150g" or "1 cup (240g)". */
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  servings: number;
  /** Added by the user rather than detected by the AI. */
  manual?: boolean;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const GRAMS_TOKEN = /(\d+(?:\.\d+)?)(\s*g\b)/i;
export const MAX_GRAMS = 5000;
export const MAX_CALORIES = 20000;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function gramsOf(item: Pick<EditableItem, "portion">): number | null {
  return extractGrams(item.portion);
}

/** Parses a user-typed number. Returns null for blank / invalid / negative input. */
export function parseAmount(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  if (raw.trim() === "" || !Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Re-weighs an item. Macros scale in proportion to the change in grams, so
 * 150g -> 300g doubles everything. Items whose portion has no gram weight
 * (e.g. "1 slice") cannot be scaled and are returned unchanged.
 */
export function withGrams(item: EditableItem, grams: number): EditableItem {
  const current = gramsOf(item);
  if (!current || current <= 0 || !Number.isFinite(grams) || grams <= 0) return item;
  const ratio = grams / current;
  const rounded = round1(grams);
  return {
    ...item,
    portion: item.portion.replace(GRAMS_TOKEN, `${rounded}$2`),
    calories: Math.round(item.calories * ratio),
    protein: round1(item.protein * ratio),
    carbs: round1(item.carbs * ratio),
    fat: round1(item.fat * ratio),
  };
}

export function itemTotals(item: EditableItem): Macros {
  const s = item.servings;
  return {
    calories: item.calories * s,
    protein: item.protein * s,
    carbs: item.carbs * s,
    fat: item.fat * s,
  };
}

export function sumItems(items: EditableItem[]): Macros {
  return items.reduce<Macros>(
    (acc, it) => {
      const t = itemTotals(it);
      return {
        calories: acc.calories + t.calories,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function foodToItem(food: FoodDef, grams = food.unitGrams): EditableItem {
  const base: EditableItem = {
    name: food.name,
    portion: `${food.unitGrams}g`,
    calories: food.cal,
    protein: food.p,
    carbs: food.c,
    fat: food.f,
    confidence: 100,
    servings: 1,
    manual: true,
  };
  return grams === food.unitGrams ? base : withGrams(base, grams);
}

/** An item estimated by the describe-a-meal AI, shaped like a manually added one. */
export function aiEstimateToItem(ai: {
  name: string;
  portion?: string;
  grams?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
}): EditableItem {
  const portionText = (ai.portion ?? "").trim();
  const hasGramsInText = extractGrams(portionText) !== null;
  const grams = typeof ai.grams === "number" && ai.grams > 0 ? round1(ai.grams) : null;
  let portion = portionText || "1 serving";
  if (!hasGramsInText && grams) portion = portionText ? `${grams}g (${portionText})` : `${grams}g`;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);
  return {
    name: ai.name.trim() || "Food item",
    portion,
    calories: Math.round(num(ai.calories)),
    protein: round1(num(ai.protein)),
    carbs: round1(num(ai.carbs)),
    fat: round1(num(ai.fat)),
    confidence: Math.round(ai.confidence ?? 70),
    servings: 1,
    manual: true,
  };
}

export function customItem(input: {
  name: string;
  grams: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): EditableItem {
  return {
    name: input.name.trim(),
    portion: input.grams && input.grams > 0 ? `${round1(input.grams)}g` : "1 serving",
    calories: Math.round(input.calories),
    protein: round1(input.protein),
    carbs: round1(input.carbs),
    fat: round1(input.fat),
    confidence: 100,
    servings: 1,
    manual: true,
  };
}

/** Items with 0 servings are treated as removed. */
export function activeItems(items: EditableItem[]): EditableItem[] {
  return items.filter((it) => it.servings > 0);
}

export function toMealItem(item: EditableItem): MealItem {
  const s = item.servings;
  return {
    name: item.name,
    portion: s === 1 ? item.portion : `${s} × ${item.portion}`,
    basePortion: item.portion,
    servings: s,
    baseMacros: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    },
    calories: Math.round(item.calories * s),
    protein: Math.round(item.protein * s),
    carbs: Math.round(item.carbs * s),
    fat: Math.round(item.fat * s),
  };
}
