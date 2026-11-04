import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mic, Square } from "lucide-react";
import { describeMealText, transcribeMealAudio } from "@/lib/mealAiClient";
import {
  blobToBase64,
  isVoiceRecordingSupported,
  startRecording,
  type ActiveRecording,
} from "@/lib/voiceRecorder";
import { createMealId, saveMeal, type Meal, type MealItem } from "@/lib/profile";
import { maybeRequestReview } from "@/lib/reviewPrompt";
import { formatDayLabel, isToday, timestampForDay } from "@/lib/dayKey";
import { readDayParam, withDay } from "@/lib/loggingDay";
import { toast } from "@/hooks/use-toast";
import PortionGuideList from "@/components/app/PortionGuideList";
import PortionHelper from "@/components/app/PortionHelper";
import { useT, type TranslationKey } from "@/i18n";

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

const EXAMPLES: TranslationKey[] = ["desc.ex1", "desc.ex2", "desc.ex3", "desc.ex4"];

type VoiceState = "idle" | "starting" | "recording" | "transcribing";

const formatClock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const Describe = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const targetDay = readDayParam(searchParams);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [helperOpen, setHelperOpen] = useState(false);
  const recordingRef = useRef<ActiveRecording | null>(null);
  const voiceBusyRef = useRef(false);
  const textRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const voiceSupported = isVoiceRecordingSupported();

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    return () => recordingRef.current?.cancel();
  }, []);

  const autoStartedRef = useRef(false);
  const wantsVoiceFirst = searchParams.get("voice") === "1";

  useEffect(() => {
    if (voice !== "recording") return;
    const startedAt = Date.now();
    setElapsedMs(0);
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => window.clearInterval(id);
  }, [voice]);

  const stopAndTranscribe = async () => {
    const active = recordingRef.current;
    if (!active) return;
    recordingRef.current = null;
    setVoice("transcribing");
    try {
      const recording = await active.stop();
      const transcript = await transcribeMealAudio(await blobToBase64(recording.blob), recording.mimeType);
      if (!transcript) {
        toast({ title: t("desc.noCatch"), description: t("desc.noCatchDesc") });
        return;
      }
      const current = textRef.current.trim();
      const joined = current ? `${current}${/[.,;]$/.test(current) ? " " : ", "}${transcript}` : transcript;
      setText(joined);
      setVoice("idle");
      void estimate(joined);
    } catch (e) {
      console.error(e);
      toast({
        title: t("desc.badRec"),
        description: e instanceof Error ? e.message : t("desc.pleaseRetry"),
      });
    } finally {
      setVoice("idle");
      voiceBusyRef.current = false;
    }
  };

  const toggleDictation = async () => {
    if (voiceBusyRef.current && voice !== "recording") return;
    if (voice === "recording") {
      await stopAndTranscribe();
      return;
    }
    if (!voiceSupported) {
      toast({
        title: t("desc.unavailable"),
        description: t("desc.unavailableDesc"),
      });
      return;
    }
    voiceBusyRef.current = true;
    setVoice("starting");
    try {
      recordingRef.current = await startRecording({
        onAutoStop: () => {
          void stopAndTranscribe();
        },
      });
      setVoice("recording");
    } catch (e) {
      voiceBusyRef.current = false;
      setVoice("idle");
      toast({
        title: t("desc.micUnavailable"),
        description: e instanceof Error ? e.message : t("desc.allowMic"),
      });
    }
  };

  useEffect(() => {
    if (!wantsVoiceFirst || autoStartedRef.current || !voiceSupported) return;
    autoStartedRef.current = true;
    void toggleDictation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsVoiceFirst, voiceSupported]);

  const insertPortion = (phrase: string) => {
    setText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return phrase;
      const sep = /[.,;]$/.test(trimmed) ? " " : ", ";
      return `${trimmed}${sep}${phrase}`;
    });
    toast({ title: t("desc.portionAdded"), description: phrase });
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const estimate = async (override?: string) => {
    const desc = (override ?? text).trim();
    if (desc.length < 3) {
      toast({ title: t("desc.addFew"), description: t("desc.addFewDesc") });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await describeMealText<AIResult>(desc);
      if (!r.items || r.items.length === 0) {
        toast({ title: t("desc.noFood"), description: r.notes || t("desc.rephrase") });
      }
      setResult(r);
    } catch (e) {
      console.error(e);
      toast({
        title: t("desc.cantEstimate"),
        description: e instanceof Error ? e.message : t("desc.pleaseRetry"),
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
      basePortion: i.portion,
      servings: 1,
      baseMacros: {
        calories: Math.round(i.calories),
        protein: +i.protein.toFixed(1),
        carbs: +i.carbs.toFixed(1),
        fat: +i.fat.toFixed(1),
      },
      calories: Math.round(i.calories),
      protein: +i.protein.toFixed(1),
      carbs: +i.carbs.toFixed(1),
      fat: +i.fat.toFixed(1),
    }));
    const meal: Meal = {
      id: createMealId(),
      loggedAt: timestampForDay(targetDay),
      title: result.title || t("desc.estimatedMeal"),
      icon: "",
      items,
      totalCalories: items.reduce((s, i) => s + i.calories, 0),
      totalProtein: +items.reduce((s, i) => s + i.protein, 0).toFixed(1),
      totalCarbs: +items.reduce((s, i) => s + i.carbs, 0).toFixed(1),
      totalFat: +items.reduce((s, i) => s + i.fat, 0).toFixed(1),
      hiddenIngredient: result.hiddenIngredient ?? null,
      source: "voice",
      verified: false,
      notes: t("desc.notes", { text: text.trim() }),
    };
    const outcome = saveMeal(meal);
    if (!outcome.ok) {
      toast({
        title: t("desc.storage"),
        description: t("desc.storageDesc"),
      });
      return;
    }
    maybeRequestReview(meal.source);
    toast({
      title: t("desc.saved"),
      description: t("desc.savedDesc", { cal: meal.totalCalories, day: formatDayLabel(targetDay) }),
    });
    if (refineAfter) navigate(`/app/history/${meal.id}`);
    else navigate(withDay("/app/today", targetDay));
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border safe-top-sticky">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground leading-tight">{t("desc.title")}</h1>
            <p className="text-[11px] text-muted-foreground">
              {isToday(targetDay)
                ? t("desc.sub")
                : t("desc.adding", { day: formatDayLabel(targetDay) })}
            </p>
          </div>
          <div className="glass border border-border rounded-full px-2.5 py-1">
            <span className="text-[10px] font-medium text-foreground">{t("desc.estimated")}</span>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("desc.q")}
          </label>
          {voice === "recording" && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-primary" role="status">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t("desc.listening", { time: formatClock(elapsedMs) })}
            </span>
          )}
          {voice === "transcribing" && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-primary" role="status">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("desc.transcribing")}
            </span>
          )}
        </div>
        <div className="relative mt-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("desc.ph")}
            rows={4}
            className="w-full px-4 py-3 pr-14 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <button
            type="button"
            onClick={() => void toggleDictation()}
            disabled={voice === "starting" || voice === "transcribing" || loading}
            aria-label={voice === "recording" ? t("desc.micStop") : t("desc.micStart")}
            title={voice === "recording" ? t("desc.micTitleStop") : t("desc.micTitleStart")}
            className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-60 ${
              voice === "recording"
                ? "bg-primary text-primary-foreground shadow-glow animate-pulse"
                : "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
            }`}
          >
            {voice === "starting" || voice === "transcribing" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : voice === "recording" ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        </div>

        {voice === "recording" ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("desc.sayAll")}
          </p>
        ) : (
          voiceSupported && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("desc.tip")}
            </p>
          )
        )}

        {/* Portion helper trigger */}
        <button
          type="button"
          onClick={() => setHelperOpen(true)}
          className="mt-3 w-full p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 hover:border-primary/50 transition-colors text-left flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{t("desc.portionHelp")}</p>
            <p className="text-[10px] text-muted-foreground">
              {t("desc.portionHelpDesc")}
            </p>
          </div>
          <span className="text-[10px] font-semibold text-primary shrink-0">{t("desc.open")}</span>
        </button>

        {!result && (
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground mb-2">{t("desc.try")}</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((key) => (
                <button
                  key={key}
                  onClick={() => setText(t(key))}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-secondary/60 border border-border text-foreground/80 hover:bg-secondary"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => void estimate()}
          disabled={loading}
          className="mt-4 w-full h-12 rounded-xl gradient-glow shadow-glow flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("desc.estimating")}
            </>
          ) : (
            <>{result ? t("desc.reestimate") : t("desc.estimate")}</>
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
            <div className="mb-3">
              <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
              <p className="text-[11px] text-muted-foreground">{result.notes}</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label={t("desc.cal")} value={Math.round(totals.cal)} />
              <Stat label={t("desc.p")} value={`${totals.p.toFixed(0)}g`} />
              <Stat label={t("desc.c")} value={`${totals.c.toFixed(0)}g`} />
              <Stat label={t("desc.f")} value={`${totals.f.toFixed(0)}g`} />
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
                    <p className="text-[10px] text-muted-foreground">{t("desc.conf", { n: i.confidence })}</p>
                  </div>
                </div>
              ))}
            </div>

            {result.hiddenIngredient && (
              <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-[11px] text-primary font-medium">{t("desc.hidden")}</p>
                <p className="text-xs text-foreground/90 mt-0.5">{result.hiddenIngredient}</p>
              </div>
            )}

            <PortionGuideList
              items={result.items.map((i) => ({ name: i.name, portion: i.portion }))}
              title={t("desc.guide")}
              compact
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => saveAsEstimated(false)}
              className="h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              {t("desc.saveEst")}
            </button>
            <button
              onClick={() => saveAsEstimated(true)}
              className="h-12 rounded-xl bg-secondary border border-border text-foreground text-sm font-semibold"
            >
              {t("desc.saveRefine")}
            </button>
          </div>

          <button
            onClick={() => void estimate()}
            disabled={loading}
            className="mt-2 w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            {t("desc.notQuite")}
          </button>
        </motion.div>
      )}

      <PortionHelper
        open={helperOpen}
        onClose={() => setHelperOpen(false)}
        onInsert={insertPortion}
      />
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
