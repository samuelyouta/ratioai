import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getRecentUniqueMeals, relogMeal, type Meal } from "@/lib/profile";
import { toast } from "sonner";

interface Props {
  /** Max number of meals to show */
  limit?: number;
  /** "row" = horizontal scroller (Today), "stack" = vertical list (Log) */
  variant?: "row" | "stack";
  /** Optional title override */
  title?: string;
  /** Where to navigate after a re-log; defaults to no navigation */
  onLogged?: (meal: Meal) => void;
}

const RecentMeals = ({ limit = 6, variant = "row", title, onLogged }: Props) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setMeals(getRecentUniqueMeals(limit));
  }, [limit]);

  if (meals.length === 0) return null;

  const handleRelog = (m: Meal) => {
    setBusyId(m.id);
    const copy = relogMeal(m);
    toast.success("Logged again", {
      description: `${copy.title} · ${copy.totalCalories} cal added to today.`,
    });
    setMeals(getRecentUniqueMeals(limit));
    onLogged?.(copy);
    setTimeout(() => setBusyId(null), 400);
  };

  const heading = (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title ?? "Log again"}
      </h3>
      <span className="text-[10px] text-muted-foreground">
        {meals.length} recent
      </span>
    </div>
  );

  if (variant === "row") {
    return (
      <div>
        {heading}
        <div className="-mx-6 px-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {meals.map((m) => (
            <motion.button
              key={m.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleRelog(m)}
              disabled={busyId === m.id}
              className="shrink-0 w-44 text-left rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors p-3 disabled:opacity-60"
            >
              <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {m.items.slice(0, 3).map((i) => i.name).join(" · ") || "Saved meal"}
              </p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-base font-bold text-primary">{m.totalCalories}</span>
                <span className="text-[10px] text-muted-foreground">cal</span>
                <span className="ml-auto text-[10px] font-semibold text-primary">
                  + Log again
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <div className="space-y-2">
        {meals.map((m) => (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRelog(m)}
            disabled={busyId === m.id}
            className="w-full text-left flex items-center gap-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors p-3 disabled:opacity-60"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {m.totalCalories} cal · P {Math.round(m.totalProtein)}g · C{" "}
                {Math.round(m.totalCarbs)}g · F {Math.round(m.totalFat)}g
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
              + Log again
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default RecentMeals;
