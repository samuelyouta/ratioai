import { useMemo } from "react";
import { getMeals } from "@/lib/profile";
import { getStreakState } from "@/lib/streak";

interface Props {
  days?: number;
}

/**
 * Metabolic Streak Tracker — a clean calendar grid of the last N days.
 * Days with a logged meal (or auto-protected by a freeze day) glow neon green.
 */
const MetabolicStreakTracker = ({ days = 28 }: Props) => {
  const cells = useMemo(() => {
    const meals = getMeals();
    const frozen = new Set(getStreakState().consumedFreezeDates);
    const out: { key: string; date: Date; logged: boolean; frozen: boolean; isToday: boolean }[] = [];
    const todayKey = new Date().toISOString().slice(0, 10);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        key,
        date: d,
        logged: meals.some((m) => m.loggedAt.startsWith(key)),
        frozen: frozen.has(key),
        isToday: key === todayKey,
      });
    }
    return out;
  }, [days]);

  const loggedCount = cells.filter((c) => c.logged || c.frozen).length;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Metabolic Streak
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {loggedCount}{" "}
            <span className="text-muted-foreground font-normal">/ {days} days locked in</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-primary shadow-glow" /> hit
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-secondary" /> missed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => {
          const active = c.logged || c.frozen;
          return (
            <div
              key={c.key}
              title={`${c.key}${active ? " — logged" : ""}`}
              className={`aspect-square rounded-md transition-colors ${
                active ? "bg-primary" : "bg-secondary"
              } ${c.isToday ? "ring-1 ring-primary/70 ring-offset-1 ring-offset-card" : ""}`}
              style={
                active
                  ? { boxShadow: "0 0 8px hsl(var(--primary) / 0.55)" }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
};

export default MetabolicStreakTracker;
