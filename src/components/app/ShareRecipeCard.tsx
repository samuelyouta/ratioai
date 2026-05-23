import { motion, AnimatePresence } from "framer-motion";
import { X, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  imageDataUrl?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * 9:16 share card overlay — vertically formatted, blurred meal photo
 * background, neon green macro pill badges, and a RatioAi tagline footer.
 */
const ShareRecipeCard = ({
  open,
  onClose,
  title,
  icon,
  imageDataUrl,
  calories,
  protein,
  carbs,
  fat,
}: Props) => {
  const handleShare = async () => {
    const text = `${title} — ${calories} kcal · P${protein} C${carbs} F${fat}\nVerified via RatioAi Engine`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[300px] aspect-[9/16] rounded-3xl overflow-hidden border border-border bg-card shadow-2xl"
          >
            {/* Background image (blurred) */}
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-50"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-card to-background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/95" />

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-background/60 border border-border flex items-center justify-center"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>

            <div className="relative h-full flex flex-col justify-between p-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-primary">
                  RatioAi · Verified Meal
                </p>
                <h3 className="mt-2 text-2xl font-black text-foreground leading-tight tracking-tight">
                  {icon && <span className="mr-2">{icon}</span>}
                  {title}
                </h3>
              </div>

              <div>
                <p className="text-5xl font-black text-primary tabular-nums tracking-tight"
                   style={{ textShadow: "0 0 24px hsl(var(--primary) / 0.45)" }}>
                  {calories}
                  <span className="text-base font-semibold text-muted-foreground ml-1">kcal</span>
                </p>

                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {[
                    { l: "Protein", v: `${protein}g` },
                    { l: "Carbs", v: `${carbs}g` },
                    { l: "Fat", v: `${fat}g` },
                  ].map((p) => (
                    <span
                      key={p.l}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary"
                    >
                      {p.l} · {p.v}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/60">
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground text-center">
                  Verified via RatioAi Engine
                </p>
              </div>
            </div>
          </motion.div>

          {/* Share action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleShare();
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 gradient-glow text-primary-foreground font-semibold text-sm px-5 py-3 rounded-full shadow-glow flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share card
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareRecipeCard;
