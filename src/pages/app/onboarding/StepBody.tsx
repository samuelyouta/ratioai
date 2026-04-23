import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import type { Unit } from "@/lib/profile";

const StepBody = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [unit, setUnit] = useState<Unit>(draft.unit ?? "metric");
  const [height, setHeight] = useState<string>(
    draft.heightCm ? (unit === "metric" ? String(draft.heightCm) : String(Math.round(draft.heightCm / 2.54))) : "",
  );
  const [weight, setWeight] = useState<string>(
    draft.weightKg ? (unit === "metric" ? String(draft.weightKg) : String(Math.round(draft.weightKg * 2.205))) : "",
  );

  const isValid = height && weight && Number(height) > 0 && Number(weight) > 0;

  const handleNext = () => {
    if (!isValid) return;
    const heightCm = unit === "metric" ? Number(height) : Number(height) * 2.54;
    const weightKg = unit === "metric" ? Number(weight) : Number(weight) / 2.205;
    setDraft({ unit, heightCm: Math.round(heightCm), weightKg: Math.round(weightKg * 10) / 10 });
    navigate("/app/onboarding/activity");
  };

  return (
    <OnboardingLayout step={2} totalSteps={4}>
      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold text-foreground">Your body</h2>
        <p className="text-muted-foreground mt-1 text-sm">Used to calculate your metabolic rate.</p>
      </div>

      <div className="space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Height & Weight</h3>
          <div className="flex bg-secondary rounded-lg p-0.5">
            {(["metric", "imperial"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`text-xs font-medium px-3 py-1 rounded-md transition-all ${
                  unit === u ? "gradient-glow text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {u === "metric" ? "kg / cm" : "lbs / in"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder={unit === "metric" ? "175" : "69"}
              className="w-full bg-card border border-border rounded-xl py-3 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {unit === "metric" ? "cm" : "in"}
            </span>
          </div>
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={unit === "metric" ? "75" : "165"}
              className="w-full bg-card border border-border rounded-xl py-3 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {unit === "metric" ? "kg" : "lbs"}
            </span>
          </div>
        </div>
      </div>

      <button
        disabled={!isValid}
        onClick={handleNext}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepBody;
