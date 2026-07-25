import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import type { Gender } from "@/lib/profile";

const genders: { id: Gender; label: string; emoji: string }[] = [
  { id: "male", label: "Male", emoji: "♂" },
  { id: "female", label: "Female", emoji: "♀" },
  { id: "other", label: "Other", emoji: "✧" },
];

const StepGender = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [gender, setGender] = useState<Gender | null>(draft.gender ?? null);

  const handleNext = () => {
    if (!gender) return;
    setDraft({ gender });
    navigate("/app/onboarding/dob");
  };

  return (
    <OnboardingLayout step={2} totalSteps={8} backTo="/app/onboarding/name">
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          Biological sex
        </h2>
        <p className="text-muted-foreground mt-2 text-base">
          This helps us calculate your metabolic rate accurately.
        </p>
      </div>

      <div className="flex-1 space-y-3">
        {genders.map(({ id, label, emoji }, i) => {
          const active = gender === id;
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, scale: active ? 1.02 : 1 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 320, damping: 24 }}
              onClick={() => setGender(id)}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-colors ${
                active ? "border-primary bg-primary/[0.07]" : "border-border bg-card"
              }`}
              style={
                active
                  ? {
                      boxShadow:
                        "0 0 0 1px hsl(var(--primary) / 0.6), 0 0 24px hsl(var(--primary) / 0.25)",
                    }
                  : undefined
              }
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {emoji}
              </div>
              <h3 className="font-semibold text-foreground text-base">{label}</h3>
            </motion.button>
          );
        })}
      </div>

      <button
        disabled={!gender}
        onClick={handleNext}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepGender;
