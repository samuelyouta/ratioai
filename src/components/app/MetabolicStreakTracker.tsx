import { useMemo } from "react";
import { getLoggedDayKeys } from "@/lib/profile";
import { getStreakState } from "@/lib/streak";
import { dayKeyToDate, recentDayKeys, todayKey } from "@/lib/dayKey";

interface Props {
  days?: number;
  /** When provided, each cell becomes a shortcut to that day's log. */
  onSelectDay?: (day: string) => void;
}

/**
 * Metabolic Streak Tracker — a clean calendar grid of the last N days.
 * Days with a logged meal (or auto-protected by a freeze day) glow neon green.
 */
const MetabolicStreakTracker = ({ days = 28, onSelectDay }: Props) => {
  const cells = useMemo(() => {
    const logged = getLoggedDayKeys();
    const frozen = new Set(getStreakState().consumedFreezeDates);
    const today = todayKey();
    return recentDayKeys(days).map((key) => ({
      key,
      date: dayKeyToDate(key),
      logged: logged.has(key),
      frozen: frozen.has(key),
      isToday: key === today,
    }));
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
          const className = `aspect-square rounded-md transition-colors ${
            active ? "bg-primary" : "bg-secondary"
          } ${c.isToday ? "ring-1 ring-primary/70 ring-offset-1 ring-offset-card" : ""}`;
          const glow = active
            ? { boxShadow: "0 0 8px hsl(var(--primary) / 0.55)" }
            : undefined;
          const label = `${c.key}${active ? " — logged" : ""}`;

          if (!onSelectDay) {
            return <div key={c.key} title={label} className={className} style={glow} />;
          }
          return (
            <button
              key={c.key}
              type="button"
              title={label}
              aria-label={`View ${c.key}`}
              onClick={() => onSelectDay(c.key)}
              className={`${className} active:scale-95`}
              style={glow}
            />
          );
        })}
      </div>

      {onSelectDay && (
        <p className="mt-2 text-[10px] text-muted-foreground text-center">
          Tap any day to review or edit what you logged.
        </p>
      )}
    </div>
  );
};

export default MetabolicStreakTracker;
