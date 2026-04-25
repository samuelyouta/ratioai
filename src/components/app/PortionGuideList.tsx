import { motion } from "framer-motion";
import { useState } from "react";
import { matchPortion, extractGrams, compareToReference } from "@/lib/portionGuides";

interface ListItem {
  name: string;
  portion: string;
}

interface Props {
  items: ListItem[];
  /** Optional title shown above the chips */
  title?: string;
  /** Compact = smaller chips, used inside results cards */
  compact?: boolean;
}

const toneRing: Record<string, string> = {
  primary: "ring-primary/60 bg-primary/15 text-foreground",
  warning: "ring-warning/60 bg-warning/15 text-foreground",
  accent: "ring-accent/60 bg-accent/15 text-foreground",
};

/**
 * Photo-less variant of the Augmented Portion Guide. Shows a familiar
 * real-world reference object for each detected/logged item so the user
 * can sanity-check the AI's gram estimate without needing a captured image.
 */
const PortionGuideList = ({ items, title = "Portion guide", compact = false }: Props) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (!items.length) return null;

  return (
    <div className={compact ? "mt-3" : "mx-4 mt-4"}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it, i) => {
          const ref = matchPortion(it.name);
          const grams = extractGrams(it.portion);
          const cmp = compareToReference(grams, ref);
          const isOpen = openIdx === i;

          return (
            <motion.button
              key={`${it.name}-${i}`}
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 220, damping: 22 }}
              className={`flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 text-left transition-colors ${
                isOpen ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <span
                className={`flex items-center justify-center min-w-[3rem] h-10 px-2 rounded-full ring-2 text-[10px] font-bold shrink-0 ${toneRing[ref.tone]}`}
              >
                {grams ? `${grams}g` : ref.object}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground truncate">{it.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {isOpen
                    ? `${ref.object} · ~${ref.grams}g`
                    : cmp?.label ?? `≈ ${ref.object.toLowerCase()}`}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 px-0.5">
        Tap a chip to compare the estimate to a familiar reference.
      </p>
    </div>
  );
};

export default PortionGuideList;
