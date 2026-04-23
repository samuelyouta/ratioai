import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, Check, RefreshCw, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { saveMeal, type Meal, type MealItem } from "@/lib/profile";
import { toast } from "@/hooks/use-toast";

interface AIItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}
interface AIResult {
  title: string;
  icon: string;
  items: AIItem[];
  hiddenIngredient: string | null;
  notes: string;
}

const EXAMPLES = [
  "A big bowl of homemade lasagna and a side salad",
  "Two scrambled eggs on sourdough toast with butter",
  "Chicken caesar wrap and a small fries",
  "Chocolate protein smoothie with banana and oats",
];

const Describe = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);

  const estimate = async () => {
    const desc = text.trim();
    if (desc.length < 3) {
      toast({ title: "Describe your meal", description: "Add a few words about what you ate." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("describe-meal", {
        body: { description: desc },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as AIResult;
      if (!r.items || r.items.length === 0) {
        toast({ title: "No food detected", description: r.notes || "Try rephrasing your description." });
      }
      setResult(r);
    } catch (e) {
      console.error(e);
      toast({
        title: "Couldn't estimate",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = result?.items.reduce(
    (acc, i) => ({
      cal: acc.cal + i.calories,
      p: acc.p + i.protein,
      c: acc.c + i.carbs,
      f: acc.f + i.fat,
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  const saveAsEstimated = (refineAfter: boolean) => {
    if (!result || result.items.length === 0) return;
    const items: MealItem[] = result.items.map((i) => ({
      name: i.name,
      portion: i.portion,
      calories: Math.round(i.calories),
      protein: +i.protein.toFixed(1),
      carbs: +i.carbs.toFixed(1),
      fat: +i.fat.toFixed(1),
    }));
    const meal: Meal = {
      id: `meal_${Date.now()}`,
      loggedAt: new Date().toISOString(),
      title: result.title || "Estimated meal",
      icon: result.icon || "✨",
      items,
      totalCalories: items.reduce((s, i) => s + i.calories, 0),
      totalProtein: +items.reduce((s, i) => s + i.protein, 0).toFixed(1),
      totalCarbs: +items.reduce((s, i) => s + i.carbs, 0).toFixed(1),
      totalFat: +items.reduce((s, i) => s + i.fat, 0).toFixed(1),
      hiddenIngredient: result.hiddenIngredient ?? null,
      source: "voice",
      verified: false,
      notes: `Estimated from: "${text.trim()}"`,
    };
    saveMeal(meal);
    toast({
      title: "Estimated entry saved",
      description: `${meal.totalCalories} cal logged. Refine anytime.`,
    });
    if (refineAfter) navigate(`/app/history/${meal.id}`);
    else navigate("/app/today");
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground leading-tight">Describe meal</h1>
            <p className="text-[11px] text-muted-foreground">AI estimates · refine later</p>
          </div>
          <div className="flex items-center gap-1.5 glass border border-border rounded-full px-2.5 py-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-foreground">Estimated</span>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pt-5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          What did you eat?
        </label>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. A big bowl of homemade lasagna and a side salad"
          rows={4}
          className="mt-2 w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />

        {!result && (
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground mb-2">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setText(ex)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-secondary/60 border border-border text-foreground/80 hover:bg-secondary"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={estimate}
          disabled={loading}
          className="mt-4 w-full h-12 rounded-xl gradient-glow shadow-glow flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Estimating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {result ? "Re-estimate" : "Estimate macros"}
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && result.items.length > 0 && totals && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-6"
        >
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{result.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
                <p className="text-[11px] text-muted-foreground">{result.notes}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label="Cal" value={Math.round(totals.cal)} />
              <Stat label="P" value={`${totals.p.toFixed(0)}g`} />
              <Stat label="C" value={`${totals.c.toFixed(0)}g`} />
              <Stat label="F" value={`${totals.f.toFixed(0)}g`} />
            </div>

            <div className="space-y-2">
              {result.items.map((i, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-background border border-border rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {i.portion} · P {i.protein.toFixed(0)}g · C {i.carbs.toFixed(0)}g · F {i.fat.toFixed(0)}g
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{Math.round(i.calories)}</p>
                    <p className="text-[10px] text-muted-foreground">{i.confidence}% conf</p>
                  </div>
                </div>
              ))}
            </div>

            {result.hiddenIngredient && (
              <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-[11px] text-primary font-medium">Hidden ingredient</p>
                <p className="text-xs text-foreground/90 mt-0.5">{result.hiddenIngredient}</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => saveAsEstimated(false)}
              className="h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save estimate
            </button>
            <button
              onClick={() => saveAsEstimated(true)}
              className="h-12 rounded-xl bg-secondary border border-border text-foreground text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Save & refine
            </button>
          </div>

          <button
            onClick={estimate}
            disabled={loading}
            className="mt-2 w-full h-10 rounded-xl text-xs text-muted-foreground flex items-center justify-center gap-1.5 hover:text-foreground"
          >
            <RefreshCw className="w-3 h-3" />
            Not quite right? Re-estimate
          </button>
        </motion.div>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-background border border-border rounded-lg py-2 text-center">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default Describe;
