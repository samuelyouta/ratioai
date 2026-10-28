import { motion, AnimatePresence } from "framer-motion";
import { Plus, Snowflake, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProgressRing from "@/components/ProgressRing";
import MacroBar from "@/components/MacroBar";
import BottomNav from "@/components/BottomNav";
import FlameBurst from "@/components/app/FlameBurst";
import LevelUpModal from "@/components/app/LevelUpModal";
import RecentMeals from "@/components/app/RecentMeals";
import MetabolicStreakTracker from "@/components/app/MetabolicStreakTracker";
import DayNavigator from "@/components/app/DayNavigator";
import TimeZoneNotice from "@/components/app/TimeZoneNotice";
import {
  deleteMeal,
  getLoggedDayKeys,
  getMealsForDay,
  getProfile,
  sumMeals,
  type Meal,
} from "@/lib/profile";
import {
  checkLevelUp,
  evaluateProteinStreakReward,
  getProtectedStreak,
  getStreakState,
  markFlameShown,
  shouldShowFlameToday,
  type LevelUpReward,
} from "@/lib/streak";
import {
  formatDayLabel,
  formatTimeOfDay,
  hourOfDay,
  todayKey,
  type DayKey,
} from "@/lib/dayKey";
import { readDayParam, withDay } from "@/lib/loggingDay";
import { toast } from "sonner";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { useMealLogVersion, useTodayKey } from "@/hooks/useMealLog";

const Today = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const profile = getProfile()!;

  const mealLogVersion = useMealLogVersion();
  const currentDay = useTodayKey();
  const selectedDay = readDayParam(searchParams);
  const viewingToday = selectedDay === currentDay;

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loggedDays, setLoggedDays] = useState<Set<DayKey>>(() => new Set());
  const [freezeDays, setFreezeDays] = useState(0);
  const [showFlame, setShowFlame] = useState(false);
  const [reward, setReward] = useState<LevelUpReward | null>(null);

  // Meals live in localStorage, so re-read them whenever the day or the log changes.
  const reload = useCallback(() => {
    setMeals(getMealsForDay(selectedDay));
    setLoggedDays(getLoggedDayKeys());
  }, [selectedDay]);

  useEffect(() => {
    reload();
  }, [reload, mealLogVersion]);

  const totals = useMemo(() => sumMeals(meals), [meals]);
  const streak = getProtectedStreak();

  const selectDay = useCallback(
    (day: DayKey) => {
      const next = new URLSearchParams(searchParams);
      if (day === todayKey()) next.delete("day");
      else next.set("day", day);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const awarded = evaluateProteinStreakReward();
    if (awarded) {
      toast.success("Freeze Day earned!", {
        description: "3 days of hitting protein. Use it on a missed log day.",
      });
    }
    setFreezeDays(getStreakState().freezeDays);
  }, [meals]);

  useEffect(() => {
    if (!viewingToday || meals.length < 1 || !shouldShowFlameToday()) return;
    setShowFlame(true);
    markFlameShown();
    const t = setTimeout(() => setShowFlame(false), 2200);
    return () => clearTimeout(t);
  }, [meals.length, viewingToday]);

  useEffect(() => {
    const r = checkLevelUp();
    if (r) setReward(r);
  }, []);

  const handleDelete = (id: string, title: string) => {
    deleteMeal(id);
    reload();
    toast.success("Entry removed", { description: title });
  };

  const remaining = Math.max(profile.calorieTarget - totals.calories, 0);
  const pct = Math.min(Math.round((totals.calories / profile.calorieTarget) * 100), 100);

  const greeting = (() => {
    const h = hourOfDay();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const logPath = withDay("/app/log", selectedDay);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 safe-top pb-4">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h1 className="text-xl font-bold text-foreground">
          {profile.name?.trim() || "Athlete"}
        </h1>
      </div>

      <div className="px-6 mb-4">
        <DayNavigator day={selectedDay} onChange={selectDay} loggedDays={loggedDays} />
      </div>

      <div className="px-6 mb-4">
        <TimeZoneNotice />
      </div>

      <motion.div
        key={selectedDay}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center py-4"
      >
        <ProgressRing progress={pct} size={180} strokeWidth={11}>
          <div className="text-center">
            <p className="text-4xl font-black text-foreground">{remaining}</p>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>
        </ProgressRing>

        <div className="flex items-center gap-6 mt-5 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{totals.calories}</p>
            <p className="text-[11px] text-muted-foreground">eaten</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-foreground">{profile.calorieTarget}</p>
            <p className="text-[11px] text-muted-foreground">target</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-foreground">0</p>
            <p className="text-[11px] text-muted-foreground">burned</p>
          </div>
        </div>
      </motion.div>

      <div className="px-6 mb-6">
        <div className="flex gap-4">
          <MacroBar label="Protein" current={Math.round(totals.protein)} target={profile.proteinTarget} color="primary" />
          <MacroBar label="Carbs" current={Math.round(totals.carbs)} target={profile.carbsTarget} color="coral" />
          <MacroBar label="Fat" current={Math.round(totals.fat)} target={profile.fatTarget} color="info" />
        </div>
      </div>

      <div className="px-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="gradient-glow rounded-2xl p-4 flex items-center justify-between relative overflow-hidden"
        >
          <div>
            <p className="text-sm font-bold text-primary-foreground">
              {streak === 0 ? "Start your streak today" : `${streak}-day streak`}
            </p>
            <p className="text-xs text-primary-foreground/70">
              {streak === 0 ? "Log a meal to begin" : "Keep going, you're on fire"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence>{showFlame && <FlameBurst key="burst" />}</AnimatePresence>
            <span className="text-2xl font-black text-primary-foreground">{streak}</span>
            {freezeDays > 0 && (
              <div className="flex items-center gap-1 bg-background/30 backdrop-blur rounded-full px-2 py-0.5">
                <Snowflake className="w-3 h-3 text-primary-foreground" />
                <span className="text-[10px] font-bold text-primary-foreground">
                  {freezeDays}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <LevelUpModal reward={reward} onClose={() => setReward(null)} />

      {/* Metabolic Streak Tracker — calendar of consecutive successful days */}
      <div className="px-6 mb-6">
        <MetabolicStreakTracker days={28} onSelectDay={selectDay} />
      </div>

      {/* Repeat / recent meals — one-tap re-log */}
      <div className="px-6 mb-6">
        <RecentMeals limit={6} variant="row" day={selectedDay} onLogged={reload} />
      </div>

      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">
            {viewingToday ? "Today's meals" : `${formatDayLabel(selectedDay)}'s meals`}
          </h3>
          <button
            onClick={() => navigate(logPath)}
            className="text-xs text-primary font-semibold uppercase tracking-wide"
          >
            Log
          </button>
        </div>

        {meals.length === 0 ? (
          <button
            onClick={() => navigate(logPath)}
            className="w-full bg-card border border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors"
          >
            <p className="text-sm font-medium text-foreground">
              {viewingToday ? "No meals yet" : "Nothing logged on this day"}
            </p>
            <p className="text-xs">
              {viewingToday ? "Tap to log your first one" : "Tap to add an entry to this day"}
            </p>
          </button>
        ) : (
          <div className="space-y-3">
            {meals.map((m) => (
              <div key={m.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <button
                    onClick={() => navigate(`/app/history/${m.id}`)}
                    className="min-w-0 text-left flex-1"
                  >
                    <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatTimeOfDay(m.loggedAt)}
                    </p>
                  </button>
                  <p className="text-sm font-bold text-primary whitespace-nowrap">
                    {m.totalCalories}
                    <span className="text-muted-foreground font-normal text-xs"> cal</span>
                  </p>
                  <button
                    onClick={() => handleDelete(m.id, m.title)}
                    aria-label={`Delete ${m.title}`}
                    className="w-8 h-8 shrink-0 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.items.slice(0, 4).map((it, i) => (
                    <span key={i} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                      {it.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate(logPath)}
          className="mt-3 w-full border border-primary/30 bg-primary/10 rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary"
        >
          <Plus className="w-4 h-4" />
          Add entry to {viewingToday ? "today" : formatDayLabel(selectedDay).toLowerCase()}
        </button>
      </div>

      <div className="px-6 mt-4 mb-4"><MedicalDisclaimer compact /></div>
      <BottomNav />
    </div>
  );
};

export default Today;
