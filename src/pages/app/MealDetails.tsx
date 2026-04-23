import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Trash2, Camera, Mic, AlertTriangle, Check } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { getMeals, deleteMeal, type MealSource } from "@/lib/profile";
import { toast } from "sonner";

const sourceMeta: Record<MealSource, { icon: typeof Camera; label: string }> = {
  photo: { icon: Camera, label: "Photo capture" },
  voice: { icon: Mic, label: "Voice log" },
  manual: { icon: Pencil, label: "Manual entry" },
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const MealDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const meal = useMemo(() => getMeals().find((m) => m.id === id), [id]);

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
  const SIcon = sourceMeta[src].icon;

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

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
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
        <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-border bg-secondary flex items-center justify-center mb-4">
          {meal.imageDataUrl ? (
            <img src={meal.imageDataUrl} alt={meal.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-7xl">{meal.icon || "🍽️"}</span>
          )}
        </div>

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
          <span className="inline-flex items-center gap-1.5 text-[11px] bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
            <SIcon className="w-3 h-3" />
            {sourceMeta[src].label}
          </span>
          {meal.verified && (
            <span className="inline-flex items-center gap-1.5 text-[11px] bg-primary/15 text-primary px-2.5 py-1 rounded-full">
              <Check className="w-3 h-3" /> Verified
            </span>
          )}
        </div>

        {meal.hiddenIngredient && (
          <div className="gradient-card border border-border rounded-2xl p-4 mb-5 flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-0.5">
                Ingredient probe
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {meal.hiddenIngredient}
              </p>
            </div>
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Item breakdown
          </h2>
          <div className="space-y-2">
            {meal.items.length === 0 && (
              <p className="text-xs text-muted-foreground">No items recorded.</p>
            )}
            {meal.items.map((it, idx) => (
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
            ))}
          </div>
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
          <Pencil className="w-4 h-4 mr-2" /> Edit meal
        </Button>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default MealDetails;
