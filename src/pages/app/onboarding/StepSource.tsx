import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";

const sources = [
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "youtube", label: "YouTube", emoji: "▶️" },
  { id: "twitter", label: "X / Twitter", emoji: "𝕏" },
  { id: "friend", label: "Friend or family", emoji: "💬" },
  { id: "search", label: "Google search", emoji: "🔎" },
  { id: "appstore", label: "App Store", emoji: "📱" },
  { id: "other", label: "Somewhere else", emoji: "✨" },
];

const StepSource = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [source, setSource] = useState<string | null>(draft.source ?? null);

  const handleNext = () => {
    if (!source) return;
    setDraft({ source });
    navigate("/app/onboarding/blocker");
  };

  return (
    <OnboardingLayout step={6} totalSteps={8}>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          How did you find us?
        </h2>
        <p className="text-muted-foreground mt-2 text-base">
          Helps us understand where our community grows.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-2.5">
        {sources.map(({ id, label, emoji }, i) => {
          const active = source === id;
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, scale: active ? 1.03 : 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 320, damping: 24 }}
              onClick={() => setSource(id)}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-colors ${
                active ? "border-primary bg-primary/[0.07]" : "border-border bg-card"
              }`}
              style={
                active
                  ? {
                      boxShadow:
                        "0 0 0 1px hsl(var(--primary) / 0.6), 0 0 20px hsl(var(--primary) / 0.25)",
                    }
                  : undefined
              }
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-semibold text-foreground text-center">{label}</span>
            </motion.button>
          );
        })}
      </div>

      <button
        disabled={!source}
        onClick={handleNext}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepSource;
