import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import {
  addMealItem,
  deleteMeal,
  formatServings,
  getMeals,
  itemServings,
  mealDay,
  setMealItemServings,
  type Meal,
  type MealSource,
} from "@/lib/profile";
import { formatDayLabel, formatTimeOfDay, getTimeZone } from "@/lib/dayKey";
import { withDay } from "@/lib/loggingDay";
import { toast } from "sonner";

const sourceLabel: Record<MealSource, string> = {
  photo: "Photo capture",
  voice: "Voice log",
  manual: "Manual entry",
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: getTimeZone(),
  })} · ${formatTimeOfDay(iso)}`;
};

const MealDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meal, setMeal] = useState<Meal | undefined>(undefined);

  // Re-read from storage after each portion edit.
  const reload = useCallback(() => {
    setMeal(getMeals().find((m) => m.id === id));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!meal) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Meal not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This entry may have been deleted from your history.
        </p>
        <Button onClick={() => navigate("/app/history")}>Back to history</Button>
      </div>
    );
  }

  const src = (meal.source ?? "photo") as MealSource;

  const macros = [
    { key: "Protein", value: meal.totalProtein, color: "hsl(var(--primary))" },
    { key: "Carbs", value: meal.totalCarbs, color: "hsl(var(--accent))" },
    { key: "Fat", value: meal.totalFat, color: "hsl(var(--muted-foreground))" },
  ];
  const macroTotal = Math.max(meal.totalProtein + meal.totalCarbs + meal.totalFat, 1);

  const handleDelete = () => {
    deleteMeal(meal.id);
    toast.success("Meal deleted");
    navigate("/app/history");
  };

  const changeServings = (index: number, next: number) => {
    if (next < 0.5) return;
    if (!setMealItemServings(meal.id, index, next)) {
      toast.error("Couldn't update this portion", {
        description: "Your device is out of storage space.",
      });
      return;
    }
    reload();
  };

  const handleAddPortion = () => {
    const last = meal.items[meal.items.length - 1];
    const template = last
      ? {
          name: last.name,
          portion: last.basePortion ?? last.portion,
          basePortion: last.basePortion ?? last.portion,
          servings: 1,
          baseMacros: last.baseMacros ?? {
            calories: last.calories / itemServings(last),
            protein: last.protein / itemServings(last),
            carbs: last.carbs / itemServings(last),
            fat: last.fat / itemServings(last),
          },
          calories: Math.round(last.calories / itemServings(last)),
          protein: Math.round((last.protein / itemServings(last)) * 10) / 10,
          carbs: Math.round((last.carbs / itemServings(last)) * 10) / 10,
          fat: Math.round((last.fat / itemServings(last)) * 10) / 10,
        }
      : {
          name: "Extra portion",
          portion: "1 serving",
          basePortion: "1 serving",
          servings: 1,
          baseMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };

    if (!addMealItem(meal.id, template)) {
      toast.error("Couldn't add a portion", {
        description: "Your device is out of storage space.",
      });
      return;
    }
    reload();
    toast.success("Portion added", {
      description: "Adjust the amount below, or edit the macros in history.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 safe-top pb-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <button
          onClick={handleDelete}
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-destructive"
          aria-label="Delete meal"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6"
      >
        {meal.imageDataUrl && (
          <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-border bg-secondary mb-4">
            <img src={meal.imageDataUrl} alt={meal.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{meal.title}</h1>
            <p className="text-xs text-muted-foreground">{formatWhen(meal.loggedAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary leading-none">{meal.totalCalories}</p>
            <p className="text-[11px] text-muted-foreground">calories</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <span className="text-[11px] bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
            {sourceLabel[src]}
          </span>
          {meal.verified && (
            <span className="text-[11px] bg-primary/15 text-primary px-2.5 py-1 rounded-full font-semibold">
              Verified
            </span>
          )}
        </div>

        {meal.hiddenIngredient && (
          <div className="gradient-card border border-border rounded-2xl p-4 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warning mb-1">
              Ingredient probe
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {meal.hiddenIngredient}
            </p>
          </div>
        )}

        <div className="mb-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Macro totals
          </h2>
          <div className="gradient-card border border-border rounded-2xl p-4">
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden flex mb-3">
              {macros.map((m) => (
                <div
                  key={m.key}
                  style={{
                    width: `${(m.value / macroTotal) * 100}%`,
                    background: m.color,
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {macros.map((m) => (
                <div key={m.key}>
                  <p className="text-[11px] text-muted-foreground">{m.key}</p>
                  <p className="text-sm font-bold text-foreground">{Math.round(m.value)}g</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Item breakdown
            </h2>
            <span className="text-[10px] text-muted-foreground">tap − / + to change portions</span>
          </div>
          <div className="space-y-2">
            {meal.items.length === 0 && (
              <p className="text-xs text-muted-foreground">No items recorded.</p>
            )}
            {meal.items.map((it, idx) => {
              const servings = itemServings(it);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="gradient-card border border-border rounded-2xl p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{it.name}</h4>
                      <p className="text-[11px] text-muted-foreground">{it.portion}</p>
                    </div>
                    <span className="text-sm font-bold text-primary whitespace-nowrap">
                      {it.calories}{" "}
                      <span className="text-[10px] text-muted-foreground">cal</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Portions
                    </span>
                    <div className="flex items-center gap-1 bg-secondary rounded-lg px-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => changeServings(idx, servings - 0.5)}
                        disabled={servings <= 0.5}
                        aria-label={`Fewer portions of ${it.name}`}
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground disabled:opacity-30"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-semibold text-foreground w-7 text-center">
                        {formatServings(servings)}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeServings(idx, servings + 0.5)}
                        aria-label={`More portions of ${it.name}`}
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(["protein", "carbs", "fat"] as const).map((k) => (
                      <div
                        key={k}
                        className="bg-secondary/60 rounded-lg px-2 py-1 text-center"
                      >
                        <p className="text-[10px] text-muted-foreground capitalize">{k}</p>
                        <p className="text-xs font-semibold text-foreground">
                          {Math.round(it[k])}g
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={handleAddPortion}
            className="w-full mt-2 text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add a portion
          </Button>
        </div>

        {meal.notes && (
          <div className="mb-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Notes
            </h2>
            <div className="gradient-card border border-border rounded-2xl p-4 text-sm text-foreground whitespace-pre-wrap">
              {meal.notes}
            </div>
          </div>
        )}

        <Button
          onClick={() => navigate(`/app/history?edit=${meal.id}`)}
          className="w-full gradient-glow text-primary-foreground font-semibold"
        >
          Edit meal
        </Button>

        <button
          onClick={() => navigate(withDay("/app/today", mealDay(meal)))}
          className="w-full mt-2 text-xs font-semibold text-primary py-2"
        >
          View {formatDayLabel(mealDay(meal)).toLowerCase()}
        </button>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default MealDetails;
