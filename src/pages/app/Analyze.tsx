import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Minus, Pencil, Plus, Share2 } from "lucide-react";
import { createMealId, getMeals, saveMeal, updateMeal, type Meal } from "@/lib/profile";
import { maybeRequestReview } from "@/lib/reviewPrompt";
import {
  activeItems,
  foodToItem,
  sumItems,
  toMealItem,
  type EditableItem,
} from "@/lib/mealEdit";
import type { FoodDef } from "@/lib/foodDb";
import { AddItemSheet, ItemEditorSheet } from "@/components/app/MealItemSheets";
import { analyzeMealPhoto } from "@/lib/mealAiClient";
import { ScanLimitError } from "@/lib/scanQuota";
import { consumePendingMealImage } from "@/lib/mealImageStore";
import { sanitizeMealIcon } from "@/lib/mealIcon";
import PortionGuideOverlay from "@/components/app/PortionGuideOverlay";
import ShareRecipeCard from "@/components/app/ShareRecipeCard";
import { formatDayLabel, isToday, timestampForDay } from "@/lib/dayKey";
import { readDayParam, withDay } from "@/lib/loggingDay";
import { toast } from "sonner";
import { translate, useT } from "@/i18n";

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
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const targetDay = readDayParam(searchParams);
  const logPath = withDay("/app/log", targetDay);
  const todayPath = withDay("/app/today", targetDay);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [acceptHidden, setAcceptHidden] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [autoNavTimer, setAutoNavTimer] = useState<number | null>(null);
  const [savedMealId, setSavedMealId] = useState<string | null>(null);
  const [extraCalories, setExtraCalories] = useState(0);
  const [savedAddOpen, setSavedAddOpen] = useState(false);
  const [savedCustomOpen, setSavedCustomOpen] = useState(false);

  const imageRef = useRef<string | null>(null);
  const runIdRef = useRef(0);
  const [slow, setSlow] = useState(false);

  const runAnalysis = useCallback(async (dataUrl: string) => {
    const runId = ++runIdRef.current;
    const current = () => runId === runIdRef.current;
    setLoading(true);
    setError(null);
    setLimitReached(false);
    setSlow(false);
    try {
      const r = await analyzeMealPhoto<AnalysisResult>(dataUrl);
      if (!current()) return;
      if (!r.items?.length) {
        setError(r.notes || translate("an.noFood"));
        return;
      }
      setResult(r);
      setItems(r.items.map((it) => ({ ...it, servings: 1 })));
    } catch (e) {
      if (!current()) return;
      if (e instanceof ScanLimitError) {
        setLimitReached(true);
        setError(e.message);
        return;
      }
      const raw = e instanceof Error ? e.message : "Analysis failed";
      const lower = raw.toLowerCase();
      // WebKit often surfaces failed fetch as exactly "Load failed".
      if (
        lower === "load failed" ||
        lower.includes("failed to fetch") ||
        lower.includes("networkerror") ||
        lower.includes("function_invocation_failed")
      ) {
        setError(translate("an.noReach"));
      } else {
        setError(raw);
      }
    } finally {
      if (current()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The photo is handed over exactly once. Re-running this effect (a route
    // change re-creating `navigate`, say) must not look for it again and bounce
    // the user back to the camera mid-analysis.
    if (imageRef.current) return;
    const dataUrl = consumePendingMealImage();
    if (!dataUrl) {
      navigate(logPath, { replace: true });
      return;
    }
    imageRef.current = dataUrl;
    setImageUrl(dataUrl);
    void runAnalysis(dataUrl);
  }, [navigate, logPath, runAnalysis]);

  useEffect(
    () => () => {
      runIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setSlow(true), 12_000);
    return () => window.clearTimeout(t);
  }, [loading]);

  const cancelAnalysis = () => {
    runIdRef.current += 1;
    navigate(logPath, { replace: true });
  };

  const hiddenCalories =
    result?.hiddenIngredient && acceptHidden ? parseHiddenCalories(result) : 0;

  const kept = activeItems(items);
  const totals = sumItems(kept);

  const totalCalories = Math.round(totals.calories + hiddenCalories);
  const totalFat = Math.round(totals.fat + hiddenCalories / 9);

  const handleSave = () => {
    if (!result || saving || saved || kept.length === 0) return;
    setSaving(true);

    try {
      const meal: Meal = {
        id: createMealId(),
        loggedAt: timestampForDay(targetDay),
        title: result.title,
        icon: sanitizeMealIcon(result.icon),
        items: kept.map(toMealItem),
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

      const outcome = saveMeal(meal);
      if (!outcome.ok) {
        setSaving(false);
        toast.error(t("an.saveFail"), {
          description: t("an.storageFull"),
        });
        return;
      }

      if (outcome.photoDropped) {
        toast.message(t("an.noPhoto"), {
          description: t("an.noPhotoDesc"),
        });
      }

      setSavedMealId(meal.id);
      setSaved(true);
      maybeRequestReview(meal.source);
      const timer = window.setTimeout(() => navigate(todayPath, { replace: true }), 3200);
      setAutoNavTimer(timer);
    } catch (e) {
      console.error("confirm & log failed", e);
      setSaving(false);
      toast.error(t("an.saveFail"), {
        description: e instanceof Error ? e.message : t("an.tapConfirm"),
      });
    }
  };

  const addToSavedMeal = (added: EditableItem[]) => {
    const kept = activeItems(added);
    if (!savedMealId || kept.length === 0) return;
    const before = getMeals().find((m) => m.id === savedMealId);
    if (!before) return;
    const ok = updateMeal(savedMealId, { items: [...before.items, ...kept.map(toMealItem)] });
    if (!ok) {
      toast.error(t("an.saveFail"), { description: t("an.storageFull") });
      return;
    }
    // Recomputing totals from items would drop a hidden-ingredient estimate, so restore them.
    const add = sumItems(kept);
    updateMeal(savedMealId, {
      totalCalories: before.totalCalories + Math.round(add.calories),
      totalProtein: before.totalProtein + Math.round(add.protein),
      totalCarbs: before.totalCarbs + Math.round(add.carbs),
      totalFat: before.totalFat + Math.round(add.fat),
    });
    setExtraCalories((c) => c + Math.round(add.calories));
    toast.success(
      kept.length === 1 ? t("an.addedOne", { name: kept[0].name }) : t("an.addedMany", { n: kept.length }),
      { description: t("an.addedToMeal") },
    );
  };

  const openSavedAdd = () => {
    if (autoNavTimer) window.clearTimeout(autoNavTimer);
    setAutoNavTimer(null);
    setSavedAddOpen(true);
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
        <p className="text-sm text-foreground font-semibold mt-4">{t("an.analyzing")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {slow
            ? t("an.slow")
            : t("an.identifying")}
        </p>
        <button
          onClick={cancelAnalysis}
          className="mt-6 text-xs font-medium text-muted-foreground underline underline-offset-4"
        >
          {t("an.cancel")}
        </button>
      </motion.div>
    );
  }

  if (limitReached) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center"
      >
        <p className="text-base font-semibold text-foreground">{t("an.limitTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => navigate(withDay("/app/manual", targetDay), { replace: true })}
          className="w-full max-w-xs gradient-glow text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-glow"
        >
          {t("log.searchEdit")}
        </button>
        <button
          onClick={() => navigate(withDay("/app/describe", targetDay), { replace: true })}
          className="mt-3 w-full max-w-xs border border-primary/30 bg-primary/10 text-foreground font-semibold px-6 py-3 rounded-xl"
        >
          {t("log.describe")}
        </button>
        <button
          onClick={() => navigate(todayPath, { replace: true })}
          className="mt-4 text-sm font-medium text-muted-foreground underline underline-offset-4"
        >
          {t("an.backToday")}
        </button>
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
        <p className="text-base font-semibold text-foreground">{t("an.failTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">
          {error ?? t("an.noResult")}
        </p>
        {imageRef.current && (
          <button
            onClick={() => imageRef.current && void runAnalysis(imageRef.current)}
            className="gradient-glow text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-glow"
          >
            {t("an.retry")}
          </button>
        )}
        <button
          onClick={() => navigate(logPath, { replace: true })}
          className={
            imageRef.current
              ? "mt-3 text-sm font-medium text-muted-foreground underline underline-offset-4"
              : "gradient-glow text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-glow"
          }
        >
          {t("an.retake")}
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
          className="text-center w-full max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring" }}
            className="w-20 h-20 gradient-glow rounded-full mx-auto shadow-glow mb-6"
          />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("an.logged")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("an.caloriesAdded", {
              cal: totalCalories + extraCalories,
              where: isToday(targetDay) ? t("an.yourDay") : formatDayLabel(targetDay).toLowerCase(),
            })}
          </p>

          <div className="mt-7 flex flex-col gap-2">
            <button
              onClick={openSavedAdd}
              className="w-full bg-card border border-dashed border-primary/50 rounded-2xl py-3.5 text-sm font-semibold text-primary flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("an.addMissed")}
            </button>
            <button
              onClick={() => {
                if (autoNavTimer) window.clearTimeout(autoNavTimer);
                setShareOpen(true);
              }}
              className="w-full bg-card border border-primary/40 rounded-2xl py-3.5 text-sm font-semibold text-primary flex items-center justify-center gap-2 transition-colors hover:bg-primary/10"
            >
              <Share2 className="w-4 h-4" />
              {t("an.share")}
            </button>
            <button
              onClick={() => navigate(todayPath, { replace: true })}
              className="text-xs text-muted-foreground py-2"
            >
              {t("an.home")}
            </button>
          </div>
        </motion.div>

        <ShareRecipeCard
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={result?.title ?? t("an.meal")}
          icon={result ? sanitizeMealIcon(result.icon) : undefined}
          imageDataUrl={imageUrl}
          calories={totalCalories}
          protein={Math.round(totals.protein)}
          carbs={Math.round(totals.carbs)}
          fat={totalFat}
        />

        <AddItemSheet
          open={savedAddOpen}
          onClose={() => setSavedAddOpen(false)}
          onPick={(food: FoodDef) => {
            setSavedAddOpen(false);
            addToSavedMeal([foodToItem(food)]);
          }}
          onCustom={() => {
            setSavedAddOpen(false);
            setSavedCustomOpen(true);
          }}
          onDescribed={(added) => {
            setSavedAddOpen(false);
            addToSavedMeal(added);
          }}
        />
        <ItemEditorSheet
          open={savedCustomOpen}
          item={null}
          onClose={() => setSavedCustomOpen(false)}
          onSave={(next) => {
            setSavedCustomOpen(false);
            addToSavedMeal([next]);
          }}
          onRemove={() => setSavedCustomOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-6 safe-top pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(logPath)}
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="font-semibold text-foreground">{result.title}</h2>
        <span className="text-2xl">{sanitizeMealIcon(result.icon)}</span>
      </div>

      {!isToday(targetDay) && (
        <div className="px-6 mb-3">
          <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
            {t("an.loggingTo", { day: formatDayLabel(targetDay) })}
          </p>
        </div>
      )}

      {imageUrl && <PortionGuideOverlay imageUrl={imageUrl} items={items.filter((it) => !it.manual && it.servings > 0)} />}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 mb-4"
      >
        <motion.div className="bg-primary/10 rounded-xl px-4 py-2.5">
          <p className="text-sm text-primary font-medium">
            {items.filter((it) => !it.manual).length} items detected
            {items.some((it) => it.manual) && ` · ${items.filter((it) => it.manual).length} added by you`}
          </p>
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
              {t("an.hiddenDetected")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{result.hiddenIngredient}</p>
            {hiddenCalories > 0 && acceptHidden && (
              <p className="text-xs text-foreground/80 mt-1">{t("an.hiddenAdded", { cal: hiddenCalories })}</p>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setAcceptHidden(true)}
                className={`text-xs font-medium px-3 py-1 rounded-lg ${
                  acceptHidden ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {t("an.yesAdd")}
              </button>
              <button
                onClick={() => setAcceptHidden(false)}
                className={`text-xs font-medium px-3 py-1 rounded-lg ${
                  !acceptHidden ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {t("an.noThanks")}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="px-6 space-y-3 mb-6">
        {items.map((it, i) => {
          const servings = it.servings;
          const removed = servings === 0;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: removed ? 0.5 : 1, x: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.1 }}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <motion.div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground text-sm truncate">{it.name}</h4>
                    {it.manual ? (
                      <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                        {t("an.addedByYou")}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded shrink-0">
                        {t("an.match", { n: it.confidence })}
                      </span>
                    )}
                  </motion.div>
                  <p className="text-xs text-muted-foreground">
                    {it.portion}
                    {removed && ` · ${t("an.wontLog")}`}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {Math.round(it.calories * servings)}
                    <span className="text-muted-foreground text-xs font-normal"> {t("common.cal")}</span>
                  </p>
                  <button
                    onClick={() => setEditingIdx(i)}
                    aria-label={t("an.editAria", { name: it.name })}
                    className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span>
                    {t("desc.p")} <span className="text-foreground font-medium">{Math.round(it.protein * servings)}g</span>
                  </span>
                  <span>
                    {t("desc.c")} <span className="text-foreground font-medium">{Math.round(it.carbs * servings)}g</span>
                  </span>
                  <span>
                    {t("desc.f")} <span className="text-foreground font-medium">{Math.round(it.fat * servings)}g</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-1">
                  <button
                    onClick={() =>
                      setItems((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, servings: Math.max(0, x.servings - 1) } : x)),
                      )
                    }
                    aria-label={t("an.fewer")}
                    className="w-7 h-7 flex items-center justify-center text-muted-foreground"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-foreground w-4 text-center">{servings}</span>
                  <button
                    onClick={() =>
                      setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, servings: x.servings + 1 } : x)))
                    }
                    aria-label={t("an.more")}
                    className="w-7 h-7 flex items-center justify-center text-muted-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        <button
          onClick={() => setAddOpen(true)}
          className="w-full h-12 rounded-2xl border border-dashed border-primary/50 text-primary text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("an.addMissed")}
        </button>
      </div>

      {result.notes && (
        <div className="px-6 mb-4">
          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-xl px-4 py-2.5">{result.notes}</p>
        </div>
      )}

      <div className="px-6">
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <motion.div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("an.total")}</span>
            <span className="text-xl font-bold text-foreground">
              {totalCalories} <span className="text-sm text-muted-foreground font-normal">{t("common.cal")}</span>
            </span>
          </motion.div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              {t("macro.protein")} <span className="text-foreground font-medium">{Math.round(totals.protein)}g</span>
            </span>
            <span>
              {t("macro.carbs")} <span className="text-foreground font-medium">{Math.round(totals.carbs)}g</span>
            </span>
            <span>
              {t("macro.fat")} <span className="text-foreground font-medium">{totalFat}g</span>
            </span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || kept.length === 0}
          className="gradient-glow text-primary-foreground font-semibold text-base py-4 rounded-2xl shadow-glow w-full flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? t("an.logging") : t("an.confirm")}
        </motion.button>
      </div>

      <ItemEditorSheet
        open={editingIdx !== null || customOpen}
        item={editingIdx !== null ? (items[editingIdx] ?? null) : null}
        onClose={() => {
          setEditingIdx(null);
          setCustomOpen(false);
        }}
        onSave={(next) => {
          if (editingIdx !== null) {
            setItems((prev) => prev.map((x, idx) => (idx === editingIdx ? next : x)));
          } else {
            setItems((prev) => [...prev, next]);
          }
          setEditingIdx(null);
          setCustomOpen(false);
        }}
        onRemove={() => {
          if (editingIdx !== null) {
            const target = items[editingIdx];
            setItems((prev) =>
              target?.manual
                ? prev.filter((_, idx) => idx !== editingIdx)
                : prev.map((x, idx) => (idx === editingIdx ? { ...x, servings: 0 } : x)),
            );
          }
          setEditingIdx(null);
        }}
      />

      <AddItemSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={(food: FoodDef) => {
          setAddOpen(false);
          setItems((prev) => [...prev, foodToItem(food)]);
          setEditingIdx(items.length);
        }}
        onCustom={() => {
          setAddOpen(false);
          setCustomOpen(true);
        }}
        onDescribed={(added) => {
          setAddOpen(false);
          setItems((prev) => [...prev, ...added]);
          toast.success(added.length === 1 ? t("an.addedOne", { name: added[0].name }) : t("an.addedMany", { n: added.length }), {
            description: t("an.estimatedAI"),
          });
        }}
      />
    </div>
  );
};

export default Analyze;
