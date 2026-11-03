import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Field, Sheet } from "@/components/app/Sheet";
import { describeMealText } from "@/lib/mealAiClient";
import { FOODS, type FoodDef } from "@/lib/foodDb";
import {
  MAX_CALORIES,
  MAX_GRAMS,
  aiEstimateToItem,
  customItem,
  gramsOf,
  parseAmount,
  withGrams,
  type EditableItem,
} from "@/lib/mealEdit";

const fmt = (n: number) => String(Math.round(n * 10) / 10);

interface EditorProps {
  open: boolean;
  /** Item to correct, or null to create a custom item from scratch. */
  item: EditableItem | null;
  onSave: (item: EditableItem) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export function ItemEditorSheet({ open, item, onSave, onRemove, onClose }: EditorProps) {
  const creating = item === null;
  const hasGrams = item ? gramsOf(item) !== null : true;

  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");
  const [portion, setPortion] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    if (item) {
      setName(item.name);
      setGrams(fmt(gramsOf(item) ?? 0));
      setPortion(item.portion);
      setCalories(fmt(item.calories));
      setProtein(fmt(item.protein));
      setCarbs(fmt(item.carbs));
      setFat(fmt(item.fat));
    } else {
      setName("");
      setGrams("");
      setPortion("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
    }
  }, [open, item]);

  const onGramsChange = (value: string) => {
    setGrams(value);
    const g = parseAmount(value);
    if (item && g && g > 0 && g <= MAX_GRAMS && gramsOf(item)) {
      const scaled = withGrams(item, g);
      setCalories(fmt(scaled.calories));
      setProtein(fmt(scaled.protein));
      setCarbs(fmt(scaled.carbs));
      setFat(fmt(scaled.fat));
    }
  };

  const parsed = {
    grams: parseAmount(grams),
    calories: parseAmount(calories),
    protein: parseAmount(protein),
    carbs: parseAmount(carbs),
    fat: parseAmount(fat),
  };
  const gramsRequired = !creating && hasGrams;
  const gramsInvalid =
    grams.trim() !== "" || gramsRequired
      ? parsed.grams === null || parsed.grams > MAX_GRAMS || (gramsRequired && parsed.grams === 0)
      : false;
  const errors = {
    name: name.trim() === "",
    grams: gramsInvalid,
    calories: parsed.calories === null || parsed.calories > MAX_CALORIES,
    protein: parsed.protein === null || parsed.protein > 2000,
    carbs: parsed.carbs === null || parsed.carbs > 2000,
    fat: parsed.fat === null || parsed.fat > 2000,
  };
  const valid = !Object.values(errors).some(Boolean);

  const handleSave = () => {
    setSubmitted(true);
    if (!valid) return;
    const macros = {
      calories: Math.round(parsed.calories ?? 0),
      protein: Math.round((parsed.protein ?? 0) * 10) / 10,
      carbs: Math.round((parsed.carbs ?? 0) * 10) / 10,
      fat: Math.round((parsed.fat ?? 0) * 10) / 10,
    };
    if (!item) {
      onSave(
        customItem({
          name,
          grams: parsed.grams && parsed.grams > 0 ? parsed.grams : null,
          ...macros,
        }),
      );
      return;
    }
    const nextPortion =
      hasGrams && parsed.grams
        ? withGrams(item, parsed.grams).portion
        : portion.trim() || item.portion;
    onSave({ ...item, name: name.trim(), portion: nextPortion, ...macros });
  };

  const show = (key: keyof typeof errors) => submitted && errors[key];

