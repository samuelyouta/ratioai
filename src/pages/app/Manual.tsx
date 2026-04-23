import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Plus, Minus, Check, Pencil } from "lucide-react";
import { saveMeal, type Meal, type MealItem } from "@/lib/profile";
import { toast } from "@/hooks/use-toast";

// Lightweight built-in food database (per 100g unless noted)
type FoodDef = {
  name: string;
  icon: string;
  unit: string; // e.g. "100g", "1 egg", "1 slice"
  unitGrams: number;
  cal: number;
  p: number;
  c: number;
  f: number;
};

const FOODS: FoodDef[] = [
  { name: "Chicken breast", icon: "🍗", unit: "100g", unitGrams: 100, cal: 165, p: 31, c: 0, f: 3.6 },
  { name: "Salmon", icon: "🐟", unit: "100g", unitGrams: 100, cal: 208, p: 20, c: 0, f: 13 },
  { name: "Beef mince (lean)", icon: "🥩", unit: "100g", unitGrams: 100, cal: 217, p: 26, c: 0, f: 12 },
  { name: "Egg", icon: "🥚", unit: "1 egg", unitGrams: 50, cal: 78, p: 6, c: 0.6, f: 5 },
  { name: "Greek yogurt", icon: "🥛", unit: "100g", unitGrams: 100, cal: 59, p: 10, c: 3.6, f: 0.4 },
  { name: "Oats", icon: "🌾", unit: "40g (dry)", unitGrams: 40, cal: 150, p: 5, c: 27, f: 3 },
  { name: "White rice (cooked)", icon: "🍚", unit: "100g", unitGrams: 100, cal: 130, p: 2.4, c: 28, f: 0.3 },
  { name: "Brown rice (cooked)", icon: "🍚", unit: "100g", unitGrams: 100, cal: 112, p: 2.6, c: 24, f: 0.9 },
  { name: "Pasta (cooked)", icon: "🍝", unit: "100g", unitGrams: 100, cal: 158, p: 5.8, c: 31, f: 0.9 },
  { name: "Bread slice", icon: "🍞", unit: "1 slice", unitGrams: 30, cal: 80, p: 3, c: 14, f: 1 },
  { name: "Banana", icon: "🍌", unit: "1 medium", unitGrams: 118, cal: 105, p: 1.3, c: 27, f: 0.4 },
  { name: "Apple", icon: "🍎", unit: "1 medium", unitGrams: 182, cal: 95, p: 0.5, c: 25, f: 0.3 },
  { name: "Avocado", icon: "🥑", unit: "1/2", unitGrams: 100, cal: 160, p: 2, c: 9, f: 15 },
  { name: "Olive oil", icon: "🫒", unit: "1 tbsp", unitGrams: 14, cal: 119, p: 0, c: 0, f: 14 },
  { name: "Almonds", icon: "🌰", unit: "30g", unitGrams: 30, cal: 174, p: 6, c: 6, f: 15 },
  { name: "Peanut butter", icon: "🥜", unit: "1 tbsp", unitGrams: 16, cal: 94, p: 4, c: 3, f: 8 },
  { name: "Broccoli", icon: "🥦", unit: "100g", unitGrams: 100, cal: 35, p: 2.4, c: 7, f: 0.4 },
  { name: "Sweet potato", icon: "🍠", unit: "100g", unitGrams: 100, cal: 86, p: 1.6, c: 20, f: 0.1 },
  { name: "Protein shake", icon: "🥤", unit: "1 scoop", unitGrams: 30, cal: 120, p: 24, c: 3, f: 1.5 },
  { name: "Coffee w/ milk", icon: "☕", unit: "1 cup", unitGrams: 240, cal: 35, p: 2, c: 3, f: 1.5 },
];

type Selected = { food: FoodDef; servings: number };

