import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft, clearDraft } from "@/lib/onboardingDraft";
import { calculateTargets, saveProfile } from "@/lib/profile";

const blockers = [
  {
    id: "support",
    label: "Lack of support",
    desc: "No one to keep me accountable.",
    emoji: "🤝",
  },
  {
    id: "consistency",
    label: "Inconsistency",
    desc: "I start strong, then fall off.",
    emoji: "🔁",
  },
  {
    id: "tracking",
    label: "Tracking is tedious",
    desc: "Logging meals feels like a chore.",
    emoji: "📝",
  },
  {
    id: "knowledge",
    label: "Don't know what to eat",
    desc: "Macros and portions confuse me.",
    emoji: "🤔",
  },
  {
    id: "time",
    label: "Not enough time",
    desc: "My schedule is unpredictable.",
    emoji: "⏱️",
  },
];

const StepBlocker = () => {
  const navigate = useNavigate();
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
          What's holding you back?
        </h2>
        <p className="text-muted-foreground mt-2 text-base">
          Knowing the obstacle lets us design around it.
        </p>
      </div>

      <div className="flex-1 space-y-2.5">
        {blockers.map(({ id, label, desc, emoji }, i) => {
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
                <h3 className="font-semibold text-foreground text-sm">{label}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
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
        Build My Plan <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepBlocker;
