import { motion } from "framer-motion";
import { Bell, Plus, Camera as CamIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProgressRing from "@/components/ProgressRing";
import MacroBar from "@/components/MacroBar";
import BottomNav from "@/components/BottomNav";
import { getProfile, getStreak, getTodayMeals, getTodayTotals } from "@/lib/profile";

const Today = () => {
  const navigate = useNavigate();
  const profile = getProfile()!;
  const totals = getTodayTotals();
  const meals = getTodayMeals();
  const streak = getStreak();

  const remaining = Math.max(profile.calorieTarget - totals.calories, 0);
  const pct = Math.min(Math.round((totals.calories / profile.calorieTarget) * 100), 100);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-xl font-bold text-foreground">Athlete 👋</h1>
        </div>
        <button className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center py-6"
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
          className="gradient-glow rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-sm font-bold text-primary-foreground">
                {streak === 0 ? "Start your streak today" : `${streak}-day streak!`}
              </p>
              <p className="text-xs text-primary-foreground/70">
                {streak === 0 ? "Log a meal to begin" : "Keep going, you're on fire"}
              </p>
            </div>
          </div>
          <div className="flex -space-x-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="text-sm">
                {i < streak ? "🟢" : "⚪"}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Today's Meals</h3>
          <button onClick={() => navigate("/app/log")} className="flex items-center gap-1 text-xs text-primary font-medium">
            <Plus className="w-3.5 h-3.5" /> Log
          </button>
        </div>

        {meals.length === 0 ? (
          <button
            onClick={() => navigate("/app/log")}
            className="w-full bg-card border border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors"
          >
            <CamIcon className="w-6 h-6" />
            <p className="text-sm">No meals yet — snap your first one</p>
          </button>
        ) : (
          <div className="space-y-3">
            {meals.map((m) => (
              <div key={m.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg">{m.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(m.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-primary">
                    {m.totalCalories}
                    <span className="text-muted-foreground font-normal text-xs"> cal</span>
                  </p>
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
      </div>

      <BottomNav />
    </div>
  );
};

export default Today;
