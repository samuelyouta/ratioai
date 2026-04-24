import { useMemo, useState } from "react";
import { Ruler, Plus, Minus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Portion Helper — a quick visual size picker that turns vague descriptions
 * ("some chicken", "a bit of rice") into precise phrases the AI can estimate
 * accurately, e.g. "150g chicken (≈1½ decks of cards)".
 *
 * The user picks a familiar real-world reference (deck of cards, fist, cup…)
 * and a multiplier. We compose a portion phrase and hand it back to the parent
 * so it can be inserted into the description textarea.
 */

export interface PortionReference {
  id: string;
  icon: string;
  label: string; // shown to user
  grams: number; // grams per 1x of this reference
  hint: string; // e.g. "Lean meats, fish, tofu"
  category: "protein" | "carb" | "veg" | "fat" | "liquid";
}

export const REFERENCES: PortionReference[] = [
  { id: "deck", icon: "🃏", label: "Deck of cards", grams: 85, hint: "Cooked meat, poultry, fish", category: "protein" },
  { id: "palm", icon: "✋", label: "Palm of hand", grams: 100, hint: "Meat, tofu, paneer", category: "protein" },
  { id: "fist", icon: "✊", label: "Fist", grams: 150, hint: "Cooked rice, pasta, fruit", category: "carb" },
  { id: "cuppedhand", icon: "🤲", label: "Cupped hand", grams: 60, hint: "Nuts, dry cereal, chips", category: "fat" },
  { id: "puck", icon: "🥌", label: "Hockey puck", grams: 125, hint: "Rice, pasta, grains", category: "carb" },
  { id: "tennis", icon: "🎾", label: "Tennis ball", grams: 150, hint: "Whole fruit, ice cream scoop", category: "carb" },
  { id: "baseball", icon: "🥎", label: "Baseball", grams: 90, hint: "Chopped vegetables", category: "veg" },
  { id: "twohands", icon: "🏐", label: "Two cupped hands", grams: 60, hint: "Leafy salad", category: "veg" },
  { id: "dice", icon: "🎲", label: "Pair of dice", grams: 30, hint: "Hard cheese", category: "fat" },
  { id: "cd", icon: "💿", label: "CD case", grams: 30, hint: "1 slice of bread", category: "carb" },
  { id: "thumb", icon: "👍", label: "Thumb tip", grams: 14, hint: "1 tbsp oil, butter, peanut butter", category: "fat" },
  { id: "chip", icon: "🪙", label: "Poker chip", grams: 14, hint: "1 tbsp dressing, mayo", category: "fat" },
  { id: "cup", icon: "🥤", label: "Standard cup", grams: 240, hint: "Milk, juice, smoothie", category: "liquid" },
  { id: "shot", icon: "🥃", label: "Shot glass", grams: 30, hint: "Liqueur, oil pour", category: "liquid" },
];

const MULTIPLIERS = [0.5, 1, 1.5, 2, 3];

const categoryLabels: Record<PortionReference["category"], string> = {
  protein: "Protein",
  carb: "Carbs",
  veg: "Vegetables",
  fat: "Fats & oils",
  liquid: "Liquids",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (phrase: string) => void;
}

const PortionHelper = ({ open, onClose, onInsert }: Props) => {
  const [picked, setPicked] = useState<PortionReference | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [foodName, setFoodName] = useState<string>("");

  const grams = picked ? Math.round(picked.grams * multiplier) : 0;

  const grouped = useMemo(() => {
    const map: Record<string, PortionReference[]> = {};
    REFERENCES.forEach((r) => {
      (map[r.category] ||= []).push(r);
    });
    return map;
  }, []);

  const multiplierLabel = (m: number) =>
    m === 0.5 ? "½" : m === 1.5 ? "1½" : `${m}`;

  const buildPhrase = () => {
    if (!picked) return "";
    const food = foodName.trim();
    const refLabel =
      multiplier === 1
        ? picked.label.toLowerCase()
        : `${multiplierLabel(multiplier)} ${picked.label.toLowerCase()}${multiplier > 1 ? "s" : ""}`;
    if (food) return `${grams}g ${food} (≈ ${refLabel})`;
    return `${grams}g (≈ ${refLabel})`;
  };

  const handleInsert = () => {
    const phrase = buildPhrase();
    if (!phrase) return;
    onInsert(phrase);
    setPicked(null);
    setMultiplier(1);
    setFoodName("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                <Ruler className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-foreground">Portion helper</h2>
                <p className="text-[11px] text-muted-foreground">
                  Pick a familiar object to estimate grams precisely
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            <div className="px-4 pt-4 pb-32">
              {/* Reference picker */}
              {Object.entries(grouped).map(([cat, refs]) => (
                <div key={cat} className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {categoryLabels[cat as PortionReference["category"]]}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {refs.map((r) => {
                      const isPicked = picked?.id === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setPicked(r)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                            isPicked
                              ? "border-primary bg-primary/15 ring-2 ring-primary/40"
                              : "border-border bg-background hover:bg-secondary"
                          }`}
                        >
                          <span className="text-2xl shrink-0">{r.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-foreground truncate">
                              {r.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              ~{r.grams}g · {r.hint}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer composer */}
            {picked && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed inset-x-0 bottom-0 bg-card border-t border-border px-4 pt-3 pb-4 z-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{picked.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {picked.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ~{picked.grams}g per 1×
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-secondary rounded-full px-1 py-1">
                    <button
                      onClick={() => {
                        const idx = MULTIPLIERS.indexOf(multiplier);
                        if (idx > 0) setMultiplier(MULTIPLIERS[idx - 1]);
                      }}
                      className="w-7 h-7 rounded-full bg-background flex items-center justify-center disabled:opacity-40"
                      disabled={multiplier === MULTIPLIERS[0]}
                      aria-label="Less"
                    >
                      <Minus className="w-3 h-3 text-foreground" />
                    </button>
                    <span className="text-xs font-semibold text-foreground min-w-[28px] text-center">
                      {multiplierLabel(multiplier)}×
                    </span>
                    <button
                      onClick={() => {
                        const idx = MULTIPLIERS.indexOf(multiplier);
                        if (idx < MULTIPLIERS.length - 1) setMultiplier(MULTIPLIERS[idx + 1]);
                      }}
                      className="w-7 h-7 rounded-full bg-background flex items-center justify-center disabled:opacity-40"
                      disabled={multiplier === MULTIPLIERS[MULTIPLIERS.length - 1]}
                      aria-label="More"
                    >
                      <Plus className="w-3 h-3 text-foreground" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="Food name (optional) e.g. grilled chicken"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2"
                />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Will add
                    </p>
                    <p className="text-xs font-semibold text-primary truncate">
                      {buildPhrase()}
                    </p>
                  </div>
                  <button
                    onClick={handleInsert}
                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-glow shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to meal
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PortionHelper;
