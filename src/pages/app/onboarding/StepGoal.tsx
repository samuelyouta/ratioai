import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight, Flame, Dumbbell, Scale, Zap } from "lucide-react";
import { setDraft, getDraft } from "@/lib/onboardingDraft";
import type { Goal } from "@/lib/profile";
import { useT } from "@/i18n";

const goals: { id: Goal; icon: typeof Flame; color: string }[] = [
  { id: "lose", icon: Flame, color: "text-coral" },
  { id: "muscle", icon: Dumbbell, color: "text-primary" },
  { id: "maintain", icon: Scale, color: "text-info" },
  { id: "endurance", icon: Zap, color: "text-warning" },
];

const StepGoal = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const [selected, setSelected] = useState<Goal | null>(getDraft().goal ?? null);

  const handleNext = () => {
    if (!selected) return;
    setDraft({ goal: selected });
    navigate("/app/onboarding/name");
  };

  return (
    <OnboardingLayout step={0} totalSteps={8}>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{t("goal.title")}</h2>
        <p className="text-muted-foreground mt-2 text-base">{t("goal.subtitle")}</p>
      </div>

      <div className="space-y-3 flex-1">
        {goals.map(({ id, icon: Icon, color }, i) => {
          const active = selected === id;
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: active ? 1.02 : 1,
              }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 320, damping: 22 }}
              onClick={() => setSelected(id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-colors ${
                active
                  ? "border-primary bg-primary/[0.07]"
                  : "border-border bg-card hover:border-muted-foreground/30"
              }`}
              style={
                active
                  ? {
                      boxShadow:
                        "0 0 0 1px hsl(var(--primary) / 0.6), 0 0 24px hsl(var(--primary) / 0.25), inset 0 0 20px hsl(var(--primary) / 0.08)",
                    }
                  : undefined
              }
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-secondary ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t(`goal.${id}`)}</h3>
                <p className="text-xs text-muted-foreground">{t(`goal.${id}.desc`)}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <button
        disabled={!selected}
        onClick={handleNext}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        {t("common.continue")} <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepGoal;
