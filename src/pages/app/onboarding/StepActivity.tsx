import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft, clearDraft } from "@/lib/onboardingDraft";
import { calculateTargets, saveProfile, type Activity } from "@/lib/profile";
import previewActivity from "@/assets/preview-activity.png";

const levels: { id: Activity; label: string; desc: string }[] = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little exercise" },
  { id: "light", label: "Lightly Active", desc: "Light exercise 1-3 days" },
  { id: "moderate", label: "Moderately Active", desc: "Exercise 3-5 days" },
  { id: "very", label: "Very Active", desc: "Hard exercise 6-7 days" },
];

const StepActivity = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [activity, setActivity] = useState<Activity | null>(draft.activity ?? null);

  const handleFinish = () => {
    if (!activity) return;
    const full = setDraft({ activity });
    if (!full.gender || !full.age || !full.heightCm || !full.weightKg || !full.goal) {
      navigate("/app/onboarding/goal");
      return;
    }
    const targets = calculateTargets({
      gender: full.gender,
      age: full.age,
      heightCm: full.heightCm,
      weightKg: full.weightKg,
      activity,
      goal: full.goal,
    });
    saveProfile({
      gender: full.gender,
      age: full.age,
      heightCm: full.heightCm,
      weightKg: full.weightKg,
      unit: full.unit ?? "metric",
      activity,
      goal: full.goal,
      ...targets,
      createdAt: new Date().toISOString(),
    });
    clearDraft();
    navigate("/app/today", { replace: true });
  };

  return (
    <OnboardingLayout step={3} totalSteps={4}>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Activity level</h2>
        <p className="text-muted-foreground mt-2 text-base">Be honest — we calibrate your targets from this.</p>
        <img
          src={previewActivity}
          alt="Activity preview"
          loading="lazy"
          width={512}
          height={512}
          className="mt-5 mx-auto h-32 w-auto rounded-xl opacity-90"
        />
      </div>

      <div className="space-y-2 flex-1">
        {levels.map(({ id, label, desc }, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setActivity(id)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
              activity === id ? "border-primary bg-primary/5 shadow-glow-sm" : "border-border bg-card"
            }`}
          >
            <div>
              <h3 className="font-semibold text-foreground text-sm">{label}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <button
        disabled={!activity}
        onClick={handleFinish}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        Finish setup <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepActivity;
