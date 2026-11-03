import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Sheet } from "@/components/app/Sheet";
import { getMeals, mealDay, relogMeal, type Meal } from "@/lib/profile";
import { formatDayLabel, formatTimeOfDay, isToday, todayKey, type DayKey } from "@/lib/dayKey";
import { toast } from "sonner";

const PAGE = 60;

interface Props {
  open: boolean;
  /** Day the chosen meal is logged on; defaults to today. */
  day?: DayKey;
  onClose: () => void;
  onLogged?: (meal: Meal) => void;
}

/** Every meal ever logged, grouped by day like the History page, ready to log again in one tap. */
const MealPickerSheet = ({ open, day, onClose, onLogged }: Props) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (!open) return;
    setMeals([...getMeals()].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)));
    setQuery("");
    setShown(PAGE);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter(
      (m) => m.title.toLowerCase().includes(q) || m.items.some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [meals, query]);

  const grouped = useMemo(() => {
    const groups: [string, Meal[]][] = [];
    for (const m of filtered.slice(0, shown)) {
      const key = mealDay(m);
      const last = groups[groups.length - 1];
      if (last && last[0] === key) last[1].push(m);
      else groups.push([key, [m]]);
    }
    return groups;
  }, [filtered, shown]);

  const targetDay = day ?? todayKey();

  const handleLog = (m: Meal) => {
    const copy = relogMeal(m, targetDay);
    const where = isToday(targetDay) ? "today" : formatDayLabel(targetDay).toLowerCase();
    toast.success("Logged again", {
      description: `${copy.title} · ${copy.totalCalories} cal added to ${where}.`,
    });
    onClose();
    onLogged?.(copy);
  };

  return (
    <Sheet open={open} title="Log a previous meal" onClose={onClose}>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder="Search your meals"
          aria-label="Search your meals"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-secondary text-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {meals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Meals you log will show up here so you can add them again in one tap.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No meals match “{query}”.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, dayMeals]) => (
            <div key={key}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {formatDayLabel(key)}
              </h4>
              <div className="space-y-2">
                {dayMeals.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleLog(m)}
                    className="w-full text-left flex items-center gap-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {formatTimeOfDay(m.loggedAt)} · {m.totalCalories} cal · P {Math.round(m.totalProtein)}g · C{" "}
                        {Math.round(m.totalCarbs)}g · F {Math.round(m.totalFat)}g
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
                      + Log
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="w-full h-10 rounded-xl border border-border text-xs font-semibold text-foreground"
            >
              Show more ({filtered.length - shown} left)
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
};

export default MealPickerSheet;
