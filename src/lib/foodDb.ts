// Lightweight built-in food database. Macros are per `unit` (which weighs `unitGrams`).
export type FoodDef = {
  name: string;
  unit: string;
  unitGrams: number;
  cal: number;
  p: number;
  c: number;
  f: number;
};

export const FOODS: FoodDef[] = [
  { name: "Chicken breast", unit: "100g", unitGrams: 100, cal: 165, p: 31, c: 0, f: 3.6 },
  { name: "Salmon", unit: "100g", unitGrams: 100, cal: 208, p: 20, c: 0, f: 13 },
  { name: "Beef mince (lean)", unit: "100g", unitGrams: 100, cal: 217, p: 26, c: 0, f: 12 },
  { name: "Egg", unit: "1 egg", unitGrams: 50, cal: 78, p: 6, c: 0.6, f: 5 },
  { name: "Greek yogurt", unit: "100g", unitGrams: 100, cal: 59, p: 10, c: 3.6, f: 0.4 },
  { name: "Oats", unit: "40g (dry)", unitGrams: 40, cal: 150, p: 5, c: 27, f: 3 },
  { name: "White rice (cooked)", unit: "100g", unitGrams: 100, cal: 130, p: 2.4, c: 28, f: 0.3 },
  { name: "Brown rice (cooked)", unit: "100g", unitGrams: 100, cal: 112, p: 2.6, c: 24, f: 0.9 },
  { name: "Pasta (cooked)", unit: "100g", unitGrams: 100, cal: 158, p: 5.8, c: 31, f: 0.9 },
  { name: "Bread slice", unit: "1 slice", unitGrams: 30, cal: 80, p: 3, c: 14, f: 1 },
  { name: "Banana", unit: "1 medium", unitGrams: 118, cal: 105, p: 1.3, c: 27, f: 0.4 },
  { name: "Apple", unit: "1 medium", unitGrams: 182, cal: 95, p: 0.5, c: 25, f: 0.3 },
  { name: "Avocado", unit: "1/2", unitGrams: 100, cal: 160, p: 2, c: 9, f: 15 },
  { name: "Olive oil", unit: "1 tbsp", unitGrams: 14, cal: 119, p: 0, c: 0, f: 14 },
  { name: "Almonds", unit: "30g", unitGrams: 30, cal: 174, p: 6, c: 6, f: 15 },
  { name: "Peanut butter", unit: "1 tbsp", unitGrams: 16, cal: 94, p: 4, c: 3, f: 8 },
  { name: "Broccoli", unit: "100g", unitGrams: 100, cal: 35, p: 2.4, c: 7, f: 0.4 },
  { name: "Sweet potato", unit: "100g", unitGrams: 100, cal: 86, p: 1.6, c: 20, f: 0.1 },
  { name: "Protein shake", unit: "1 scoop", unitGrams: 30, cal: 120, p: 24, c: 3, f: 1.5 },
  { name: "Coffee w/ milk", unit: "1 cup", unitGrams: 240, cal: 35, p: 2, c: 3, f: 1.5 },
];
