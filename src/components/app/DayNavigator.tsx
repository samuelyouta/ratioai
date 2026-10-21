import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  dayKeyToDate,
  formatDayLabel,
  isFutureDay,
  isValidDayKey,
  recentDayKeys,
  shiftDayKey,
  todayKey,
  type DayKey,
} from "@/lib/dayKey";

interface Props {
  day: DayKey;
  onChange: (day: DayKey) => void;
  /** Days that already have at least one entry, marked with a dot. */
  loggedDays?: Set<DayKey>;
  /** How many days the quick strip reaches back. */
  stripDays?: number;
}

/**
 * Day switcher for the daily log: arrows for one-day steps, a scrollable strip
 * of recent days, and a date field for jumping further back.
 */
const DayNavigator = ({ day, onChange, loggedDays, stripDays = 14 }: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const today = todayKey();
  const strip = useMemo(() => recentDayKeys(stripDays), [stripDays]);
  const atToday = day === today;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [day]);

  const go = (delta: number) => {
    const next = shiftDayKey(day, delta);
    if (isFutureDay(next)) return;
    onChange(next);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous day"
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="flex-1 min-w-0 flex flex-col items-center justify-center py-1"
          aria-label="Choose a date"
          aria-expanded={pickerOpen}
        >
          <span className="text-sm font-bold text-foreground truncate">
            {formatDayLabel(day)}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            {dayKeyToDate(day).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Open date picker"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            pickerOpen ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={atToday}
          aria-label="Next day"
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground disabled:opacity-30 active:scale-95 transition-transform"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {pickerOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden px-1 pt-2"
        >
          <label className="text-[11px] text-muted-foreground" htmlFor="day-picker">
            Jump to a date
          </label>
          <input
            id="day-picker"
            type="date"
            value={day}
            max={today}
            onChange={(e) => {
              const next = e.target.value;
              if (isValidDayKey(next) && !isFutureDay(next)) {
                onChange(next);
                setPickerOpen(false);
              }
            }}
            className="mt-1 w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </motion.div>
      )}

      <div
        ref={stripRef}
        className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar px-0.5 pb-0.5"
      >
        {strip.map((key) => {
          const date = dayKeyToDate(key);
          const selected = key === day;
          return (
            <button
              key={key}
              ref={selected ? activeRef : undefined}
              type="button"
              onClick={() => onChange(key)}
              aria-label={formatDayLabel(key)}
              aria-current={selected ? "date" : undefined}
              className={`shrink-0 w-11 py-1.5 rounded-xl flex flex-col items-center gap-0.5 border transition-colors ${
                selected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-secondary/50 border-border text-muted-foreground"
              }`}
            >
              <span className="text-[9px] uppercase tracking-wide">
                {date.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
              <span className="text-xs font-bold">{date.getDate()}</span>
              <span
                className={`w-1 h-1 rounded-full ${
                  loggedDays?.has(key)
                    ? selected
                      ? "bg-primary-foreground"
                      : "bg-primary"
                    : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      {!atToday && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="mt-1 w-full text-[11px] font-semibold text-primary py-1.5"
        >
          Back to today
        </button>
      )}
    </div>
  );
};

export default DayNavigator;
