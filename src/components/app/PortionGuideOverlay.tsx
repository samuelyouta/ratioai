import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  matchPortion,
  extractGrams,
  compareToReference,
  overlayPosition,
} from "@/lib/portionGuides";

interface OverlayItem {
  name: string;
  portion: string;
}

interface Props {
  imageUrl: string;
  items: OverlayItem[];
}

const toneRing: Record<string, string> = {
  primary: "ring-primary/70 bg-primary/25 text-primary-foreground",
  warning: "ring-warning/70 bg-warning/25 text-warning-foreground",
  accent: "ring-accent/70 bg-accent/25 text-accent-foreground",
};

const PortionGuideOverlay = ({ imageUrl, items }: Props) => {
  const [showGuide, setShowGuide] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const active = useMemo(() => {
    if (activeIdx === null) return null;
    const item = items[activeIdx];
    if (!item) return null;
    const ref = matchPortion(item.name);
    const grams = extractGrams(item.portion);
    return { item, ref, grams, cmp: compareToReference(grams, ref) };
  }, [activeIdx, items]);

  return (
    <div className="mx-6 mb-4 rounded-2xl overflow-hidden border border-border bg-card">
      <div className="relative aspect-[4/3] w-full">
        <img
          src={imageUrl}
          alt="Captured meal"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Subtle scrim so chips are legible */}
        {showGuide && (
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/20 pointer-events-none" />
        )}

        {/* Portion markers */}
        <AnimatePresence>
          {showGuide &&
            items.map((it, i) => {
              const ref = matchPortion(it.name);
              const pos = overlayPosition(i, items.length);
              const grams = extractGrams(it.portion);
              const isActive = activeIdx === i;

              return (
                <motion.button
                  key={`${it.name}-${i}`}
                  type="button"
                  onClick={() => setActiveIdx(isActive ? null : i)}
                  aria-pressed={isActive}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 18, delay: i * 0.05 }}
                  style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                >
                  <span
                    className={`flex items-center justify-center min-w-[3rem] h-12 px-2 rounded-full ring-2 backdrop-blur-md text-[11px] font-bold shadow-glow transition-transform ${
                      toneRing[ref.tone]
                    } ${isActive ? "scale-110 ring-4" : ""}`}
                  >
                    {grams ? `${grams}g` : ref.object}
                  </span>
                </motion.button>
              );
            })}
        </AnimatePresence>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowGuide((s) => !s);
            setActiveIdx(null);
          }}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border text-[11px] font-semibold text-foreground"
        >
          {showGuide && <X className="w-3 h-3" />}
          {showGuide ? "Hide guide" : "Show guide"}
        </button>
      </div>

      {/*
        The reference read-out lives below the photo rather than floating over
        it: a chip near the bottom edge put its popover outside the image's
        overflow-hidden box, where it was clipped and covered by the hint bar.
      */}
      {showGuide && (
        <div className="border-t border-border px-4 py-3">
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={`detail-${activeIdx}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{active.item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      AI estimate: {active.item.portion}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveIdx(null)}
                    aria-label="Close reference"
                    className="w-7 h-7 shrink-0 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-foreground bg-secondary rounded-lg px-2 py-1">
                    <span aria-hidden="true">{active.ref.icon}</span> Looks like{" "}
                    {active.ref.object.toLowerCase()} · ~{active.ref.grams}g
                  </span>
                  {active.cmp && (
                    <span className="text-xs font-medium text-primary bg-primary/10 rounded-lg px-2 py-1">
                      {active.cmp.label}
                    </span>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] text-muted-foreground leading-snug"
              >
                Tap a chip on the photo to compare the AI estimate to a familiar reference.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default PortionGuideOverlay;
