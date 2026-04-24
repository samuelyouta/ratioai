import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { setActiveTheme, type LevelUpReward } from "@/lib/streak";

interface Props {
  reward: LevelUpReward | null;
  onClose: () => void;
}

const themePreview: Record<string, { bg: string; accent: string; label: string }> = {
  neon: { bg: "linear-gradient(135deg,#0a0a0f,#1a1030)", accent: "#c6ff3d", label: "Neon" },
  midnight: { bg: "linear-gradient(135deg,#020617,#0f1f3d)", accent: "#60a5fa", label: "Midnight" },
  default: { bg: "hsl(240 10% 6%)", accent: "hsl(82 78% 55%)", label: "Default" },
};

const LevelUpModal = ({ reward, onClose }: Props) => {
  if (!reward) return null;
  const preview = themePreview[reward.theme] ?? themePreview.default;

  const apply = () => {
    setActiveTheme(reward.theme);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 relative overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              className="w-20 h-20 rounded-2xl gradient-glow flex items-center justify-center shadow-glow mb-4"
            >
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">
              Level {reward.level} unlocked
            </p>
            <h2 className="text-2xl font-black text-foreground">{reward.title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{reward.description}</p>

            <div
              className="mt-5 w-full rounded-2xl p-4 border border-border"
              style={{ background: preview.bg }}
            >
              <p className="text-[11px] uppercase tracking-wider text-white/60 mb-2">Theme preview</p>
              <div className="flex items-center gap-2">
                <span
                  className="w-8 h-8 rounded-full"
                  style={{ background: preview.accent, boxShadow: `0 0 18px ${preview.accent}55` }}
                />
                <span className="text-white font-bold">{preview.label}</span>
              </div>
            </div>

            <div className="flex gap-2 w-full mt-5">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm"
              >
                Later
              </button>
              <button
                onClick={apply}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
              >
                Apply theme
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LevelUpModal;