  return (
    <Sheet open={open} title={creating ? "Add item manually" : "Edit item"} onClose={onClose}>
      <div className="space-y-3">
        <Field
          label="Food name"
          value={name}
          onChange={setName}
          placeholder="e.g. Olive oil, side salad"
          error={show("name")}
        />

        {hasGrams ? (
          <Field
            label={creating ? "Amount (optional)" : "Amount"}
            suffix="g"
            numeric
            value={grams}
            onChange={onGramsChange}
            placeholder="e.g. 150"
            error={show("grams")}
          />
        ) : (
          <Field label="Portion" value={portion} onChange={setPortion} placeholder="e.g. 1 slice" />
        )}
        {!creating && hasGrams && (
          <p className="text-[11px] text-muted-foreground -mt-1">
            Changing the amount rescales calories and macros. You can still fine-tune them below.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Calories"
            suffix="cal"
            numeric
            value={calories}
            onChange={setCalories}
            error={show("calories")}
          />
          <Field
            label="Protein"
            suffix="g"
            numeric
            value={protein}
            onChange={setProtein}
            error={show("protein")}
          />
          <Field
            label="Carbs"
            suffix="g"
            numeric
            value={carbs}
            onChange={setCarbs}
            error={show("carbs")}
          />
          <Field label="Fat" suffix="g" numeric value={fat} onChange={setFat} error={show("fat")} />
        </div>

        {submitted && !valid && (
          <p className="text-xs text-destructive">
            Please fill in a name and valid, non-negative numbers.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {onRemove && !creating && (
            <button
              onClick={onRemove}
              className="h-12 px-4 rounded-xl bg-secondary text-destructive flex items-center gap-1.5 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 h-12 rounded-xl gradient-glow shadow-glow text-sm font-semibold text-primary-foreground"
          >
            {creating ? "Add to meal" : "Save changes"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

interface AddProps {
  open: boolean;
  onPick: (food: FoodDef) => void;
  onCustom: () => void;
  /** Called with the items the AI estimated from a free-text description. */
  onDescribed: (items: EditableItem[]) => void;
  onClose: () => void;
}

interface DescribeResponse {
  items?: Parameters<typeof aiEstimateToItem>[0][];
  notes?: string;
}

export function AddItemSheet({ open, onPick, onCustom, onDescribed, onClose }: AddProps) {
  const [query, setQuery] = useState("");
  const [description, setDescription] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDescription("");
      setAiError(null);
      setEstimating(false);
    }
  }, [open]);

  const estimate = async () => {
    const text = description.trim();
    if (text.length < 3) {
      setAiError("Add a few words about what you ate.");
      return;
    }
    setEstimating(true);
    setAiError(null);
    try {
      const r = await describeMealText<DescribeResponse>(text);
      const items = (r.items ?? []).map(aiEstimateToItem);
      if (items.length === 0) {
        setAiError(r.notes || "No food detected. Try rephrasing, e.g. \"a tablespoon of butter\".");
        return;
      }
      onDescribed(items);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Couldn't estimate that. Please try again.");
    } finally {
      setEstimating(false);
    }
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOODS.slice(0, 4);
    return FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12);
  }, [query]);

  return (
    <Sheet open={open} title="Add a missed item" onClose={onClose}>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods (e.g. olive oil, rice)…"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="space-y-2">
        {results.map((f) => (
          <button
            key={f.name}
            onClick={() => onPick(f)}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {f.cal} cal · P {f.p}g · C {f.c}g · F {f.f}g · per {f.unitGrams}g
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
          </button>
        ))}
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No match for "{query}". Describe it to the AI below or enter it yourself.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Describe it to the AI</p>
        </div>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setAiError(null);
          }}
          rows={2}
          disabled={estimating}
          placeholder="e.g. a tablespoon of butter and a glass of orange juice"
          className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
        {aiError && <p className="text-xs text-destructive mt-1.5">{aiError}</p>}
        <button
          onClick={estimate}
          disabled={estimating}
          className="mt-2 w-full h-11 rounded-xl gradient-glow text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {estimating && <Loader2 className="w-4 h-4 animate-spin" />}
          {estimating ? "Estimating…" : "Estimate and add"}
        </button>
      </div>

      <button
        onClick={onCustom}
        className="mt-3 w-full h-12 rounded-xl border border-primary/40 text-primary text-sm font-semibold"
      >
        Enter a custom item
      </button>
    </Sheet>
  );
}
