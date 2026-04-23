import { motion, AnimatePresence } from "framer-motion";
import { Ruler, X } from "lucide-react";
import { useState } from "react";
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

  return (
    <div className="relative mx-6 mb-4 rounded-2xl overflow-hidden border border-border bg-card">
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
              const cmp = compareToReference(grams, ref);
              const isActive = activeIdx === i;

              return (
                <motion.button
                  key={`${it.name}-${i}`}
                  type="button"
                  onClick={() => setActiveIdx(isActive ? null : i)}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 18, delay: i * 0.05 }}
                  style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                >
                  <span
                    className={`flex items-center justify-center w-12 h-12 rounded-full ring-2 backdrop-blur-md text-2xl shadow-glow ${toneRing[ref.tone]}`}
                  >
                    {ref.icon}
                  </span>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 220, damping: 22 }}
                        className="absolute left-1/2 top-full mt-2 -translate-x-1/2 w-44 bg-background/95 backdrop-blur-md border border-border rounded-xl px-3 py-2 text-left shadow-glow"
                      >
                        <p className="text-[11px] font-semibold text-foreground truncate">
                          {it.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          AI: {it.portion}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-base leading-none">{ref.icon}</span>
                          <p className="text-[10px] text-foreground">
                            {ref.object} · ~{ref.grams}g
                          </p>
                        </div>
                        {cmp && (
                          <p className="text-[10px] text-primary font-medium mt-1">
                            {cmp.label}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
          {showGuide ? <X className="w-3 h-3" /> : <Ruler className="w-3 h-3 text-primary" />}
          {showGuide ? "Hide guide" : "Portion guide"}
        </button>

        {showGuide && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-background/80 backdrop-blur-md border border-border">
            <Ruler className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-[11px] text-foreground leading-snug">
              Tap an icon to compare the AI estimate to a familiar object.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortionGuideOverlay;
