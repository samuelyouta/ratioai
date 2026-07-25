import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import type { Activity } from "@/lib/profile";

const levels: { id: Activity; label: string; desc: string; multiplier: number }[] = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little exercise", multiplier: 1.2 },
  { id: "light", label: "Lightly Active", desc: "Light exercise 1-3 days", multiplier: 1.375 },
  { id: "moderate", label: "Moderately Active", desc: "Exercise 3-5 days", multiplier: 1.55 },
  { id: "very", label: "Very Active", desc: "Hard exercise 6-7 days", multiplier: 1.725 },
];

const StepActivity = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [activity, setActivity] = useState<Activity | null>(draft.activity ?? null);

  const bmr = useMemo(() => {
    if (!draft.gender || !draft.age || !draft.heightCm || !draft.weightKg) return null;
    return (
      10 * draft.weightKg +
      6.25 * draft.heightCm -
      5 * draft.age +
      (draft.gender === "male" ? 5 : draft.gender === "female" ? -161 : -78)
    );
  }, [draft.gender, draft.age, draft.heightCm, draft.weightKg]);

  const activeLevel = levels.find((l) => l.id === activity);
  const kcalImpact = activeLevel && bmr ? Math.round(bmr * (activeLevel.multiplier - 1)) : null;

  const handleNext = () => {
    if (!activity) return;
    setDraft({ activity });
    navigate("/app/onboarding/source");
  };

  return (
    <OnboardingLayout step={5} totalSteps={8} backTo="/app/onboarding/body">
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Activity level</h2>
        <p className="text-muted-foreground mt-2 text-base">Be honest — we calibrate your targets from this.</p>
      </div>

      <div className="space-y-2 flex-1">
        {levels.map(({ id, label, desc }, i) => {
          const active = activity === id;
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, scale: active ? 1.02 : 1 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 320, damping: 24 }}
              onClick={() => setActivity(id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
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
              <div>
                <h3 className="font-semibold text-foreground text-sm">{label}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </motion.button>
          );
        })}

        <div className="h-12 mt-2">
          <AnimatePresence mode="wait">
            {activeLevel && kcalImpact != null && (
              <motion.p
                key={activeLevel.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-xs text-center text-muted-foreground px-4"
              >
                <span className="text-primary font-semibold">{activeLevel.label}:</span>{" "}
                Adds ~{kcalImpact} kcal to your baseline calorie allowance.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <button
        disabled={!activity}
        onClick={handleNext}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepActivity;
