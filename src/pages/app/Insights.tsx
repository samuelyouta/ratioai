import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { getLast7DaysTotals, getProfile } from "@/lib/profile";
import { TrendingUp, Target, Zap } from "lucide-react";

const Insights = () => {
  const profile = getProfile()!;
  const days = getLast7DaysTotals();
  const maxCal = Math.max(...days.map((d) => d.calories), profile.calorieTarget);

  // Macro consistency: stddev-like divergence from target macro split
  const consistency = days.map((d) => {
    if (d.calories === 0) return { date: d.date, score: 0 };
    const pTarget = profile.proteinTarget;
    const cTarget = profile.carbsTarget;
    const fTarget = profile.fatTarget;
    const dev =
      Math.abs(d.protein - pTarget) / pTarget +
      Math.abs(d.carbs - cTarget) / cTarget +
      Math.abs(d.fat - fTarget) / fTarget;
    const score = Math.max(0, Math.round(100 - (dev / 3) * 100));
    return { date: d.date, score };
  });
  const avgConsistency = Math.round(consistency.reduce((s, d) => s + d.score, 0) / 7);

  const dayLabel = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: "short" });

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground">Your last 7 days</p>
      </div>

      <div className="px-6 grid grid-cols-3 gap-2 mb-5">
        <div className="bg-card border border-border rounded-2xl p-3">
          <Target className="w-4 h-4 text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{avgConsistency}%</p>
          <p className="text-[10px] text-muted-foreground">Macro consistency</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3">
          <TrendingUp className="w-4 h-4 text-info mb-1" />
          <p className="text-lg font-bold text-foreground">
            {Math.round(days.reduce((s, d) => s + d.calories, 0) / 7)}
          </p>
          <p className="text-[10px] text-muted-foreground">Avg calories</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3">
          <Zap className="w-4 h-4 text-warning mb-1" />
          <p className="text-lg font-bold text-foreground">
            {Math.round(days.reduce((s, d) => s + d.protein, 0) / 7)}g
          </p>
          <p className="text-[10px] text-muted-foreground">Avg protein</p>
        </div>
      </div>

      {/* Calorie chart */}
      <div className="px-6 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">Calories</h3>
            <span className="text-[10px] text-muted-foreground">target {profile.calorieTarget}</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-36">
            {days.map((d, i) => {
              const h = Math.max(4, (d.calories / maxCal) * 100);
              const onTarget = Math.abs(d.calories - profile.calorieTarget) / profile.calorieTarget < 0.1;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
                    className={`w-full rounded-md ${onTarget ? "gradient-glow" : "bg-secondary"}`}
                  />
                  <span className="text-[10px] text-muted-foreground">{dayLabel(d.date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Macro consistency line */}
      <div className="px-6 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">Macro Consistency</h3>
            <span className="text-[10px] text-primary">7-day trend</span>
          </div>
          <div className="relative h-32">
            <svg viewBox="0 0 280 120" className="w-full h-full">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(82 78% 55%)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(82 78% 55%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line key={y} x1="0" y1={120 - y * 1.2} x2="280" y2={120 - y * 1.2} stroke="hsl(240 6% 18%)" strokeDasharray="2 4" />
              ))}
              {(() => {
                const points = consistency.map((d, i) => {
                  const x = (i / 6) * 280;
                  const y = 120 - d.score * 1.2;
                  return { x, y };
                });
                const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                const fill = `${path} L280,120 L0,120 Z`;
                return (
                  <>
                    <path d={fill} fill="url(#lineGrad)" />
                    <path d={path} stroke="hsl(82 78% 55%)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(82 78% 55%)" />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="flex justify-between mt-2">
            {consistency.map((d) => (
              <span key={d.date} className="text-[10px] text-muted-foreground">
                {dayLabel(d.date)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Insights;
