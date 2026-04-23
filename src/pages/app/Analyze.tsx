import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle, Check, Sparkles, Loader2, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { saveMeal, type Meal } from "@/lib/profile";
import { toast } from "sonner";
import PortionGuideOverlay from "@/components/app/PortionGuideOverlay";

interface AnalyzedItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}
interface AnalysisResult {
  title: string;
  icon: string;
  items: AnalyzedItem[];
  hiddenIngredient: string | null;
  notes: string;
}

const Analyze = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [counts, setCounts] = useState<number[]>([]);
  const [acceptHidden, setAcceptHidden] = useState(true);
  const [saved, setSaved] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const dataUrl = sessionStorage.getItem("ratioai.lastImage");
    if (!dataUrl) {
      navigate("/app/log", { replace: true });
      return;
    }
    setImageUrl(dataUrl);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("analyze-meal", {
          body: { imageBase64: dataUrl },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const r = data as AnalysisResult;
        setResult(r);
        setCounts(r.items.map(() => 1));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Analysis failed";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const hiddenCalories = (() => {
    if (!result?.hiddenIngredient || !acceptHidden) return 0;
    const m = result.hiddenIngredient.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  })();

  const totals = result
    ? result.items.reduce(
        (acc, it, i) => {
          const c = counts[i] ?? 1;
          return {
            calories: acc.calories + it.calories * c,
            protein: acc.protein + it.protein * c,
            carbs: acc.carbs + it.carbs * c,
            fat: acc.fat + it.fat * c,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const totalCalories = Math.round(totals.calories + hiddenCalories);
  const totalFat = Math.round(totals.fat + hiddenCalories / 9);

  const handleSave = () => {
    if (!result) return;
    const meal: Meal = {
      id: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
      title: result.title,
      icon: result.icon || "🍽️",
      items: result.items.map((it, i) => ({
        name: it.name,
        portion: it.portion,
        calories: Math.round(it.calories * (counts[i] ?? 1)),
        protein: Math.round(it.protein * (counts[i] ?? 1)),
        carbs: Math.round(it.carbs * (counts[i] ?? 1)),
        fat: Math.round(it.fat * (counts[i] ?? 1)),
      })),
      totalCalories,
      totalProtein: Math.round(totals.protein),
      totalCarbs: Math.round(totals.carbs),
      totalFat,
      hiddenIngredient: acceptHidden ? result.hiddenIngredient : null,
    };
    saveMeal(meal);
    sessionStorage.removeItem("ratioai.lastImage");
    setSaved(true);
    setTimeout(() => navigate("/app/today", { replace: true }), 1400);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-sm text-foreground font-semibold mt-4">Analyzing your meal…</p>
        <p className="text-xs text-muted-foreground mt-1">Identifying items, portions, and hidden ingredients</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-warning mb-3" />
        <p className="text-base font-semibold text-foreground">Couldn't analyze that photo</p>
        <p className="text-sm text-muted-foreground mt-1 mb-6">{error ?? "No result"}</p>
        <button
          onClick={() => navigate("/app/log")}
          className="gradient-glow text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-glow"
        >
          Try again
        </button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring" }}
            className="w-20 h-20 gradient-glow rounded-full mx-auto flex items-center justify-center shadow-glow mb-6"
          >
            <Check className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Meal Logged 🎉</h2>
          <p className="text-muted-foreground text-sm">{totalCalories} calories added to your day</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <button onClick={() => navigate("/app/log")} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="font-semibold text-foreground">{result.title}</h2>
        <div className="w-10" />
      </div>

      {imageUrl && <PortionGuideOverlay imageUrl={imageUrl} items={result.items} />}

      <div className="px-6 mb-4">
        <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-2.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm text-primary font-medium">{result.items.length} items detected</p>
        </div>
      </div>

      {result.hiddenIngredient && (
        <div className="px-6 mb-4">
          <div className="flex items-start gap-3 bg-warning/10 rounded-xl px-4 py-3 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Hidden ingredient detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">{result.hiddenIngredient}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setAcceptHidden(true)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg ${
                    acceptHidden ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Yes, add it
                </button>
                <button
                  onClick={() => setAcceptHidden(false)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg ${
                    !acceptHidden ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  No thanks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 space-y-3 mb-6">
        {result.items.map((it, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground text-sm">{it.name}</h4>
                  <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                    {it.confidence}% match
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{it.portion}</p>
              </div>
              <p className="text-sm font-bold text-foreground">
                {Math.round(it.calories * (counts[i] ?? 1))}
                <span className="text-muted-foreground text-xs font-normal"> cal</span>
              </p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-3 text-[11px] text-muted-foreground">
                <span>P <span className="text-foreground font-medium">{Math.round(it.protein * (counts[i] ?? 1))}g</span></span>
                <span>C <span className="text-foreground font-medium">{Math.round(it.carbs * (counts[i] ?? 1))}g</span></span>
                <span>F <span className="text-foreground font-medium">{Math.round(it.fat * (counts[i] ?? 1))}g</span></span>
              </div>
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-1">
                <button
                  onClick={() =>
                    setCounts((prev) => prev.map((c, idx) => (idx === i ? Math.max(0, c - 1) : c)))
                  }
                  className="w-7 h-7 flex items-center justify-center text-muted-foreground"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-semibold text-foreground w-4 text-center">{counts[i] ?? 1}</span>
                <button
                  onClick={() => setCounts((prev) => prev.map((c, idx) => (idx === i ? c + 1 : c)))}
                  className="w-7 h-7 flex items-center justify-center text-muted-foreground"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6">
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total meal</span>
            <span className="text-xl font-bold text-foreground">
              {totalCalories} <span className="text-sm text-muted-foreground font-normal">cal</span>
            </span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Protein <span className="text-foreground font-medium">{Math.round(totals.protein)}g</span></span>
            <span>Carbs <span className="text-foreground font-medium">{Math.round(totals.carbs)}g</span></span>
            <span>Fat <span className="text-foreground font-medium">{totalFat}g</span></span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="gradient-glow text-primary-foreground font-semibold text-base py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center"
        >
          <Check className="w-5 h-5" /> Confirm & Log Meal
        </motion.button>
      </div>
    </div>
  );
};

export default Analyze;
