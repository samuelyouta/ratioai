import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft, clearDraft } from "@/lib/onboardingDraft";
import { calculateTargets, saveProfile } from "@/lib/profile";
import { useT } from "@/i18n";

const blockers: { id: "support" | "consistency" | "tracking" | "knowledge" | "time"; emoji: string }[] = [
  { id: "support", emoji: "🤝" },
  { id: "consistency", emoji: "🔁" },
  { id: "tracking", emoji: "📝" },
  { id: "knowledge", emoji: "🤔" },
  { id: "time", emoji: "⏱️" },
];

const StepBlocker = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const draft = getDraft();
  const [blocker, setBlocker] = useState<string | null>(draft.blocker ?? null);

  const handleFinish = () => {
    if (!blocker) return;
    const full = setDraft({ blocker });
    if (!full.gender || !full.age || !full.heightCm || !full.weightKg || !full.goal || !full.activity) {
      navigate("/app/onboarding/goal");
      return;
    }
    const targets = calculateTargets({
      gender: full.gender,
      age: full.age,
      heightCm: full.heightCm,
      weightKg: full.weightKg,
      activity: full.activity,
      goal: full.goal,
    });
    saveProfile({
      name: full.name,
      gender: full.gender,
      age: full.age,
      heightCm: full.heightCm,
      weightKg: full.weightKg,
      unit: full.unit ?? "metric",
      activity: full.activity,
      goal: full.goal,
      ...targets,
      createdAt: new Date().toISOString(),
    });
    clearDraft();
    navigate("/app/onboarding/analyzing", { replace: true });
  };

  return (
    <OnboardingLayout step={7} totalSteps={8}>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          {t("blocker.title")}
        </h2>
        <p className="text-muted-foreground mt-2 text-base">
          {t("blocker.subtitle")}
        </p>
      </div>

      <div className="flex-1 space-y-2.5">
        {blockers.map(({ id, emoji }, i) => {
          const active = blocker === id;
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, scale: active ? 1.02 : 1 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 320, damping: 24 }}
              onClick={() => setBlocker(id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${
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
              <div>
                <h3 className="font-semibold text-foreground text-sm">{t(`blocker.${id}`)}</h3>
                <p className="text-xs text-muted-foreground">{t(`blocker.${id}.desc`)}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <button
        disabled={!blocker}
        onClick={handleFinish}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        {t("blocker.build")} <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepBlocker;
