import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, Check, RefreshCw, Pencil, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { saveMeal, type Meal, type MealItem } from "@/lib/profile";
import { toast } from "@/hooks/use-toast";
import PortionGuideList from "@/components/app/PortionGuideList";

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
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const speechSupported = !!SpeechRecognition;

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  // Convert spoken number words ("two", "twenty-one") and digits to a number.
  const NUMBER_WORDS: Record<string, number> = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100,
  };
  const parseSpokenNumber = (raw: string): number | null => {
    const s = raw.trim().toLowerCase().replace(/-/g, " ");
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    const parts = s.split(/\s+/);
    let total = 0;
    for (const p of parts) {
      const n = NUMBER_WORDS[p];
      if (n == null) return null;
      if (n === 100) total = (total || 1) * 100;
      else total += n;
    }
    return total || null;
  };

  // Run voice commands on each finalized speech chunk.
  // Returns handled=true when the chunk was consumed by a command.
  const handleVoiceCommands = (chunk: string): { remaining: string; handled: boolean } => {
    const raw = chunk.trim();
    const lower = raw.toLowerCase().replace(/[.!?,]+$/g, "").trim();
    if (!lower) return { remaining: chunk, handled: true };

    // STOP / END dictation
    if (/^(stop|stop dictation|stop listening|that's all|done|end dictation)$/.test(lower)) {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      toast({ title: "Dictation stopped", description: "Voice command: stop." });
      return { remaining: "", handled: true };
    }

    // CLEAR text
    if (/^(clear text|clear all|clear everything|delete all|reset text|start over)$/.test(lower)) {
      baseTextRef.current = "";
      setText("");
      toast({ title: "Cleared", description: "Voice command: clear text." });
      return { remaining: "", handled: true };
    }

    // DELETE LAST word/sentence
    const delMatch = lower.match(/^(delete|remove|scratch)\s+(that|last(?:\s+(word|sentence))?)$/);
    if (delMatch) {
      const target = delMatch[3] || (delMatch[2] === "that" ? "sentence" : "word");
      const current = baseTextRef.current.trim();
      let next = current;
      if (target === "sentence") next = current.replace(/[^.!?]*[.!?]?\s*$/, "").trim();
      else next = current.replace(/\s*\S+\s*$/, "").trim();
      baseTextRef.current = next ? next + " " : "";
      setText(next);
      return { remaining: "", handled: true };
    }

    // ESTIMATE NOW
    if (/^(estimate( now| it)?|run estimate|analyze( now)?|calculate( now)?)$/.test(lower)) {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      setTimeout(() => estimate(), 250);
      toast({ title: "Estimating", description: "Voice command: estimate." });
      return { remaining: "", handled: true };
    }

    // ADD <quantity> <food>
    const addMatch = lower.match(/^(?:add|log|include|put in)\s+(.+)$/);
    if (addMatch) {
      const rest = addMatch[1].trim();
      const qtyMatch = rest.match(
        /^((?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|\d+(?:\.\d+)?)(?:[\s-](?:and\s+)?(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred))*)\s+(.+)$/,
      );
      let phrase = rest;
      if (qtyMatch) {
        const qty = parseSpokenNumber(qtyMatch[1]);
        phrase = qty != null ? `${qty} ${qtyMatch[2]}` : `${qtyMatch[1]} ${qtyMatch[2]}`;
      }
      const sep = baseTextRef.current.trim() && !baseTextRef.current.trim().endsWith(",") ? ", " : "";
      baseTextRef.current = (baseTextRef.current + sep + phrase).replace(/\s+/g, " ");
      setText(baseTextRef.current.trim());
      return { remaining: "", handled: true };
    }

    return { remaining: chunk, handled: false };
  };

  const toggleDictation = () => {
    if (!speechSupported) {
      toast({
        title: "Dictation not supported",
        description: "Try Chrome or Safari on desktop / iOS to dictate your meal.",
      });
      return;
    }
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    baseTextRef.current = text ? text.trim() + (text.trim().endsWith(".") ? " " : ". ") : "";

    rec.onresult = (event: any) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += transcript;
        else interim += transcript;
      }
      if (finalChunk) {
        const { remaining, handled } = handleVoiceCommands(finalChunk);
        if (handled) {
          // Command consumed — refresh base from current text and skip append
          baseTextRef.current = text ? text.trim() + " " : "";
          setText(baseTextRef.current.trim());
          return;
        }
        baseTextRef.current = (baseTextRef.current + remaining).replace(/\s+/g, " ");
      }
      setText((baseTextRef.current + " " + interim).trim());
    };
    rec.onerror = (e: any) => {
      console.error("SpeechRecognition error", e);
      const code = e?.error || "unknown";
      const msg =
        code === "not-allowed" || code === "service-not-allowed"
          ? "Microphone permission denied."
          : code === "no-speech"
            ? "Didn't catch that — try again."
            : `Dictation error: ${code}`;
      toast({ title: "Dictation stopped", description: msg });
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.onstart = () => setListening(true);

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.error(err);
      toast({ title: "Couldn't start mic", description: "Please allow microphone access." });
    }
  };

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
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            What did you eat?
          </label>
          {listening && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Listening…
            </span>
          )}
        </div>
        <div className="relative mt-2">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. A big bowl of homemade lasagna and a side salad"
            rows={4}
            className="w-full px-4 py-3 pr-14 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <button
            type="button"
            onClick={toggleDictation}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
            title={
              speechSupported
                ? listening
                  ? "Stop dictation"
                  : "Dictate your meal"
                : "Dictation unavailable in this browser"
            }
            className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              listening
                ? "bg-primary text-primary-foreground shadow-glow animate-pulse"
                : speechSupported
                  ? "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
                  : "bg-secondary/60 text-muted-foreground border border-border opacity-60"
            }`}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {speechSupported && listening && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['"add two eggs"', '"delete last word"', '"clear text"', '"estimate"', '"stop"'].map((c) => (
              <span
                key={c}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary"
              >
                {c}
              </span>
            ))}
          </div>
        )}

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

            <PortionGuideList
              items={result.items.map((i) => ({ name: i.name, portion: i.portion }))}
              title="Portion guide"
              compact
            />
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
