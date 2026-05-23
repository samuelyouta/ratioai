import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Minus, Plus, Share2 } from "lucide-react";
import { saveMeal, type Meal } from "@/lib/profile";
import { invokeEdgeFunction } from "@/lib/edgeFunction";
import { sanitizeMealIcon } from "@/lib/mealIcon";
import PortionGuideOverlay from "@/components/app/PortionGuideOverlay";
import ShareRecipeCard from "@/components/app/ShareRecipeCard";

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
  hiddenIngredientCalories?: number | null;
  notes: string;
}

const LAST_IMAGE_KEY = "ratioai.lastImage";

function parseHiddenCalories(result: AnalysisResult): number {
  if (typeof result.hiddenIngredientCalories === "number" && result.hiddenIngredientCalories > 0) {
    return Math.round(result.hiddenIngredientCalories);
  }
  if (!result.hiddenIngredient) return 0;
  const plusMatch = result.hiddenIngredient.match(/\+\s*(\d+)/);
  if (plusMatch) return Number(plusMatch[1]);
  const calMatch = result.hiddenIngredient.match(/(\d+)\s*cal/i);
  return calMatch ? Number(calMatch[1]) : 0;
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
  const [shareOpen, setShareOpen] = useState(false);
  const [autoNavTimer, setAutoNavTimer] = useState<number | null>(null);

  useEffect(() => {
    const dataUrl = sessionStorage.getItem(LAST_IMAGE_KEY);
    if (!dataUrl) {
      navigate("/app/log", { replace: true });
      return;
    }
    setImageUrl(dataUrl);

    (async () => {
      try {
        const r = await invokeEdgeFunction<AnalysisResult>("analyze-meal", {
          imageBase64: dataUrl,
        });
        if (!r.items?.length) {
          setError(r.notes || "No food detected in this photo. Try a clearer shot of your meal.");
          return;
        }
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

  const hiddenCalories =
    result?.hiddenIngredient && acceptHidden ? parseHiddenCalories(result) : 0;

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
      icon: sanitizeMealIcon(result.icon),
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
      source: "photo",
      imageDataUrl: imageUrl,
      verified: true,
      notes: result.notes || undefined,
    };
    saveMeal(meal);
    sessionStorage.removeItem(LAST_IMAGE_KEY);
    setSaved(true);
    setTimeout(() => navigate("/app/today", { replace: true }), 1400);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
      >
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-sm text-foreground font-semibold mt-4">Analyzing your meal…</p>
        <p className="text-xs text-muted-foreground mt-1">Identifying items, portions, and hidden ingredients</p>
      </motion.div>
    );
  }

  if (error || !result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center"
      >
        <p className="text-base font-semibold text-foreground">Couldn't analyze that photo</p>
        <p className="text-sm text-muted-foreground mt-1 mb-6">{error ?? "No result"}</p>
        <button
          onClick={() => navigate("/app/log")}
          className="gradient-glow text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-glow"
        >
          Try again
        </button>
      </motion.div>
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
            className="w-20 h-20 gradient-glow rounded-full mx-auto shadow-glow mb-6"
          />
          <h2 className="text-2xl font-bold text-foreground mb-2">Meal logged</h2>
          <p className="text-muted-foreground text-sm">{totalCalories} calories added to your day</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/app/log")}
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="font-semibold text-foreground">{result.title}</h2>
        <span className="text-2xl">{sanitizeMealIcon(result.icon)}</span>
      </div>

      {imageUrl && <PortionGuideOverlay imageUrl={imageUrl} items={result.items} />}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 mb-4"
      >
        <motion.div className="bg-primary/10 rounded-xl px-4 py-2.5">
          <p className="text-sm text-primary font-medium">{result.items.length} items detected</p>
        </motion.div>
      </motion.div>

      {result.hiddenIngredient && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-6 mb-4"
        >
          <div className="bg-warning/10 rounded-xl px-4 py-3 border border-warning/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warning mb-1">
              Hidden ingredient detected
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{result.hiddenIngredient}</p>
            {hiddenCalories > 0 && acceptHidden && (
              <p className="text-xs text-foreground/80 mt-1">+{hiddenCalories} cal added to total</p>
            )}
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
        </motion.div>
      )}

      <div className="px-6 space-y-3 mb-6">
        {result.items.map((it, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <motion.div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground text-sm">{it.name}</h4>
                  <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                    {it.confidence}% match
                  </span>
                </motion.div>
                <p className="text-xs text-muted-foreground">{it.portion}</p>
              </div>
              <p className="text-sm font-bold text-foreground">
                {Math.round(it.calories * (counts[i] ?? 1))}
                <span className="text-muted-foreground text-xs font-normal"> cal</span>
              </p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-3 text-[11px] text-muted-foreground">
                <span>
                  P <span className="text-foreground font-medium">{Math.round(it.protein * (counts[i] ?? 1))}g</span>
                </span>
                <span>
                  C <span className="text-foreground font-medium">{Math.round(it.carbs * (counts[i] ?? 1))}g</span>
                </span>
                <span>
                  F <span className="text-foreground font-medium">{Math.round(it.fat * (counts[i] ?? 1))}g</span>
                </span>
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
          </motion.div>
        ))}
      </div>

      {result.notes && (
        <div className="px-6 mb-4">
          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-xl px-4 py-2.5">{result.notes}</p>
        </div>
      )}

      <div className="px-6">
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <motion.div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total meal</span>
            <span className="text-xl font-bold text-foreground">
              {totalCalories} <span className="text-sm text-muted-foreground font-normal">cal</span>
            </span>
          </motion.div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              Protein <span className="text-foreground font-medium">{Math.round(totals.protein)}g</span>
            </span>
            <span>
              Carbs <span className="text-foreground font-medium">{Math.round(totals.carbs)}g</span>
            </span>
            <span>
              Fat <span className="text-foreground font-medium">{totalFat}g</span>
            </span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="gradient-glow text-primary-foreground font-semibold text-base py-4 rounded-2xl shadow-glow w-full"
        >
          Confirm & log meal
        </motion.button>
      </div>
    </div>
  );
};

export default Analyze;