const Manual = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Selected[]>([]);
  const [title, setTitle] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOODS.slice(0, 10);
    return FOODS.filter((f) => f.name.toLowerCase().includes(q));
  }, [query]);

  const totals = useMemo(() => {
    return selected.reduce(
      (acc, s) => ({
        cal: acc.cal + s.food.cal * s.servings,
        p: acc.p + s.food.p * s.servings,
        c: acc.c + s.food.c * s.servings,
        f: acc.f + s.food.f * s.servings,
      }),
      { cal: 0, p: 0, c: 0, f: 0 },
    );
  }, [selected]);

  const addFood = (food: FoodDef) => {
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.food.name === food.name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], servings: copy[idx].servings + 1 };
        return copy;
      }
      return [...prev, { food, servings: 1 }];
    });
  };

  const adjust = (name: string, delta: number) => {
    setSelected((prev) =>
      prev
        .map((s) => (s.food.name === name ? { ...s, servings: Math.max(0, +(s.servings + delta).toFixed(2)) } : s))
        .filter((s) => s.servings > 0),
    );
  };

  const handleSave = () => {
    if (selected.length === 0) {
      toast({ title: "Add at least one item", description: "Search and tap to add foods." });
      return;
    }
    const items: MealItem[] = selected.map((s) => ({
      name: s.food.name,
      portion: `${s.servings} × ${s.food.unit}`,
      calories: Math.round(s.food.cal * s.servings),
      protein: +(s.food.p * s.servings).toFixed(1),
      carbs: +(s.food.c * s.servings).toFixed(1),
      fat: +(s.food.f * s.servings).toFixed(1),
    }));
    const meal: Meal = {
      id: `meal_${Date.now()}`,
      loggedAt: new Date().toISOString(),
      title: title.trim() || (items.length === 1 ? items[0].name : "Manual entry"),
      icon: selected[0]?.food.icon ?? "🍽️",
      items,
      totalCalories: items.reduce((s, i) => s + i.calories, 0),
      totalProtein: +items.reduce((s, i) => s + i.protein, 0).toFixed(1),
      totalCarbs: +items.reduce((s, i) => s + i.carbs, 0).toFixed(1),
      totalFat: +items.reduce((s, i) => s + i.fat, 0).toFixed(1),
      hiddenIngredient: null,
      source: "manual",
      verified: true,
    };
    saveMeal(meal);
    toast({ title: "Logged", description: `${meal.totalCalories} cal added to today.` });
    navigate("/app/today");
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground leading-tight">Search & Edit</h1>
            <p className="text-[11px] text-muted-foreground">Manual log — no AI</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods (e.g. chicken, oats)…"
              className="w-full h-11 pl-9 pr-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      {/* Selected items */}
      {selected.length > 0 && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Your meal</h2>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meal name (optional)"
            className="w-full h-10 px-3 mb-3 rounded-lg bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none"
          />
          <div className="space-y-2">
            {selected.map((s) => (
              <div
                key={s.food.name}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
              >
                <div className="text-2xl">{s.food.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.food.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {Math.round(s.food.cal * s.servings)} cal · {s.servings} × {s.food.unit}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjust(s.food.name, -0.5)}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
                    aria-label="Decrease"
                  >
                    <Minus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-foreground">{s.servings}</span>
                  <button
                    onClick={() => adjust(s.food.name, 0.5)}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
                    aria-label="Increase"
                  >
                    <Plus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="px-4 pt-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {query ? `Results (${results.length})` : "Common foods"}
        </h2>
        {results.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">No matches. Try another term.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((f) => (
              <button
                key={f.name}
                onClick={() => addFood(f)}
                className="w-full flex items-center gap-3 bg-card hover:bg-card/80 border border-border rounded-xl p-3 text-left transition-colors"
              >
                <div className="text-2xl">{f.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.cal} cal · P {f.p}g · C {f.c}g · F {f.f}g · per {f.unit}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      {selected.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border px-4 py-3 safe-bottom"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-foreground">{Math.round(totals.cal)} cal</p>
            </div>
            <div className="flex gap-3 text-[11px] text-muted-foreground">
              <span>P {totals.p.toFixed(0)}g</span>
              <span>C {totals.c.toFixed(0)}g</span>
              <span>F {totals.f.toFixed(0)}g</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="w-full h-12 rounded-xl gradient-glow shadow-glow flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground"
          >
            <Check className="w-4 h-4" />
            Log {selected.length} item{selected.length > 1 ? "s" : ""}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Manual;
